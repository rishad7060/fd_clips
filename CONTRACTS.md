# YT Shorts Clips — Shared Contracts

This file is the **single source of truth** for the JSON shapes that flow between the
four subsystems:

```
web (Next.js) ──HTTP/WS──> api (NestJS) ──BullMQ/Redis──> worker (Docker GPU) ──> pipeline (Python)
                                  │                                │
                                  └──────── Cloudflare R2 ─────────┘
```

Rules for everyone:

- These shapes are **identical in MOCK_MODE and real mode**. Mocks return the same
  fields with canned values; the real implementations drop in without changing callers.
- All times are **seconds (float)** unless suffixed `_ms`. All timestamps are **ISO-8601 UTC**.
- All money/credit values count **source minutes** (1 credit = 1 source-minute).
- Field names are `snake_case` in pipeline/worker JSON and over the wire. The NestJS API
  may expose `camelCase` at its DTO boundary, but the queue payloads and R2 artifacts on
  this page are always `snake_case`.
- Fixtures that conform to these shapes live in `tests/fixtures/`
  (`transcript.sample.json`, `clips.sample.json`).

---

## 1. Job

A job is one video → clips request. Created by the API on `POST /jobs`, enqueued to BullMQ,
consumed by the worker.

### Job (DB / API view)

| Field            | Type                | Required | Notes |
|------------------|---------------------|----------|-------|
| `job_id`         | string (uuid/cuid)  | yes      | Primary key, used as the workspace dir name. |
| `organization_id`| string              | yes      | Tenant scope (every row carries it; RLS guard). |
| `source_type`    | `"url" \| "upload"` | yes      | How the source arrives. |
| `source_url`     | string              | when url | YouTube/remote URL. |
| `source_key`     | string (R2 key)     | when upload | R2 key of the uploaded source (see §5). |
| `clip_count`     | int (1–10)          | yes      | Number of clips requested. |
| `style`          | object              | no       | Caption/template style (see §4 of roadmap captions_style). |
| `status`         | JobStatus           | yes      | See enum below. |
| `progress`       | int (0–100)         | yes      | Overall percent. |
| `stage`          | JobStage            | yes      | Current pipeline stage. |
| `error`          | string \| null      | no       | Set only when `status = "failed"`. |
| `created_at`     | ISO-8601 string     | yes      | |
| `updated_at`     | ISO-8601 string     | yes      | |

### JobStatus (enum)

`queued` · `running` · `completed` · `failed` · `canceled`

### JobStage (enum, ordered)

`ingest` · `transcribe` · `score` · `extract` · `reframe` · `captions` · `done`

### Queue payload (API → worker, BullMQ job `data`)

Minimal payload the worker needs; everything else is looked up by `job_id`.

```json
{
  "job_id": "demo-job-0001",
  "organization_id": "org_2abcXYZ",
  "source_type": "url",
  "source_url": "https://www.youtube.com/watch?v=EXAMPLE",
  "source_key": null,
  "clip_count": 5,
  "style": { "template": "default", "font": "Inter", "highlight_color": "#FFE600" }
}
```

---

## 2. Transcript

Produced by `pipeline/transcribe.py` (WhisperX + pyannote), written to
`workspace/{job_id}/transcript.json` and uploaded to R2. Canonical fixture:
`tests/fixtures/transcript.sample.json`.

### Top level

| Field       | Type                | Required | Notes |
|-------------|---------------------|----------|-------|
| `job_id`    | string              | yes      | |
| `language`  | string (ISO 639-1)  | yes      | e.g. `"en"`, `"ar"`, `"ta"`. |
| `duration`  | float (seconds)     | yes      | Total source duration. |
| `source`    | string              | no       | Relative path/key to the normalized source. |
| `segments`  | TranscriptSegment[] | yes      | Ordered by `start`. |

### TranscriptSegment

| Field     | Type           | Required | Notes |
|-----------|----------------|----------|-------|
| `text`    | string         | yes      | Full segment text. |
| `start`   | float (sec)    | yes      | |
| `end`     | float (sec)    | yes      | |
| `speaker` | string         | yes      | Diarized label, e.g. `"SPEAKER_00"`. |
| `words`   | TranscriptWord[] | yes    | Per-word timing for caption karaoke. |

### TranscriptWord

| Field   | Type        | Required | Notes |
|---------|-------------|----------|-------|
| `word`  | string      | yes      | Token incl. trailing punctuation. |
| `start` | float (sec) | yes      | |
| `end`   | float (sec) | yes      | |

---

## 3. Clip candidate

Produced by `pipeline/score_clips.py` (GPT-4o-mini against
`prompts/virality_rubric.txt`; deterministic heuristic in MOCK_MODE). Written to
`workspace/{job_id}/clips.json`. Canonical fixture: `tests/fixtures/clips.sample.json`.

### Top level

| Field        | Type            | Required | Notes |
|--------------|-----------------|----------|-------|
| `job_id`     | string          | yes      | |
| `model`      | string          | yes      | Scoring model id, e.g. `"gpt-4o-mini"` or `"mock-heuristic-v1"`. |
| `candidates` | ClipCandidate[] | yes      | Sorted by `virality_score` desc; deduped (overlap >50% drops the lower score). |

