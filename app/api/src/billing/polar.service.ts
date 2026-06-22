import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { AppConfigService } from '../config/config.service';
import {
  DataStore,
  DATA_STORE,
  OrganizationRecord,
  PlanTier,
  SubscriptionStatus,
} from '../persistence/store.types';
import { PLANS } from './plans';

/**
 * Polar.sh billing — the payment provider for checkout, cancellation, and
 * subscription webhooks. Credit/debit/true-up accounting lives in
 * billing.service.ts.
 *
 * Flow (recurring subscription):
 *   1. createSubscription(org, tier) -> POST /v1/checkouts/ with the tier's
 *      product id + metadata { organizationId, tier } -> returns a hosted
 *      checkout URL the browser is redirected to.
 *   2. Buyer pays on Polar's hosted checkout (cards supported for guests).
 *   3. Polar fires webhooks: order.paid / subscription.active -> grant credits;
 *      subscription.canceled / subscription.revoked -> downgrade to free.
 *
 * MOCK mode (no POLAR_ACCESS_TOKEN): createSubscription immediately grants the
 * plan locally and returns a stub URL, so offline dev/tests exercise the flow
 * without Polar.
 *
 * Webhooks follow the Standard Webhooks spec: headers webhook-id,
 * webhook-timestamp, webhook-signature; the signed content is
 * `${id}.${timestamp}.${rawBody}`, HMAC-SHA256 with the base64-decoded secret
 * (the part after the `whsec_` prefix), base64-encoded, compared to each
 * space-separated `v1,<sig>` entry in webhook-signature.
 */
@Injectable()
export class PolarService {
  private readonly logger = new Logger(PolarService.name);

  constructor(
    private readonly config: AppConfigService,
    @Inject(DATA_STORE) private readonly store: DataStore,
  ) {}

  // ── Public seam (checkout / cancel / webhook) ─────────────────────────────

  /**
   * Start a Polar checkout for a paid tier. Returns the hosted checkout URL.
   * In mock mode, grants the plan locally and returns a stub URL (mock=true).
   */
  async createSubscription(
    organizationId: string,
    tier: Exclude<PlanTier, 'free'>,
  ): Promise<{ url: string; subscriptionId: string; mock: boolean; tier: typeof tier }> {
    await this.requireOrg(organizationId);

    if (this.config.flags.mockBilling) {
      const subscriptionId = `polar_mock_${tier}_${organizationId}`;
      this.logger.warn(`MOCK Polar checkout for org=${organizationId} tier=${tier} → auto-activating.`);
      await this.activate(organizationId, tier, subscriptionId, `polar-mock:${subscriptionId}`);
      return {
        url: `https://mock-polar.local/checkout?product=${tier}&org=${organizationId}`,
        subscriptionId,
        mock: true,
        tier,
      };
    }

    const productId = this.productIdFor(tier);
    const token = this.requireToken();
    const res = await this.polarFetch('/v1/checkouts/', token, {
      method: 'POST',
      body: JSON.stringify({
        products: [productId],
        success_url: this.config.billingReturnUrl,
        // metadata is echoed back on the checkout + order + subscription webhooks
        // so we can resolve the org/tier to grant without a separate lookup.
        metadata: { organizationId, tier },
      }),
    });
    const checkout = (await res.json()) as { id: string; url: string };
    if (!checkout.id || !checkout.url) {
      throw new BadRequestException('Polar did not return a checkout URL.');
    }
    return { url: checkout.url, subscriptionId: checkout.id, mock: false, tier };
  }

