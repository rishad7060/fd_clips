/**
 * Offline fixtures for the admin dashboard. Used by adminApi.ts when
 * NEXT_PUBLIC_API_URL is empty, so the whole admin UI renders and is clickable
 * without the NestJS API. Deterministic - mutations are applied in-memory for
 * the session so dialogs/row-actions feel real.
 */
import type {
  AdminAffiliate,
  AdminBlogPost,
  AdminClip,
  AdminJob,
  AdminLedgerEntry,
  AdminOrg,
  AdminOverview,
  AdminPlan,
  AdminReferral,
  AdminSystemInfo,
  AdminUser,
  AdminWaitlistEntry,
  AffiliateSettings,
  BlogPostInput,
  JobStatus,
  ListParams,
  Paged,
  PlanPatch,
  PlanTier,
  PlatformSettings,
  PlatformSettingsPatch,
  WaitlistStatus,
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
  waitlist: AdminWaitlistEntry[];
  blog: AdminBlogPost[];
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
  waitlistMode: false,
  watermarkFreeClips: true,
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

  // A few demo waitlist signups so the admin waitlist table renders offline.
  const waitlist: AdminWaitlistEntry[] = [
    { id: "wl_1", email: "creator.jane@gmail.com", name: "Jane R.", source: "landing-hero", status: "pending", createdAt: daysAgo(1), invitedAt: null },
    { id: "wl_2", email: "podcastpro@outlook.com", name: null, source: "landing-hero", status: "pending", createdAt: daysAgo(2), invitedAt: null },
    { id: "wl_3", email: "marco@studio.io", name: "Marco", source: "landing-hero", status: "invited", createdAt: daysAgo(4), invitedAt: daysAgo(1) },
    { id: "wl_4", email: "hello@shortsfactory.co", name: "Sam", source: "landing-hero", status: "converted", createdAt: daysAgo(6), invitedAt: daysAgo(3) },
  ];

  // Seed with the 5 posts migrated from the old hardcoded content/blog/*.tsx
  // files, so /blog and /admin/blog render real content offline too.
  const blog: AdminBlogPost[] = [
    {
      id: "post_1",
      slug: "clipshq-vs-opus-clip-2026",
      title: "ClipsHQ vs Opus.pro: Which AI Shorts Tool Wins in 2026?",
      description:
        "A detailed 2026 comparison of ClipsHQ and Opus.pro - pricing, watermarks, captions, and workflow - to help you pick the right AI shorts tool.",
      excerpt:
        "We put ClipsHQ head-to-head with Opus.pro on price, captions, and workflow. Here's the honest breakdown.",
      category: "Comparisons",
      tags: ["opus clip alternative", "clipshq vs opus", "ai shorts tools"],
      author: "ClipsHQ Team",
      bodyMarkdown:
        "## The short version\n\nClipsHQ and Opus.pro both turn long video into ranked, captioned vertical clips. The difference comes down to **pricing transparency** and **workflow speed**.\n\n## Pricing\n\nClipsHQ bills by the minute processed, with no hidden credit math. Opus.pro uses a credit system that can be harder to predict for longer sources.\n\n## Captions & watermark\n\nBoth support burned-in karaoke captions. ClipsHQ does not watermark paid plans; free plans carry a small watermark that can be removed on upgrade.\n\n## Verdict\n\nIf you want predictable pricing and fast turnaround, ClipsHQ is the better value pick for most creators.",
      heroAlt: "Split-screen comparison of ClipsHQ and Opus.pro clip editors",
      published: true,
      publishedAt: "2026-01-12T00:00:00.000Z",
      updatedAt: "2026-01-12T00:00:00.000Z",
    },
    {
      id: "post_2",
      slug: "best-ai-shorts-tools-2026-2027",
      title: "The Best AI Tools to Create Shorts in 2026 & 2027",
      description:
        "The best AI tools for turning long videos into short-form clips in 2026 and 2027, ranked by value, caption quality, and workflow.",
      excerpt:
        "A ranked roundup of the AI shorts tools actually worth your time and money going into 2027.",
      category: "Comparisons",
      tags: ["ai shorts tools", "best ai clip generator", "short form video"],
      author: "ClipsHQ Team",
      bodyMarkdown:
        "## Why this list\n\nThere are dozens of \"AI shorts\" tools now. We ranked the ones worth trying by three criteria: caption quality, price transparency, and how well they pick the actual best moments.\n\n### 1. ClipsHQ\n\nStrong virality scoring and clean minute-based pricing.\n\n### 2. Opus.pro\n\nMature product, credit-based pricing.\n\n### 3. Others\n\nSeveral newer entrants are catching up on caption styling but still lag on clip selection quality.\n\n## Takeaway\n\nTry two or three on the same source video before committing to a subscription.",
      heroAlt: "Grid of vertical short-form video thumbnails on a dark background",
      published: true,
      publishedAt: "2026-02-03T00:00:00.000Z",
      updatedAt: "2026-02-03T00:00:00.000Z",
    },
    {
      id: "post_3",
      slug: "free-youtube-transcript-guide",
      title: "How to Get a Free YouTube Transcript (No Login, No API Key)",
      description:
        "Step-by-step guide to grabbing a full, accurate YouTube transcript for free - no sign-up, no API key, no browser extension required.",
      excerpt:
        "Every free way to pull a YouTube transcript in seconds, plus when you actually need one.",
      category: "Guides",
      tags: ["youtube transcript", "free tools", "how-to"],
      author: "ClipsHQ Team",
      bodyMarkdown:
        "## The fastest way\n\nPaste the video URL into [ClipsHQ's free transcript tool](/tools) - no login, no API key.\n\n## Manual method\n\n1. Open the video on YouTube.\n2. Click **...more** under the description, then **Show transcript**.\n3. Copy the text out of the panel.\n\n## When you need a transcript\n\n- Repurposing a podcast into blog posts\n- Finding quotable moments for clips\n- Translation and localization",
      heroAlt: "A YouTube video player next to a scrolling text transcript panel",
      published: true,
      publishedAt: "2026-02-18T00:00:00.000Z",
      updatedAt: "2026-02-18T00:00:00.000Z",
    },
    {
      id: "post_4",
      slug: "repurpose-long-videos-into-shorts",
      title: "How to Repurpose Long Videos into Viral Shorts (2026 Playbook)",
      description:
        "The full 2026 playbook for repurposing podcasts, interviews, and long-form video into ranked, captioned short clips that actually get views.",
      excerpt:
        "A practical, repeatable playbook for turning one long video into a week of short-form content.",
      category: "Playbooks",
      tags: ["repurpose video", "short form strategy", "content playbook"],
      author: "ClipsHQ Team",
      bodyMarkdown:
        "## Step 1: Pick the right source\n\nLong interviews and podcasts with clear hooks work best - look for moments with a strong opening line.\n\n## Step 2: Let the AI rank moments\n\nUpload to ClipsHQ and let virality scoring surface the top 8-10 candidate clips.\n\n## Step 3: Edit only what needs it\n\nMost clips need zero editing. Trim the rest with the inline editor.\n\n## Step 4: Schedule a week of posts\n\nSpread 8-10 clips across a week for consistent posting without new source material.",
      heroAlt: "A long video timeline being cut into several short vertical clips",
      published: true,
      publishedAt: "2026-03-05T00:00:00.000Z",
      updatedAt: "2026-03-05T00:00:00.000Z",
    },
    {
      id: "post_5",
      slug: "why-clipshq-better-value",
      title: "Why ClipsHQ Is the Best-Value AI Clip Generator",
      description:
        "Why ClipsHQ's minute-based pricing, no-watermark clips, and multilingual captions make it the best-value AI clip generator on the market.",
      excerpt:
        "No credit math, no watermark, no lock-in - here's the case for ClipsHQ as the value pick.",
      category: "Company",
      tags: ["clipshq", "pricing", "value"],
      author: "ClipsHQ Team",
      bodyMarkdown:
        "## Simple pricing\n\nNo credit-conversion math - plans map directly to minutes processed per month.\n\n## No lock-in\n\nCancel anytime; exported clips are yours, watermark-free on paid plans.\n\n## Multilingual captions\n\nKaraoke-style captions support RTL scripts (Arabic, Urdu) out of the box.\n\n## Bottom line\n\nFor creators who want predictable costs and no surprises, ClipsHQ is the value pick.",
      heroAlt: "ClipsHQ pricing plans displayed on a dark dashboard",
      published: true,
      publishedAt: "2026-03-22T00:00:00.000Z",
      updatedAt: "2026-03-22T00:00:00.000Z",
    },
  ];

  return { orgs, users, jobs, clips, ledger, affiliates, referrals, waitlist, blog, settings: { commissionRate: DEFAULT_COMMISSION_RATE }, platform: { ...DEFAULT_PLATFORM } };
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
  listWaitlist(p: ListParams): Paged<AdminWaitlistEntry> {
    const rows = db.waitlist
      .filter((w) => match([w.email, w.name], p.search))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return page(rows, p);
  },
  setWaitlistStatus(id: string, status: WaitlistStatus): AdminWaitlistEntry {
    const w = db.waitlist.find((x) => x.id === id)!;
    w.status = status;
    if (status === "invited" && !w.invitedAt) w.invitedAt = new Date().toISOString();
    return { ...w };
  },
  deleteWaitlistEntry(id: string) {
    db.waitlist = db.waitlist.filter((x) => x.id !== id);
    return { deleted: true };
  },
  listBlogPosts(): AdminBlogPost[] {
    return [...db.blog].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  getBlogPost(id: string): AdminBlogPost {
    const p = db.blog.find((x) => x.id === id);
    if (!p) throw new Error(`Blog post ${id} not found`);
    return p;
  },
  createBlogPost(input: BlogPostInput): AdminBlogPost {
    const now = new Date().toISOString();
    const post: AdminBlogPost = {
      id: `post_${Math.random().toString(36).slice(2, 10)}`,
      ...input,
      publishedAt: now,
      updatedAt: now,
    };
    db.blog.unshift(post);
    return post;
  },
  updateBlogPost(id: string, patch: Partial<BlogPostInput>): AdminBlogPost {
    const p = db.blog.find((x) => x.id === id);
    if (!p) throw new Error(`Blog post ${id} not found`);
    Object.assign(p, patch, { updatedAt: new Date().toISOString() });
    return p;
  },
  deleteBlogPost(id: string) {
    db.blog = db.blog.filter((x) => x.id !== id);
    return { deleted: true };
  },
  waitlistCsv(): string {
    const esc = (v: string | null) => {
      const s = v ?? "";
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [...db.waitlist].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const header = "email,name,status,source,signed_up_at";
    const lines = rows.map((r) => [esc(r.email), esc(r.name), esc(r.status), esc(r.source), esc(r.createdAt)].join(","));
    return [header, ...lines].join("\r\n");
  },
};
