# ENV setup guide — FocalDive Clips

Every environment variable, grouped by service, with what it's for, an example value,
and whether it's **required for production**. Derived from the three `.env.example`
files (`/.env.example`, `app/api/.env.example`, `app/web/.env.example`) and the code
that reads them (`pipeline/config.py`, `app/api/src/config/config.service.ts`,
`app/web/src/lib/auth.ts`, `app/web/src/lib/api.ts`).

> **Mock-first principle.** With keys absent the app boots in **MOCK_MODE** — in-memory
> DB, in-memory queue, fake auth org, stubbed PayPal, local-disk files, and a canned
> transcript/heuristic scorer. "Going to production" = filling in the real keys below
> and flipping the mock switches off. See `PRODUCTION_CHECKLIST.md` for the ordered runbook.

There are **three** `.env` files. Keep them separate — they're read by different processes:

| File | Read by | Copy from |
|---|---|---|
| `/.env` (repo root) | the Python **pipeline** (and shared by the worker) | `/.env.example` |
| `app/api/.env` | the **NestJS API** | `app/api/.env.example` |
| `app/web/.env.local` | the **Next.js web** app (build-time) | `app/web/.env.example` |

`Req?` legend: **Yes** = required for a real production deploy · **No** = optional /
has a working default · **Mock** = only needed to keep a subsystem mocked.

---

## 1. Pipeline (`/.env`)

The Python pipeline (`pipeline/`) reads the repo-root `.env`. This is also where the
worker that spawns `pipeline/run.py` gets its AI keys.

### Mode

| Var | Purpose | Example | Req? |
|---|---|---|---|
| `MOCK_MODE` | `auto` \| `true` \| `false`. `auto` stays mocked until a real scoring/transcribe backend is configured. | `false` | No (default `auto`) |

### AI backends (the $0 path)

| Var | Purpose | Example | Req? |
|---|---|---|---|
| `GROQ_API_KEY` | Groq free-tier key — Whisper-large-v3 transcription. | `gsk_...` | **Yes** (real transcription) |
| `GROQ_MODEL` | Groq model id. | `whisper-large-v3` | No |
| `GEMINI_API_KEY` | Google AI Studio key (free tier) — the clip-scoring LLM. | `AIza...` | **Yes** (real scoring) |
| `GEMINI_MODEL` | Gemini model id. | `gemini-2.0-flash` | No |
| `SCORING_PROVIDER` | `auto` \| `gemini` \| `openai` \| `mock`. | `gemini` | No (default `auto`) |
| `TRANSCRIBE_BACKEND` | `auto` \| `groq` \| `whisperx` \| `faster-whisper` \| `mock`. | `groq` | No (default `auto`) |
| `FASTER_WHISPER_MODEL` | CPU-fallback model size: `tiny`\|`base`\|`small`\|`medium`. | `small` | No |
| `OPENAI_API_KEY` | Alternative scorer (GPT-4o-mini) when `SCORING_PROVIDER=openai`. | `sk-...` | No |

### YouTube download (cookies)

| Var | Purpose | Example | Req? |
|---|---|---|---|
| `YTDLP_COOKIES_FROM_BROWSER` | Reuse a logged-in browser's cookies for gated videos (`chrome`\|`edge`\|`firefox`\|`brave`). Fixes "Sign in to confirm you're not a bot". | `chrome` | No (recommended on a server with no browser → use the file below) |
| `YTDLP_COOKIES` | Path to an exported `cookies.txt` (alternative to the above). | `/srv/cookies.txt` | No |

### GPU path (optional, RunPod)

| Var | Purpose | Example | Req? |
|---|---|---|---|
| `HUGGINGFACE_TOKEN` | pyannote diarization (GPU only). | `hf_...` | No |
| `WHISPERX_MODEL` | WhisperX model when `TRANSCRIBE_BACKEND=whisperx`. | `large-v3` | No |
| `WHISPERX_DEVICE` | `cuda` \| `cpu`. | `cuda` | No |

### Tooling

| Var | Purpose | Example | Req? |
|---|---|---|---|
| `FFMPEG_PATH` | ffmpeg binary (full path if not on `PATH`). | `ffmpeg` | **Yes** (must be installed) |
| `FFPROBE_PATH` | ffprobe binary. | `ffprobe` | **Yes** (must be installed) |

### Email delivery (Resend)

| Var | Purpose | Example | Req? |
|---|---|---|---|
| `RESEND_API_KEY` | Sends the "your clips are ready" email. Empty → the worker logs instead of sending. | `re_...` | No |
| `EMAIL_FROM` | From-address for clip emails. | `FocalDive <clips@focaldive.com>` | No |

### Storage (Cloudflare R2 / S3)

| Var | Purpose | Example | Req? |
|---|---|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account id (endpoint host). | `abc123` | No (local-disk fallback) |
| `R2_ACCESS_KEY_ID` | R2 S3 token access key. | `...` | No |
| `R2_SECRET_ACCESS_KEY` | R2 S3 token secret. | `...` | No |
| `R2_BUCKET` | Bucket name. | `focaldive-clips` | No (default) |
| `R2_ENDPOINT` | `https://<accountid>.r2.cloudflarestorage.com`. | `https://abc123.r2.cloudflarestorage.com` | No |

> R2 upload + signed URLs are the **one remaining code piece** (see `INTEGRATION.md` §2).
> Until wired, clips are served from the local `workspace/` via the API `/files` route.

### Queue / DB (shared with API + worker)

