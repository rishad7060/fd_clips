import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import {
  DataStore,
  DATA_STORE,
  OrganizationRecord,
  PlanTier,
  SubscriptionStatus,
} from '../persistence/store.types';
import { capabilitiesFor, PlanCapabilities, PLANS } from './plans';

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

/** Ledger notes used as idempotency markers for the duration true-up. */
const TRUEUP_NOTE = 'Duration true-up (full video)';
const TRUEUP_REFUND_NOTE = 'Refund — insufficient credits for full video';

/** Approval handoff for a PayPal recurring subscription. */
export interface SubscriptionStart {
  /** PayPal approval URL the buyer is redirected to (mock: a local stub). */
  url: string;
  /** PayPal subscription id (I-XXXX); mock encodes `${orgId}:${tier}`. */
  subscriptionId: string;
  mock: boolean;
  tier: Exclude<PlanTier, 'free'>;
}

/** Org plan + balance + capability flags (for the web to gate features). */
export interface PlanStatus {
  plan: PlanTier;
  creditBalance: number;
  capabilities: PlanCapabilities;
  subscriptionStatus: SubscriptionStatus | null;
}

/** Result of reconciling a job's charge against its real source duration. */
export interface TrueUpResult {
  /** Extra credits debited (0 when the up-front charge already covered it). */
  extraCharged: number;
  /** True when the org couldn't afford the full video and the job was refunded. */
  insufficient: boolean;
  /** New balance after reconciliation. */
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

  /**
   * Plan + balance + capability flags (watermark/editing/retention/resolution).
   * The web reads this to gate the editor and show "remove watermark" upsells.
   */
  async getPlanStatus(organizationId: string): Promise<PlanStatus> {
    const org = await this.requireOrg(organizationId);
    return {
      plan: org.plan,
      creditBalance: org.creditBalance,
      capabilities: capabilitiesFor(org.plan),
      subscriptionStatus: org.subscriptionStatus,
    };
  }

  /**
   * Server-side duration true-up (closes the create-time revenue leak). The
   * up-front charge uses a CLIENT-supplied durationSec; after ingest the worker
   * knows the REAL source duration. Reconcile:
   *  - real cost <= already charged -> no-op.
   *  - real cost  > already charged and balance covers the delta -> debit delta.
   *  - real cost  > already charged but balance can't cover it -> refund the
   *    whole up-front charge and signal insufficient so the worker fails the
   *    job with a clear "not enough credits for the full video" message.
   * Idempotent: keyed on a `trueup:${jobId}` ledger entry so a retried callback
   * can't double-charge.
   */
  async reconcileJobDuration(
    organizationId: string,
    jobId: string,
    realDurationSec: number,
    chargedAtCreate: number,
  ): Promise<TrueUpResult> {
    const org = await this.requireOrg(organizationId);

    // Idempotency: if we've already trued-up (or refunded) this job, no-op.
    const ledger = await this.store.listLedger(organizationId);
    const already = ledger.some(
      (l) => l.jobId === jobId && (l.note === TRUEUP_NOTE || l.note === TRUEUP_REFUND_NOTE),
    );
    if (already) {
      return { extraCharged: 0, insufficient: false, creditBalance: org.creditBalance };
    }

    const realCost = this.creditsForDuration(realDurationSec);
    const delta = realCost - chargedAtCreate;
    if (delta <= 0) {
      return { extraCharged: 0, insufficient: false, creditBalance: org.creditBalance };
    }

    if (org.creditBalance < delta) {
      // Can't afford the full video: refund the up-front charge so the user
      // isn't billed for a job that won't complete, and signal failure.
      const refunded = await this.store.addCredits(organizationId, chargedAtCreate, 'refund', {
        jobId,
        note: TRUEUP_REFUND_NOTE,
      });
      this.logger.warn(
        `True-up: org=${organizationId} job=${jobId} needs ${realCost} credits ` +
          `(real ${realDurationSec}s) but only had ${org.creditBalance + chargedAtCreate}; refunded ${chargedAtCreate}.`,
      );
      return { extraCharged: 0, insufficient: true, creditBalance: refunded.creditBalance };
    }

    const debited = await this.store.addCredits(organizationId, -delta, 'debit', {
      jobId,
      note: TRUEUP_NOTE,
    });
    this.logger.log(
      `True-up: org=${organizationId} job=${jobId} charged +${delta} credit(s) ` +
        `(real ${realDurationSec}s = ${realCost}, was ${chargedAtCreate}).`,
    );
    return { extraCharged: delta, insufficient: false, creditBalance: debited.creditBalance };
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
  async handlePaypalWebhook(rawBody: Buffer, headers: Record<string, string> = {}): Promise<string> {
    let event: { id?: string; event_type?: string; resource?: any };
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid PayPal webhook JSON.');
    }

    // SECURITY (money-critical): this endpoint is public and unauthenticated. In
    // REAL mode we VERIFY the PayPal signature before trusting the body —
    // otherwise anyone could POST a fake event with a custom_id and mint free
    // credits. Verified via /v1/notifications/verify-webhook-signature using
    // PAYPAL_WEBHOOK_ID. Mock mode (no keys, no real money) skips verification.
    if (!this.config.flags.mockBilling) {
      const verified = await this.verifyWebhookSignature(headers, rawBody);
      if (!verified) {
        throw new BadRequestException('PayPal webhook signature verification failed.');
      }
    }

    return this.dispatchPaypalEvent(event);
  }

