import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { DataStore, DATA_STORE, OrganizationRecord, PlanTier } from '../persistence/store.types';
import { PLANS } from './plans';

export interface CheckoutOrder {
  /** PayPal approval URL (mock: a deterministic local URL). */
  url: string;
  /** PayPal order id; in mock mode it encodes `${orgId}:${tier}` so capture can grant. */
  orderId: string;
  /** True when this is a mock (no real PayPal redirect). */
  mock: boolean;
  tier: PlanTier;
}

export interface CaptureResult {
  ok: boolean;
  plan: PlanTier;
  creditBalance: number;
}

/**
 * Credits + subscriptions (roadmap 9d).
 * - 1 credit = 1 source-minute.
 * - Debit on job submit; refund on job failure (refund is wired in the queue).
 * - PayPal Orders v2 starts the purchase; capture (or the webhook) grants credits.
 *
 * Flow: createOrder -> buyer approves on PayPal -> captureOrder -> on COMPLETED
 * we read custom_id = `${orgId}:${tier}` and grant the plan's monthly credits.
 *
 * MOCK_BILLING (no PAYPAL_CLIENT_ID/PAYPAL_SECRET): PayPal is stubbed.
 * createOrder returns a local mock approval URL with an orderId that encodes
 * `${orgId}:${tier}`, and captureOrder / the webhook trust that unsigned payload
 * and grant credits — so the offline demo and tests work without keys.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly config: AppConfigService,
    @Inject(DATA_STORE) private readonly store: DataStore,
  ) {}

  /** Source minutes required for a job = ceil(durationSec / 60), min 1. */
  creditsForDuration(durationSec: number): number {
    return Math.max(1, Math.ceil(durationSec / 60));
  }

  async getBalance(organizationId: string): Promise<{ plan: PlanTier; creditBalance: number }> {
    const org = await this.requireOrg(organizationId);
    return { plan: org.plan, creditBalance: org.creditBalance };
  }

  /** Throws 402-style error if insufficient; otherwise debits and returns the new balance. */
  async debitForJob(organizationId: string, credits: number, jobId: string): Promise<OrganizationRecord> {
    const org = await this.requireOrg(organizationId);
    if (org.creditBalance < credits) {
      throw new BadRequestException(
        `Insufficient credits: need ${credits} source-minute(s), have ${org.creditBalance}.`,
      );
    }
    return this.store.addCredits(organizationId, -credits, 'debit', { jobId, note: 'Job submission' });
  }

  async refundForJob(organizationId: string, credits: number, jobId: string): Promise<OrganizationRecord> {
    return this.store.addCredits(organizationId, credits, 'refund', { jobId, note: 'Refund for failed job' });
  }

  async grantMonthly(organizationId: string, tier: PlanTier, externalEventId?: string): Promise<OrganizationRecord> {
    const plan = PLANS[tier];
    // IDEMPOTENCY (money-critical): a single purchase fires BOTH the capture and
    // the webhook for the same order, and webhooks can be replayed. Without this
    // guard each would grant credits again. If this external event id has already
    // produced a 'grant' ledger row, no-op — return the current org unchanged.
    if (externalEventId) {
      const ledger = await this.store.listLedger(organizationId);
      const already = ledger.some(
        (l) => l.reason === 'grant' && l.stripeEventId === externalEventId,
      );
      if (already) {
        this.logger.warn(
          `Skipping duplicate grant for org=${organizationId} event=${externalEventId} (already granted).`,
        );
        return this.requireOrg(organizationId);
      }
    }
    await this.store.setOrganizationPlan(organizationId, tier);
    return this.store.addCredits(organizationId, plan.monthlyCredits, 'grant', {
      // The ledger meta slot is a generic external-event id (PayPal order/capture id here).
      stripeEventId: externalEventId,
      note: `${plan.label} plan grant (${plan.monthlyCredits} min)`,
    });
  }

  /**
   * Creates a PayPal Orders v2 order for the given tier. In mock mode returns a
   * deterministic local approval URL + an orderId encoding `${orgId}:${tier}`.
   */
  async createOrder(organizationId: string, tier: PlanTier): Promise<CheckoutOrder> {
    if (tier === 'free') {
      throw new BadRequestException('Free tier does not require checkout.');
    }
    const plan = PLANS[tier];
    await this.requireOrg(organizationId);

    if (this.config.flags.mockBilling) {
      this.logger.warn(`MOCK PayPal order for org=${organizationId} tier=${tier}.`);
      const orderId = this.mockOrderId(organizationId, tier);
      return {
        url: `https://mock-paypal.local/checkout?order=${orderId}&tier=${tier}&amount=${plan.priceUsd}`,
        orderId,
        mock: true,
        tier,
      };
    }

    // Real mode: PayPal Orders v2 (plain REST — no SDK needed).
    const accessToken = await this.paypalAccessToken();
    const res = await this.paypalFetch('/v2/checkout/orders', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            custom_id: `${organizationId}:${tier}`,
            description: `${plan.label} plan — ${plan.monthlyCredits} source-minutes/mo`,
            amount: { currency_code: 'USD', value: plan.priceUsd.toFixed(2) },
          },
        ],
        application_context: {
          brand_name: 'FocalDive Clips',
          user_action: 'PAY_NOW',
          return_url: this.config.billingReturnUrl,
          cancel_url: this.config.billingCancelUrl,
        },
      }),
    });
    const order = (await res.json()) as { id: string; links?: Array<{ rel: string; href: string }> };
    const approve = order.links?.find((l) => l.rel === 'approve' || l.rel === 'payer-action');
    if (!order.id || !approve) {
      throw new BadRequestException('PayPal did not return an approval link.');
    }
    return { url: approve.href, orderId: order.id, mock: false, tier };
  }

  /**
   * Captures an approved PayPal order. On COMPLETED, reads custom_id =
   * `${orgId}:${tier}` and grants the plan's monthly credits. In mock mode the
   * orderId itself encodes `${orgId}:${tier}` and is trusted.
   */
  async captureOrder(orderId: string, expectedOrgId?: string): Promise<CaptureResult> {
    if (!orderId) throw new BadRequestException('Missing orderId.');

    if (this.config.flags.mockBilling) {
      const { orgId, tier } = this.decodeMockOrderId(orderId);
      if (expectedOrgId && orgId !== expectedOrgId) {
        throw new BadRequestException('Order does not belong to this account.');
      }
      const org = await this.grantMonthly(orgId, tier, `order:${orderId}`);
      return { ok: true, plan: org.plan, creditBalance: org.creditBalance };
    }

    const accessToken = await this.paypalAccessToken();
    const res = await this.paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, accessToken, {
      method: 'POST',
    });
    const result = (await res.json()) as {
      id: string;
      status: string;
      purchase_units?: Array<{ custom_id?: string }>;
    };
    if (result.status !== 'COMPLETED') {
      throw new BadRequestException(`PayPal capture not completed (status=${result.status}).`);
    }
    const customId = result.purchase_units?.[0]?.custom_id;
    const parsed = customId ? this.parseCustomId(customId) : null;
    if (!parsed) {
      throw new BadRequestException('PayPal capture missing org/tier custom_id.');
    }
    if (expectedOrgId && parsed.orgId !== expectedOrgId) {
      throw new BadRequestException('Order does not belong to this account.');
    }
    // Idempotency key = the ORDER id (stable across the capture AND the webhook
    // for one purchase), NOT the per-call capture/event id — so capture+webhook
    // can't double-grant. Prefix to avoid colliding with mock order ids.
    const org = await this.grantMonthly(parsed.orgId, parsed.tier, `order:${orderId}`);
    return { ok: true, plan: org.plan, creditBalance: org.creditBalance };
  }

  /**
   * Handles a PayPal webhook. Grants credits on PAYMENT.CAPTURE.COMPLETED and
   * CHECKOUT.ORDER.APPROVED (which we auto-capture) via custom_id. In mock mode
   * the signature is not verified and the raw JSON is trusted. Returns a short
   * description of the action taken (for logging/response).
   */
  async handlePaypalWebhook(rawBody: Buffer): Promise<string> {
    let event: { id?: string; event_type?: string; resource?: any };
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid PayPal webhook JSON.');
    }

    const type = event.event_type ?? '';
    const resource = event.resource ?? {};

    // SECURITY (money-critical): this endpoint is public and unauthenticated. In
    // REAL mode we do NOT trust a webhook body to grant credits until its PayPal
    // signature is verified — otherwise anyone could POST a fake
    // PAYMENT.CAPTURE.COMPLETED with a custom_id and mint free credits. Until
    // signature verification (PayPal /v1/notifications/verify-webhook-signature)
    // is wired, the AUTHENTICATED capture endpoint is the sole grant path in real
    // mode; the webhook only triggers a capture (which re-confirms with PayPal).
    // Mock mode (no keys, no real money) still grants so the demo works.
    if (!this.config.flags.mockBilling) {
      if (type === 'CHECKOUT.ORDER.APPROVED' && resource.id) {
        // Re-capture via PayPal (authoritative) — capture confirms COMPLETED and
        // grants idempotently by order id.
        const capture = await this.captureOrder(resource.id);
        return `Captured approved order ${resource.id} -> ${capture.plan}`;
      }
      return `Webhook ${type || '(none)'}: real-mode grant requires verified signature; ignored (capture is the grant path).`;
    }

    // ---- Mock mode only below (offline demo; no real money) ----
    if (type === 'PAYMENT.CAPTURE.COMPLETED') {
      const customId: string | undefined =
        resource.custom_id ?? resource.supplementary_data?.related_ids?.order_id;
      const parsed = customId ? this.parseCustomId(customId) : null;
      if (parsed) {
        const orderId = resource.supplementary_data?.related_ids?.order_id ?? resource.id;
        await this.grantMonthly(parsed.orgId, parsed.tier, `order:${orderId}`);
        return `Granted ${parsed.tier} credits to org ${parsed.orgId}`;
      }
      return 'PAYMENT.CAPTURE.COMPLETED: no org/tier custom_id; ignored';
    }

    if (type === 'CHECKOUT.ORDER.APPROVED') {
      const customId: string | undefined = resource.purchase_units?.[0]?.custom_id;
      const parsed = customId ? this.parseCustomId(customId) : null;
      if (parsed) {
        await this.grantMonthly(parsed.orgId, parsed.tier, `order:${resource.id}`);
        return `Granted ${parsed.tier} credits to org ${parsed.orgId}`;
      }
      return 'CHECKOUT.ORDER.APPROVED: no org/tier custom_id; ignored';
    }

    return `Unhandled event type: ${type || '(none)'}`;
  }

  // ---- PayPal REST helpers (Orders v2, plain fetch — no SDK) ----------------

  /** OAuth2 client-credentials token. */
  private async paypalAccessToken(): Promise<string> {
    const clientId = this.config.paypalClientId;
    const secret = this.config.paypalSecret;
    if (!clientId || !secret) throw new BadRequestException('Missing PayPal credentials.');
    const basic = Buffer.from(`${clientId}:${secret}`).toString('base64');
    const res = await fetch(`${this.config.paypalBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new BadRequestException(`PayPal auth failed (${res.status}): ${body}`);
    }
    const json = (await res.json()) as { access_token?: string };
    if (!json.access_token) throw new BadRequestException('PayPal auth returned no access_token.');
    return json.access_token;
  }

  private async paypalFetch(path: string, accessToken: string, init: RequestInit): Promise<Response> {
    const res = await fetch(`${this.config.paypalBaseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new BadRequestException(`PayPal ${path} failed (${res.status}): ${body}`);
    }
    return res;
  }

  // ---- custom_id / mock orderId encoding ------------------------------------

  private parseCustomId(customId: string): { orgId: string; tier: PlanTier } | null {
    const idx = customId.indexOf(':');
    if (idx <= 0) return null;
    const orgId = customId.slice(0, idx);
    const tier = customId.slice(idx + 1) as PlanTier;
    if (!orgId || !PLANS[tier] || tier === 'free') return null;
    return { orgId, tier };
  }

  /** Mock order id encodes org:tier (base64url) so capture can grant offline. */
  private mockOrderId(orgId: string, tier: PlanTier): string {
    const token = Buffer.from(`${orgId}:${tier}`, 'utf8').toString('base64url');
    return `MOCK-${token}`;
  }

  private decodeMockOrderId(orderId: string): { orgId: string; tier: PlanTier } {
    const token = orderId.startsWith('MOCK-') ? orderId.slice('MOCK-'.length) : orderId;
    let decoded = '';
    try {
      decoded = Buffer.from(token, 'base64url').toString('utf8');
    } catch {
      decoded = '';
    }
    const parsed = this.parseCustomId(decoded);
    if (!parsed) throw new BadRequestException('Invalid mock order id.');
    return parsed;
  }

  private async requireOrg(organizationId: string): Promise<OrganizationRecord> {
    const org = await this.store.getOrganization(organizationId);
    if (!org) throw new BadRequestException(`Unknown organization ${organizationId}`);
    return org;
  }
}
