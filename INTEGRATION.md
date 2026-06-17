# FocalDive Clips — Integration & Go-Live Guide

_How to connect the real services (Cloudflare R2, Groq, Gemini, Resend, PayPal),
how credit tracking works, and what to flip on for production. Everything works in
**mock mode** with no keys — this guide is for taking it live._

---

## 0. The mock-first principle

Every paid/external dependency has a **mock fallback** that activates when its keys
are absent, so you can develop and demo with zero accounts:

| Service | Mock when… | Real when… |
|---|---|---|
| Scoring (Gemini) | no `GEMINI_API_KEY` | key set → `SCORING_PROVIDER=gemini` |
| Transcription (Groq) | no `GROQ_API_KEY` | key set → `TRANSCRIBE_BACKEND=groq` |
| Email (Resend) | no `RESEND_API_KEY` | key set (logs to console otherwise) |
| Payments (PayPal) | no `PAYPAL_CLIENT_ID` | keys set |
| Storage (R2) | no `R2_*` (uses local `workspace/`) | keys set (code: see §2) |
| Auth (Clerk) | `MOCK_AUTH=true` / no keys | Clerk keys set |
| Web → API | no `NEXT_PUBLIC_API_URL` (in-app mock store) | URL set → real NestJS API |

So "going live" = filling in `.env` keys, plus the **one piece of code still to wire:
R2 upload** (§2). Pipeline `.env` lives at repo root; API `.env` at `app/api/.env`;
web at `app/web/.env.local`.

---

## 1. AI APIs (Groq + Gemini) — already wired, just add keys

These are fully implemented; set the keys and the pipeline uses them automatically.

```bash
# repo-root .env  (the Python pipeline reads this)
GROQ_API_KEY=gsk_...            # https://console.groq.com/keys
GROQ_MODEL=whisper-large-v3
TRANSCRIBE_BACKEND=groq         # else "mock"

GEMINI_API_KEY=AIza...          # https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-2.5-flash
SCORING_PROVIDER=gemini         # "gemini" | "openai" | "mock"

FFMPEG_PATH=ffmpeg              # full path on Windows if not on PATH
FFPROBE_PATH=ffprobe
```

- **Groq** (transcription): free tier is generous; ~$0.04/audio-hour paid. Whisper-large-v3.
- **Gemini** (clip scoring): free tier covers MVP. Flash-lite is the cheap workhorse.
- **No code change needed** — `config.py` auto-detects keys and flips off `MOCK_MODE`.
- Cookies for gated videos (private/age-gated YouTube, Instagram, TikTok):
  `YTDLP_COOKIES_FROM_BROWSER=chrome` (or `edge`/`firefox`) reuses a logged-in browser.

---

## 2. Cloudflare R2 (artifact storage) — the one piece to wire

**Today:** clip artifacts (`{n}_final.mp4`, `{n}_thumb.jpg`) live in the local
`workspace/{job_id}/clips/` and are served by the API's `files.controller.ts`. This
works for a single box. For production you want them in **R2** (zero egress fees,
S3-compatible, ~$0.015/GB-mo) with **signed URLs** the browser can fetch directly.

### Get R2 credentials
1. Cloudflare dashboard → **R2** → create a bucket (e.g. `focaldive-clips`).
2. **R2 → Manage API Tokens** → create an S3 token → note the **Access Key ID**,
   **Secret**, and your **Account ID** (the endpoint is
   `https://<accountid>.r2.cloudflarestorage.com`).

```bash
# app/api/.env
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=focaldive-clips
R2_PUBLIC_BASE=                  # optional: a custom domain / r2.dev public URL
```

### Wire the code (the remaining work — ~half a day)
R2 is S3-compatible, so use the AWS SDK v3 S3 client (already a small dep, or add
`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`):

1. **Worker upload** (`app/api/src/queue/real-pipeline.worker.ts`): after `run.py`
   produces clips in the workspace, `PutObject` each `{n}_final.mp4` / `{n}_thumb.jpg`
   to R2 under `clips/{jobId}/{n}_final.mp4`, and record the **R2 key** on the clip.
2. **Signed URLs** (`app/api/src/clips/clips.controller.ts`): replace the local
   `files`-based `final_url`/`thumb_url` with `getSignedUrl(...)` (presigned GET,
   ~1h TTL). The web already treats these as opaque URLs — no web change.
3. **Uploads in** (`app/api/src/uploads/uploads.controller.ts`): for large source
   files, switch from saving to the local workspace to a presigned **PUT** so the
   browser uploads straight to R2; the worker then reads the source from R2.

Until this is wired, the local-workspace path is the fallback and the app fully works.
The clip/job records already carry key fields where the signed URL would attach.

---

## 3. PayPal payments — sandbox-ready, wired

Payments use **PayPal Orders v2** (plain REST, no SDK). The whole flow works in mock
mode (no keys → upgrade grants credits locally so you can test the UI).

