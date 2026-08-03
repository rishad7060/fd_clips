import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  DataStore,
  DATA_STORE,
  OrganizationRecord,
  PlanTier,
  SubscriptionStatus,
} from '../persistence/store.types';
import { PlanCapabilities } from './plans';
import { PlansService } from '../plans/plans.service';

/** Ledger notes used as idempotency markers for the duration true-up. */
const TRUEUP_NOTE = 'Duration true-up (full video)';
const TRUEUP_REFUND_NOTE = 'Refund - insufficient credits for full video';

/** Org plan + balance + capability flags (for the web to gate features). */
export interface PlanStatus {
  plan: PlanTier;
  creditBalance: number;
  capabilities: PlanCapabilities;
  subscriptionStatus: SubscriptionStatus | null;
}

/** One grant source line in the credit breakdown (e.g. "Pro plan", 600, 2). */
export interface CreditGrantLine {
  label: string;
  amount: number;
  count: number;
}

/** Where the current credit balance came from (for the billing UI breakdown). */
export interface CreditBreakdown {
  plan: PlanTier;
  balance: number;
  /** One line per grant source, largest first. */
  grants: CreditGrantLine[];
  /** Total minutes spent on jobs (positive number). */
  used: number;
  /** Total minutes refunded from failed jobs (positive number). */
  refunded: number;
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
 * Credit accounting (roadmap 9d).
 * - 1 credit = 1 source-minute.
 * - Debit on job submit; refund on job failure (refund is wired in the queue).
 * - Reconcile against the real source duration after ingest (true-up).
 *
 * Checkout / subscription grants live in the payment provider (PolarService);
 * this service owns only the credit ledger + feature gating.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @Inject(DATA_STORE) private readonly store: DataStore,
    private readonly plans: PlansService,
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
   * A human-friendly breakdown of WHERE the current credit balance came from, so
   * the billing UI can show "Free grant 60 + Pro plan 300 - used 27 = 333"
   * instead of a bare number. Groups the ledger:
   *   - grants  -> one line per distinct source (the note, e.g. "Pro plan grant",
   *                "Free tier signup grant", "Starter plan grant x2")
   *   - used    -> sum of all debits (job charges), as a negative
   *   - refunds -> sum of all refunds (failed jobs), as a positive
   * `balance` echoes the org's authoritative balance (grants - used + refunds
   * should equal it; we return the org value as the source of truth).
   */
  async getCreditBreakdown(organizationId: string): Promise<CreditBreakdown> {
    const org = await this.requireOrg(organizationId);
    const ledger = await this.store.listLedger(organizationId);

    // Group grants by a normalized label so repeated monthly Pro grants collapse
    // into one "Pro plan" line with a summed amount + count.
    const grants = new Map<string, { label: string; amount: number; count: number }>();
    let used = 0;
    let refunded = 0;
    for (const e of ledger) {
      if (e.reason === 'grant') {
        const label = this.grantLabel(e.note);
        const prev = grants.get(label) ?? { label, amount: 0, count: 0 };
        prev.amount += e.amount;
        prev.count += 1;
        grants.set(label, prev);
      } else if (e.reason === 'debit') {
        used += Math.abs(e.amount);
      } else if (e.reason === 'refund') {
        refunded += Math.abs(e.amount);
      }
    }

    return {
      plan: org.plan,
      balance: org.creditBalance,
      grants: [...grants.values()].sort((a, b) => b.amount - a.amount),
      used,
      refunded,
    };
  }

  /**
   * Normalize a ledger note into a short grant-source label. Notes look like
   * "Pro plan grant (monthly x2, 600 min)" or "Free tier signup grant" - we keep
   * the leading source words and drop the parenthetical detail so grants from the
   * same source collapse together.
   */
  private grantLabel(note: string | null): string {
    if (!note) return 'Credit grant';
    const base = note.split('(')[0].trim();
    // Trim a trailing "grant" verb for a cleaner label ("Pro plan grant" -> "Pro plan").
    return base.replace(/\s*grant$/i, '').trim() || base || 'Credit grant';
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
      capabilities: this.plans.capabilities(org.plan),
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

  private async requireOrg(organizationId: string): Promise<OrganizationRecord> {
    const org = await this.store.getOrganization(organizationId);
    if (!org) throw new BadRequestException(`Unknown organization ${organizationId}`);
    return org;
  }
}
