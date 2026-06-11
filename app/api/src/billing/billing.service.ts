import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { DataStore, DATA_STORE, OrganizationRecord, PlanTier } from '../persistence/store.types';
import { PLANS, planForStripePrice } from './plans';

export interface CheckoutSession {
  url: string;
  /** True when this is a mock (no real Stripe redirect). */
  mock: boolean;
  tier: PlanTier;
}

/**
 * Credits + subscriptions (roadmap 9d).
 * - 1 credit = 1 source-minute.
 * - Debit on job submit; refund on job failure (refund is wired in the queue).
 * - Stripe Checkout starts a subscription; the webhook grants monthly credits.
 *
 * MOCK_BILLING: Stripe is stubbed. createCheckout returns a local mock URL that
 * (in dev) you can POST back to the webhook to simulate payment, and the
 * webhook handler accepts unsigned payloads.
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

  async grantMonthly(organizationId: string, tier: PlanTier, stripeEventId?: string): Promise<OrganizationRecord> {
    const plan = PLANS[tier];
    await this.store.setOrganizationPlan(organizationId, tier);
    return this.store.addCredits(organizationId, plan.monthlyCredits, 'grant', {
      stripeEventId,
      note: `${plan.label} plan grant (${plan.monthlyCredits} min)`,
    });
  }

  /**
   * Starts a Stripe Checkout subscription session. In mock mode returns a
   * deterministic local URL instead of calling Stripe.
   */
  async createCheckout(organizationId: string, tier: PlanTier): Promise<CheckoutSession> {
    if (tier === 'free') {
      throw new BadRequestException('Free tier does not require checkout.');
    }
    const plan = PLANS[tier];
    await this.requireOrg(organizationId);

    if (this.config.flags.mockBilling) {
      this.logger.warn(`MOCK Stripe checkout for org=${organizationId} tier=${tier}.`);
      return {
        url: `https://mock-stripe.local/checkout?org=${organizationId}&tier=${tier}&amount=${plan.priceUsd}`,
        mock: true,
        tier,
      };
    }

    // Real mode: create a Stripe Checkout Session (lazy import).
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(this.config.stripeSecretKey!);
    const priceId = this.config.get<string>(plan.stripePriceEnv!, undefined);
    if (!priceId) throw new BadRequestException(`Missing ${plan.stripePriceEnv} for tier ${tier}.`);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: organizationId,
      metadata: { organizationId, tier },
      success_url: this.config.get<string>('STRIPE_SUCCESS_URL', 'http://localhost:3000/billing?ok=1'),
      cancel_url: this.config.get<string>('STRIPE_CANCEL_URL', 'http://localhost:3000/billing?canceled=1'),
    });
    return { url: session.url ?? '', mock: false, tier };
  }

  /**
   * Verifies + handles a Stripe webhook. Grants credits on
   * checkout.session.completed and invoice.payment_succeeded.
   * In mock mode the signature check is skipped and the raw JSON is trusted.
   * Returns a short description of the action taken (for logging/response).
   */
  async handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<string> {
    let event: { id: string; type: string; data: { object: any } };

    if (this.config.flags.mockBilling) {
      event = JSON.parse(rawBody.toString('utf8'));
    } else {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(this.config.stripeSecretKey!);
      const secret = this.config.stripeWebhookSecret;
      if (!secret || !signature) throw new BadRequestException('Missing Stripe signature/secret.');
      event = stripe.webhooks.constructEvent(rawBody, signature, secret) as any;
    }

    const resolveEnv = (k: string): string | undefined => this.config.get<string>(k, undefined);

    if (event.type === 'checkout.session.completed') {
      const obj = event.data.object;
      const orgId: string | undefined = obj.client_reference_id ?? obj.metadata?.organizationId;
      const tier: PlanTier | undefined = obj.metadata?.tier;
      if (orgId && tier && tier !== 'free') {
        await this.grantMonthly(orgId, tier, event.id);
        return `Granted ${tier} credits to org ${orgId}`;
      }
      return 'checkout.session.completed: no org/tier metadata; ignored';
    }

    if (event.type === 'invoice.payment_succeeded') {
      // Renewal: re-grant monthly credits. Map the price back to a tier.
      const obj = event.data.object;
      const orgId: string | undefined = obj.metadata?.organizationId ?? obj.subscription_details?.metadata?.organizationId;
      const priceId: string | undefined = obj.lines?.data?.[0]?.price?.id;
      const tier = priceId ? planForStripePrice(priceId, resolveEnv) : null;
      if (orgId && tier) {
        await this.grantMonthly(orgId, tier, event.id);
        return `Renewal: granted ${tier} credits to org ${orgId}`;
      }
      return 'invoice.payment_succeeded: could not resolve org/tier; ignored';
    }

    return `Unhandled event type: ${event.type}`;
  }

  private async requireOrg(organizationId: string): Promise<OrganizationRecord> {
    const org = await this.store.getOrganization(organizationId);
    if (!org) throw new BadRequestException(`Unknown organization ${organizationId}`);
    return org;
  }
}
