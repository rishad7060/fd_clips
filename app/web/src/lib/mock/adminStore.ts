/**
 * Offline fixtures for the admin dashboard. Used by adminApi.ts when
 * NEXT_PUBLIC_API_URL is empty, so the whole admin UI renders and is clickable
 * without the NestJS API. Deterministic - mutations are applied in-memory for
 * the session so dialogs/row-actions feel real.
 */
import type {
  AdminAffiliate,
  AdminClip,
  AdminJob,
  AdminLedgerEntry,
  AdminOrg,
  AdminOverview,
  AdminPlan,
  AdminReferral,
  AdminSystemInfo,
  AdminUser,
  AffiliateSettings,
  JobStatus,
  ListParams,
  Paged,
  PlanPatch,
  PlanTier,
  PlatformSettings,
  PlatformSettingsPatch,
} from "@/lib/adminTypes";

/** Global default commission rate fallback - mirrors AFFILIATE_COMMISSION_RATE. */
const DEFAULT_COMMISSION_RATE = 0.3;

const PLANS: AdminPlan[] = [
  { tier: "free", label: "Free", priceUsd: 0, monthlyCredits: 60, watermark: true, editingEnabled: false, clipRetentionDays: 3, maxResolution: "1080p" },
  { tier: "starter", label: "Starter", priceUsd: 7.5, monthlyCredits: 150, watermark: false, editingEnabled: true, clipRetentionDays: null, maxResolution: "1080p" },
  { tier: "pro", label: "Pro", priceUsd: 14.5, monthlyCredits: 300, watermark: false, editingEnabled: true, clipRetentionDays: null, maxResolution: "1080p" },
];
const MONTHLY: Record<PlanTier, number> = { free: 60, starter: 150, pro: 300 };
const PRICE: Record<PlanTier, number> = { free: 0, starter: 7.5, pro: 14.5 };

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

interface DB {
  orgs: AdminOrg[];
  users: AdminUser[];
  jobs: AdminJob[];
  clips: AdminClip[];
  ledger: AdminLedgerEntry[];
  affiliates: AdminAffiliate[];
  referrals: AdminReferral[];
  settings: AffiliateSettings;
  platform: PlatformSettings;
}

/** Baseline platform controls - mirrors DEFAULT_PLATFORM_SETTINGS in the API. */
const DEFAULT_PLATFORM: PlatformSettings = {
  maintenanceMode: false,
  maintenanceMessage:
    "FocalDive Clips is undergoing scheduled maintenance. We'll be back shortly.",
  newJobsEnabled: true,
  signupsEnabled: true,
  announcement: "",
  updatedAt: new Date().toISOString(),
};

