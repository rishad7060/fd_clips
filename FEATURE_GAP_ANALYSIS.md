# FocalDive Clips — Feature Gap Analysis vs Opus.pro & Other Platforms

_Long-video → short-clip platforms compared. This is the honest "what we're
missing" list, grouped so you can prioritise. Status legend:_
**✅ have** · **🟡 partial / basic** · **❌ missing**

Reference competitors: **Opus.pro** (OpusClip), **Vizard**, **Klap**,
**Submagic** (captions-first), **Munch**, **2Short**, **Spikes Studio**,
**Veed / Descript** (editor-first).

---

## 1. Ingestion & sources

| Feature | Opus & others | FocalDive | Notes |
|---|---|---|---|
| YouTube URL | ✅ all | ✅ | yt-dlp, hardened |
| File upload (mp4/mov) | ✅ all | ❌ | DTO/R2 staging stubbed; cut from MVP |
| Google Drive / Dropbox import | ✅ Opus, Vizard | ❌ | |
| Zoom / Riverside / StreamYard | ✅ Opus, Vizard | ❌ | recording integrations |
| Twitch / TikTok / Vimeo / Rumble URL | ✅ most | 🟡 | yt-dlp supports many; untested |
| Podcast RSS / audio-only + auto B-roll | ✅ Vizard, Munch | ❌ | audio→video shorts |
| Live-stream / long-VOD chunking | ✅ Opus | 🟡 | pipeline chunks transcribe; no UX |
| Batch / bulk upload | ✅ Opus, Vizard | ❌ | one URL at a time |

## 2. Clip selection (the core IP)

| Feature | Opus & others | FocalDive | Notes |
|---|---|---|---|
| AI moment detection | ✅ all | ✅ | Gemini/GPT vs rubric |
| Virality score per clip | ✅ Opus ("virality score") | ✅ | 0–100 |
| Hook / title / reason | ✅ Opus | ✅ | |
| Choose # clips | ✅ all | 🟡 | fixed at 3 (MVP); UI slider stubbed |
| Choose clip length range | ✅ all (15/30/60/90s) | ❌ | hardcoded 20–60s |
| Keyword / topic targeting | ✅ Opus, Vizard | ❌ | "find clips about X" |
| Manual moment selection (pick your own timestamp) | ✅ Opus, Veed | ❌ | |
| "ClipAnything" — clip any visual/action, not just speech | ✅ Opus | ❌ | needs vision model |
| Multi-language scoring | ✅ most | 🟡 | works; not tuned per-lang |

## 3. Reframing / vertical crop

| Feature | Opus & others | FocalDive | Notes |
|---|---|---|---|
| Auto 9:16 vertical | ✅ all | ✅ | |
| Face-centered crop | ✅ all | ✅ | MediaPipe, per-shot follow |
| **Active-speaker tracking** (cut to whoever talks) | ✅ Opus, Vizard | ❌ | **biggest gap** — needs LR-ASD; MediaPipe can't see the off-cam speaker. We blur-pad two-shots instead |
| Multi-person "auto-layout" (split/stacked speakers) | ✅ Opus, Vizard | ❌ | speaker-grid layouts |
| Scene-cut aware reframe | ✅ Opus | 🟡 | frame-diff cuts; basic |
| Smooth virtual-camera pan (no jitter) | ✅ Opus | 🟡 | windowed, snaps at cuts; not continuous |
| Multiple aspect ratios (1:1, 4:5, 16:9 out) | ✅ all | ❌ | 9:16 only |
| Blur-pad / fit fallback for wide shots | ✅ all | ✅ | just added |
| Manual reframe / reposition crop | ✅ Opus, Veed | ❌ | |

## 4. Captions

