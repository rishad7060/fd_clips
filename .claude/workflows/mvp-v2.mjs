export const meta = {
  name: 'mvp-v2',
  description: 'Evolve FocalDive to the v2 $0 MVP: Groq transcribe, MediaPipe crop, email worker, one-page web',
  phases: [
    { title: 'Build', detail: 'Groq transcribe, MediaPipe reframe, email worker, MVP web — in parallel' },
    { title: 'Verify', detail: 'Run each module; confirm no breakage and mock path intact' },
  ],
}

const ROOT = 'C:/Projects/Opus_clip_clone'
const FFMPEG = 'C:/Users/Rs Computers/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.1-full_build/bin/ffmpeg.exe'
const FFPROBE = 'C:/Users/Rs Computers/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.1-full_build/bin/ffprobe.exe'

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
PROJECT: FocalDive Clips. Repo root: ${ROOT}. READ ${ROOT}/CLAUDE.md, ${ROOT}/CONTRACTS.md, and the v2 MVP
roadmap ${ROOT}/fd_clips_v2.md FIRST. We are EVOLVING the existing working code to the v2 $0 MVP — NOT rewriting
from scratch. Reuse what works; change only what v2 requires.

WHAT ALREADY WORKS (do not break): the mock path + 15 pytests in tests/test_pipeline.py; Gemini scoring
(pipeline/score_clips.py); FFmpeg cuts + ASS captions + thumbnails (extract/reframe/captions.py); the
NestJS API + Next.js web wiring (web -> /jobs -> RealPipelineWorker -> run.py --json-progress -> /files).

CONFIG API (ALREADY DONE in pipeline/config.py — DO NOT modify config.py):
- settings.resolved_transcribe_backend() -> 'groq' | 'whisperx' | 'faster-whisper' | 'mock'
- settings.groq_api_key, settings.groq_model ('whisper-large-v3')
- settings.resolved_scoring_provider() -> 'gemini' | 'openai' | 'mock'; settings.gemini_api_key/model
- settings.resend_api_key, settings.email_from
- settings.ffmpeg_path, settings.ffprobe_path, settings.workspace(job_id), settings.repo_root, settings.mock_mode

HARD RULES (the user explicitly asked for these):
- NO MISTAKES: every module you touch must actually RUN and be verified (run its __main__ / a smoke test).
  Keep the mock path working — run \`python -m pytest tests/test_pipeline.py -q\` and ensure 15 pass.
- COMMENT THE ADVANCED CODE FOR LATER: where you implement the MVP-simple version of something, add a clear
  comment block documenting the Phase-2 upgrade (e.g. "# PHASE 2: swap MediaPipe center-crop for LR-ASD
  active-speaker tracking — see fd_clips_v2.md Part 5"). Future devs must understand what to turn on later.
- Lazy-import heavy/paid deps (groq, mediapipe, resend) INSIDE the real branch only; mock stays import-free.
- Type hints; each pipeline module keeps a runnable __main__.
- MVP scope per v2: 3 clips, 20-60s, single-speaker/talking-head. Don't add features beyond the roadmap.
- FFmpeg here (NOT on bash PATH): ${FFMPEG} / ${FFPROBE}. To test, set FFMPEG_PATH/FFPROBE_PATH env.
- Stay within your assigned files. config.py is already done — never edit it.
`

phase('Build')

