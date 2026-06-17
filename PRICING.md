# FocalDive Clips — Pricing & Feasibility

_Positioning: **half of Opus Clip's price, the same monthly minutes.** Effectively
2× the value-per-dollar. Last updated 2026-06-17._

---

## 1. Opus Clip's pricing (verified, billed monthly, USD)

| Opus tier | $/mo | Source-minutes/mo | Notes |
|---|---|---|---|
| Free | $0 | 60 | Watermarked, 9:16 only, exports expire ~3 days |
| Starter | **$15** | 150 | Watermark-free |
| Pro | **$29** | 300 | 1080p, all aspect ratios, active-speaker reframe |
| Business | Custom (~$149) | Custom | 4K, API, team seats |

Opus **meters on source-minutes**: 1 credit = 1 minute of *input* video, regardless
of how many clips come out. (Upload a 60-min podcast → 60 credits spent.)
Sources: opus.pro/pricing, eesel.ai, fluxnote.io (Jun 2026). Annual prices and
per-tier resolution caps are **not reliably public** — do not hardcode them.

---

## 2. FocalDive pricing (half of Opus, same minutes)

| Our tier | $/mo | Source-minutes/mo | Value vs Opus |
|---|---|---|---|
| **Free** | **$0** | 30 | half of Opus's free 60 min |
| **Starter** | **$7.50** | 150 | **½ the price, same 150 min** |
| **Pro** | **$14.50** | 300 | **½ the price, same 300 min** |

- Unit identical to Opus: **1 credit = 1 source-minute**. `creditsForDuration =
  ceil(durationSec / 60)`.
- Same minute allocations at the paid tiers → **2× minutes-per-dollar** is the headline.
- Free is intentionally 30 (half of Opus's 60) to keep the "half" theme and bound
  free-tier compute. Bump to 60 if you want to free-match.

These numbers live in **two places** (keep them in sync):
- `app/api/src/billing/plans.ts` → `PLANS[*].priceUsd` and `monthlyCredits`
- `app/web/src/app/(app)/billing/page.tsx` → the `PLANS` array

---

## 3. Is it feasible? (unit economics on the free/CPU stack)

Our pipeline runs on cheap/free infra, so the gross margin at half-Opus pricing is
healthy. Per **source-minute** processed (the metered unit):

| Cost item | Provider | ~Cost / source-min | Notes |
|---|---|---|---|
| Transcription | Groq Whisper-large-v3 | ~**$0.0007–0.002** | Groq bills ~$0.04/hr audio → ≈$0.0007/min; effectively free at low volume |
| Clip scoring | Gemini 2.x Flash (free tier) | ~**$0** | Free tier covers MVP volume; paid Flash is ~$0.0001–0.001 per video |
| Reframe + captions encode | libx264 on CPU (your box / a cheap VPS) | ~**$0.001–0.005** | CPU time only; no GPU, no per-call fee |
| Ingest (yt-dlp) | — | ~$0 | bandwidth only |
| Storage/egress (clips) | Cloudflare R2 | ~**$0.0001–0.001** | R2 has **zero egress fees**; ~$0.015/GB-mo stored |
| **Total variable cost** | | **≈ $0.005–0.01 / source-minute** | order-of-magnitude |

**Revenue per source-minute:**
- Starter: $7.50 / 150 min = **$0.05 / min**
- Pro: $14.50 / 300 min = **$0.048 / min**

**Gross margin ≈ 80–90%** even at half Opus's price, because the stack is CPU/free-tier.
The real costs that erode this at scale are **CPU render time** (a 4090/NVENC box
speeds it up but adds fixed cost) and **support/dev**, not per-minute API spend.

### Caveats / what to watch
- **Free tier is the loss leader.** 30 free min/mo × many signups = CPU time with no
  revenue. The 30-min cap + 3-day export expiry (like Opus) bounds this.
- **Groq/Gemini free-tier rate limits** will throttle at volume → budget for paid
  tiers (~$0.001/min) before promoting heavily. Margin still >80%.
- **Render speed, not cost, is the bottleneck** on CPU. A single CPU box serializes
  jobs; add a GPU worker (RunPod 4090, ~$0.40/hr spot) when the queue backs up — at
  that point cost/min rises to ~$0.02 but margin is still ~60%.
- **PayPal fees:** ~2.9% + $0.30 per transaction. On a $7.50 charge that's ~$0.52
  (7%); on $14.50 ~$0.72 (5%). Acceptable; factored into the >80% gross above only
  loosely — net margin after PayPal ≈ 75–85%.

**Verdict: feasible.** Half-Opus pricing with the same minutes is sustainable on the
free/CPU stack at MVP scale, with 75–85% net margin. Revisit once a GPU worker is
needed (still profitable).

---

## 4. How credits are charged (already implemented)

1. **On job submit** — the API debits `ceil(sourceMinutes)` credits
   (`BillingService.debitForJob`). Insufficient credits → 400 with a clear message.
2. **On job failure** — credits are **refunded** (`refundForJob`, wired in the queue).
3. **On successful PayPal capture** — the plan's `monthlyCredits` are granted
   (`grantMonthly`) and the org's plan is set.
4. **Balance** — `GET /billing/balance` → `{ plan, creditBalance }`; the web shows
   it in the top-bar chip + the `/billing` page bar.

To enforce the free-tier long-video gate, the pipeline already raises
`video_too_long` past `FREE_MAX_SOURCE_SEC` — keep that aligned with the free 30-min
allocation.

---

## 5. To go live

- Set `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` (and `PAYPAL_BASE_URL` for live) — see
  `INTEGRATION.md`. Until then, the demo grants credits locally so the flow is testable.
- Confirm Opus's current prices before launch (they change); keep ours at half.
- Decide free-tier minutes (30 vs 60) based on signup volume vs CPU budget.
