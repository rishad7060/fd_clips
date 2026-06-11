export const meta = {
  name: 'wire-web-pipeline',
  description: 'Wire web -> NestJS API -> real Python pipeline so the browser shows real Gemini-scored clips',
  phases: [
    { title: 'Implement', detail: 'Real worker, static file serving, queue toggle, web env' },
    { title: 'Verify', detail: 'Boot API+web, submit a job, confirm real clips appear' },
  ],
}

const ROOT = 'C:/Projects/Opus_clip_clone'
const API = ROOT + '/app/api'
const WEB = ROOT + '/app/web'

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['part', 'files_changed', 'tests_run', 'tests_passed', 'notes'],
  properties: {
    part: { type: 'string' },
    files_changed: { type: 'array', items: { type: 'string' } },
    tests_run: { type: 'string' },
    tests_passed: { type: 'boolean' },
    notes: { type: 'string' },
  },
}

const SHARED = `
PROJECT: FocalDive Clips. Repo root: ${ROOT}. READ ${ROOT}/CLAUDE.md and ${ROOT}/CONTRACTS.md first.
GOAL: connect the Next.js web app -> NestJS API -> the REAL Python pipeline so a pasted YouTube URL produces
REAL Gemini-scored, faster-whisper-transcribed, FFmpeg-cut clips shown in the browser (no more mock data).

KEY EXISTING PIECES (study before editing; do NOT break the mock path / 15 pytests / existing API mock mode):
- The Python pipeline entrypoint is ${ROOT}/pipeline/run.py. It now supports a parent-process protocol:
    python pipeline/run.py "<source-url-or-path>" --clips N --job-id <ID> --json-progress
  It prints lines:  '@@PROGRESS@@ {json}'  per stage (fields: type,stage,status,progress,message; stage in
  ingest|transcribe|score|extract|reframe|captions; progress is cumulative 0-100), and a final
  '@@RESULT@@ {summary json}' (fields include job_id, model, clip_count, rows[] where each row has
  rank,score,hook,title,start,end,duration,final_path,final_exists). It writes outputs to
  workspace/<job-id>/clips.json and workspace/<job-id>/clips/<rank>_final.mp4 (+ _raw, _vertical, .ass).
  Run it from ${ROOT} so relative workspace/ resolves. The python on PATH is 'python'.
- API queue wiring: ${API}/src/queue/queue.module.ts chooses BullMQ (if redis) else MemoryQueue(MockWorker).
  MockWorker is ${API}/src/queue/mock-worker.ts (emits JobProgressEvent via ProgressBus, writes Clip rows).
  The JobQueuePayload shape is in ${API}/src/queue/queue.types.ts (snake_case, CONTRACTS §1).
- Clip rows: store.createClip(...) (see ${API}/src/persistence/store.types.ts). Clips are served with signed
  URLs by ${API}/src/storage/storage.service.ts (mock returns fake mock-r2.local URLs). The web's GET /clips
  path returns clips with those URLs.
- AppConfigService (${API}/src/config/config.service.ts) exposes flags + env. Add a flag for the real pipeline.
- Web API client: ${WEB}/src/lib/api.ts toggles on NEXT_PUBLIC_API_URL (empty => in-app mock store).

RULES:
- ADDITIVE: keep MockWorker and the in-memory mock path fully working (they are the default and CI relies on them).
- Type-safe (NestJS strict TS). Lazy/guarded. Don't touch the Python pipeline modules (run.py is already done).
- Stay within your assigned files. Coordinate via the contracts above.
`

phase('Implement')

