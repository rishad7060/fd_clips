export const meta = {
  name: 'build-focaldive',
  description: 'Build FocalDive Clips full-stack scaffold (pipeline + NestJS API + Next.js web), mocked for local run',
  phases: [
    { title: 'Contracts', detail: 'Define shared data shapes & module interfaces' },
    { title: 'Build', detail: 'Implement + self-test each subsystem in parallel' },
    { title: 'Verify', detail: 'Integration check: web app runs, pipeline mock runs' },
  ],
}

const ROOT = 'C:/Projects/Opus_clip_clone'

const CONTRACT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'files_written'],
  properties: {
    summary: { type: 'string' },
    files_written: { type: 'array', items: { type: 'string' } },
  },
}

const BUILD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['subsystem', 'files_written', 'tests_run', 'tests_passed', 'notes'],
  properties: {
    subsystem: { type: 'string' },
    files_written: { type: 'array', items: { type: 'string' } },
    tests_run: { type: 'string', description: 'exact command(s) run' },
    tests_passed: { type: 'boolean' },
    notes: { type: 'string', description: 'what works, what is mocked, any blockers' },
  },
}

const VERIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['pipeline_ok', 'api_ok', 'web_ok', 'issues', 'verdict'],
  properties: {
    pipeline_ok: { type: 'boolean' },
    api_ok: { type: 'boolean' },
    web_ok: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'string' } },
    verdict: { type: 'string' },
  },
}

const SHARED = `
PROJECT: FocalDive Clips — an Opus-Clip-style app. Repo root: ${ROOT}.
READ ${ROOT}/CLAUDE.md FIRST for stack rules and layout. Read the roadmap at
${ROOT}/FocalDive_Clips_Complete_Roadmap.md for full intent (esp. PART 3 prompts).

CRITICAL CONSTRAINTS:
- This is a Windows machine with NO GPU and NO API keys. Everything must run locally
  via MOCK_MODE. Real WhisperX/pyannote/LR-ASD/nvenc/OpenAI calls are guarded behind
  MOCK_MODE and replaced with deterministic mocks so code runs & tests pass offline.
- Interfaces must be identical between mock and real so the real impl drops in on RunPod.
- Type hints on Python; TypeScript strict on Node. Each Python module needs a __main__ test entry.
- Write real, working, reviewable code — not stubs that throw NotImplementedError.
  Mocks return realistic canned data.
- Do NOT add features beyond the roadmap. Do NOT touch files outside your assigned directory.
`

// ── Phase 1: shared contracts (do these myself? no — one agent, fast) ──
phase('Contracts')
const contract = await agent(
  SHARED + `
TASK: Write the SHARED CONTRACTS that all three subsystems depend on, so they interoperate.
Write these files:
1. ${ROOT}/pipeline/config.py — loads .env via python-dotenv, exposes MOCK_MODE bool
   (auto => True when OPENAI_API_KEY missing), WORKSPACE dir helper, and typed settings.
2. ${ROOT}/tests/fixtures/transcript.sample.json — a realistic canned WhisperX-style transcript
   (~12 segments, fields: text,start,end,speaker, and words[] with word,start,end). Use a
   short podcast-style monologue/dialogue so scoring has real material.
3. ${ROOT}/tests/fixtures/clips.sample.json — example scored-clip output (8 candidates,
   fields: start,end,hook_line,virality_score,reason,suggested_title).
4. ${ROOT}/CONTRACTS.md — document the canonical JSON shapes for: job, transcript, clip
   candidate, job status/progress events (used by API websocket + worker), and R2 object keys.
   These shapes are the contract between pipeline, worker, API, and web.
Keep shapes minimal and consistent with the roadmap. Return the schema-required fields.`,
  { label: 'contracts', phase: 'Contracts', schema: CONTRACT_SCHEMA }
)

log(`Contracts: ${contract?.files_written?.length ?? 0} files. Now building 3 subsystems in parallel.`)

// ── Phase 2: build each subsystem (parallel — disjoint directories) ──
const PIPELINE_TASK = SHARED + `
SUBSYSTEM: pipeline/ (Python). Read ${ROOT}/CONTRACTS.md and ${ROOT}/tests/fixtures/*.
Implement these modules per roadmap PART 3 prompts 1–7, each with type hints and a __main__ test entry,
all working in MOCK_MODE offline:
- ingest.py: yt-dlp+ffprobe interface; MOCK_MODE => copy/treat a local path & emit metadata json
  (skip real download). Real branch uses yt-dlp.
- transcribe.py: real branch = WhisperX large-v3 + align + pyannote diarization. MOCK_MODE => return
  tests/fixtures/transcript.sample.json. (Note: WhisperX 3.3.4+ moved DiarizationPipeline; import
  defensively with try/except and a TODO comment.)
- score_clips.py + prompts/virality_rubric.txt: real branch = OpenAI GPT-4o-mini JSON mode with the
  rubric; MOCK_MODE => deterministic heuristic scorer over the transcript that returns the same JSON
  shape (sentence-boundary clips 20–90s, dedupe >50% overlap keeping higher score).
- extract.py: ffmpeg cut (stream-copy where possible). MOCK_MODE => write tiny placeholder files / skip
  if ffmpeg absent, but log intended command.
- reframe.py: real branch = PySceneDetect + face/LR-ASD virtual-camera crop to 1080x1920 with
  velocity-bounded smoothing. MOCK_MODE => no-op that records intended crop plan per clip.
- captions.py: build .ass karaoke (\\k word highlight) from per-word timing, RTL-capable (test an
  Arabic string), burn-in via ffmpeg h264_nvenc (libx264 fallback). MOCK_MODE => generate the .ass
  file for real (that's pure text, testable offline) and skip burn-in if no ffmpeg.
- run.py: orchestrate ingest→transcribe→score→extract→reframe→captions; resumable (skip completed
  stages), per-stage timing, rich summary table.
TEST: run \`python pipeline/run.py --clips 5 --mock\` (add CLI flags) end-to-end on the fixture and
ensure it completes and prints a 5-row summary. Also run any pytest you add. Report exact commands.`