### ClipCandidate

| Field             | Type          | Required | Notes |
|-------------------|---------------|----------|-------|
| `start`           | float (sec)   | yes      | Snaps to a sentence/segment boundary. |
| `end`             | float (sec)   | yes      | `end - start` is 15–90s (ideal 30–60s) per the rubric. |
| `hook_line`       | string        | yes      | The attention-grabbing opening line (verbatim). |
| `payoff_line`     | string        | yes      | The line that DELIVERS the answer/insight (verbatim, inside the clip). Empty only when the scorer couldn't find one — such clips are penalized. |
| `hook_type`       | string        | no       | One of: question, bold_claim, contrarian, curiosity_gap, story, numbered_promise, direct_address. |
| `virality_score`  | int (0–100)   | yes      | Ranking score (after payoff/length/replay adjustments). |
| `replay_score`    | int (0–100) \| null | no | This video's normalized "most replayed" intensity over the clip range; null when no YouTube heatmap. |
| `reason`          | string        | yes      | Why it scored this way (rubric-grounded). |
| `suggested_title` | string        | yes      | Short shareable title. |
| `hashtags`        | string[]      | no       | 3–5 post hashtags (no `#`), for the social caption. |
| `description`     | string        | no       | 1-sentence post caption for the clip. |

Downstream stages (`extract` → `reframe` → `captions`) add render outputs but do **not**
mutate these fields; rendered file references are tracked as R2 keys (see §5).

---

## 4. Job status / progress events

Emitted by the worker into Redis and relayed by the API WebSocket gateway to the web app.
One event type, published on channel/room `job:{job_id}`.

### JobProgressEvent

| Field             | Type        | Required | Notes |
|-------------------|-------------|----------|-------|
| `job_id`          | string      | yes      | |
| `organization_id` | string      | yes      | For server-side authorization of the WS subscriber. |
| `status`          | JobStatus   | yes      | See §1. |
| `stage`           | JobStage    | yes      | See §1. |
| `progress`        | int (0–100) | yes      | Overall percent. |
| `message`         | string      | no       | Human-readable status line. |
| `clips_ready`     | int         | no       | Count of clips fully rendered so far. |
| `error`           | string \| null | no    | Present only when `status = "failed"`. |
| `ts`              | ISO-8601 string | yes  | Event time (UTC). |

Example progression:

```json
{ "job_id": "demo-job-0001", "organization_id": "org_2abcXYZ", "status": "running", "stage": "transcribe", "progress": 30, "message": "Transcribing audio", "clips_ready": 0, "error": null, "ts": "2026-06-11T12:00:05Z" }
{ "job_id": "demo-job-0001", "organization_id": "org_2abcXYZ", "status": "running", "stage": "captions",   "progress": 85, "message": "Burning captions (4/5)", "clips_ready": 4, "error": null, "ts": "2026-06-11T12:01:40Z" }
{ "job_id": "demo-job-0001", "organization_id": "org_2abcXYZ", "status": "completed", "stage": "done",     "progress": 100, "message": "5 clips ready", "clips_ready": 5, "error": null, "ts": "2026-06-11T12:02:10Z" }
```

Suggested per-stage progress weights (worker reports overall `progress` accordingly):
`ingest` 0–10 · `transcribe` 10–35 · `score` 35–45 · `extract` 45–55 · `reframe` 55–80 · `captions` 80–100.

---

## 5. R2 object keys

All artifacts are namespaced by tenant and job so signed-URL access can be authorized by
`organization_id`. Bucket: `R2_BUCKET` (default `focaldive-clips`).

```
{organization_id}/{job_id}/source.mp4              # normalized H.264 source (ingest)
{organization_id}/{job_id}/transcript.json         # §2 transcript
{organization_id}/{job_id}/clips.json              # §3 scored candidates
{organization_id}/{job_id}/clips/{n}_raw.mp4       # extract.py  (n = 1-based rank)
{organization_id}/{job_id}/clips/{n}_vertical.mp4  # reframe.py  (1080x1920)
{organization_id}/{job_id}/clips/{n}_final.mp4     # captions.py (burned-in, deliverable)
{organization_id}/{job_id}/clips/{n}.ass           # ASS subtitle source for {n}
{organization_id}/{job_id}/clips/{n}_thumb.jpg     # poster frame for the gallery card
```

Uploads (user-provided source before a job exists) use a staging prefix:

```
{organization_id}/uploads/{upload_id}/source.{ext} # referenced by Job.source_key
```

Conventions:

- `{n}` is the 1-based clip rank (matches order in `clips.json.candidates`).
- The web app only ever receives **time-limited signed URLs** to these keys, minted by the
  API after an `organization_id` check; raw keys are never exposed to the browser.
- The worker writes `*_final.mp4` last; its presence is the signal a clip is deliverable
  and is what increments `clips_ready` in the progress events (§4).

---

## Cross-references

- Config / `MOCK_MODE` resolution: `pipeline/config.py`.
- Stack rules and module layout: `CLAUDE.md`.
- Full product intent and prompts: `FocalDive_Clips_Complete_Roadmap.md` (PART 3).
