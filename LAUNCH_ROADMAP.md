# FocalDive Clips (clipshq.pro) — Launch Roadmap & Economics

**Purpose:** a plain-English guide to how the project uses AI APIs today, what the
free tiers actually give you, how to launch on free keys with rotation +
alerting, and a restructured credits/pricing model you can grow into. Read top to
bottom — no prior context needed.

---

## 1. What the project actually uses (the truth, from the code)

Your pipeline turns one long video into ranked, captioned vertical clips. Two paid
AI services are involved, **once per job each**:

| Stage | Service | Model (in your `.env`) | Calls per job | What it does |
|---|---|---|---|---|
| Transcribe | **Groq** (Speech-to-Text) | `whisper-large-v3` | **1** | audio → text with word timestamps |
| Score clips | **Google Gemini** | `gemini-2.5-flash-lite` | **1** | picks the best viral moments |
| Everything else | — | ffmpeg / MediaPipe (local, free) | 0 | cut, reframe, caption — no API |

> **Important:** the Groq **text** models you found on the web (Llama 3.1/3.3,
> Qwen 3, GPT-OSS) are **NOT used** by this project. You only use Groq's
> **Whisper** (speech-to-text). Scoring runs on **Gemini**, not Groq. So the only
> Groq limit that matters to you is the **Whisper** row:
>
> **Whisper Large V3 — RPM 20, RPD 2,000** (requests per minute / per day).