const API_TASK = SHARED + `
SUBSYSTEM: app/api/ (NestJS + TypeScript, strict). Read ${ROOT}/CONTRACTS.md.
Scaffold per roadmap PROMPT 9 (9a–9d) but RUNNABLE LOCALLY WITHOUT external services:
- NestJS app: config module, health endpoint.
- Prisma schema (Postgres) with Organization, Job, Clip, Credit models; EVERY table has organization_id.
- Auth: Clerk JWT guard, but provide a MOCK_AUTH mode (env) that injects a fake org so it runs without Clerk keys.
- Jobs: POST /jobs (validate credits, enqueue), GET /jobs/:id (status+progress), GET /clips (signed URLs;
  mock returns fake URLs). BullMQ wiring present but guarded so the app boots without Redis (in-memory
  fallback queue for local dev). WebSocket gateway emitting progress events matching CONTRACTS.md.
- Billing: Credit model (1 credit=1 source-minute), Stripe Checkout + webhook handler stubs (guarded; no
  Stripe key needed to boot). Tiers: Free 30/mo, Starter $12/150, Pro $25/300.
Make it BOOT locally: \`npm install\` then a dev script that starts on API_PORT without Postgres/Redis/Clerk/Stripe
keys (use mock/in-memory fallbacks, log that it's in mock mode).
TEST: install, build (tsc), start the server, curl the health endpoint and POST /jobs, confirm 2xx. Report commands & output.`

const WEB_TASK = SHARED + `
SUBSYSTEM: app/web/ (Next.js 14 App Router + Tailwind + TypeScript). Read ${ROOT}/CONTRACTS.md.
Build per roadmap PROMPT 10 (10a–10c), RUNNABLE LOCALLY and visually complete with MOCK DATA:
- Landing page, dashboard shell. Clerk wired but with a mock/dev mode so it renders without Clerk keys.
- Core flow: paste-URL/upload page → submit → live progress view → clip gallery (vertical video cards
  with virality score badge, hook line, download button). Use MOCK data / a local mock API client so the
  whole flow is clickable WITHOUT the backend running (toggle to real API via NEXT_PUBLIC_API_URL).
- Light editor: per-clip trim handles, caption text edit, style/template picker, re-render button.
Style it to actually look like a product (Tailwind, dark UI, clean cards) since it WILL be screenshotted.
TEST: \`npm install\` then \`npm run build\` must succeed. Confirm \`npm run dev\` starts. Report exact commands & any build output. Do NOT leave type errors.`

phase('Build')
const builds = await parallel([
  () => agent(PIPELINE_TASK, { label: 'build:pipeline', phase: 'Build', schema: BUILD_SCHEMA }),
  () => agent(API_TASK, { label: 'build:api', phase: 'Build', schema: BUILD_SCHEMA }),
  () => agent(WEB_TASK, { label: 'build:web', phase: 'Build', schema: BUILD_SCHEMA }),
])

const ok = builds.filter(Boolean)
log(`Build done: ${ok.map(b => `${b.subsystem}=${b.tests_passed ? 'PASS' : 'FAIL'}`).join(', ')}`)

// ── Phase 3: integration verification ──
phase('Verify')
const verify = await agent(
  SHARED + `
TASK: VERIFY the scaffold works locally. Do NOT rewrite features — only confirm and fix small blockers.
1. Pipeline: run \`python pipeline/run.py --clips 5 --mock\` from ${ROOT}. Confirm it completes with a 5-row summary.
2. API: from ${ROOT}/app/api run install+build; start the server in mock mode; hit /health. (If install is heavy/slow,
   at least confirm tsc build passes and the boot script is correct.)
3. Web: from ${ROOT}/app/web run install + \`npm run build\`. Confirm build succeeds with no type errors.
Build summaries from the builders: ${JSON.stringify(ok.map(b => ({ s: b.subsystem, p: b.tests_passed, n: b.notes })))}.
Fix only trivial breakages (missing import, wrong script name, lockfile). Report what passed, what failed, and concrete issues.`,
  { label: 'verify', phase: 'Verify', schema: VERIFY_SCHEMA }
)

return { contract, builds: ok, verify }