| Feature | Opus & others | FocalDive | Notes |
|---|---|---|---|
| Auto word-by-word karaoke | ✅ all | ✅ | ASS \k |
| Multiple templates | ✅ all (10–30+) | 🟡 | 4 templates |
| Bold / big / uppercase styles | ✅ all | ✅ | Hormozi default |
| User font / size / colour / position | ✅ all | ✅ | template, highlight colour, align, size |
| Auto-fit (no overflow) | ✅ all | ✅ | width-wrap + per-line shrink |
| Emoji auto-insert | ✅ Submagic, Opus | 🟡 | curated keyword bank, 1/line |
| Animated word effects (pop, bounce, slide) | ✅ Submagic, Opus | ❌ | static highlight only |
| Auto-highlight keywords (color/scale per word) | ✅ Submagic | 🟡 | emphasis words only |
| Custom fonts upload / brand fonts | ✅ Opus, Veed | ❌ | system fonts |
| RTL (Arabic/Urdu) | 🟡 some | ✅ | our differentiator for the niche |
| Edit caption text after generation | ✅ all | 🟡 | re-render endpoint exists; editor UI minimal |
| Censor / profanity bleep | ✅ Opus, Veed | ❌ | |

## 5. Editing & enhancement

| Feature | Opus & others | FocalDive | Notes |
|---|---|---|---|
| Timeline trim per clip | ✅ all | 🟡 | endpoint stub, no UI |
| Re-order / merge clips | ✅ Veed, Descript | ❌ | |
| B-roll / stock footage auto-insert | ✅ Opus, Munch, Vizard | ❌ | |
| Background music / audio ducking | ✅ Opus, Vizard | ❌ | |
| Auto-remove filler words / silences | ✅ Descript, Vizard | ❌ | |
| Intro/outro, logo, watermark, progress bar | ✅ Opus, Vizard | 🟡 | free-tier watermark planned |
| Brand kit (logo/colours/fonts presets) | ✅ Opus, Veed | ❌ | |
| AI B-roll / AI image generation | ✅ Munch, Klap | ❌ | |
| Screen-share layout / talking-head overlay | ✅ Veed, Opus | ❌ | |

## 6. Output, publishing & growth

| Feature | Opus & others | FocalDive | Notes |
|---|---|---|---|
| Download MP4 | ✅ all | ✅ | |
| Per-clip thumbnail | ✅ all | ✅ | |
| AI caption/hashtag/description for posting | ✅ Opus, Vizard | ❌ | social copy gen |
| Direct publish to TikTok/Reels/Shorts | ✅ Opus, Vizard | ❌ | OAuth posting |
| Schedule / calendar | ✅ Opus, Vizard | ❌ | |
| Analytics (views, retention) | ✅ Opus, Spikes | ❌ | |
| A/B hook testing | ✅ Spikes | ❌ | |
| Team workspaces / collaboration | ✅ Opus, Veed | ❌ | org model exists; no team UI |
| API / white-label | ✅ Opus, Vizard | ❌ | Phase 3 roadmap |

## 7. Platform / account

| Feature | Opus & others | FocalDive | Notes |
|---|---|---|---|
| Auth | ✅ all | ✅ | Clerk (+mock) |
| Credit / subscription billing | ✅ all | ✅ | Stripe + credit ledger |
| Live progress while processing | ✅ all | ✅ | WebSocket + progress page |
| Email notification when done | ✅ most | 🟡 | Resend in worker.py; API path doesn't trigger it yet (see CLAUDE notes) |
| Project history / gallery | ✅ all | ✅ | dashboard |
| Speed | seconds–minutes (GPU) | 🟡 | CPU = ~10–30 min/video |
| Resolution / quality | up to source | 🟡 | ingest pulls ≤720p (often 360p → soft) |

---

## The honest top-5 gaps that matter most for "feels like Opus"

1. **Active-speaker tracking** — the #1 visible difference on multi-person
   content. Opus cuts to whoever's talking; we follow the biggest detectable
   face and blur-pad two-shots. Needs **LR-ASD** (Phase 2, GPU).
2. **Source resolution / render quality** — we ingest ≤720p (often 360p) and
   CPU-encode; output looks softer than Opus. Raise yt-dlp target + (later) GPU
   NVENC.
