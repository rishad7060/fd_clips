# Production checklist — FocalDive Clips

An ordered, actionable runbook for taking FocalDive Clips from **mock mode** (boots with
no keys) to a live deploy. Every external dependency has a mock fallback, so "go live" is
the act of filling in real keys and flipping each mock switch off, in the right order.

- Full per-variable reference: **`docs/ENV_SETUP.md`**.
- Integration deep-dives (R2 wiring, PayPal flow internals, credit ledger): **`INTEGRATION.md`**.
- Pricing / plan facts (single source of truth): **`app/api/src/billing/plans.ts`**, `PRICING.md`.

There are **three** `.env` files — keep them straight:
`/.env` (pipeline + worker) · `app/api/.env` (NestJS API) · `app/web/.env.local` (Next.js, build-time).

---

## 0. Pre-flight

- [ ] `git` clean; you can build all three apps: `pip install -r requirements.txt`, and in `app/api` & `app/web` run `npm ci`.
- [ ] `app/web` type-checks: `cd app/web && npx tsc --noEmit`.
- [ ] `app/api` builds: `cd app/api && npm run build`.
- [ ] `ffmpeg` and `ffprobe` are installed and on `PATH` on the box that runs the pipeline (`ffmpeg -version`). Set `FFMPEG_PATH`/`FFPROBE_PATH` if not.
- [ ] Decide hosting: web (e.g. Vercel), API + worker (a VPS/RunPod with ffmpeg), Postgres, Redis.

---

## 1. Environment variables

Copy each `.env.example` to its real file and fill in. See `docs/ENV_SETUP.md` for every var.

- [ ] **Pipeline `/.env`**: `GROQ_API_KEY`, `GEMINI_API_KEY` (sets `MOCK_MODE=auto` → real), `DATABASE_URL`, `REDIS_URL`, `FFMPEG_PATH`/`FFPROBE_PATH`. Optional: `RESEND_API_KEY`/`EMAIL_FROM`, `YTDLP_COOKIES_FROM_BROWSER` or `YTDLP_COOKIES`, `R2_*`.
- [ ] **API `app/api/.env`**: `MOCK_AUTH=false`, `CLERK_SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`, `USE_REAL_PIPELINE=true`, `API_PUBLIC_URL`, all `PAYPAL_*` (see §4), `R2_*`.
- [ ] **Web `app/web/.env.local`**: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (must start `pk_`), `CLERK_SECRET_KEY`.
- [ ] **Never** set `MOCK_MODE=true` in production — it forces every subsystem to mock. Leave it `auto` (or `false`). Note: `mockBilling` is deliberately driven only by the PayPal keys, so a stray `MOCK_MODE=true` can't re-enable the forgeable local-grant path — but it *will* mock the DB/queue/auth. Avoid it.

---

## 2. Auth — Clerk + Google OAuth

- [ ] Create a Clerk application (production instance) at dashboard.clerk.com.
- [ ] Copy the **Publishable key** (`pk_live_...`) → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (web). The web only mounts Clerk when this starts with `pk_` (`app/web/src/lib/auth.ts` → `CLERK_ENABLED`).
- [ ] Copy the **Secret key** (`sk_live_...`) → `CLERK_SECRET_KEY` (web **and** api).
- [ ] **Enable Google OAuth**: Clerk Dashboard → **User & Authentication → Social Connections → Google → Enable**. For production, supply your own Google Cloud OAuth **Client ID/Secret** (Clerk's shared dev credentials don't work on a production instance).
  - In Google Cloud Console → APIs & Services → Credentials → OAuth client (Web): add Clerk's **Authorized redirect URI** (shown in the Clerk Google connection panel).
- [ ] Add your production web domain to Clerk's allowed origins / configure the production instance domain.
- [ ] Set `MOCK_AUTH=false` in `app/api/.env` so the API requires a real Clerk JWT (otherwise it injects a fake org).
- [ ] New orgs are auto-seeded with the free-tier grant (`FREE_TIER_CREDITS = 60` from `plans.ts`, via `clerk-auth.guard.ts`) on first authenticated request — verify this fires after a real sign-in.

---

## 3. Database — Postgres + Prisma