The free tools on the site (`/tools/*` — transcript, subtitles, hashtags, tags)
use **yt-dlp only** (a video's own captions). **They cost $0 and use no API keys.**
Only the "Create clips" product touches Groq + Gemini.

### The one-line economics
> **1 clip job ≈ 1 Groq Whisper request + 1 Gemini request.**
> Job count — not video length — is what burns your daily request quota.

---

## 2. What a free Groq key really gives you

From Groq's free tier for `whisper-large-v3`:

- **RPD 2,000** = up to **2,000 transcriptions per key per day** (the real ceiling).
- **RPM 20** = max 20 per minute (bursty spikes; the queue smooths this).
- Upload cap ≈ **25 MB** mono-mp3 ≈ **~50 minutes** of audio per request.

**So one free Groq key ≈ up to ~2,000 clip-jobs/day** (assuming Gemini keeps up —
see below). That is a *lot* of runway for launch. The RPM 20 limit is the thing
you'll actually hit first during a spike, which is exactly why the launch needs a
**job queue** (Section 5).

### Gemini free tier (the other half)
`gemini-2.5-flash-lite` free tier is roughly **~15 RPM / ~1,000 requests per day**
per key (Google's limits move; verify in [AI Studio](https://aistudio.google.com)).
Since scoring is also 1 call/job, **Gemini's ~1,000/day is likely your *lower*
ceiling** — you'll exhaust Gemini before Groq. Plan key rotation for **both**.

### Realistic combined free capacity (per pair of keys)
| Keys | Rough safe daily jobs | Notes |
|---|---|---|
| 1 Groq + 1 Gemini | ~800–1,000 jobs/day | Gemini's ~1k/day is the limiter |
| 3 Groq + 3 Gemini | ~2,500–3,000 jobs/day | rotate on 429 |
| 5 Groq + 5 Gemini | ~5,000 jobs/day | more than enough to launch |

At launch you will **not** be near these numbers. A few free keys carry you for
months. You only spend money when volume (or a paying customer's SLA) demands it.

---

## 3. Your plan, stated back clearly

> "Create multiple API keys from various emails, rotate them, alert me when limits
> hit, and only spend money once users purchase."

This is a sound bootstrap strategy. To make it real you need **three things the
project does NOT have yet** (they're the build items in Section 5):

1. **Multi-key rotation** — today the code reads a *single* `GROQ_API_KEY` /
   `GEMINI_API_KEY`. It must read a *list* and rotate to the next key on a
   429/quota error.
2. **A job queue** — so a traffic spike doesn't blow past RPM 20 and fail jobs;
   jobs wait their turn instead of erroring.
3. **Usage tracking + alerts** — count requests per key per day, and ping you
   (email/Telegram/Slack) at 80% and 100% of a key's daily budget.

> ⚠️ **One honest caveat.** Rotating keys made from many personal emails to extend
> a single product's free tier is **against Groq's and Google's terms of service**
> and can get keys/accounts banned. It's fine for *testing and a soft launch*, but
> treat it as a **bridge, not the business**. The moment you have revenue, move
> real traffic to one paid key (Groq pay-as-you-go is cheap — Section 6) and keep
> rotation only as an overflow/backup. The credits system (Section 7) is what makes
> that switch painless.

---

## 4. Launch roadmap (phased, in order)

### Phase 0 — Pre-flight (before any traffic) ✅ mostly done
- [x] Free tools live + SEO (transcript/subtitles/hashtags/tags, sitemap, schema).
- [x] `clipshq.pro` wired into all SEO output.
- [ ] Point `clipshq.pro` DNS at the host; get HTTPS (Caddy/Cloudflare/Vercel).
- [ ] Set production env: `NEXT_PUBLIC_SITE_URL=https://clipshq.pro`,
      `AUTH_URL=https://clipshq.pro`, real `NEXT_PUBLIC_API_URL`.
- [ ] Google OAuth redirect URI → `https://clipshq.pro/api/auth/callback/google`.
- [ ] Turn **waitlist mode ON** (admin → System) to collect emails pre-launch.

### Phase 1 — Soft launch on free keys (weeks 1–4)
- [ ] Build **multi-key rotation** for Groq + Gemini (Section 5.1).
- [ ] Build **usage tracking + alerts** (Section 5.3) — this is your "alert me".
- [ ] Create **3× Groq keys + 3× Gemini keys** on separate accounts; load as lists.
- [ ] Keep the **queue** single-concurrency (already effectively the case — the API
      runs one in-process worker) so you never exceed RPM 20.
- [ ] Waitlist OFF, invite waitlist in small batches. Watch the alerts.

### Phase 2 — Enable payments (when demand appears)
- [ ] Polar.sh is already integrated — set `POLAR_ACCESS_TOKEN` to **production**,
      `POLAR_MODE=production`, `POLAR_BASE_URL=https://api.polar.sh`, and set
      `POLAR_WEBHOOK_SECRET` (+ a public webhook URL/tunnel) so credits grant on
      real payments.
- [ ] Restructure credits/pricing per Section 7.
- [ ] First paying customer = your signal to buy a **paid Groq key** and route paid
      users through it (free users stay on rotated free keys).

### Phase 3 — Scale (only if it's working)
- [ ] Move to a real Redis/BullMQ queue + multiple workers (the code is built for
      this; `REDIS_URL` is intentionally unset today).
- [ ] Add the 20-min audio chunking (already scoped in `transcribe.py`) so >50-min
      videos work — a paid-tier feature.

---

## 5. What to build (the 3 missing pieces) — with where they go

### 5.1 Multi-key rotation
**Today:** `pipeline/config.py` exposes one `groq_api_key` / `gemini_api_key`.
**Change:** accept a comma-separated list and rotate on quota errors.

- `.env`:
  ```
  GROQ_API_KEYS=key1,key2,key3        # new (plural); falls back to GROQ_API_KEY
  GEMINI_API_KEYS=key1,key2,key3      # new (plural); falls back to GEMINI_API_KEY
  ```
- In `transcribe.py` (Groq) and `score_clips.py` (Gemini): on a 429 / quota /
  "resource exhausted" error, advance to the next key and retry, instead of
  failing. The existing `_GROQ_RETRY_BACKOFFS` retry loop is the hook — extend it
  to "try next key" before giving up.
- Persist a tiny per-key daily counter so rotation prefers keys with budget left
  (see 5.3) rather than blindly cycling.

**Effort:** ~half a day. This is the highest-value launch item.

### 5.2 Job queue (protect RPM 20)
- Today the API runs **one in-process worker** (jobs already effectively serialize),
  which naturally keeps you under RPM 20. Good enough for soft launch.
- For Phase 3, flip on Redis/BullMQ (`REDIS_URL`) and run N workers, with a
  **global rate-limit** of ≤ (keys × 20) RPM so you never exceed the pooled quota.

### 5.3 Usage tracking + alerts ("alert me when limits hit")
- Add a small `api_usage` table (or in-memory counter for MVP): `{provider, key_id,
  date, count}`, incremented on every Groq/Gemini call.
- A budget per key (e.g. Groq 1,800/day = 90% of 2,000; Gemini 900/day).
- When a key crosses **80%** and **100%**, send an alert. Cheapest channels:
  - **Telegram bot** (free, instant) — recommended.
  - **Email via Resend** (already integrable in the project).
  - **Slack/Discord webhook**.
- Surface the same counters in the **admin dashboard** (a "API usage" card next to
  the existing System page) so you can eyeball remaining budget.

**Effort:** ~half a day for counters + one alert channel.

---

## 6. What it costs when you DO pay (so you can price sanely)

Rough public pay-as-you-go rates (verify at launch — they change):

| Service | Unit | ~Price | Per clip-job* |
|---|---|---|---|
| Groq Whisper v3 | per hour of audio | ~$0.04/hr (turbo cheaper) | ~$0.007 for a 10-min video |
| Gemini 2.5 Flash-Lite | per 1M tokens | ~$0.10 in / ~$0.40 out | ~$0.001–0.003 |
| **Total AI cost per job** | | | **≈ $0.01–0.02** |

\* A "job" here = one ~10-minute source video.

**Plus non-AI cost:** CPU time for ffmpeg/reframe/captions (your server or a
RunPod GPU box) and bandwidth. On a cheap VPS this is fractions of a cent of
compute per short clip; the AI cost above dominates and is tiny.

### The headline
> **Your marginal cost per clip job is roughly 1–2 US cents.** Even a $5 plan with
> 100 jobs costs you ~$1–2 in AI. Margins are healthy — which is why free-key
> rotation is a *bridge*, not a necessity, once you have any revenue.

---

## 7. Restructured credits & pricing (grow-into model)

### 7.1 The credit unit — keep it, but make it honest
Today: **1 credit = 1 source-minute.** That's clean and matches Opus. Keep it.
A 10-minute video = 10 credits. This maps *loosely* to cost (longer audio = more
Groq seconds), so it's fair to users and safe for you.

### 7.2 Recommended tiers (v1 at launch)
Prices below are examples — tune to your market. Cost column assumes ~$0.02/job
and an average 10-min video (10 credits/job).

| Plan | Price/mo | Credits (source-min) | ≈ Jobs (10-min avg) | Your AI cost | Gross margin |
|---|---|---|---|---|---|
| **Free** | $0 | 30 | ~3 | ~$0.06 | loss-leader (watermark, 3-day expiry) |
| **Starter** | $9 | 120 | ~12 | ~$0.24 | ~97% |
| **Pro** | $19 | 300 | ~30 | ~$0.60 | ~97% |
| **Studio** | $39 | 800 | ~80 | ~$1.60 | ~96% |

Notes:
- **Lower the free grant from 60 → 30** source-minutes. 60 free min/mo is generous
  and, at scale on rotated free keys, is exactly what drains your quota with zero
  revenue. 30 min (≈ 3 videos) still lets people try it and convert.
- Free stays **watermarked + 3-day clip expiry + no editor** (already coded via
  plan capabilities) — the upgrade nudges.
- These are edited in **one place**: `app/api/src/billing/plans.ts` (`PLANS`), and
  the admin dashboard can also edit plan rows live. Changing a number there updates
  the whole app (auth grant, billing, web pricing).

### 7.3 One-off credit packs (optional, high-margin)
For users who don't want a subscription — pure profit, and they map perfectly to
"only spend when they pay":

| Pack | Price | Credits | ≈ Jobs |
|---|---|---|---|
| Small | $5 | 60 | ~6 |
| Medium | $12 | 180 | ~18 |
| Large | $25 | 450 | ~45 |

### 7.4 The rule that protects you
> **Never let a free user consume more AI than a rotated key can absorb.** The
> credit grant *is* that guardrail: free = 30 credits = ~3 jobs = ~3 Groq + 3
> Gemini calls per user per month. 1,000 free users = ~3,000 jobs/mo — comfortably
> inside a few rotated keys. Paying users get more credits *and* (Phase 2+) run on
> the paid key, so their usage is already funded.

---

## 8. Launch-day checklist (tick these in order)

1. [ ] DNS + HTTPS for `clipshq.pro`; prod env vars set (Phase 0).
2. [ ] Multi-key rotation live for Groq + Gemini (5.1).
3. [ ] Usage counters + one alert channel wired (5.3).
4. [ ] 3× Groq + 3× Gemini free keys loaded as lists.
5. [ ] Credits restructured in `plans.ts` (free 30; Starter/Pro/Studio) (7.2).
6. [ ] Polar in **production** mode + webhook secret set (Phase 2) — can defer
       until the first buyer, but wire it before announcing paid plans.
7. [ ] Waitlist ON → collect emails → invite in batches, watch alerts.
8. [ ] Submit `sitemap.xml` to Google Search Console + Bing Webmaster.
9. [ ] First payment received → buy a paid Groq key, route paid users to it.

---

## 9. TL;DR

- You use **Groq Whisper** (1 call/job) + **Gemini Flash-Lite** (1 call/job). The
  Groq *text* models you saw don't apply.
- One free key ≈ up to ~1–2k jobs/day; **Gemini's ~1k/day is your real ceiling** —
  rotate **both**.
- Free tools (`/tools/*`) cost **$0** (yt-dlp), so they can scale organic traffic
  freely — that's your top-of-funnel.
- Build **3 things** to launch on free keys: **key rotation**, **usage alerts**,
  and lean on the existing **single-worker queue**.
- Real cost is **~1–2¢/job** → margins are ~97%. Free-key rotation is a **bridge**;
  switch paid traffic to a paid key on your first sale.
- Cut the **free grant to 30 credits**, add **Starter/Pro/Studio + one-off packs**,
  all editable in `app/api/src/billing/plans.ts`.
- Key rotation across many personal-email accounts **violates provider ToS** — fine
  to bootstrap, but plan to graduate off it as revenue arrives.
