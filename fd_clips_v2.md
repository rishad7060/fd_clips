# FocalDive Clips — ZERO-COST MVP Roadmap
## Launch with $0/month fixed cost on infrastructure you already own

---

# THE MVP MINDSET

The full blueprint stays as your Phase 2+ map. But the MVP answers ONE question with the least money possible:

> **"Will people pay for AI-picked clips from their long videos?"**

Everything that doesn't answer that question gets cut. The trick that makes $0 possible: at MVP volume (a handful of videos/day), you don't need GPUs at all — free AI API tiers + your existing VPS CPU handle everything.

---

# PART 1 — WHAT'S IN, WHAT'S CUT

| Feature | Full product | MVP decision |
|---|---|---|
| URL/file ingestion | Both | ✅ YouTube URL only (no uploads = no storage cost, no big-file handling) |
| Transcription | Self-hosted WhisperX on GPU | ✅ **Groq API free tier** (whisper-large-v3, free quota, no GPU) |
| Clip scoring | GPT-4o-mini | ✅ **Gemini 2.5 Flash free tier** (free daily quota covers MVP volume) |
| Clips per video | 5–10 ranked | ✅ Top 3 only |
| Vertical reframe | LR-ASD active-speaker tracking | ✅ MediaPipe face-detect center crop (CPU, free) — good enough for 1-speaker content; CUT multi-speaker podcasts from MVP scope |
| Captions | Animated karaoke, RTL, templates | ✅ One clean style, word-by-word highlight via ASS. RTL test included (it's free — just fonts) |
| Rendering | GPU NVENC | ✅ CPU libx264 on your VPS (slow is fine at MVP volume) |
| Languages | 25+ | ✅ English + ONE regional language you'll sell to |
| Dashboard/editor | Full editor | ❌ CUT — simple submit form + results page. No editing |
| Teams, scheduler, B-roll, API | All | ❌ CUT entirely |
| Auth | Clerk | ✅ Clerk free tier (or even magic-link only) |
| Billing | Stripe tiers + credits | ✅ Stripe Payment Links (no code) — manual credit top-up |
| Speed | Minutes | Accept 15–30 min/video on CPU. Set expectations: "clips ready in ~30 min, we'll email you" |

**MVP promise to the customer:** *paste a YouTube link → get your 3 best moments as captioned vertical clips by email/WhatsApp in ~30 minutes.*

---

# PART 2 — THE $0 STACK

| Layer | Tool | Cost |
|---|---|---|
| Transcription | **Groq API** (whisper-large-v3, word timestamps) | $0 — free tier |
| Clip scoring | **Gemini 2.5 Flash API** | $0 — free tier (rate-limited daily quota; queue jobs to stay inside it) |
| Download | yt-dlp | $0 |
| Face crop | MediaPipe (CPU) | $0 |
| Captions + render | FFmpeg + libass, libx264 (CPU) | $0 |
| Compute | **Your existing Hostinger VPS** | $0 extra |
| Queue | Redis already on VPS + BullMQ | $0 |
| DB | Postgres already on VPS | $0 |
| Frontend | Vercel hobby (or a page on focaldive.com) | $0 |
| Storage/delivery | Cloudflare R2 free 10 GB, zero egress + 7-day auto-delete of clips | $0 |
| Auth | Clerk free tier | $0 |
| Payments | Stripe Payment Links | $0 fixed (fee per transaction only) |
| Email delivery | Resend free 3k/mo | $0 |
| Dev environment | Claude Code on the VPS / your laptop | your existing Claude plan |

**Fixed monthly cost: $0.** Variable cost per video: $0 (until you exceed free API quotas — which is a GOOD problem, see Part 5).

⚠️ Two honest caveats:
- Free API tiers have rate limits and their terms/quotas change — verify current Groq + Gemini free quotas the week you build, and queue jobs so you never burst past them.
- CPU rendering means one video occupies your VPS for ~10–30 min. Fine for ≤10 videos/day. Past that, you'll have revenue (Part 5).

---

# PART 3 — THE CLAUDE CODE PROMPTS (7 prompts, ~1 week)

Rules: one prompt per module → run → verify → commit. Start each session with "Read CLAUDE.md."

**PROMPT 0 — foundation:**
> Create CLAUDE.md for this MVP: a CPU-only pipeline on a Linux VPS that takes a YouTube URL and outputs the 3 best moments as captioned 9:16 clips. Stack: Python 3.10, yt-dlp, Groq API for whisper-large-v3 transcription with word timestamps, Gemini Flash for clip scoring (rubric in prompts/virality_rubric.txt), MediaPipe face-detect smart crop, FFmpeg + libass ASS karaoke captions, libx264 encode. Hard rules: single-speaker/talking-head content only, 3 clips of 20–60s each, complete-thought boundaries, all API keys in .env, every module standalone-runnable. Create folder structure, requirements.txt, .env.example, .gitignore.

**PROMPT 1 — ingest + transcribe:**
> Build pipeline/ingest.py (yt-dlp download ≤720p — smaller/faster for CPU — to workspace/{job_id}/source.mp4 + ffprobe metadata) and pipeline/transcribe.py (extract audio, send to Groq whisper-large-v3 with word-level timestamps, save transcript.json with segments + per-word timing). Handle Groq rate limits with retry/backoff. Run on [TEST PODCAST URL] and show me the first 10 segments.

**PROMPT 2 — clip scoring (the product):**
> Build pipeline/score_clips.py + prompts/virality_rubric.txt. Send the timestamped transcript to Gemini 2.5 Flash, JSON-mode output: 6 candidates {start, end, hook_line, virality_score 0–100, reason}, complete-thought boundaries, 20–60s, dedupe >50% overlap, return top 3. Handle the free-tier rate limit with queued retry. Run on the test transcript, print the ranked picks.

**PROMPT 2b — rubric iteration (repeat until good):**
> Here's what it picked and my notes: [your judgment]. Update only prompts/virality_rubric.txt to fix these patterns. Re-run, show new ranking.

✅ **THE GATE: 7 of 10 test videos must produce a #1 clip you'd actually post. Spend 2 days here. Nothing else matters until this passes.**

**PROMPT 3 — extract + crop:**
> Build pipeline/extract.py (FFmpeg cut per clip) and pipeline/reframe.py: MediaPipe face detection sampled every 5th frame, exponential-moving-average smoothed crop window centered on the dominant face, fallback to center crop if no face, output 1080x1920. CPU only. Run on the 3 clips.

**PROMPT 4 — captions + render:**
> Build pipeline/captions.py: per-word timing → ASS karaoke word-by-word highlight, one clean bold style (white text, colored active word, black outline, lower-third). Verify RTL renders correctly with an Arabic test string. Burn in with FFmpeg libx264 preset veryfast → {n}_final.mp4. Run on all 3 clips; confirm caption sync.

**PROMPT 5 — chain + worker:**
> Build pipeline/run.py chaining everything with resumable stages and a summary table. Then worker.py: BullMQ-compatible Redis consumer for jobs {job_id, email, url}, runs pipeline, uploads 3 finals to R2 (7-day expiry), emails the customer signed links via Resend. Test with a manual job end to end.

**PROMPT 6 — the tiny web app:**
> Build a one-page Next.js app: hero + paste-YouTube-URL form + email field, Clerk sign-in, POST to a small NestJS (or even Next API-route) backend on my VPS that checks the user's credit balance in Postgres, enqueues the job, shows "Your clips will arrive by email in ~30 minutes." Plus a /clips page listing the user's past jobs with R2 links. Deploy: Vercel for web, docker-compose for VPS services. Include DEPLOY.md.

**PROMPT 7 — payments (no code, almost):**
> Add Stripe Payment Links for two packs: $9 = 10 videos, $19 = 25 videos. Build a webhook endpoint that, on successful payment, adds credits to the user's row in Postgres and emails a confirmation. New signups get 2 free videos (watermarked: small "made with FocalDive Clips" text via FFmpeg drawtext).

**Total build: ~5–8 working days. Total cash spent: $0** (you're on your VPS and free tiers throughout — no GPU pod at all).

---

# PART 4 — LAUNCH WEEK (still $0)

1. **Process 20 videos for 10 people you know** — Sri Lankan/GCC podcasters, mosque/sermon channels, business coaches, your own BookMyPlay content. Free, in exchange for 15-min feedback calls.
2. **Sell manually first.** WhatsApp the clips to them. If 3 of 10 say "can I pay for more?" — you've validated. If zero do, you've spent $0 finding out and you tune the rubric or pivot the niche.
3. Post before/after demos (their long video → your 3 clips) on LinkedIn/TikTok. The product demos itself.
4. Turn on the Stripe links.

---

# PART 5 — UPGRADE TRIGGERS (spend ONLY when revenue forces you)

| Trigger | What breaks | The fix | New cost |
|---|---|---|---|
| >10–15 videos/day | VPS CPU queue backs up | Move transcribe+render worker to RunPod **Serverless** 4090 (the Docker image is the same code) | ~$0.10–0.20/video, paid by margin |
| Groq/Gemini free quota exceeded | API rejections | Flip to paid tiers (Groq is cheap; or self-host faster-whisper once on GPU) | ~$0.01–0.05/video |
| Users ask for podcasts/2-speakers | Crop picks wrong person | Add LR-ASD active-speaker detection (Prompt 5 from the full roadmap) | GPU time only |
| Users ask to tweak clips | No editor | Add trim + caption-edit + re-render page | dev time only |
| ~$500 MRR | Vercel hobby ToS / polish needs | Vercel Pro $20/mo, more caption templates, 10 clips/video | $20/mo |
| ~$1.5k MRR | Serverless GPU premium adds up | Always-on Community pod for baseline + serverless overflow | ~$250/mo, halves unit cost |
| Strong niche signal (e.g. sermons, Tamil creators) | — | Double down: niche templates, dialect ASR, white-label for agencies | revenue-funded |

Every upgrade is triggered by *demand you can already bill for* — you never spend ahead of revenue.

---

# THE ONE-PAGE SUMMARY

| Day | Action | Cash out |
|---|---|---|
| 1 | CLAUDE.md + Prompt 0–1 on your VPS | $0 |
| 2–3 | Prompt 2 + 2b: scoring + rubric iteration → pass the 7/10 gate | $0 |
| 4–5 | Prompts 3–5: crop, captions, chain, worker | $0 |
| 6–7 | Prompts 6–7: web page + Stripe links, deploy | $0 |
| Week 2 | 10 free beta users → 3 say "shut up and take my money" | $0 |
| Week 3 | Stripe on. First revenue | +$ |
| Only then | Upgrade table above, paid by margin | revenue-funded |

**Fixed cost to launch: $0. The only investment is ~2 weeks of one developer + your taste in clips.** The full GPU/SaaS roadmap you already have is exactly what this MVP grows into — same code, same prompts, just more horsepower switched on as customers pay for it.