3. **Animated captions** (pop/bounce/keyword scale) — Submagic/Opus look more
   "alive"; ours is a clean static karaoke highlight.
4. **Editing UI** (trim, caption-edit, re-render) — endpoints exist but the
   editor screen is minimal; users can't tweak a clip.
5. **Publishing & social copy** (auto hashtags/description, direct post,
   schedule, analytics) — entirely absent; this is where Opus/Vizard retain users.

## What we already do as well or better

- **RTL captions** (Arabic/Urdu/Farsi) — a genuine edge for the GCC/regional
  niche; most Western tools handle this poorly.
- **$0 fixed cost** architecture — every paid/GPU path has a free fallback.
- **Auto-fit captions** and **blur-pad wide-shot** handling are on par with the
  incumbents.

> Phasing: the roadmap (`fd_clips_v2.md` Part 5, `FocalDive_Clips_Complete_Roadmap.md`
> Part 4) already maps most of these as revenue-triggered upgrades. This file is
> the scoreboard to prioritise against.

---

# GO-TO-MARKET NOW: what to spend immediately to compete & launch

_The point of the MVP was $0 fixed cost. That gets you **validating**, not_
_**competing**. This section is the honest "what you must pay for NOW" to ship a_
_product people compare to Opus and pay for — with the exact tool and price._

## A. What "$0 stack" actually costs you in quality (why you can't stay free)

| Free choice today | The hidden cost | Felt by the customer as |
|---|---|---|
| CPU libx264 render on VPS | 10–30 min/video, 1 video ties up the box | "Opus did it in 2 min, yours took 25" |
| yt-dlp ≤720p (often 360p) | soft, upscaled clips | "looks low quality / blurry" |
| MediaPipe face crop (no LR-ASD) | wrong/edge framing on 2-person | "it cut the other person out" |
| Groq/Gemini free tiers | rate-limited; jobs queue/stall at volume | "stuck processing" |

You can launch on free to get your **first 10 testimonials**. To **charge and
retain**, you need the paid pieces below.

## B. The IMMEDIATE spend (Tier 0 → launch & charge) — ~$50–90/mo + ~$0.10–0.30/video

Buy these the week you turn on Stripe. Everything is variable/cheap and pays for
itself from the first paid video.

| # | Need it fixes | Tool to buy | Price | Why this one |
|---|---|---|---|---|
| 1 | **Speed + quality render** | **RunPod Serverless 4090** (Flex, scale-to-zero) | ~$0.00069/s ≈ **$0.05–0.20/video**, **$0 idle** | Same Docker image as the CPU worker; NVENC + GPU = minutes not 30 min. The single biggest "feels like Opus" lever. |
| 2 | **Transcription at volume** | **Groq paid** OR self-host **faster-whisper** on the RunPod GPU | Groq ~**$0.04/hr audio**; self-host = GPU time only | Removes the free-tier rate limit that stalls jobs. |
| 3 | **Clip scoring at volume** | **Gemini 2.5 Flash paid** (or GPT-4o-mini) | ~**$0.005–0.015/video** | Removes free daily-quota cap. |
| 4 | **Sharper input** | _code change, $0_ — raise yt-dlp target to **≥1080p** in `ingest.py` | $0 | Stop shipping 360p. Do this first; it's free. |
| 5 | **Commercial frontend** | **Vercel Pro** | **$20/mo** | Hobby tier ToS forbids commercial use the moment you charge. |
| 6 | **Managed DB (reliability)** | **Neon** or **Supabase** Postgres | **$0–25/mo** | Backups + uptime once you have paying users' data. |
| 7 | **Storage/delivery** | **Cloudflare R2** | **$0** to 10 GB, **$0.015/GB** after, **$0 egress** | Already in the stack; egress-free is decisive for video. |
| 8 | **Email delivery** | **Resend** | **$0** to 3k/mo | Already wired in `worker.py`; wire the API path to trigger it. |
| 9 | **Domain + emails** | domain + Google Workspace | **~$6–12/mo** | focaldive.com + support@ |

