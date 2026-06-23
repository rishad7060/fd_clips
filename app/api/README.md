# FocalDive Clips - API (NestJS)

Tenant-scoped jobs/clips/billing API. Boots fully locally with **no** Postgres,
Redis, Clerk, or Stripe keys via MOCK_MODE (in-memory DB + queue, fake auth org,
stubbed Stripe/R2). Interfaces match the real implementations (CONTRACTS.md), so
the real adapters drop in on the VPS/RunPod without touching callers.

## Run locally (mock mode)

```bash
cd app/api
npm install
npm run build          # tsc via nest build
npm start              # node dist/main.js  (default API_PORT=4000)
# or: npm run dev      # watch mode
```

The boot log prints the resolved feature flags. With an empty `.env` you'll see
`MOCK MODE` and in-memory backends.

## Endpoints

| Method | Path               | Auth | Notes |
|--------|--------------------|------|-------|
| GET    | `/health`          | no   | Status + resolved subsystem modes. |
| GET    | `/plans`           | no   | Subscription tiers. |
| POST   | `/jobs`            | yes  | Validate credits, debit, enqueue. |
| GET    | `/jobs`            | yes  | List org jobs. |
| GET    | `/jobs/:id`        | yes  | Status + progress. |
| GET    | `/clips?jobId=...` | yes  | Clips with signed (fake in mock) URLs. |
| GET    | `/billing/balance` | yes  | Credit balance + plan. |
| POST   | `/billing/checkout`| yes  | Start Stripe Checkout (mock URL locally). |
| POST   | `/billing/webhook` | no   | Stripe webhook (unsigned accepted in mock). |
| WS     | `/ws`              | -    | emit `subscribe {job_id}` → `progress` events. |

In `MOCK_AUTH=true` no `Authorization` header is needed; a fake org is injected.

## Smoke test

```bash
npm run build && node dist/main.js &   # start server
bash ./scripts/smoke.sh                 # or scripts/smoke.ps1 on Windows
```

## Real mode (VPS / RunPod)

Set `DATABASE_URL`, `REDIS_URL`, `CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY`,
`R2_*`, and `MOCK_MODE=false`, then:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run build && npm start
```
