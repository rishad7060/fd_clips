import { PlanTier } from '../persistence/store.types';

/**
 * Subscription tiers (roadmap 9d). Credits are source-minutes: 1 credit = 1
 * source-minute. monthlyCredits is granted on subscription / renewal.
 *
 * Pricing is set to HALF of Opus Clip's verified monthly prices for the same
 * minute allotments (Opus starter $15, pro $29). Billing runs through PayPal:
 *  - one-time Orders v2 (buy a credit pack), AND
 *  - recurring Subscriptions (the monthly plan path) — see billing.service.ts.
 *
 * Capability flags (watermark / editingEnabled / clipRetentionDays /
 * maxResolution) mirror Opus's free-tier limits so the API, worker, and web can
 * gate features off ONE source of truth. The free tier outputs 1080p clips WITH
 * a watermark, has editing gated, and clips expire after 3 days.
 */
export interface PlanCapabilities {
  /** Burn a watermark into rendered clips (free=true, paid=false). */
  watermark: boolean;
  /** Allow the in-app clip editor (free=false, paid=true). */
  editingEnabled: boolean;
  /** Days before clips expire; null = kept indefinitely (paid). */
  clipRetentionDays: number | null;
  /** Max output resolution; all tiers ship 1080p like Opus. */
  maxResolution: '1080p';
}

export interface PlanDefinition extends PlanCapabilities {
  tier: PlanTier;
  label: string;
  priceUsd: number;
  monthlyCredits: number;
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
  free: {
    tier: 'free',
    label: 'Free',
    priceUsd: 0,
    // Opus parity: free tier = 60 source-minutes/mo. SINGLE SOURCE OF TRUTH —
    // clerk-auth.guard.ts imports FREE_TIER_CREDITS from here.
    monthlyCredits: 60,
    watermark: true,
    editingEnabled: false,
    clipRetentionDays: 3,
    maxResolution: '1080p',
  },
  starter: {
    tier: 'starter',
    label: 'Starter',
    priceUsd: 7.5,
    monthlyCredits: 150,
    watermark: false,
    editingEnabled: true,
    clipRetentionDays: null,
    maxResolution: '1080p',
  },
  pro: {
    tier: 'pro',
    label: 'Pro',
    priceUsd: 14.5,
    monthlyCredits: 300,
    watermark: false,
    editingEnabled: true,
    clipRetentionDays: null,
    maxResolution: '1080p',
  },
};

/**
 * The free-tier monthly credit grant. The auth guard seeds new orgs with this,
 * so it lives here (next to the plan) to stay the single source of truth — no
 * duplicate literal in clerk-auth.guard.ts.
 */
export const FREE_TIER_CREDITS = PLANS.free.monthlyCredits;

/** Capability flags for a plan tier (for feature gating in API/worker/web). */
export function capabilitiesFor(tier: PlanTier): PlanCapabilities {
  const p = PLANS[tier];
  return {
    watermark: p.watermark,
    editingEnabled: p.editingEnabled,
    clipRetentionDays: p.clipRetentionDays,
    maxResolution: p.maxResolution,
  };
}