- [ ] Provision Postgres; set `DATABASE_URL` in **both** `/.env` and `app/api/.env`.
- [ ] Provision Redis; set `REDIS_URL` in both.
- [ ] Run migrations from `app/api`: `npx prisma migrate deploy` (and `npx prisma generate` if needed).
- [ ] Confirm the API logs show `database = Postgres via Prisma` and `queue = BullMQ/Redis` at boot (the banner in `config.service.ts`) — **not** the in-memory fallbacks.

---

## 4. Payments — PayPal (sandbox → live)

Pricing is **half of Opus**: Starter **$7.50/mo**, Pro **$14.50/mo** (`plans.ts`). Free = 60 min/mo.

### 4a. Create the PayPal app & products (do this in **sandbox** first, then repeat for **live**)

- [ ] developer.paypal.com → **Apps & Credentials** → create a REST app → copy `Client ID` + `Secret` → `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET`.
- [ ] Create a **Product** (catalog) and two **Billing Plans** at the prices above:
  - Starter — $7.50/month → plan id → `PAYPAL_PLAN_STARTER`.
  - Pro — $14.50/month → plan id → `PAYPAL_PLAN_PRO`.
- [ ] Create a **Webhook** (Dashboard → Webhooks) pointing at `https://api.yourdomain.com/billing/webhook`; subscribe to at least `PAYMENT.CAPTURE.COMPLETED` (and the subscription events `BILLING.SUBSCRIPTION.ACTIVATED` / `.CANCELLED` if using subscriptions). Copy the **Webhook ID** → `PAYPAL_WEBHOOK_ID`.
- [ ] Set `PAYPAL_RETURN_URL` / `PAYPAL_CANCEL_URL` to your real web domain (`https://app.yourdomain.com/billing?ok=1` / `?canceled=1`).

### 4b. Sandbox test

- [ ] Keep `PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com`, `PAYPAL_MODE=sandbox`.
- [ ] Use a sandbox buyer account to run a real one-time order **and** a subscription end-to-end; confirm credits land and the plan updates.

### 4c. Go live

