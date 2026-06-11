import { PlanTier } from '../persistence/store.types';

/**
 * Subscription tiers (roadmap 9d). Credits are source-minutes: 1 credit = 1
 * source-minute. monthlyCredits is granted on subscription / renewal.
 */
export interface PlanDefinition {
  tier: PlanTier;
  label: string;
  priceUsd: number;
  monthlyCredits: number;
  /** Stripe Price id env var name (resolved at runtime; empty in mock mode). */
  stripePriceEnv?: string;
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
  free: { tier: 'free', label: 'Free', priceUsd: 0, monthlyCredits: 30 },
  starter: {
    tier: 'starter',
    label: 'Starter',
    priceUsd: 12,
    monthlyCredits: 150,
    stripePriceEnv: 'STRIPE_PRICE_STARTER',
  },
  pro: {
    tier: 'pro',
    label: 'Pro',
    priceUsd: 25,
    monthlyCredits: 300,
    stripePriceEnv: 'STRIPE_PRICE_PRO',
  },
};

export function planForStripePrice(priceId: string, resolveEnv: (k: string) => string | undefined): PlanTier | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceEnv && resolveEnv(plan.stripePriceEnv) === priceId) {
      return plan.tier;
    }
  }
  return null;
}
