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