**Tier-0 fixed cost: ≈ $50–90/mo.** Variable: **~$0.10–0.30/video** all-in
(GPU + ASR + LLM). You charge ~$0.08–0.10/source-minute in credits → **every
video is profitable from the first one.**

## C. The COMPETE spend (Tier 1 — close the "feels like Opus" gap) — code/dev time, little extra cash

These are mostly **engineering on infra you already pay for in Tier 0**, not new
subscriptions. Do them in this order; each is a thing customers directly notice.

| Priority | Gap it closes | What to build / buy | Extra cost |
|---|---|---|---|
| 1 | **Active-speaker tracking** (the #1 visible gap) | Integrate **LR-ASD** (open-source, free) into `reframe.py`; runs on the Tier-0 GPU | **$0** (GPU time only) |
| 2 | **Animated captions** | Add pop/scale/slide word effects to the ASS generator (Submagic-style) | **$0** (code) |
| 3 | **Editor UI** (trim + caption edit + re-render) | Wire the existing `POST /clips/render` endpoint to a real editor screen | **$0** (code) |
| 4 | **Social copy** (title/hashtags/description) | One extra LLM call per clip (Gemini) | **~$0.001/clip** |
| 5 | **Aspect ratios** 1:1 / 4:5 / 16:9 | render-param in pipeline | **$0** (code) |
| 6 | **More caption templates** (10–20) | author more ASS style presets | **$0** (content) |

## D. The RETAIN/SCALE spend (Tier 2 — only when MRR justifies it)

| Trigger | Add | Cost |
|---|---|---|
| ~$500 MRR | Priority GPU lane for paid users | included |
| ~$1.5k MRR | Always-on Community 4090 pod (baseline) + serverless overflow | **~$250/mo** (halves unit cost) |
| Retention need | **Direct publish** to TikTok/Reels/Shorts (OAuth) + scheduler | dev time |
| Retention need | **Analytics** (views/retention), **B-roll/stock** (Pexels free API → paid) | $0–low |
| Business deals | **API / white-label** for agencies | dev time (margin engine) |

## E. Three honest launch budgets

| Plan | Monthly fixed | Per-video | Gets you | Verdict |
|---|---|---|---|---|
| **Stay free** | ~$0 + VPS | $0 | 10 beta testimonials only | Validation, **not** a sellable product |
| **Tier 0 (recommended launch)** | **~$50–90** | **~$0.10–0.30** | Fast GPU render, 1080p, no rate-limit stalls, real email | **Charge confidently; profitable per video** |
| **Tier 0 + Tier 1** | **~$50–90** (+ ~1–2 wks dev) | same | Active-speaker, animated captions, editor — "feels like Opus" | **Competes head-to-head in the niche** |

## F. Going to market — the immediate motion (week-by-week)

1. **This week (code, $0):** raise ingest to 1080p (`ingest.py`); wire the API
   worker to upload→R2→Resend so the "email when done" actually fires.
2. **Buy Tier 0** (≈$50–90/mo): point the worker at RunPod Serverless 4090; flip
   Groq + Gemini to paid; Vercel Pro; domain.
3. **Price it** (Stripe Payment Links, no code): e.g. **$9 = 10 videos**,
   **$19 = 25 videos**, 2 free watermarked trials. Margin ≈ 30–90× unit cost.
4. **Sell manually first** to 10 niche creators (Sri Lankan / GCC podcasters,
   sermon channels, coaches). WhatsApp before/after demos. 3 of 10 saying "can I
   pay for more?" = validated.
5. **Then build Tier 1** (active-speaker + animated captions + editor), funded by
   that first revenue — and now you're genuinely comparable to Opus for your niche.

> **Bottom line:** ~**$50–90/month + ~$0.10–0.30/video** is the real cost to stop
> being a demo and start being a product you can charge for **today**. The
> "$0 forever" path is only for proving demand — it cannot compete on speed or
> quality, which is exactly what customers compare against Opus.
