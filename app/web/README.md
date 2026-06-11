# FocalDive Clips — Web (`app/web`)

Next.js 14 (App Router) + Tailwind + TypeScript (strict). The marketing site and
the product dashboard for FocalDive Clips.

## Run locally (no backend, no Clerk needed)

```bash
npm install
npm run dev      # http://localhost:3000
```

The whole flow is clickable offline against an in-app **mock API client**:

- `/` — landing page
- `/dashboard` — projects list (seeded with demo jobs)
- `/new` — paste URL / upload → choose clip count + caption style → submit
- `/jobs/[jobId]` — live progress view (animated stage timeline + ring)
- `/jobs/[jobId]/clips` — clip gallery (vertical cards, virality badge, hook, download)
- `/jobs/[jobId]/clips/[rank]` — light editor (trim, caption text, style picker, re-render)

## Modes

| Concern | No keys (default) | With keys |
|---|---|---|
| Auth | Dev mode, static demo user. Renders without Clerk. | Clerk (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`). |
| Data | In-memory mock store (`src/lib/mock/`), simulates the pipeline stages. | Real NestJS API via `NEXT_PUBLIC_API_URL`. |

The mock and real API clients share identical shapes (see `../../CONTRACTS.md`),
so the real backend drops in by setting `NEXT_PUBLIC_API_URL` — no caller changes.

Copy `.env.example` to `.env.local` to configure.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build (type-checks)
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
```