- [ ] Swap to **live** app credentials, plan ids, and webhook id.
- [ ] Set `PAYPAL_BASE_URL=https://api-m.paypal.com` and `PAYPAL_MODE=live`.
- [ ] **Verify webhook signatures.** The webhook grant path must reject unverified calls — confirm `PAYPAL_WEBHOOK_ID` is set so signatures are checked (`config.service.ts` exposes it; webhook grants are rejected without it). The **capture endpoint remains the primary, safe grant path** (only grants on a real PayPal `COMPLETED`).
- [ ] Decide **monthly renewal**: PayPal Subscriptions re-grant via webhook on each cycle, OR run a monthly cron that re-grants `monthlyCredits` to active plans (one-time Orders don't renew). Pick one before launch.

> With PayPal keys present, billing is **never** mocked (`mockBilling = hasPaypal ? false : true`), so the local "free credit grant on capture" demo path is off in production.

---

## 5. Switch mock → real (the flip list)

| Subsystem | Mock when… | Make real by… | Verify |
|---|---|---|---|
| Auth | `MOCK_AUTH=true` / no Clerk key | set `MOCK_AUTH=false` + Clerk keys | sign in with Google works |
| Database | no `DATABASE_URL` | set `DATABASE_URL` + `prisma migrate deploy` | banner: `Postgres via Prisma` |
| Queue | no `REDIS_URL` | set `REDIS_URL` | banner: `BullMQ/Redis` |
| Pipeline | `USE_REAL_PIPELINE` unset | `USE_REAL_PIPELINE=true` + Groq/Gemini keys | a real job produces real clips |
| Billing | no PayPal keys | set `PAYPAL_*` (live) | sandbox/live purchase grants credits |
| Storage | no `R2_*` | set `R2_*` **and wire R2 upload** (INTEGRATION.md §2) | clips served from R2 signed URLs |
| Web→API | no `NEXT_PUBLIC_API_URL` | set it + rebuild web | app reads live data, not mock store |

- [ ] Confirm the API boot banner (logged by `config.service.ts`) shows the **real** counterpart for every line, and does **not** warn "Running in MOCK MODE".

---

## 6. Worker / pipeline runtime

- [ ] `USE_REAL_PIPELINE=true` on the API so the queue drives `RealPipelineWorker` (spawns `pipeline/run.py`) instead of the mock worker.
- [ ] Python 3.10+ with `requirements.txt` installed on the worker box; `python pipeline/run.py --help` runs.
- [ ] **ffmpeg/ffprobe present** on the worker (the pipeline shells out to them). On CPU-only boxes the final render uses **libx264** (works, slower); on a GPU box (RunPod 4090) `h264_nvenc` is used when available.
- [ ] **GPU vs CPU decision**: the $0 path (Groq transcribe + Gemini score + libx264 encode) runs CPU-only and is the default. Move to a GPU pod only if you need faster encodes / WhisperX+pyannote (`WHISPERX_DEVICE=cuda`, `HUGGINGFACE_TOKEN`).
- [ ] Free-tier long-video gate: `FREE_MAX_SOURCE_SEC` in `pipeline/run.py` caps free-tier source length — confirm it's set sensibly for your free 60-min allocation.
- [ ] YouTube downloads on a clean server IP often need cookies — set `YTDLP_COOKIES` (file) or `YTDLP_COOKIES_FROM_BROWSER` to avoid "Sign in to confirm you're not a bot".
- [ ] (Optional) Email: set `RESEND_API_KEY` + `EMAIL_FROM`. Note the **email seam gap**: the "clips ready" email currently sends from `worker.py`, not the `run.py` API path — wire it on the API path if you want emails in production (tracked in `INTEGRATION.md` §7).

---

## 7. Domain, CORS & networking

- [ ] Point DNS: web → `app.yourdomain.com`, API → `api.yourdomain.com`. TLS on both.
- [ ] Set `API_PUBLIC_URL` (api) and `NEXT_PUBLIC_API_URL` (web) to the public API URL; rebuild web after changing `NEXT_PUBLIC_*` (build-time).
- [ ] **Tighten CORS.** `app/api/src/main.ts` currently calls `app.enableCors({ origin: '*' })`. Restrict it to your web origin(s) before launch, e.g. `origin: ['https://app.yourdomain.com']`.
- [ ] PayPal `PAYPAL_RETURN_URL`/`PAYPAL_CANCEL_URL` and the webhook URL all use the real domains.
- [ ] WebSocket path (`ws://…/ws` → `wss://…`) reachable through your proxy for live job progress.

---

## 8. Smoke test (run this exact sequence on the live deploy)

1. [ ] **Sign in with Google** on the web app → lands on the dashboard. (Clerk Google connection works.)
2. [ ] **Free credits granted** → the credits chip shows **60** min for the new org (free-tier grant from `plans.ts`).
3. [ ] **Create a clip** → paste a public YouTube URL (or upload a file), submit, job runs in the background, real clips appear with burned-in captions; credits debit by ~`ceil(source-minutes)`.
4. [ ] **Open `/help`** → the help center loads; the bottom "?" rail icon highlights; an article (e.g. *Getting started*) renders.
5. [ ] **Buy credits / subscribe in sandbox** → go to **Plans & credits**, upgrade Starter/Pro via PayPal sandbox; on return, balance/plan updates.
6. [ ] **Verify the grant** → credits/plan reflect the purchase; watermark/editing/retention gates change per the new plan (`plans.ts` capabilities).
7. [ ] **Failure refund** → submit an intentionally bad link; job fails and the debited credits are **refunded** (`refundForJob`).
8. [ ] Repeat step 5 against **live** PayPal with a real (small) purchase before opening signups.

---

## 9. Post-launch / known gaps

- [ ] **R2 upload + signed URLs** still to wire (INTEGRATION.md §2) — until then clips serve from local disk via `/files` (single-box only).
- [ ] **Monthly credit renewal** automation (cron or PayPal subscription webhook) — confirm chosen approach is running.
- [ ] **API-path email** seam (see §6).
- [ ] Tighten CORS (§7) and rotate any keys that were ever used in sandbox/dev.
- [ ] Confirm Opus's current public prices and keep ours at half (`plans.ts` + `app/web/src/app/(app)/billing/page.tsx`).

> **Stale-fact note:** `app/api/src/billing/plans.ts` is the single source of truth (free = **60**).
> The web billing page (`billing/page.tsx`) and `app/web/src/lib/api.ts` `MONTHLY_CREDITS` map
> still show **30** for free — reconcile these to 60 before launch so the UI matches the grant.