const WORKER = SHARED + `
YOUR TASK (API — real pipeline worker + queue toggle):
1. Create ${API}/src/queue/real-pipeline.worker.ts exporting a RealPipelineWorker with the SAME shape/process()
   contract as MockWorker (constructor takes {store, bus, onFailure, ...}; async process(payload)). It must:
   - spawn 'python' with args: ['pipeline/run.py', payload.source_url, '--clips', String(payload.clip_count),
     '--job-id', payload.job_id, '--json-progress'], cwd=${ROOT}. Use Node child_process.spawn.
   - On each stdout line starting with '@@PROGRESS@@ ', JSON.parse the rest and emit a JobProgressEvent
     (map stage->stage, progress->progress, status 'running', message). On '@@RESULT@@ ' capture the summary.
   - On process exit 0: read ${ROOT}/workspace/<job-id>/clips.json, create a Clip row per candidate (rank by order,
     top clip_count) with finalKey set to a LOCAL key the storage layer can serve (see STORAGE task): use key
     '<orgId>/<jobId>/clips/<rank>_final.mp4' (same shape as MockWorker) — the file actually lives at
     workspace/<jobId>/clips/<rank>_final.mp4. Update job status running->completed with progress 100; emit final event.
   - On non-zero exit or error: set job failed, call onFailure to refund, emit failed event. Log stderr.
   - updateJob at the start (running, ingest, 0) like MockWorker.
2. Edit ${API}/src/queue/queue.module.ts: when config flag useRealPipeline is true (env USE_REAL_PIPELINE=true),
   build MemoryQueue(new RealPipelineWorker({...})) instead of MockWorker. Keep all existing branches intact.
3. Edit ${API}/src/config/config.service.ts to expose flags.useRealPipeline from env USE_REAL_PIPELINE.
TEST: nest build (tsc strict) compiles clean. You can't easily run a full job here, but ensure the module wires and
the worker compiles; note that the Verify phase runs it live. Report exact build command + result.`

const STORAGE = SHARED + `
YOUR TASK (API — serve real local clip files over HTTP):
The produced clips live on local disk at ${ROOT}/workspace/<jobId>/clips/<rank>_final.mp4 (no R2 in local mode).
The browser must be able to GET them.
1. Add a static/streaming file controller, e.g. ${API}/src/files/files.controller.ts + files.module.ts, route
   GET /files/:jobId/:name that streams ${ROOT}/workspace/<jobId>/clips/<name> (validate name: only \\w, digits,
   underscore, dot, .mp4/.jpg; reject path traversal). Set correct content-type; support range requests if easy
   (StreamableFile is fine). Register the module in app.module.ts.
2. Edit ${API}/src/storage/storage.service.ts signKey(): when a new flag flags.localFiles is true (env
   LOCAL_FILES=true, default true when USE_REAL_PIPELINE=true), turn a key like '<org>/<job>/clips/<rank>_final.mp4'
   into an absolute URL the browser can hit: \`\${PUBLIC_API_URL}/files/<job>/<rank>_final.mp4\` (derive PUBLIC_API_URL
   from env API_PUBLIC_URL or build from API_PORT, default http://localhost:4000). Keep the existing mock-r2.local
   behaviour when localFiles is false. Keep the real-R2 branch.
3. Expose the needed flags/env in ${API}/src/config/config.service.ts (coordinate: another agent also edits this
   file to add useRealPipeline — only ADD your localFiles flag + API_PUBLIC_URL getter, do not remove theirs;
   use distinct additions and merge-friendly edits).
TEST: nest build compiles clean. Start the server, curl GET /files/realtest/1_final.mp4 (a real clip from an earlier
run exists at ${ROOT}/workspace/realtest/clips/1_final.mp4) and confirm it streams bytes (HTTP 200, video/mp4).
Report commands + result.`

const WEBENV = SHARED + `
YOUR TASK (Web — point at the real API, verify shapes):
1. Create ${WEB}/.env.local with NEXT_PUBLIC_API_URL=http://localhost:4000  (so the web calls the real NestJS API,
   not the in-app mock store). Also ensure ${WEB}/.gitignore ignores .env.local (it likely already does via .env*).
2. Review ${WEB}/src/lib/api.ts and ${WEB}/src/lib/types.ts against CONTRACTS.md and the real API responses:
   - GET /clips?job_id=... returns the clip list; confirm the web maps fields (snake_case from API) to what
     ClipCard expects. The clip's playable/downloadable URL comes from the signed URL (now a /files/... URL).
   - The live progress page subscribes via WebSocket in real mode (api.subscribeProgress). Confirm the WS URL it
     builds matches the API gateway namespace '/ws' room 'job:{job_id}' (see ${API}/src/progress/progress.gateway.ts).
     If the URL is wrong, FIX the web client to match the gateway (do not change the gateway).
   - Fix any field-name mismatches so real clips render (video src + download href point at the signed URL).
3. Do NOT break mock mode (empty NEXT_PUBLIC_API_URL must still work). The .env.local just sets the default for dev.
TEST: cd ${WEB}; npm run build (must pass, no type errors); npm run typecheck. Report commands + any mapping fixes made.`