function seed(): DB {
  const orgs: AdminOrg[] = [];
  const users: AdminUser[] = [];
  const jobs: AdminJob[] = [];
  const clips: AdminClip[] = [];
  const ledger: AdminLedgerEntry[] = [];

  const names = ["Ava", "Liam", "Noah", "Mia", "Zoe", "Kai", "Ivy", "Leo", "Nora", "Eli"];
  const plans: PlanTier[] = ["pro", "starter", "free", "free", "starter", "pro", "free", "starter", "free", "pro"];
  const statuses: JobStatus[] = ["completed", "completed", "running", "failed", "queued"];

  // Admin org + user.
  orgs.push({ id: "org_admin", name: "FocalDive Admin", plan: "pro", creditBalance: 0, subscriptionId: null, subscriptionStatus: null, userCount: 1, jobCount: 0, createdAt: daysAgo(30), updatedAt: daysAgo(30) });
  users.push({ id: "user_admin", googleId: null, email: "admin@focaldive.local", name: "System Admin", avatarUrl: null, role: "admin", lastLoginAt: daysAgo(0), organizationId: "org_admin", createdAt: daysAgo(30), updatedAt: daysAgo(30) });

  names.forEach((nm, i) => {
    const plan = plans[i];
    const created = daysAgo(25 - i * 2);
    const orgId = `org_${i}`;
    let jobCount = 0;
    const njobs = 2 + (i % 3);
    for (let j = 0; j < njobs; j++) {
      const status = statuses[(i + j) % statuses.length];
      const jc = daysAgo(22 - i * 2 - j);
      const jobId = `job_${i}_${j}`;
      jobs.push({ id: jobId, organizationId: orgId, sourceType: "url", sourceUrl: `https://youtu.be/dQw${i}${j}`, clipCount: 6, status, stage: status === "completed" ? "done" : "transcribe", progress: status === "completed" ? 100 : status === "running" ? 50 : 0, creditsCharged: 8 + j, error: status === "failed" ? "Mock failure" : null, createdAt: jc, updatedAt: jc });
      ledger.push({ id: `led_d_${i}_${j}`, organizationId: orgId, amount: -(8 + j), reason: "debit", jobId, note: "Job submit", createdAt: jc });
      jobCount++;
      if (status === "completed") {
        for (let r = 1; r <= 4; r++) {
          clips.push({ id: `clip_${i}_${j}_${r}`, organizationId: orgId, jobId, rank: r, start: r * 30, end: r * 30 + 27, hookLine: `${nm}: punchy hook line ${r}`, hookTitle: `Hook ${r}`, viralityScore: 96 - r * 6 - i, suggestedTitle: `${nm} clip ${r}`, createdAt: jc });
        }
      }
    }
    orgs.push({ id: orgId, name: `${nm}'s workspace`, plan, creditBalance: MONTHLY[plan] - i * 5, subscriptionId: plan === "free" ? null : `sub_${i}`, subscriptionStatus: plan === "free" ? null : "ACTIVE", userCount: 1, jobCount, createdAt: created, updatedAt: created });
    ledger.push({ id: `led_g_${i}`, organizationId: orgId, amount: MONTHLY[plan], reason: "grant", jobId: null, note: `${plan} grant`, createdAt: created });
    users.push({ id: `user_${i}`, googleId: `g_${i}`, email: `${nm.toLowerCase()}@example.com`, name: nm, avatarUrl: null, role: "user", lastLoginAt: daysAgo(i), organizationId: orgId, createdAt: created, updatedAt: created });
  });

  // Affiliates for the first few orgs + a couple of referrals so the admin
  // affiliate console renders against real demo data.
  const affiliates: AdminAffiliate[] = [];
  const referrals: AdminReferral[] = [];
  const affSpec = [
    { i: 0, code: "AVA10", clicks: 142, signups: 6, conversions: 2, earnedCents: 450, paidCents: 225 },
    { i: 1, code: "LIAM20", clicks: 88, signups: 3, conversions: 1, earnedCents: 225, paidCents: 0 },
    { i: 4, code: "ZOE30", clicks: 51, signups: 2, conversions: 0, earnedCents: 0, paidCents: 0 },
  ];
  affSpec.forEach((a, idx) => {
    const org = orgs.find((o) => o.id === `org_${a.i}`)!;
    const user = users.find((u) => u.organizationId === `org_${a.i}`)!;
    affiliates.push({
      id: `aff_${a.i}`,
      organizationId: org.id,
      organizationName: org.name,
      ownerEmail: user.email,
      code: a.code,
      commissionRate: null,
      clicks: a.clicks,
      signups: a.signups,
      conversions: a.conversions,
      earnedCents: a.earnedCents,
      paidCents: a.paidCents,
      createdAt: daysAgo(20 - idx * 3),
      updatedAt: daysAgo(idx),
    });
  });
  // Ava (AVA10) referred Noah's + Mia's orgs; Noah converted.
  referrals.push(
    { id: "rf_1", affiliateId: "aff_0", code: "AVA10", referredOrgId: "org_2", referredEmail: "noah@example.com", status: "converted", earnedCents: 225, createdAt: daysAgo(12), convertedAt: daysAgo(10) },
    { id: "rf_2", affiliateId: "aff_0", code: "AVA10", referredOrgId: "org_3", referredEmail: "mia@example.com", status: "signed_up", earnedCents: 0, createdAt: daysAgo(5), convertedAt: null },
    { id: "rf_3", affiliateId: "aff_1", code: "LIAM20", referredOrgId: "org_6", referredEmail: "ivy@example.com", status: "converted", earnedCents: 225, createdAt: daysAgo(8), convertedAt: daysAgo(6) },
  );

  return { orgs, users, jobs, clips, ledger, affiliates, referrals, settings: { commissionRate: DEFAULT_COMMISSION_RATE }, platform: { ...DEFAULT_PLATFORM } };
}

const db: DB = seed();