const GROQ = SHARED + `
YOUR MODULE: ${ROOT}/pipeline/transcribe.py — add the 'groq' transcription branch (v2 MVP default).
transcribe() dispatches on settings.resolved_transcribe_backend(): currently mock/whisperx/faster-whisper.
Add 'groq' -> new _transcribe_groq(job_id, source_path).
_transcribe_groq: lazy 'from groq import Groq'; client = Groq(api_key=settings.groq_api_key).
- Groq's audio API caps file size (~25MB) and wants audio, not video. Extract a compressed audio track first
  with ffmpeg (settings.ffmpeg_path): -vn -ac 1 -ar 16000 -c:a libmp3lame (or aac) -> workspace/{job}/audio.mp3.
  This keeps even long videos under the limit.
- Call client.audio.transcriptions.create(file=..., model=settings.groq_model,
  response_format='verbose_json', timestamp_granularities=['word','segment']). Map the response to the
  CONTRACTS §2 transcript shape: top-level {job_id, language, duration, source, segments[]} where each segment
  has {text,start,end,speaker,words[]} and words[] = {word,start,end}. speaker='SPEAKER_00' (no diarization on
  the free MVP path — COMMENT that pyannote diarization is the Phase-2 upgrade for multi-speaker).
- Handle Groq rate limits: retry with exponential backoff on 429/RateLimitError (e.g. 3 tries, 2/4/8s),
  and surface a clear error if still failing. COMMENT that queueing jobs to stay within the free daily quota
  is the production approach (fd_clips_v2.md Part 2 caveat).
TEST: mock still works -> python pipeline/transcribe.py (prints segments); pytest 15 pass. The live Groq call
needs GROQ_API_KEY (the Verify phase / user runs it). Note in your report that a real media file + key is needed.`

const CROP = SHARED + `
YOUR MODULE: ${ROOT}/pipeline/reframe.py — replace the center-crop fallback with MediaPipe face-detect smart crop.
Per v2 Prompt 3: MediaPipe face detection sampled every ~5th frame, exponential-moving-average (EMA) smoothed
crop window centered on the dominant (largest/most-confident) face, fallback to center crop when no face is found,
output 1080x1920. CPU only, libx264.
- Keep the existing dispatch (mock vs real) and the CropPlan json output shape; the mock branch is untouched.
- Real branch (_reframe_real or equivalent): lazy 'import mediapipe as mp' + cv2. Open the raw clip with OpenCV,
  sample every 5th frame, run mp.solutions.face_detection (or the Tasks FaceDetector), pick the dominant face,
  convert its box center to a 9:16 crop window, EMA-smooth the center across samples (alpha ~0.2-0.3) so the
  camera doesn't jitter, clamp to frame bounds. Build an ffmpeg crop=w:h:x:y,scale=1080:1920 filter (a single
  static window per clip is fine for MVP — COMMENT that per-frame/animated crop paths via sendcmd and LR-ASD
  active-speaker tracking are the Phase-2 upgrades, see fd_clips_v2.md Part 5). libx264, no nvenc.
- No-ffmpeg / no-face: keep the graceful center-crop + placeholder fallback so mock/CI passes.
TEST: pytest 15 pass; run reframe on a real raw clip if one exists at workspace/*/clips/*_raw.mp4 (set FFMPEG_PATH),
else confirm the code path with a synthesized test clip via ffmpeg. Report dimensions of any output (must be 1080x1920).`

const WORKER = SHARED + `
YOUR MODULE: create ${ROOT}/pipeline/worker.py (NEW) per v2 Prompt 5 — a queue worker that runs the pipeline and
emails the finished clips. This is the Python-side worker described in the roadmap (separate from the NestJS
RealPipelineWorker, which already exists; do NOT touch the NestJS code).
- worker.py: a standalone module exposing process_job(job: dict) where job = {job_id, email, url} and a
  __main__ that runs ONE manual job end-to-end for testing.
  Steps: call pipeline.run.run_pipeline(url, job_id, clip_count=3), then upload the 3 final clips to R2 and email
  the customer signed links via Resend.
- R2 upload: lazy 'import boto3' (S3 API to settings.r2_endpoint with r2_* creds). When R2 is NOT configured
  (settings.r2_configured False), FALL BACK to leaving files in workspace/{job}/clips and emailing/logging local
  /files-style references — so the worker is testable now without R2. COMMENT the R2 7-day-expiry lifecycle as
  the production setup (fd_clips_v2.md Part 2).
- Email: lazy 'import resend'. When settings.resend_api_key is set, send a clean HTML email (subject "Your 3
  FocalDive clips are ready", from settings.email_from, the 3 links + scores/hooks). When NOT set, LOG the email
  content instead of sending (so it's testable offline). COMMENT this.
- A BullMQ-compatible Redis consumer is the production entrypoint; for the MVP, COMMENT how it would attach
  (the NestJS side already enqueues) and provide the process_job() function it would call. Don't require Redis to
  run the __main__ test.
TEST: python pipeline/worker.py --help works; run process_job once in mock mode (MOCK_MODE=true) on the demo job
or a synthesized job and confirm it completes, produces 3 clip references, and logs the email (no real send).
Report exact command + result. Do not break pytests.`

