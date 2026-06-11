export const meta = {
  name: 'free-cpu-path',
  description: 'Wire the free CPU path: Gemini scoring + faster-whisper CPU transcribe + FFmpeg real cuts/captions',
  phases: [
    { title: 'Implement', detail: 'Add real branches to transcribe, score, extract/reframe/captions' },
    { title: 'Verify', detail: 'End-to-end real run on a short YouTube video' },
  ],
}

const ROOT = 'C:/Projects/Opus_clip_clone'
const FFMPEG = 'C:/Users/Rs Computers/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.1-full_build/bin/ffmpeg.exe'
const FFPROBE = 'C:/Users/Rs Computers/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.1-full_build/bin/ffprobe.exe'

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['module', 'files_changed', 'tests_run', 'tests_passed', 'notes'],
  properties: {
    module: { type: 'string' },
    files_changed: { type: 'array', items: { type: 'string' } },
    tests_run: { type: 'string' },
    tests_passed: { type: 'boolean' },
    notes: { type: 'string' },
  },
}

const SHARED = `
PROJECT: FocalDive Clips. Repo root: ${ROOT}. READ ${ROOT}/CLAUDE.md and ${ROOT}/CONTRACTS.md first.
We are adding a FREE CPU PATH so a real YouTube video becomes real short clips with NO GPU and NO paid API
(Gemini free tier scores; faster-whisper transcribes on CPU; FFmpeg cuts + burns captions with libx264).

CONFIG API (already implemented in ${ROOT}/pipeline/config.py — DO NOT modify config.py):
- settings.resolved_scoring_provider() -> 'gemini' | 'openai' | 'mock'
- settings.resolved_transcribe_backend() -> 'whisperx' | 'faster-whisper' | 'mock'
- settings.gemini_api_key, settings.gemini_model (default 'gemini-2.0-flash')
- settings.faster_whisper_model (e.g. 'small'), settings.whisperx_device
- settings.ffmpeg_path, settings.ffprobe_path  (may be just 'ffmpeg'/'ffprobe' if on PATH)
- settings.mock_mode, settings.workspace(job_id), settings.repo_root

IMPORTANT BEHAVIOUR RULES:
- Existing mock branches MUST keep working unchanged (mock_mode=True path is sacred — 15 pytests rely on it).
- New real branches dispatch on the resolved_* helpers, NOT on a raw boolean. So a module may be in
  'mock' for scoring but 'faster-whisper' for transcription independently.
- All deps are lazy-imported inside the real branch only (faster_whisper, google.genai, yt_dlp) so mock stays import-free.
- Gemini: use the NEW google-genai SDK:  from google import genai;  client = genai.Client(api_key=...);
  resp = client.models.generate_content(model=..., contents=..., config={'response_mime_type':'application/json'})
  Parse resp.text as JSON. Return the SAME shape as the OpenAI branch ({job_id, model, candidates[...]}).
- faster-whisper: from faster_whisper import WhisperModel; model = WhisperModel(name, device='cpu', compute_type='int8');
  segments, info = model.transcribe(audio_path, word_timestamps=True). Map to CONTRACTS §2 shape
  (segments[].words[].{word,start,end}; speaker='SPEAKER_00' — no diarization on the free path, that's fine).
- FFmpeg on THIS machine is at: ${FFMPEG}  (ffprobe at ${FFPROBE}). It is NOT on the bash PATH in this session,
  so when you run/test, pass the full path or set FFMPEG_PATH/FFPROBE_PATH env. Use libx264 (NO nvenc — no GPU).
- Type hints; keep each module's __main__ entry working.
- Do NOT touch files outside your assigned module(s). Do NOT modify config.py.
`

phase('Implement')
const TRANSCRIBE = SHARED + `
YOUR MODULE: ${ROOT}/pipeline/transcribe.py
Add a 'faster-whisper' branch. transcribe() currently dispatches on settings.mock_mode -> _transcribe_mock
else _transcribe_real (whisperx). Change the dispatch to use settings.resolved_transcribe_backend():
  'mock' -> _transcribe_mock (unchanged)
  'whisperx' -> _transcribe_real (unchanged)
  'faster-whisper' -> NEW _transcribe_faster_whisper(job_id, source_path)
The faster-whisper branch: lazy 'from faster_whisper import WhisperModel'; load settings.faster_whisper_model on
device='cpu', compute_type='int8'; transcribe the source (mp4/audio) with word_timestamps=True; map to the
CONTRACTS §2 transcript shape (job_id, language, duration, source, segments[] with words[]). speaker='SPEAKER_00'.
It must accept either an audio or video file path (faster-whisper reads via ffmpeg/av automatically).
TEST (mock still works): cd ${ROOT}; python pipeline/transcribe.py  (mock path, prints 3 segments).
Note in your report that the faster-whisper branch needs a real media file to fully exercise (the Verify phase does that).`

const SCORE = SHARED + `
YOUR MODULE: ${ROOT}/pipeline/score_clips.py
Add a 'gemini' branch. score_clips() currently dispatches on settings.mock_mode -> _score_mock else _score_real.
Change dispatch to settings.resolved_scoring_provider():
  'mock' -> _score_mock (unchanged)
  'openai' -> _score_real (unchanged; keep the model name in result['model'])
  'gemini' -> NEW _score_gemini(job_id, transcript)
_score_gemini: lazy 'from google import genai'; client = genai.Client(api_key=settings.gemini_api_key);
build the SAME prompt as _score_real (rubric file as system instruction + the compact transcript text);
call client.models.generate_content(model=settings.gemini_model, contents=<prompt>,
config={'response_mime_type':'application/json'}); json.loads(resp.text); enforce the same 20-90s length
bounds; return {job_id, model: settings.gemini_model, candidates}. The rubric file path is
settings.repo_root/'pipeline'/'prompts'/'virality_rubric.txt'. Reuse helpers; don't duplicate the rubric text.
TEST (mock still works): cd ${ROOT}; python pipeline/score_clips.py  (mock heuristic, prints ranked list);
python -m pytest ${ROOT}/tests/test_pipeline.py -q  (existing tests still pass).
Note that the gemini branch needs a real GEMINI_API_KEY to exercise live (Verify phase / user does that).`