| Var | Purpose | Example | Req? |
|---|---|---|---|
| `DATABASE_URL` | Postgres connection string. Absent → in-memory store (data lost on restart). | `postgresql://user:pass@host:5432/focaldive` | **Yes** |
| `REDIS_URL` | Redis for BullMQ. Absent → in-memory queue. | `redis://localhost:6379` | **Yes** |

---

## 2. API (`app/api/.env`)

The NestJS API. Resolves feature flags in `config.service.ts`: each subsystem mocks
itself when its own creds are missing, so the API always boots.

### Mode & auth

| Var | Purpose | Example | Req? |
|---|---|---|---|
| `MOCK_MODE` | `auto`\|`true`\|`false`. `true` forces all subsystems to mock (never use in prod). | `false` | No |
| `MOCK_AUTH` | `true` injects a fake org (no Clerk JWT needed). Set **`false`** in prod. | `false` | **Yes** (set `false`) |
| `API_PORT` | Port the API listens on. | `4000` | No (default 4000) |
| `API_PUBLIC_URL` | Public base URL the browser uses to reach the API (for `/files` URLs). | `https://api.yourdomain.com` | **Yes** (prod) |

### Auth (Clerk)

| Var | Purpose | Example | Req? |
|---|---|---|---|
| `CLERK_SECRET_KEY` | Clerk backend key — verifies session JWTs. Absent → mock auth. | `sk_live_...` | **Yes** |
| `CLERK_JWKS_URL` | Clerk JWKS endpoint for token verification. | `https://<your>.clerk.accounts.dev/.well-known/jwks.json` | No (derivable) |

### Database

| Var | Purpose | Example | Req? |
|---|---|---|---|
| `DATABASE_URL` | Postgres. Absent → in-memory store. | `postgresql://user:pass@host:5432/focaldive` | **Yes** |
| `REDIS_URL` | Redis for BullMQ. Absent → in-memory queue. | `redis://host:6379` | **Yes** |

### Pipeline / worker switches

| Var | Purpose | Example | Req? |
|---|---|---|---|
| `USE_REAL_PIPELINE` | `true` → the worker spawns `pipeline/run.py` (real clips) instead of the mock worker. | `true` | **Yes** (prod) |
| `LOCAL_FILES` | `true` serves clips from local disk via `/files`; defaults `true` when `USE_REAL_PIPELINE=true`. | `true` | No |

### Payments (PayPal)

| Var | Purpose | Example | Req? |
|---|---|---|---|
| `PAYPAL_CLIENT_ID` | PayPal REST app client id. Absent → mock billing (grants locally). | `Aa1...` | **Yes** |
| `PAYPAL_SECRET` | PayPal REST app secret. | `EFf...` | **Yes** |
| `PAYPAL_BASE_URL` | API host: sandbox `https://api-m.sandbox.paypal.com`, **live** `https://api-m.paypal.com`. | `https://api-m.paypal.com` | **Yes** (live for prod) |
| `PAYPAL_MODE` | `sandbox` \| `live` (informational). | `live` | No |
| `PAYPAL_PLAN_STARTER` | Pre-created PayPal Billing Plan id — Starter $7.50/mo. | `P-1AB...` | **Yes** (subscriptions) |
| `PAYPAL_PLAN_PRO` | Pre-created PayPal Billing Plan id — Pro $14.50/mo. | `P-2CD...` | **Yes** (subscriptions) |
| `PAYPAL_WEBHOOK_ID` | Webhook id (PayPal Dashboard → Webhooks). Webhook grants are **rejected** unless the signature verifies against this. | `5G7...` | **Yes** (if using the webhook) |
| `PAYPAL_RETURN_URL` | Where PayPal returns the buyer after approve. | `https://app.yourdomain.com/billing?ok=1` | **Yes** (prod) |
| `PAYPAL_CANCEL_URL` | Where PayPal returns the buyer on cancel. | `https://app.yourdomain.com/billing?canceled=1` | **Yes** (prod) |

### Storage (R2) — same vars as the pipeline table above (`R2_*`).

---

## 3. Web (`app/web/.env.local`)

The Next.js app. `NEXT_PUBLIC_*` vars are **build-time** — rebuild (`next build`) after
changing them.

| Var | Purpose | Example | Req? |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the NestJS API. Absent → the app uses its in-app **mock store** (offline demo). | `https://api.yourdomain.com` | **Yes** |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key. Must start with `pk_` to enable Clerk (`auth.ts` → `CLERK_ENABLED`). Absent → dev/mock auth (no sign-in UI). | `pk_live_...` | **Yes** |
| `CLERK_SECRET_KEY` | Clerk backend key for any web-side server calls. | `sk_live_...` | **Yes** |

---

## Quick "what's required for production" summary

**Must set:**
`DATABASE_URL`, `REDIS_URL` (pipeline + api), `GROQ_API_KEY`, `GEMINI_API_KEY`,
ffmpeg/ffprobe installed, `MOCK_AUTH=false`, `CLERK_SECRET_KEY` +
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (`pk_`), `USE_REAL_PIPELINE=true`,
`API_PUBLIC_URL`, `NEXT_PUBLIC_API_URL`, PayPal client id/secret + **live**
`PAYPAL_BASE_URL` + plan ids + webhook id + return/cancel URLs.

**Optional / has a default:**
`MOCK_MODE` (`auto`), models (`GROQ_MODEL`/`GEMINI_MODEL`), `RESEND_API_KEY` (email),
`R2_*` (local-disk fallback until R2 upload is wired), `YTDLP_COOKIES*`, GPU vars.
