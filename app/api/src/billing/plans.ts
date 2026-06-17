import { PlanTier } from '../persistence/store.types';

/**
 * Subscription tiers (roadmap 9d). Credits are source-minutes: 1 credit = 1
 * source-minute. monthlyCredits is granted on subscription / renewal.
 *
 * Pricing is set to HALF of Opus Clip's verified monthly prices for the same
 * minute allotments (Opus starter $15, pro $29). Billing runs through PayPal
 * Orders v2, which charges an amount (priceUsd) rather than a stored price-id,
 * so there is no per-plan provider price-env to configure.
 */
export interface PlanDefinition {
  tier: PlanTier;
  label: string;
  priceUsd: number;
  monthlyCredits: number;
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
  free: { tier: 'free', label: 'Free', priceUsd: 0, monthlyCredits: 30 },
  starter: {
    tier: 'starter',
    label: 'Starter',
    priceUsd: 7.5,
    monthlyCredits: 150,
  },
  pro: {
    tier: 'pro',
    label: 'Pro',
    priceUsd: 14.5,
    monthlyCredits: 300,
  },
};