const FFMPEG_TRIO = SHARED + `
YOUR MODULES: ${ROOT}/pipeline/extract.py, ${ROOT}/pipeline/reframe.py, ${ROOT}/pipeline/captions.py
Make the FFmpeg paths REAL on CPU (libx264) when ffmpeg is available, while keeping the mock/no-ffmpeg
fallback. Currently these modules likely gate on settings.mock_mode and write placeholders when ffmpeg is absent.
Change them so that when NOT mock_mode AND ffmpeg is runnable (settings.ffmpeg_path works), they actually:
- extract.py: cut each selected clip from source.mp4 with ffmpeg (stream-copy when keyframe-safe, else
  -c:v libx264 -c:a aac re-encode for frame accuracy) -> clips/{n}_raw.mp4. Keep extract.json manifest.
- reframe.py: CPU center-crop-to-9:16 fallback (NO LR-ASD, NO GPU): scale/crop source 16:9 (or whatever) to
  1080x1920 via ffmpeg crop+scale filter -> clips/{n}_vertical.mp4. Keep the CropPlan json. Document that smart
  active-speaker reframe is the GPU upgrade; center-crop is the free fallback.
- captions.py: KEEP the real .ass generation (already real). For burn-in, when ffmpeg is available, actually burn
  the .ass onto {n}_vertical.mp4 with -vf subtitles=...:fontsdir libx264 -> {n}_final.mp4 (NOT nvenc).
Helper: add a small shared check that resolves the ffmpeg binary (settings.ffmpeg_path, fall back to shutil.which).
When ffmpeg is genuinely absent, keep the current placeholder+log behaviour so mock/CI still passes.
FFmpeg here: ${FFMPEG}  — not on bash PATH, so to TEST set the env first:
  FFMPEG_PATH="${FFMPEG}" FFPROBE_PATH="${FFPROBE}" python pipeline/captions.py --selftest
TEST: run each module's __main__/selftest; confirm .ass still generates; confirm graceful no-ffmpeg fallback by
also running once without FFMPEG_PATH. Don't break the 15 pytests.`

const impl = await parallel([
  () => agent(TRANSCRIBE, { label: 'impl:transcribe', phase: 'Implement', schema: SCHEMA }),
  () => agent(SCORE, { label: 'impl:score', phase: 'Implement', schema: SCHEMA }),
  () => agent(FFMPEG_TRIO, { label: 'impl:ffmpeg', phase: 'Implement', schema: SCHEMA }),
])
const done = impl.filter(Boolean)
log(`Implement: ${done.map(d => `${d.module}=${d.tests_passed ? 'PASS' : 'FAIL'}`).join(', ')}`)

phase('Verify')
const verify = await agent(
  SHARED + `
TASK: Prove the free CPU path works END-TO-END on a REAL short video — WITHOUT any API key (so use a real
faster-whisper transcription + real ffmpeg cuts, but scoring stays on the deterministic mock since no GEMINI key
is set yet). This isolates the video tooling, which is what needs proving; the user will add their free Gemini key
after and that swaps only the scoring step.
STEPS (run from ${ROOT}, set ffmpeg env):
  set FFMPEG_PATH="${FFMPEG}", FFPROBE_PATH="${FFPROBE}", TRANSCRIBE_BACKEND=faster-whisper, SCORING_PROVIDER=mock, MOCK_MODE=false
  1. Download a SHORT real video (<= ~60s) with yt-dlp to workspace/realtest/source.mp4. Use a known short clip;
     if download fails (network), FALL BACK to synthesizing a ~30s test mp4 with ffmpeg (testsrc + sine) and a
     spoken-word sample is not required — faster-whisper on silence will still produce timing/structure; note this.
  2. Run: python pipeline/transcribe.py --job-id realtest  (faster-whisper, CPU) — confirm a real transcript.json
     with word timings is produced (report language, #segments, first words).
  3. Run the rest: python pipeline/run.py workspace/realtest/source.mp4 --job-id realtest --clips 3
     (or run extract/reframe/captions directly) and confirm REAL output files exist with non-zero size:
     clips/{n}_raw.mp4, {n}_vertical.mp4 (1080x1920), {n}_final.mp4. ffprobe each to confirm resolution/duration.
  4. Report exact commands, file sizes, ffprobe dimensions, and any failures. Fix only trivial breakages.
Implementer notes: ${JSON.stringify(done.map(d => ({ m: d.module, p: d.tests_passed, n: d.notes })))}`,
  { label: 'verify:e2e', phase: 'Verify', schema: {
      type: 'object', additionalProperties: false,
      required: ['transcribe_ok', 'clips_produced', 'sample_files', 'issues', 'verdict'],
      properties: {
        transcribe_ok: { type: 'boolean' },
        clips_produced: { type: 'integer' },
        sample_files: { type: 'array', items: { type: 'string' } },
        issues: { type: 'array', items: { type: 'string' } },
        verdict: { type: 'string' },
      },
    } }
)

return { impl: done, verify }
