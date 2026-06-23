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