const impl = await parallel([
  () => agent(WORKER, { label: 'wire:worker', phase: 'Implement', schema: SCHEMA }),
  () => agent(STORAGE, { label: 'wire:storage', phase: 'Implement', schema: SCHEMA }),
  () => agent(WEBENV, { label: 'wire:web', phase: 'Implement', schema: SCHEMA }),
])
const done = impl.filter(Boolean)
log(`Implement: ${done.map(d => `${d.part}=${d.tests_passed ? 'PASS' : 'FAIL'}`).join('; ')}`)

phase('Verify')
const verify = await agent(
  SHARED + `
TASK: VERIFY the full wiring works end-to-end locally, in REAL pipeline mode. Fix only small integration breakages
(wrong env name, import, route registration, field mapping) — do not redesign.
SETUP/RUN (from ${ROOT}):
  1. Build the API: cd ${API}; npm run build  (must be clean).
  2. Start the API in REAL mode with the Gemini/free-CPU env so submitted jobs run the real pipeline:
     env: USE_REAL_PIPELINE=true, LOCAL_FILES=true, MOCK_AUTH=true, API_PORT=4000, and the pipeline reads ${ROOT}/.env
     for GEMINI_API_KEY/etc. Boot: node dist/main.js  (background). Confirm GET /health 200.
  3. Confirm static serving: curl GET http://localhost:4000/files/realtest/1_final.mp4 -> 200 video/mp4 (this file
     exists from an earlier pipeline run). If 404, fix the files controller / path mapping.
  4. Submit a SMALL real job via the API:
     POST /jobs  {"source_type":"url","source_url":"https://www.youtube.com/watch?v=Unzc731iCUY","clip_count":2}
     (Header for mock auth if required.) This spawns python pipeline/run.py for real. Poll GET /jobs/:id until
     status=completed or failed (allow a few minutes — CPU transcription). Then GET /clips?job_id=:id and confirm
     it returns clips with real scores and /files/... URLs, and that those URLs stream video.
     NOTE: yt-dlp here has no JS runtime; if that exact video fails to download, FALL BACK to submitting a job with
     source_url set to a LOCAL path that already exists: ${ROOT}/workspace/realtest/source.mp4  (run.py accepts a
     local file path as source). Use whichever yields a real completed job; report which you used.
  5. (Optional, time permitting) Start the web with NEXT_PUBLIC_API_URL=http://localhost:4000 and confirm /new ->
     submit hits the real API. Screenshots not required here.
Implementer notes: ${JSON.stringify(done.map(d => ({ p: d.part, ok: d.tests_passed, n: (d.notes || '').slice(0, 300) })))}
REPORT: what booted, the job's final status, the clips returned (count + a sample score + a sample URL), whether the
file URL streamed, and any fixes you made.`,
  { label: 'verify:wiring', phase: 'Verify', schema: {
      type: 'object', additionalProperties: false,
      required: ['api_booted', 'static_serving_ok', 'job_status', 'clips_returned', 'source_used', 'issues', 'verdict'],
      properties: {
        api_booted: { type: 'boolean' },
        static_serving_ok: { type: 'boolean' },
        job_status: { type: 'string' },
        clips_returned: { type: 'integer' },
        source_used: { type: 'string' },
        issues: { type: 'array', items: { type: 'string' } },
        verdict: { type: 'string' },
      },
    } }
)

return { impl: done, verify }
