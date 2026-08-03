import { PlanTier } from '../persistence/store.types';

/**
 * Subscription tiers (roadmap 9d). Credits are source-minutes: 1 credit = 1
 * source-minute. monthlyCredits is granted on subscription / renewal.
 *
 * Pricing is set to HALF of Opus Clip's verified monthly prices for the same
 * minute allotments (Opus starter $15, pro $29). Billing runs through Polar.sh
 * as recurring monthly subscriptions - see polar.service.ts.
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
  /** Max output resolution (editable; defaults to 1080p). */
  maxResolution: string;
}

export interface PlanDefinition extends PlanCapabilities {
  tier: PlanTier;
  label: string;
  priceUsd: number;
  monthlyCredits: number;
  /**
   * Optional annual pricing (Pro only). When present, the web may offer an
   * annual billing period at this USD price for `annualCredits` minutes
   * granted up front (12 months' worth). Absent for tiers with no annual
   * option (free, starter - Starter is monthly-only, matching Opus).
   */
  annualPriceUsd?: number;
  /** Credits granted up front for the annual period (Pro only). */
  annualCredits?: number;
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
  free: {
    tier: 'free',
    label: 'Free',
    priceUsd: 0,
    // Opus parity: free tier = 60 source-minutes/mo. SINGLE SOURCE OF TRUTH -
    // auth.guard.ts / auth.controller.ts import FREE_TIER_CREDITS from here.
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
    // Paid clips are retained 30 days (was indefinite). Files are swept from
    // disk after this window; see clips/clip-expiry.ts + clips.controller.ts.
    clipRetentionDays: 30,
    maxResolution: '1080p',
  },
  pro: {
    tier: 'pro',
    label: 'Pro',
    priceUsd: 14.5,
    monthlyCredits: 300,
    // Annual = 60% off (12 × 14.50 × 0.40 = 69.60/yr), granting a full year of
    // credits (300×12=3600 min) up front on checkout. "Pack" quantities (1-10)
    // multiply both price and credits on top of monthly OR annual - see
    // polar.service.ts createSubscription.
    annualPriceUsd: 69.6,
    annualCredits: 3600,
    watermark: false,
    editingEnabled: true,
    // Paid clips are retained 30 days (was indefinite). See starter above.
    clipRetentionDays: 30,
    maxResolution: '1080p',
  },
};

/**
 * The free-tier monthly credit grant. The auth guard seeds new orgs with this,
 * so it lives here (next to the plan) to stay the single source of truth - no
 * duplicate literal in auth.guard.ts.
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