  /**
   * Route a (verified, or mock-trusted) PayPal event to a grant/plan change.
   * Handles both one-time orders and recurring subscriptions, idempotently.
   */
  private async dispatchPaypalEvent(event: {
    id?: string;
    event_type?: string;
    resource?: any;
  }): Promise<string> {
    const type = event.event_type ?? '';
    const resource = event.resource ?? {};

    switch (type) {
      // ---- Recurring subscriptions ----------------------------------------
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const parsed = resource.custom_id ? this.parseCustomId(resource.custom_id) : null;
        const subId: string | undefined = resource.id;
        if (parsed && subId) {
          await this.activateSubscription(parsed.orgId, parsed.tier, subId, `sub:${subId}:activate`);
          return `Activated ${parsed.tier} subscription for org ${parsed.orgId}`;
        }
        return 'BILLING.SUBSCRIPTION.ACTIVATED: missing custom_id/id; ignored';
      }
      case 'PAYMENT.SALE.COMPLETED': {
        // Recurring renewal payment. resource.billing_agreement_id = subscription id.
        const subId: string | undefined = resource.billing_agreement_id;
        const saleId: string | undefined = resource.id;
        if (!subId) return 'PAYMENT.SALE.COMPLETED: no billing_agreement_id; ignored';
        const org = await this.store.getOrganizationByPaypalSubscriptionId(subId);
        if (!org) return `PAYMENT.SALE.COMPLETED: unknown subscription ${subId}; ignored`;
        if (org.plan === 'free') return `PAYMENT.SALE.COMPLETED: org ${org.id} is free; ignored`;
        // Idempotent on the unique sale id so a replay can't double-grant.
        await this.grantMonthly(org.id, org.plan, `sale:${saleId ?? subId}`);
        return `Renewed ${org.plan} credits for org ${org.id}`;
      }
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.EXPIRED': {
        const subId: string | undefined = resource.id;
        const status: SubscriptionStatus =
          type === 'BILLING.SUBSCRIPTION.SUSPENDED'
            ? 'SUSPENDED'
            : type === 'BILLING.SUBSCRIPTION.EXPIRED'
              ? 'EXPIRED'
              : 'CANCELLED';
        if (!subId) return `${type}: no subscription id; ignored`;
        const org = await this.store.getOrganizationByPaypalSubscriptionId(subId);
        if (!org) return `${type}: unknown subscription ${subId}; ignored`;
        await this.downgradeToFree(org.id, status);
        return `Downgraded org ${org.id} to free (${status})`;
      }

