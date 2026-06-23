import { AffiliateRecord, ReferralRecord } from '../persistence/store.types';

/** camelCase API view of a referral (one referred org), for the creator dashboard. */
export interface ReferralView {
  id: string;
  status: ReferralRecord['status'];
  /** Lightly masked email of the referred user (privacy on the owner's view). */
  referredEmail: string | null;
  earnedUsd: number;
  createdAt: string;
  convertedAt: string | null;
}

/** camelCase API view returned by GET /affiliates/me. */
export interface AffiliateView {
  code: string;
  link: string;
  /** Effective commission rate (per-affiliate override or the global default). */
  commissionRate: number;
  clicks: number;
  signups: number;
  conversions: number;
  earnedUsd: number;
  paidUsd: number;
  pendingUsd: number;
  referrals: ReferralView[];
}

const centsToUsd = (cents: number): number => Math.round(cents) / 100;

/** Mask the local part of an email for the owner-facing referral list. */
export function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const at = email.indexOf('@');
  if (at <= 1) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const head = local.slice(0, 1);
  return `${head}${'*'.repeat(Math.max(1, local.length - 1))}${domain}`;
}

export function toReferralView(r: ReferralRecord): ReferralView {
  return {
    id: r.id,
    status: r.status,
    referredEmail: maskEmail(r.referredEmail),
    earnedUsd: centsToUsd(r.earnedCents),
    createdAt: r.createdAt,
    convertedAt: r.convertedAt,
  };
}

export function toAffiliateView(
  aff: AffiliateRecord,
  effectiveRate: number,
  link: string,
  referrals: ReferralRecord[],
): AffiliateView {
  return {
    code: aff.code,
    link,
    commissionRate: effectiveRate,
    clicks: aff.clicks,
    signups: aff.signups,
    conversions: aff.conversions,
    earnedUsd: centsToUsd(aff.earnedCents),
    paidUsd: centsToUsd(aff.paidCents),
    pendingUsd: centsToUsd(aff.earnedCents - aff.paidCents),
    referrals: referrals.map(toReferralView),
  };
}
