import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import {
  AffiliateRecord,
  DataStore,
  DATA_STORE,
} from '../persistence/store.types';
import { AffiliateView, toAffiliateView } from './affiliates.mapper';

/** Outcome of an attribution attempt (always 200; the reason explains a no-op). */
export interface AttributeResult {
  attributed: boolean;
  reason?: 'unknown_code' | 'self_referral' | 'already_referred';
}

/**
 * Affiliate / referral program. Every org auto-gets an affiliate account (a
 * shareable code + link). When a referred org pays, PolarService calls
 * recordConversion() to credit a recurring commission (a % of each paid invoice),
 * idempotent on the billing event id. Money is tracked in USD cents in the store.
 */
@Injectable()
export class AffiliatesService {
  private readonly logger = new Logger(AffiliatesService.name);

  constructor(
    @Inject(DATA_STORE) private readonly store: DataStore,
    private readonly config: AppConfigService,
  ) {}

  /** The global default commission rate (admin override, else config default). */
  private async defaultRate(): Promise<number> {
    const settings = await this.store.getAffiliateSettings();
    return settings.commissionRate ?? this.config.affiliateCommissionRate;
  }

  /** Effective rate for an affiliate: its own override, else the global default. */
  private async effectiveRate(aff: AffiliateRecord): Promise<number> {
    return aff.commissionRate ?? (await this.defaultRate());
  }

  private linkFor(code: string): string {
    return `${this.config.appBaseUrl}/?ref=${encodeURIComponent(code)}`;
  }

  /** The caller's affiliate account + funnel stats + referral history. */
  async getMine(organizationId: string): Promise<AffiliateView> {
    const aff = await this.store.getOrCreateAffiliate(organizationId);
    const [rate, referrals] = await Promise.all([
      this.effectiveRate(aff),
      this.store.listReferralsByAffiliate(aff.id),
    ]);
    return toAffiliateView(aff, rate, this.linkFor(aff.code), referrals);
  }

  /**
   * Attribute the caller's org to a referral code. No-op (with a reason) when the
   * code is unknown, is the caller's own code (self-referral), or the org has
   * already been referred. Idempotent: an org can only ever be referred once.
   */
  async attribute(
    organizationId: string,
    code: string,
    referredEmail?: string,
  ): Promise<AttributeResult> {
    const affiliate = await this.store.getAffiliateByCode(code.trim());
    if (!affiliate) return { attributed: false, reason: 'unknown_code' };
    if (affiliate.organizationId === organizationId) {
      return { attributed: false, reason: 'self_referral' };
    }
    const existing = await this.store.getReferralByReferredOrg(organizationId);
    if (existing) return { attributed: false, reason: 'already_referred' };

    await this.store.createReferral({
      affiliateId: affiliate.id,
      code: affiliate.code,
      referredOrgId: organizationId,
      referredEmail: referredEmail ?? null,
    });
    this.logger.log(`Attributed org ${organizationId} to affiliate ${affiliate.code}.`);
    return { attributed: true };
  }

  /** Public link-click counter bump; best-effort (no-op on an unknown code). */
  async trackClick(code: string): Promise<{ ok: true }> {
    await this.store.incrementAffiliateClicks(code.trim());
    return { ok: true };
  }

  /**
   * Credit a recurring commission for a referred org's paid invoice. Called from
   * PolarService after a successful plan grant; `eventId` is the same idempotency
   * key the grant uses, so a webhook + confirm replay never double-pays. No-op
   * when the org wasn't referred or the event was already credited.
   */
  async recordConversion(
    organizationId: string,
    planPriceUsd: number,
    eventId: string,
  ): Promise<void> {
    if (planPriceUsd <= 0) return;
    const referral = await this.store.getReferralByReferredOrg(organizationId);
    if (!referral) return;
    const affiliate = await this.store.getAffiliateById(referral.affiliateId);
    if (!affiliate) return;
    const rate = await this.effectiveRate(affiliate);
    const cents = Math.round(planPriceUsd * rate * 100);
    if (cents <= 0) return;
    const credited = await this.store.recordReferralConversion(organizationId, cents, eventId);
    if (credited) {
      this.logger.log(
        `Affiliate ${affiliate.code} earned ${cents}c from org ${organizationId} (event ${eventId}).`,
      );
    }
  }
}