  /**
   * Cancel the org's active Polar subscription. Real mode calls Polar to revoke
   * (cancel_at_period_end), marks it CANCELLED, and lets the webhook downgrade
   * at period end. Mock mode downgrades immediately.
   */
  async cancelSubscription(organizationId: string): Promise<{ ok: boolean; plan: PlanTier }> {
    const org = await this.requireOrg(organizationId);
    if (!org.subscriptionId) {
      throw new BadRequestException('No active subscription to cancel.');
    }

    if (this.config.flags.mockBilling) {
      await this.store.setOrganizationSubscription(organizationId, null, 'CANCELLED');
      const downgraded = await this.store.setOrganizationPlan(organizationId, 'free');
      return { ok: true, plan: downgraded.plan };
    }

    // Only attempt the API cancel for a real subscription id (the checkout id we
    // store before activation is not a subscription id — guard on the prefix).
    const subId = org.subscriptionId;
    const token = this.requireToken();
    try {
      await this.polarFetch(`/v1/subscriptions/${encodeURIComponent(subId)}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ cancel_at_period_end: true }),
      });
    } catch (err) {
      this.logger.warn(`Polar cancel call failed for ${subId}: ${(err as Error).message}`);
    }
    const updated = await this.store.setOrganizationSubscription(organizationId, subId, 'CANCELLED');
    return { ok: true, plan: updated.plan };
  }

  /**
   * Handle a Polar webhook (Standard Webhooks). Verifies the signature in real
   * mode, then dispatches to a grant/downgrade. Returns a short description.
   */
  async handleWebhook(rawBody: Buffer, headers: Record<string, string>): Promise<string> {
    if (!this.config.flags.mockBilling) {
      if (!this.verifySignature(rawBody, headers)) {
        throw new BadRequestException('Polar webhook signature verification failed.');
      }
    }
    let event: { type?: string; data?: any };
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid Polar webhook JSON.');
    }
    return this.dispatch(event);
  }

  // ── Event dispatch ─────────────────────────────────────────────────────────

  private async dispatch(event: { type?: string; data?: any }): Promise<string> {
    const type = event.type ?? '';
    const data = event.data ?? {};

    switch (type) {
      // First payment AND renewals both arrive as order.paid; grant on each
      // (idempotent on the unique order id, so a replay can't double-grant).
      case 'order.paid':
      case 'order.created': {
        const parsed = this.resolveOrgTier(data);
        if (!parsed) return `${type}: no org/tier metadata; ignored`;
        const subId: string | undefined = data.subscription_id ?? data.subscription?.id;
        if (subId) {
          await this.store.setOrganizationSubscription(parsed.orgId, subId, 'ACTIVE');
        }
        await this.grantMonthly(parsed.orgId, parsed.tier, `polar-order:${data.id}`);
        return `Granted ${parsed.tier} credits to org ${parsed.orgId} (order ${data.id})`;
      }

      case 'subscription.active':
      case 'subscription.created':
      case 'subscription.updated': {
        const parsed = this.resolveOrgTier(data);
        const subId: string | undefined = data.id;
        if (!parsed || !subId) return `${type}: missing org/tier/id; ignored`;
        const status = (data.status as string) ?? '';
        if (status === 'active') {
          await this.activate(parsed.orgId, parsed.tier, subId, `polar-sub:${subId}:active`);
          return `Activated ${parsed.tier} subscription for org ${parsed.orgId}`;
        }
        // Non-active updates (e.g. canceled flag set) just record the id.
        await this.store.setOrganizationSubscription(parsed.orgId, subId, this.mapStatus(status));
        return `Recorded subscription ${subId} status=${status} for org ${parsed.orgId}`;
      }

      case 'subscription.canceled':
      case 'subscription.revoked': {
        const subId: string | undefined = data.id;
        if (!subId) return `${type}: no subscription id; ignored`;
        const org = await this.store.getOrganizationBySubscriptionId(subId);
        if (!org) return `${type}: unknown subscription ${subId}; ignored`;
        const status: SubscriptionStatus = type === 'subscription.revoked' ? 'EXPIRED' : 'CANCELLED';
        await this.downgradeToFree(org.id, status);
        return `Downgraded org ${org.id} to free (${status})`;
      }

      default:
        return `Unhandled Polar event: ${type || '(none)'}`;
    }
  }

  // ── Grant / downgrade ──────────────────────────────────────────────────────

  /** Activate: store the subscription id + ACTIVE, then grant the month. */
  private async activate(
    organizationId: string,
    tier: Exclude<PlanTier, 'free'>,
    subscriptionId: string,
    externalEventId: string,
  ): Promise<OrganizationRecord> {
    await this.store.setOrganizationSubscription(organizationId, subscriptionId, 'ACTIVE');
    return this.grantMonthly(organizationId, tier, externalEventId);
  }

  /** Grant a plan's monthly credits, idempotent on externalEventId. */
  private async grantMonthly(
    organizationId: string,
    tier: PlanTier,
    externalEventId: string,
  ): Promise<OrganizationRecord> {
    const plan = PLANS[tier];
    const ledger = await this.store.listLedger(organizationId);
    const already = ledger.some((l) => l.reason === 'grant' && l.stripeEventId === externalEventId);
    if (already) {
      this.logger.warn(`Skipping duplicate Polar grant org=${organizationId} event=${externalEventId}.`);
      return this.requireOrg(organizationId);
    }
    await this.store.setOrganizationPlan(organizationId, tier);
    return this.store.addCredits(organizationId, plan.monthlyCredits, 'grant', {
      stripeEventId: externalEventId,
      note: `${plan.label} plan grant (${plan.monthlyCredits} min)`,
    });
  }

  private async downgradeToFree(organizationId: string, status: SubscriptionStatus): Promise<void> {
    const org = await this.store.getOrganization(organizationId);
    if (!org) return;
    await this.store.setOrganizationSubscription(organizationId, org.subscriptionId, status);
    if (org.plan !== 'free') {
      await this.store.setOrganizationPlan(organizationId, 'free');
      this.logger.log(`Downgraded org=${organizationId} to free (subscription ${status}).`);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Pull { organizationId, tier } from a webhook resource's metadata. */
  private resolveOrgTier(
    data: any,
  ): { orgId: string; tier: Exclude<PlanTier, 'free'> } | null {
    const meta = data?.metadata ?? data?.subscription?.metadata ?? data?.checkout?.metadata ?? {};
    const orgId: string | undefined = meta.organizationId;
    const tier = meta.tier as PlanTier | undefined;
    if (!orgId || !tier || tier === 'free' || !PLANS[tier]) return null;
    return { orgId, tier };
  }

  private mapStatus(polarStatus: string): SubscriptionStatus {
    switch (polarStatus) {
      case 'active':
        return 'ACTIVE';
      case 'canceled':
        return 'CANCELLED';
      case 'revoked':
        return 'EXPIRED';
      default:
        return 'SUSPENDED';
    }
  }

  private productIdFor(tier: Exclude<PlanTier, 'free'>): string {
    const id = tier === 'starter' ? this.config.polarProductStarter : this.config.polarProductPro;
    if (!id) {
      throw new BadRequestException(
        `Missing Polar product id for ${tier} (set POLAR_PRODUCT_${tier.toUpperCase()}).`,
      );
    }
    return id;
  }

  private requireToken(): string {
    const token = this.config.polarAccessToken;
    if (!token) throw new BadRequestException('Missing POLAR_ACCESS_TOKEN.');
    return token;
  }

  private async polarFetch(path: string, token: string, init: RequestInit): Promise<Response> {
    const res = await fetch(`${this.config.polarBaseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new BadRequestException(`Polar ${path} failed (${res.status}): ${body}`);
    }
    return res;
  }

  /**
   * Verify a Standard Webhooks signature. Fail closed: no secret, missing
   * headers, or no matching signature -> false (reject, never grant).
   */
  private verifySignature(rawBody: Buffer, headers: Record<string, string>): boolean {
    const secret = this.config.polarWebhookSecret;
    if (!secret) {
      this.logger.error('POLAR_WEBHOOK_SECRET not set — rejecting webhook (fail closed).');
      return false;
    }
    const h = (n: string): string => headers[n] ?? headers[n.toLowerCase()] ?? '';
    const id = h('webhook-id');
    const timestamp = h('webhook-timestamp');
    const sigHeader = h('webhook-signature');
    if (!id || !timestamp || !sigHeader) {
      this.logger.warn('Polar webhook missing signature headers; rejecting.');
      return false;
    }
    // Secret is "whsec_<base64>"; the key is the base64-decoded remainder.
    const rawSecret = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
    let key: Buffer;
    try {
      key = Buffer.from(rawSecret, 'base64');
    } catch {
      return false;
    }
    const signedContent = `${id}.${timestamp}.${rawBody.toString('utf8')}`;
    const expected = createHmac('sha256', key).update(signedContent).digest('base64');
    // webhook-signature is space-separated "v1,<sig>" entries; match any.
    const candidates = sigHeader.split(' ').map((p) => (p.includes(',') ? p.split(',')[1] : p));
    return candidates.some((sig) => this.safeEqual(sig, expected));
  }

  private safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
  }

  private async requireOrg(organizationId: string): Promise<OrganizationRecord> {
    const org = await this.store.getOrganization(organizationId);
    if (!org) throw new BadRequestException(`Unknown organization ${organizationId}`);
    return org;
  }
}