function page<T>(rows: T[], p: ListParams): Paged<T> {
  const pg = Math.max(1, p.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, p.pageSize ?? 20));
  return { rows: rows.slice((pg - 1) * pageSize, (pg - 1) * pageSize + pageSize), total: rows.length, page: pg, pageSize };
}

function match(hay: (string | null | undefined)[], q?: string): boolean {
  if (!q) return true;
  const s = q.toLowerCase();
  return hay.some((h) => (h ?? "").toLowerCase().includes(s));
}

function buckets(rangeDays: number): string[] {
  const out: string[] = [];
  for (let i = rangeDays - 1; i >= 0; i--) out.push(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10));
  return out;
}

export const adminMock = {
  overview(rangeDays = 30): AdminOverview {
    const jobsByStatus: Record<JobStatus, number> = { queued: 0, running: 0, completed: 0, failed: 0, canceled: 0 };
    db.jobs.forEach((j) => jobsByStatus[j.status]++);
    const plansByTier: Record<PlanTier, number> = { free: 0, starter: 0, pro: 0 };
    db.orgs.forEach((o) => plansByTier[o.plan]++);
    const revenueMrrUsd = db.orgs.reduce((s, o) => (o.subscriptionStatus === "ACTIVE" ? s + PRICE[o.plan] : s), 0);
    const days = buckets(rangeDays);
    const jt = days.map((date) => ({ date, created: 0, completed: 0, failed: 0 }));
    const ji = new Map(jt.map((d) => [d.date, d]));
    db.jobs.forEach((j) => {
      const b = ji.get(j.createdAt.slice(0, 10));
      if (b) { b.created++; if (j.status === "completed") b.completed++; if (j.status === "failed") b.failed++; }
    });
    const ct = days.map((date) => ({ date, granted: 0, debited: 0, refunded: 0 }));
    const ci = new Map(ct.map((d) => [d.date, d]));
    db.ledger.forEach((l) => {
      const b = ci.get(l.createdAt.slice(0, 10));
      if (!b) return;
      if (l.reason === "grant") b.granted += l.amount;
      else if (l.reason === "debit") b.debited += Math.abs(l.amount);
      else if (l.reason === "refund") b.refunded += l.amount;
    });
    const usage = new Map<string, { jobCount: number; creditsUsed: number }>();
    db.jobs.forEach((j) => {
      const u = usage.get(j.organizationId) ?? { jobCount: 0, creditsUsed: 0 };
      u.jobCount++; u.creditsUsed += j.creditsCharged; usage.set(j.organizationId, u);
    });
    const topOrgsByUsage = [...usage.entries()]
      .map(([id, u]) => ({ organization: db.orgs.find((o) => o.id === id)!, ...u }))
      .filter((x) => x.organization)
      .sort((a, b) => b.creditsUsed - a.creditsUsed)
      .slice(0, 5);
    return {
      totals: { organizations: db.orgs.length, users: db.users.length, jobs: db.jobs.length, clips: db.clips.length, creditsOutstanding: db.orgs.reduce((s, o) => s + o.creditBalance, 0) },
      jobsByStatus, plansByTier, revenueMrrUsd, jobsTimeseries: jt, creditsTimeseries: ct,
      recentJobs: [...db.jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10),
      topOrgsByUsage,
    };
  },
  listOrganizations(p: ListParams): Paged<AdminOrg> {
    return page(db.orgs.filter((o) => match([o.name, o.id, o.plan], p.search)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), p);
  },
  listUsers(p: ListParams): Paged<AdminUser> {
    return page(db.users.filter((u) => match([u.email, u.name, u.role], p.search)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), p);
  },
  listJobs(p: ListParams): Paged<AdminJob> {
    return page(db.jobs.filter((j) => (p.status ? j.status === p.status : true)).filter((j) => (p.organizationId ? j.organizationId === p.organizationId : true)).filter((j) => match([j.id, j.sourceUrl], p.search)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), p);
  },
  listClips(p: ListParams): Paged<AdminClip> {
    return page(db.clips.filter((c) => (p.organizationId ? c.organizationId === p.organizationId : true)).filter((c) => (p.jobId ? c.jobId === p.jobId : true)).filter((c) => match([c.hookLine, c.suggestedTitle], p.search)).sort((a, b) => b.viralityScore - a.viralityScore), p);
  },
  listLedger(p: ListParams): Paged<AdminLedgerEntry> {
    return page(db.ledger.filter((l) => (p.organizationId ? l.organizationId === p.organizationId : true)).filter((l) => match([l.note, l.reason], p.search)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), p);
  },
  plans(): AdminPlan[] { return PLANS; },
  updatePlan(tier: PlanTier, patch: PlanPatch): AdminPlan {
    const p = PLANS.find((x) => x.tier === tier)!;
    Object.assign(p, patch);
    return p;
  },
  system(): AdminSystemInfo {
    return { mockMode: true, subsystems: { auth: "mock", database: "in-memory", queue: "in-memory", storage: "mock", billing: "mock", pipeline: "mock", localFiles: false }, ts: new Date().toISOString() };
  },
  setUserRole(id: string, role: AdminUser["role"]): AdminUser {
    const u = db.users.find((x) => x.id === id)!;
    u.role = role;
    return u;
  },
  adjustCredits(orgId: string, amount: number, note?: string): AdminOrg {
    const o = db.orgs.find((x) => x.id === orgId)!;
    o.creditBalance += amount;
    db.ledger.unshift({ id: `led_a_${Math.round(o.creditBalance)}_${db.ledger.length}`, organizationId: orgId, amount, reason: amount >= 0 ? "grant" : "refund", jobId: null, note: note ?? "Admin adjust", createdAt: new Date().toISOString() });
    return o;
  },
  setPlan(orgId: string, plan: PlanTier): AdminOrg {
    const o = db.orgs.find((x) => x.id === orgId)!;
    o.plan = plan;
    return o;
  },
  cancelJob(id: string): AdminJob {
    const j = db.jobs.find((x) => x.id === id)!;
    j.status = "canceled";
    return j;
  },
  deleteUser(id: string) { db.users = db.users.filter((x) => x.id !== id); return { deleted: true }; },
  deleteOrganization(id: string) {
    db.orgs = db.orgs.filter((x) => x.id !== id);
    db.users = db.users.filter((x) => x.organizationId !== id);
    db.jobs = db.jobs.filter((x) => x.organizationId !== id);
    db.clips = db.clips.filter((x) => x.organizationId !== id);
    return { deleted: true };
  },
  deleteJob(id: string) { db.jobs = db.jobs.filter((x) => x.id !== id); db.clips = db.clips.filter((x) => x.jobId !== id); return { deleted: true }; },
  deleteClip(id: string) { db.clips = db.clips.filter((x) => x.id !== id); return { deleted: true }; },
  listAffiliates(p: ListParams): Paged<AdminAffiliate> {
    return page(db.affiliates.filter((a) => match([a.code, a.organizationName, a.ownerEmail, a.organizationId], p.search)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), p);
  },
  listReferrals(p: ListParams): Paged<AdminReferral> {
    return page(db.referrals.filter((r) => (p.affiliateId ? r.affiliateId === p.affiliateId : true)).filter((r) => match([r.code, r.referredEmail, r.referredOrgId, r.status], p.search)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), p);
  },
  payoutAffiliate(id: string, amountUsd?: number): AdminAffiliate {
    const a = db.affiliates.find((x) => x.id === id)!;
    const pending = a.earnedCents - a.paidCents;
    const cents = amountUsd != null ? Math.round(amountUsd * 100) : pending;
    a.paidCents += Math.max(0, Math.min(cents, pending));
    a.updatedAt = new Date().toISOString();
    return a;
  },
  setAffiliateRate(id: string, commissionRate: number | null): AdminAffiliate {
    const a = db.affiliates.find((x) => x.id === id)!;
    a.commissionRate = commissionRate;
    a.updatedAt = new Date().toISOString();
    return a;
  },
  getAffiliateSettings(): AffiliateSettings {
    return { commissionRate: db.settings.commissionRate ?? DEFAULT_COMMISSION_RATE };
  },
  setAffiliateSettings(commissionRate: number): AffiliateSettings {
    db.settings = { commissionRate };
    return db.settings;
  },
  getPlatformSettings(): PlatformSettings {
    return { ...db.platform };
  },
  setPlatformSettings(patch: PlatformSettingsPatch): PlatformSettings {
    db.platform = { ...db.platform, ...patch, updatedAt: new Date().toISOString() };
    return { ...db.platform };
  },
};