const WEB = SHARED + `
YOUR AREA: ${ROOT}/app/web — trim to the v2 MVP UI (Prompt 6) WITHOUT breaking the build.
v2 MVP web = a focused flow, NOT the full editor:
- Landing/home with a single "paste YouTube URL + email" submit form (Clerk sign-in already wired; keep mock-auth
  dev mode working). On submit -> POST /jobs (camelCase body: sourceType:'url', sourceUrl, clipCount:3) -> show a
  confirmation: "Your 3 clips will arrive by email in ~30 minutes" + a link to the results page.
- A /clips (or /jobs) results page listing the user's past jobs with their clip links (the existing gallery is
  fine to reuse; just ensure it works against the real API).
- CUT the editor from the MVP nav/flow: the per-clip editor route (jobs/[jobId]/clips/[rank]) should NOT be a
  promoted path. Do NOT delete the file — instead COMMENT at its top that it's a Phase-2 feature (editing/trim/
  re-render is cut from the MVP per fd_clips_v2.md) and remove links to it from the gallery cards (replace 'Edit'
  with nothing, or keep Download only). Preserve the component for later.
- Default clip count to 3 and cap the slider at 3 for the MVP (COMMENT that 5-10 is the Phase-2 range).
- Keep the dark product styling. Mock mode (empty NEXT_PUBLIC_API_URL) must still render.
TEST: cd ${ROOT}/app/web; npm run build (NO type errors); npm run typecheck. Report commands + what you changed.
Do NOT introduce type errors or break existing routes.`

const builds = await parallel([
  () => agent(GROQ, { label: 'build:groq', phase: 'Build', schema: SCHEMA }),
  () => agent(CROP, { label: 'build:mediapipe', phase: 'Build', schema: SCHEMA }),
  () => agent(WORKER, { label: 'build:worker', phase: 'Build', schema: SCHEMA }),
  () => agent(WEB, { label: 'build:web', phase: 'Build', schema: SCHEMA }),
])
const done = builds.filter(Boolean)
log(`Build: ${done.map(d => `${d.part}=${d.tests_passed ? 'PASS' : 'FAIL'}`).join('; ')}`)

phase('Verify')
const verify = await agent(
  SHARED + `
TASK: VERIFY the v2 MVP build is consistent and nothing is broken. Fix only small integration breakages.
1. Mock path intact: cd ${ROOT}; python -m pytest tests/test_pipeline.py -q  -> MUST be 15 passed.
2. Each pipeline module imports & its __main__ runs in mock mode:
   python pipeline/transcribe.py ; python pipeline/reframe.py ; python pipeline/run.py --clips 3 --mock --force --job-id mvpcheck
   (the full mock run must print a 3-row summary).
3. worker.py: python pipeline/worker.py --help (and a mock process_job run if quick) — confirm it wires.
4. Web builds: cd ${ROOT}/app/web; npm run build -> succeeds, no type errors.
5. Confirm the 'advanced code commented for later' rule was honored: grep the touched modules for PHASE 2 / Phase-2
   comments (transcribe groq diarization, reframe LR-ASD, worker R2/Resend, web editor). Note which exist.
Builder notes: ${JSON.stringify(done.map(d => ({ p: d.part, ok: d.tests_passed, n: (d.notes || '').slice(0, 250) })))}
REPORT: pytest result, which module __main__ ran, mock run summary row count, web build result, and any fixes made.`,
  { label: 'verify:mvp', phase: 'Verify', schema: {
      type: 'object', additionalProperties: false,
      required: ['pytests_pass', 'mock_run_clips', 'web_build_ok', 'phase2_comments_present', 'issues', 'verdict'],
      properties: {
        pytests_pass: { type: 'boolean' },
        mock_run_clips: { type: 'integer' },
        web_build_ok: { type: 'boolean' },
        phase2_comments_present: { type: 'boolean' },
        issues: { type: 'array', items: { type: 'string' } },
        verdict: { type: 'string' },
      },
    } }
)

return { builds: done, verify }