      // ---- One-time orders (credit packs) ---------------------------------
      case 'PAYMENT.CAPTURE.COMPLETED': {
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
      case 'CHECKOUT.ORDER.APPROVED': {
        // In real mode, re-capture via PayPal (authoritative). In mock mode,
        // grant from the trusted custom_id directly.
        if (!this.config.flags.mockBilling && resource.id) {
          const capture = await this.captureOrder(resource.id);
          return `Captured approved order ${resource.id} -> ${capture.plan}`;
        }
        const customId: string | undefined = resource.purchase_units?.[0]?.custom_id;
        const parsed = customId ? this.parseCustomId(customId) : null;
        if (parsed) {
          await this.grantMonthly(parsed.orgId, parsed.tier, `order:${resource.id}`);
          return `Granted ${parsed.tier} credits to org ${parsed.orgId}`;
        }
        return 'CHECKOUT.ORDER.APPROVED: no org/tier custom_id; ignored';
      }

      default:
        return `Unhandled event type: ${type || '(none)'}`;
    }
  }

  /**
   * Verify a PayPal webhook signature via
   * POST /v1/notifications/verify-webhook-signature using PAYPAL_WEBHOOK_ID.
   * Returns true only when PayPal responds verification_status === 'SUCCESS'.
   * Returns false (rejecting the webhook) if the webhook id is unset or any
   * required header is missing — fail closed, never grant on an unverifiable event.
   */
  private async verifyWebhookSignature(
    headers: Record<string, string>,
    rawBody: Buffer,
  ): Promise<boolean> {
    const webhookId = this.config.paypalWebhookId;
    if (!webhookId) {
      this.logger.error('PAYPAL_WEBHOOK_ID is not set — refusing to trust webhook (fail closed).');
      return false;
    }
    const h = (name: string): string => headers[name] ?? headers[name.toLowerCase()] ?? '';
    const transmissionId = h('paypal-transmission-id');
    const transmissionTime = h('paypal-transmission-time');
    const transmissionSig = h('paypal-transmission-sig');
    const certUrl = h('paypal-cert-url');
    const authAlgo = h('paypal-auth-algo');
    if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
      this.logger.warn('PayPal webhook missing one or more signature headers; rejecting.');
      return false;
    }
    let webhookEvent: unknown;
    try {
      webhookEvent = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return false;
    }
    try {
      const accessToken = await this.paypalAccessToken();
      const res = await this.paypalFetch('/v1/notifications/verify-webhook-signature', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          transmission_id: transmissionId,
          transmission_time: transmissionTime,
          transmission_sig: transmissionSig,
          cert_url: certUrl,
          auth_algo: authAlgo,
          webhook_id: webhookId,
          webhook_event: webhookEvent,
        }),
      });
      const json = (await res.json()) as { verification_status?: string };
      return json.verification_status === 'SUCCESS';
    } catch (err) {
      this.logger.error(`PayPal signature verification call failed: ${(err as Error).message}`);
      return false;
    }
  }

  // ---- PayPal recurring SUBSCRIPTIONS ---------------------------------------

  /**
   * Starts a PayPal recurring subscription for the given tier. Returns the
   * approval URL the buyer is redirected to (+ the subscription id). custom_id =
   * `${orgId}:${tier}` so the activation webhook can grant credits.
   *
   * In mock mode (no PayPal keys) this immediately mock-activates: it sets the
   * org's plan, grants the first month's credits, and stores a fake
   * subscription id — so local dev exercises the full flow without PayPal.
   */
  async createSubscription(
    organizationId: string,
    tier: Exclude<PlanTier, 'free'>,
  ): Promise<SubscriptionStart> {
    const plan = PLANS[tier];
    await this.requireOrg(organizationId);

    if (this.config.flags.mockBilling) {
      const subscriptionId = this.mockSubscriptionId(organizationId, tier);
      this.logger.warn(
        `MOCK PayPal subscription for org=${organizationId} tier=${tier} → auto-activating.`,
      );
      // Mock-activate immediately (no real redirect/webhook in offline dev).
      await this.activateSubscription(organizationId, tier, subscriptionId, `sub:${subscriptionId}`);
      return {
        url: `https://mock-paypal.local/subscribe?sub=${subscriptionId}&tier=${tier}`,
        subscriptionId,
        mock: true,
        tier,
      };
    }

    const planId = this.subscriptionPlanId(tier);
    const accessToken = await this.paypalAccessToken();
    const res = await this.paypalFetch('/v1/billing/subscriptions', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        plan_id: planId,
        custom_id: `${organizationId}:${tier}`,
        application_context: {
          brand_name: 'FocalDive Clips',
          user_action: 'SUBSCRIBE_NOW',
          shipping_preference: 'NO_SHIPPING',
          return_url: this.config.billingReturnUrl,
          cancel_url: this.config.billingCancelUrl,
        },
      }),
    });
    const sub = (await res.json()) as {
      id: string;
      status?: string;
      links?: Array<{ rel: string; href: string }>;
    };
    const approve = sub.links?.find((l) => l.rel === 'approve' || l.rel === 'payer-action');
    if (!sub.id || !approve) {
      throw new BadRequestException('PayPal did not return a subscription approval link.');
    }
    // Record the pending subscription id now (status comes from the webhook).
    await this.store.setOrganizationSubscription(organizationId, sub.id, null);
    return { url: approve.href, subscriptionId: sub.id, mock: false, tier };
  }

  /**
   * Activates a subscription: set the org's plan, store the subscription id +
   * ACTIVE status, and grant the first month's credits (idempotent on
   * externalEventId). Called on BILLING.SUBSCRIPTION.ACTIVATED and on mock start.
   */
  async activateSubscription(
    organizationId: string,
    tier: Exclude<PlanTier, 'free'>,
    subscriptionId: string,
    externalEventId: string,
  ): Promise<OrganizationRecord> {
    await this.store.setOrganizationSubscription(organizationId, subscriptionId, 'ACTIVE');
    return this.grantMonthly(organizationId, tier, externalEventId);
  }

  /**
   * Cancels the org's active PayPal subscription. Calls PayPal to cancel (real
   * mode), marks the subscription CANCELLED, and downgrades to free. PayPal
   * keeps access until period end; we flip the plan on the CANCELLED/EXPIRED
   * webhook in real mode, but downgrade immediately in mock mode.
   */
  async cancelSubscription(organizationId: string): Promise<{ ok: boolean; plan: PlanTier }> {
    const org = await this.requireOrg(organizationId);
    if (!org.paypalSubscriptionId) {
      throw new BadRequestException('No active subscription to cancel.');
    }

    if (!this.config.flags.mockBilling) {
      const accessToken = await this.paypalAccessToken();
      await this.paypalFetch(
        `/v1/billing/subscriptions/${encodeURIComponent(org.paypalSubscriptionId)}/cancel`,
        accessToken,
        { method: 'POST', body: JSON.stringify({ reason: 'User requested cancellation.' }) },
      );
      // Real mode: mark cancelled; PayPal's CANCELLED/EXPIRED webhook performs
      // the actual downgrade at period end (keeps paid access until then).
      const updated = await this.store.setOrganizationSubscription(
        organizationId,
        org.paypalSubscriptionId,
        'CANCELLED',
      );
      return { ok: true, plan: updated.plan };
    }

    // Mock mode: downgrade immediately (no period to wait out).
    await this.store.setOrganizationSubscription(organizationId, null, 'CANCELLED');
    const downgraded = await this.store.setOrganizationPlan(organizationId, 'free');
    return { ok: true, plan: downgraded.plan };
  }

  /** Downgrade an org to free at period end (CANCELLED/SUSPENDED/EXPIRED). */
  private async downgradeToFree(
    organizationId: string,
    status: SubscriptionStatus,
  ): Promise<void> {
    const org = await this.store.getOrganization(organizationId);
    if (!org) return;
    await this.store.setOrganizationSubscription(organizationId, org.paypalSubscriptionId, status);
    if (org.plan !== 'free') {
      await this.store.setOrganizationPlan(organizationId, 'free');
      this.logger.log(`Downgraded org=${organizationId} to free (subscription ${status}).`);
    }
  }

  /** Resolve the configured PayPal Billing Plan id for a paid tier. */
  private subscriptionPlanId(tier: Exclude<PlanTier, 'free'>): string {
    const id = tier === 'starter' ? this.config.paypalPlanStarter : this.config.paypalPlanPro;
    if (!id) {
      throw new BadRequestException(
        `Missing PayPal plan id for ${tier} (set PAYPAL_PLAN_${tier.toUpperCase()}).`,
      );
    }
    return id;
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

  private parseCustomId(
    customId: string,
  ): { orgId: string; tier: Exclude<PlanTier, 'free'> } | null {
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

  /** Mock subscription id encodes org:tier (base64url) for offline activation. */
  private mockSubscriptionId(orgId: string, tier: PlanTier): string {
    const token = Buffer.from(`${orgId}:${tier}`, 'utf8').toString('base64url');
    return `I-MOCK${token}`;
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
