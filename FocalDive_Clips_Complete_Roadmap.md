# FocalDive Clips — Complete From-Scratch Roadmap
## Skills → Tools → Claude Code Prompts → Free Launch → Scale When Paid

---

# PART 1 — SKILLS YOU NEED (and who covers what)

You don't need new hires. Map your 4-person tech team like this:

| Skill | Used for | Who | How deep |
|---|---|---|---|
| **Python** | The AI pipeline (transcribe, score, crop, render) | 1 person (pipeline owner) | Intermediate — Claude Code writes most of it; you review and debug |
| **FFmpeg basics** | Cutting, cropping, caption burn-in, encoding | Pipeline owner | Just concepts: filters, codecs, NVENC. Claude writes the commands |
| **Prompt engineering** | The clip-scoring rubric — your core IP | You  + whoever has best content taste | Deep. This is the skill that decides if clips are good |
| **NestJS + Postgres + BullMQ** | API, jobs, billing | Backend dev | You already have this from BookMyPlay/Weels |
| **Next.js + Tailwind** | Dashboard, clip gallery, editor | Frontend dev | You already have this |
| **Docker + basic Linux** | Packaging the pipeline for GPU workers | Pipeline owner / DevOps | You already have this (VPS work) |
| **Claude Code driving** | Everything above, faster | Everyone | The meta-skill — covered in Part 3 |

**What you DON'T need:** ML model training, computer vision research, video codec internals. Everything uses pre-trained open-source models. This is an integration project, not a research project.

---

# PART 2 — THE TOOLS (free/cheap to launch → what they cost at scale)

## Video + AI tools (the pipeline)

