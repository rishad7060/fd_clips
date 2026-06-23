import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  DataStore,
  DATA_STORE,
  PlanRecord,
  PlanTier,
} from '../persistence/store.types';
import { PlanCapabilities, PLANS } from '../billing/plans';

/** Fields an admin may edit on a plan (tier is immutable — it's the PK/enum). */
export type PlanPatch = Partial<Omit<PlanRecord, 'tier'>>;

/**
 * Runtime source of truth for the plan catalog. On boot it loads plans from the
 * DataStore, seeding them from the billing/plans.ts defaults if the store is
 * empty. The admin dashboard edits plans through `update()`; every consumer
 * (billing capabilities, Polar grants, public /plans, free-tier provisioning)
 * reads the live cached values here instead of the static constant.
 */
@Injectable()
export class PlansService implements OnModuleInit {
  private readonly logger = new Logger(PlansService.name);
  private cache: Record<PlanTier, PlanRecord> = { ...PLANS };

  constructor(@Inject(DATA_STORE) private readonly store: DataStore) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  /** Load plans from the store; seed defaults on first boot. */
  private async reload(): Promise<void> {
    let rows = await this.store.listPlans();
    if (rows.length === 0) {
      this.logger.log('Seeding plan catalog from defaults.');
      rows = await Promise.all(Object.values(PLANS).map((p) => this.store.savePlan(p)));
    }
    const next = { ...PLANS } as Record<PlanTier, PlanRecord>;
    for (const r of rows) next[r.tier] = r;
    this.cache = next;
  }

  /** All plans, in a stable tier order. */
  getAll(): PlanRecord[] {
    const order: PlanTier[] = ['free', 'starter', 'pro'];
    return order.map((t) => this.cache[t]).filter(Boolean);
  }

  get(tier: PlanTier): PlanRecord {
    return this.cache[tier] ?? PLANS[tier];
  }

  capabilities(tier: PlanTier): PlanCapabilities {
    const p = this.get(tier);
    return {
      watermark: p.watermark,
      editingEnabled: p.editingEnabled,
      clipRetentionDays: p.clipRetentionDays,
      maxResolution: p.maxResolution,
    };
  }

  /** Monthly credit grant for the free tier (new-org provisioning). */
  freeTierCredits(): number {
    return this.get('free').monthlyCredits;
  }

  /** Apply an admin edit to a plan, persist it, and refresh the cache. */
  async update(tier: PlanTier, patch: PlanPatch): Promise<PlanRecord> {
    const current = this.get(tier);
    const next: PlanRecord = { ...current, ...patch, tier };
    const saved = await this.store.savePlan(next);
    this.cache[tier] = saved;
    return saved;
  }
}
