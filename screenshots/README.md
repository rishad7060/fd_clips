# Web App Screenshots

Captured from the running Next.js dev app (`app/web`) in mock mode (no backend, no keys),
via headless Edge. These verify the UI renders end-to-end on this machine.

| File | Page | What it shows |
|---|---|---|
| `01-landing.png` | `/` | Marketing landing: hero "One long video. Ten viral clips.", clip preview strip, how-it-works, features. |
| `02-dashboard.png` | `/dashboard` | App shell: top bar, sidebar nav, credits widget (mock API · offline data), projects view. |
| `03-new-job.png` | `/new` | Create flow: paste-URL/upload tabs, clip-count slider, caption-style picker, submit. |
| `04-clip-gallery.png` | `/jobs/{id}/clips` | Clip gallery: 9:16 vertical cards, virality-score badges, hook lines, suggested titles, Download/Edit. |
| `05-clip-editor.png` | `/jobs/{id}/clips/{rank}` | Editor: 9:16 preview w/ burned caption, Trim sliders, per-line caption edit, 4-template style picker, Re-render. |
| `06-job-progress.png` | `/jobs/{id}` | Live progress: circular % ring + 6-stage timeline (Ingest→Transcribe→Score→Extract→Reframe→Captions). |

Note: dynamic pages were captured with `--headless=new --virtual-time-budget` so the client-side
mock fetch (≈150ms) resolves before the frame is taken; a first-paint capture shows the loading skeleton.