| Tool | What it does | Launch cost | Notes |
|---|---|---|---|
| **yt-dlp** | Download videos from URLs | FREE (open source) | |
| **FFmpeg** | All cutting/cropping/encoding | FREE (open source) | Use `h264_nvenc` on GPU |
| **WhisperX** | Transcription + word timestamps + speakers | FREE (open source model) | Runs on your GPU; only GPU time costs |
| **pyannote-audio** | Speaker diarization | FREE (open source) | Needs free HuggingFace token |
| **LR-ASD** | Active speaker detection (who's talking) | FREE (open source) | For smart 9:16 crop |
| **PySceneDetect** | Scene cut detection | FREE | |
| **libass (in FFmpeg)** | Animated karaoke captions incl. RTL | FREE | ASS subtitle format |
| **GPT-4o-mini or Gemini Flash API** | Clip scoring/virality | ~$0.005–0.015 per hour-long video | The ONLY per-video AI API cost |
| **RunPod Serverless (Flex)** | GPU, pay per second, scales to ZERO | ~$1.10/hr 4090, billed per second | ~$0.05–0.15 GPU cost per video. $0 when idle |

## SaaS infrastructure (launch on free tiers)

| Layer | Launch choice | Free tier | When you outgrow it |
|---|---|---|---|
| Frontend hosting | **Vercel** | Free (hobby) | $20/mo Pro when commercial traffic grows |
| Backend API | **Your existing Hostinger VPS** | Already paying | Stays fine for a long time |
| Database | Postgres on your VPS | Already paying | Managed Postgres (Neon/Supabase) at scale |
| Queue | Redis on your VPS + BullMQ | Already paying | Upstash/managed Redis at scale |
| File storage | **Cloudflare R2** | 10 GB free, ZERO egress fees | $0.015/GB/mo after — egress always free (decisive for video) |
| Auth | **Clerk** | Free to 10,000 monthly active users | Paid after 10k MAU |
| Payments | **Stripe** | No monthly fee, ~2.9% + 30¢ per transaction | Costs nothing until customers pay |
| Email | **Resend** | 3,000 emails/mo free | |
| Analytics | **PostHog** | Generous free tier | |
| Errors | **Sentry** | Free tier | |

## 💰 Total monthly bill at launch

| Item | Cost |
|---|---|
| All software/models | $0 |
| Vercel, Clerk, R2, Resend, Stripe, PostHog, Sentry | $0 |
| VPS (API + DB + Redis) | already paying |
| RunPod serverless GPU | only when a video processes (~$0.10–0.30/video) |
| LLM API | ~$0.01/video |
| Dev GPU (4090 pod while building, ~3 wks) | ~$60–120 one-time |
| **Fixed monthly total** | **≈ $0 + your existing VPS** |

Every cost above the VPS is *variable* — it only happens when a customer processes a video, and your credit pricing covers it ~10x over.

---

# PART 3 — BUILD FROM SCRATCH: THE EXACT CLAUDE CODE PROMPTS

## How to drive Claude Code (read once, applies to every step)

1. **One prompt = one module.** Never "build the whole thing."
2. **Every prompt ends with:** *"Then run it on the sample file and show me the output. Fix any errors yourself."*
3. **After each green step:** `git add -A && git commit -m "step X works"`
4. **If Claude goes wrong:** don't argue in a long thread — `git checkout .`, fix the prompt, retry fresh.
5. **Start every session with:** *"Read CLAUDE.md first."*

## Phase 0 — Environment (Day 1)

Deploy a RunPod **4090 Community Cloud pod** (PyTorch template, ~$0.34/hr — your temporary dev box). SSH in, then:

```bash
mkdir focaldive-clips && cd focaldive-clips && git init
npm install -g @anthropic-ai/claude-code
claude   # authenticate
```

**PROMPT 0 — the foundation file:**
> Create a CLAUDE.md for this project. Goal: an AI pipeline that takes a long video (YouTube URL or file) and outputs 5–10 ranked, captioned, vertical 9:16 short clips — like Opus Clip. Stack rules: Python 3.10, WhisperX (never vanilla Whisper), pyannote for diarization, LR-ASD for active-speaker detection (never Haar cascades), FFmpeg with h264_nvenc (never libx264), ASS subtitles via libass for captions (must support RTL Arabic/Urdu), GPT-4o-mini for clip scoring with the rubric in a separate editable file, yt-dlp for ingestion. Architecture: pipeline/ holds modular scripts, each runnable standalone and chainable. Later an app/ folder will hold a NestJS + Next.js SaaS. Conventions: type hints, every module has a __main__ test entry, config in .env. Also create the folder structure, requirements.txt, .env.example, and .gitignore.

## Phase 1 — The pipeline (Days 2–10)

**PROMPT 1 — Ingestion:**
> Read CLAUDE.md. Build pipeline/ingest.py: accepts a YouTube URL or local path. URLs download via yt-dlp at best quality ≤1080p. Run ffprobe, save metadata JSON (duration, fps, resolution, codec). Normalize to H.264 yuv420p constant-fps mp4 in workspace/{job_id}/source.mp4. Then download this test video [PASTE A REAL PODCAST URL] and show me the metadata.

**PROMPT 2 — Transcription:**
> Build pipeline/transcribe.py: load workspace/{job_id}/source.mp4, extract audio, run WhisperX large-v3 with word-level alignment and pyannote diarization (HF token from .env). Output transcript.json: segments with text, start, end, speaker, and per-word timing. If duration >30 min, process in 20-min chunks with 30-sec overlap and merge. Run on the test video; show me the first 10 segments so I can check word timing and speaker labels.

✅ *Check yourself: open the JSON next to the video — do words line up within ~0.1s? Are speakers right?*

**PROMPT 3 — Clip scoring (THE most important module):**
> Build pipeline/score_clips.py plus a separate prompts/virality_rubric.txt. Send transcript.json (text + timestamps + speakers) to GPT-4o-mini with the rubric, get back STRICT JSON: 8–12 candidate clips, each {start, end, hook_line, virality_score 0–100, reason, suggested_title}. Hard rules in the rubric: every clip is a complete thought starting and ending on sentence boundaries; 20–90 sec long; score on hook strength, emotional peak, quotability, story payoff, practical value, controversy. Dedupe candidates overlapping >50% keeping the higher score. Use the OpenAI structured-output/JSON mode so parsing never fails. Run on the test transcript and print the ranked list.

✅ *The business gate: run on 10 different videos over 2 days. For each, ask: would I post the #1 clip? Iterate the rubric file (not the code) with Claude until yes for 7+/10.*

**PROMPT 3b — rubric iteration (you'll use this repeatedly):**
> Here are the clips it picked for this video and what I think: [your notes — e.g. "clip 1 starts mid-story, clip 3 is the real best moment but scored 60"]. Update prompts/virality_rubric.txt to fix these failure patterns without breaking the good picks. Re-run and show the new ranking.

**PROMPT 4 — Clip extraction:**
> Build pipeline/extract.py: for each selected clip, cut workspace/{job_id}/source.mp4 with FFmpeg stream-copy where keyframes allow, re-encode with nvenc only when needed for frame accuracy. Output workspace/{job_id}/clips/{n}_raw.mp4. Run on the top 3 scored clips.

**PROMPT 5 — Smart vertical reframe:**
> Build pipeline/reframe.py: for each raw clip (NOT the full source), run scene detection (PySceneDetect), face detection/tracking, and LR-ASD active speaker detection (clone github.com/Junhua-Liao/LR-ASD, follow its README for weights). Compute a virtual camera: center the active speaker, velocity-bounded smoothing (no jitter, no whip-pans), snap on scene cuts, widen to include both faces when two people are on screen, fall back to center-crop with motion tracking when no faces. Output {n}_vertical.mp4 in 1080x1920. Run on the 3 clips; report which crop mode each used.

✅ *Watch every output. Jitter or wrong-speaker tracking = not done. This step separates pro from amateur.*

**PROMPT 6 — Animated captions:**
> Build pipeline/captions.py: slice per-word timing from transcript.json for each clip's range, generate an .ass subtitle file with karaoke-style word-by-word highlight (\k tags), style from a captions_style.json (font, size, colors, outline, position, highlight color), auto emoji for configured keywords, uppercase-emphasis for high-energy words. MUST render RTL correctly — test with an Arabic sample too. Burn in with FFmpeg + h264_nvenc → {n}_final.mp4. Run on all 3 clips and confirm sync.

**PROMPT 7 — Chain it:**
> Build pipeline/run.py: orchestrate ingest → transcribe → score → extract → reframe → captions for a given URL/file and clip count N, with per-stage timing logged, resumable stages (skip completed), and a summary table (clip, score, hook, duration, path). Run the FULL pipeline on a fresh video and show the summary.

✅ **Phase 1 done when:** `python pipeline/run.py <url> --clips 5` → 5 finished clips, and on a 20-video test set (mix English + Tamil/Sinhala/Arabic if those are your market) the picks rival Opus.

## Phase 2 — Wrap it as a product (Weeks 3–6)

Move to your VPS + local dev for this part; the GPU pod is only for the pipeline.

**PROMPT 8 — Dockerize the worker:**
> Containerize the pipeline as a worker: Dockerfile (CUDA base, models pre-downloaded at build), worker.py that polls a Redis queue (BullMQ-compatible job format) for jobs {job_id, tenant_id, source_url, clip_count, style}, runs the pipeline, uploads outputs to Cloudflare R2 (S3 API, creds in env), updates job status/progress in Redis at each stage. Build and test with a manual job.

**PROMPT 9 — Backend (run as 4 separate prompts in this order):**
> 9a. Scaffold app/api as NestJS: config module, Postgres via Prisma, health endpoint.
> 9b. Add Clerk JWT auth + an Organization model; EVERY table gets organization_id; add Postgres Row-Level Security policies as a second guard.
> 9c. Add BullMQ: jobs queue the worker consumes; endpoints POST /jobs (validates credits, enqueues with tenant_id in payload), GET /jobs/:id (status+progress), GET /clips (list with R2 signed URLs). WebSocket gateway for live progress.
> 9d. Add billing: Credit model (1 credit = 1 source-minute), Stripe Checkout for tier subscriptions (Free 30 min/mo, Starter $12/150 min, Pro $25/300 min), webhook handler in a background processor that grants credits, decrement on job submit, refund on job failure.

**PROMPT 10 — Frontend (3 prompts):**
> 10a. Scaffold app/web as Next.js 14 + Tailwind + Clerk: landing page, auth, dashboard shell.
> 10b. Core flow: paste-URL/upload page → job submit → live progress view (websocket) → clip gallery: vertical video cards with virality score badge, hook line, download button.
> 10c. Light editor: per-clip trim handles, caption text editing, style/template picker, re-render button (enqueues a render-only job).

**PROMPT 11 — Deploy:**
> Write the deployment setup: docker-compose for the VPS (API + Postgres + Redis + Nginx, matching my existing PM2/Nginx conventions), Vercel config for the web app, and a RunPod Serverless endpoint config for the worker image with scale-to-zero. Include a DEPLOY.md runbook.

## Phase 3 — Launch (Week 6–8)

1. Process 30 videos free for 10 target users (regional creators/podcasters/agencies you already know) — in exchange for feedback + testimonial.
2. Fix the top 5 complaints.
3. Turn on Stripe. Announce. Watermark on free tier only.

---

# PART 4 — THE SCALE MAP: WHAT TO CHANGE AS CUSTOMERS PAY

The launch stack is deliberately "all variable cost." Here's exactly which switch to flip at each revenue milestone — nothing needs rebuilding, only re-pointing.

## Stage A — $0 MRR (launch)
- RunPod **Serverless** only (scales to zero, ~2x/hr premium but $0 idle)
- Everything else free tier + your VPS
- **Fixed cost ≈ $0**

## Stage B — first ~$300–500 MRR (≈ 20–30 paying users)
- **Flip 1:** Vercel Hobby → Pro ($20/mo) — required for commercial use
- **Flip 2:** Add a job-priority lane: paid users' jobs jump the queue
- Keep serverless GPU — utilization is still spiky
- Take profit; change nothing else

## Stage C — ~$1,000–2,000 MRR (GPU busy >~25% of the time)
- **Flip 3 (the big one):** move baseline load from Serverless to an **always-on Community 4090 pod** (~$250/mo) and keep Serverless as overflow. Same Docker image — you change WHERE it runs, not what it is. Cuts GPU unit cost roughly in half.
- **Flip 4:** Postgres → managed (Neon/Supabase ~$25/mo) for backups + headroom
- Add a second human: support + content (your COO playbook)

## Stage D — ~$5,000+ MRR
- 2–3 dedicated pods + serverless burst; consider Vast.ai spot for batch backfill
- Premium LLM toggle (Claude Sonnet scoring) as an upsell tier
- Launch the **white-label/API product** for agencies — your margin engine
- SOC2-lite checklist if chasing business customers

## Stage E — the moat spend
- Fine-tune an open model on your accumulated "good clip / bad clip" data → clip selection no incumbent can copy
- Deep dialect ASR for Tamil/Sinhala/Arabic — the regional wall

> **The unit economics that make this safe:** you charge ~$0.08–0.10 per source-minute (credits); it costs you ~$0.005–0.012. Every customer is profitable from their first video, so scaling never outruns cash.

---

# PART 5 — THE WHOLE MAP ON ONE PAGE

| When | What | Cost | Exit gate |
|---|---|---|---|
| Day 1 | RunPod pod + repo + CLAUDE.md (Prompt 0) | ~$8 | Claude Code running |
| Days 2–4 | Prompts 1–3: ingest, transcribe, score | ~$25 GPU | Word-accurate transcript |
| Days 4–6 | Rubric iteration (Prompt 3b, repeatedly) | ~$20 | 7/10 videos: #1 clip is postable |
| Days 6–10 | Prompts 4–7: extract, reframe, captions, chain | ~$30 | 5 finished clips per video, RTL works |
| Weeks 3–4 | Prompts 8–9: worker + API | $0 (VPS) | Job flows end-to-end via queue |
| Weeks 4–6 | Prompts 10–11: frontend + deploy | $0 | Beta usable by a stranger |
| Weeks 6–8 | 10 beta users → fix → Stripe on | ~$0 fixed | First paying customer |
| $500 MRR | Vercel Pro, priority lanes | $20/mo | — |
| $1.5k MRR | Always-on GPU pod, managed DB | ~$275/mo | GPU cost/min halves |
| $5k MRR | Pod fleet, API/white-label, premium tier | scales w/ revenue | Agency deals |

**Total cash to reach launch: roughly $100–150 in GPU time + the VPS you already pay for.** The skills are 80% what your team already has; the two you must build are FFmpeg literacy (one person, one week, Claude teaches you) and rubric prompt-craft (you, ongoing — it IS the product).