### Get PayPal credentials
1. https://developer.paypal.com → **Apps & Credentials** → create an app.
2. **Sandbox** for testing (fake buyer accounts), **Live** for production.

```bash
# app/api/.env
PAYPAL_CLIENT_ID=...
PAYPAL_SECRET=...
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com   # live: https://api-m.paypal.com
PAYPAL_MODE=sandbox                                # "sandbox" | "live"
PAYPAL_RETURN_URL=http://localhost:3000/billing?ok=1
PAYPAL_CANCEL_URL=http://localhost:3000/billing?canceled=1
```

### The flow (already implemented)
- `POST /billing/checkout {tier}` → **createOrder**: gets an OAuth token, creates a
  PayPal order for `priceUsd`, `custom_id = "<orgId>:<tier>"`, returns the **approve URL**.
- Web redirects the user to PayPal (real mode) — on return, `POST /billing/capture
  {orderId}` → **captureOrder** → on `COMPLETED`, `grantMonthly()` adds the credits.
- `POST /billing/webhook` (PayPal `PAYMENT.CAPTURE.COMPLETED`) is a secondary grant
  path via `custom_id`.
- **Mock mode** (no keys): createOrder returns a local URL with an `orderId`
  encoding `org:tier`; the web immediately captures it → credits granted, balance bar
  moves. Lets you demo the whole purchase without PayPal.

### To finish for production
- **Webhook signature verification** is currently lenient (it grants on a valid
  payload but does not yet verify PayPal's `Paypal-Transmission-*` signature). Add
  verification (PayPal `/v1/notifications/verify-webhook-signature`) before relying
  on the webhook as the sole grant path. The **capture endpoint is the primary, safe
  path** — it only grants on a real PayPal `COMPLETED` capture.
- Set the live `PAYPAL_BASE_URL` + live app credentials.

---

## 4. Credit tracking — how it works (already complete)

**Unit: 1 credit = 1 source-minute** (`BillingService.creditsForDuration =
ceil(durationSec/60)`). See `PRICING.md` for the plan grants.

| Event | What happens | Code |
|---|---|---|
| Job submit | debit `ceil(min)` credits; 400 if insufficient | `debitForJob` |
| Job fails | refund those credits | `refundForJob` (queue) |
| PayPal capture | grant plan's `monthlyCredits`, set plan | `grantMonthly` |
| Balance read | `{ plan, creditBalance }` | `GET /billing/balance` |

- Balances persist via the **DataStore** — Prisma(Postgres) in prod, in-memory in
  dev (both implement `addCredits` with a ledger reason: debit/refund/grant).
- The free-tier long-video gate (`FREE_MAX_SOURCE_SEC` in the pipeline) should match
  the free plan's 30-min allocation.
- Web surfaces it: the **top-bar chip** (`CreditsChip` → `api.getBalance()`) and the
  **/billing** page bar.

**Renewals:** monthly credit reset on subscription renewal is **not yet automated** —
PayPal Orders v2 is one-time; for recurring monthly grants either (a) use PayPal
**Subscriptions** API + the webhook to re-grant on each cycle, or (b) run a monthly
cron that re-grants `monthlyCredits` to each active plan. Pick one before launch.

---

## 5. Database (Postgres via Prisma)

```bash
# app/api/.env
DATABASE_URL=postgresql://user:pass@host:5432/focaldive
USE_PRISMA=true        # else the in-memory store (dev/demo)
```
Run `npx prisma migrate deploy` in `app/api`. Without `DATABASE_URL` the in-memory
store is used — fine for dev, **not** for production (data is lost on restart).

---

## 6. Wiring the web to the real API

```bash
# app/web/.env.local
NEXT_PUBLIC_API_URL=https://api.yourdomain.com   # unset = in-app mock store
```
`NEXT_PUBLIC_*` is **build-time** — rebuild (`next build`) after changing it. With it
unset, the whole app runs on the offline mock store (great for demos/screenshots).

---

## 7. Go-live checklist

- [ ] `GROQ_API_KEY` + `GEMINI_API_KEY` set (pipeline `.env`)
- [ ] `PAYPAL_CLIENT_ID/SECRET` (start sandbox) + return/cancel URLs
- [ ] **Wire R2 upload + signed URLs** (§2) — the one remaining code piece
- [ ] `DATABASE_URL` + `USE_PRISMA=true` + `prisma migrate deploy`
- [ ] Clerk keys (or keep `MOCK_AUTH` for a closed beta)
- [ ] `RESEND_API_KEY` for clip-ready emails (and wire the API-path email seam — it
      currently sends only via `worker.py`, not the `run.py` API path)
- [ ] `NEXT_PUBLIC_API_URL` on the web build
- [ ] PayPal **webhook signature verification** + a **monthly credit renewal** job
- [ ] Confirm Opus's current prices; keep ours at half (`plans.ts` + billing page)

The product runs end-to-end **today** in mock mode; this list turns each mock into
its real counterpart.
