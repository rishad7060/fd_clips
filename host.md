# Hosting FocalDive Clips on a VPS

The app is fully dockerized (`docker-compose.yml`): **web** (Next.js) → **api**
(NestJS + bundled Python pipeline + ffmpeg) → **postgres** + **redis**. It runs the
**CPU path** (Groq transcription + MediaPipe), so **no GPU is required**.

> This guide is written for a VPS that is **already running another stack** (e.g.
> `spanly` + a host Postgres) with an existing host nginx on ports 80/443. Ports
> are remapped to avoid collisions. Adjust to your box.

---

## Port conflicts

The compose defaults collide with the existing stack, so remap the host ports:

| FocalDive service | Compose default host port | Status        | Use instead |
| ----------------- | ------------------------- | ------------- | ----------- |
| web (Next.js)     | `3000`                    | free          | `3000` (bind localhost) |
| api (NestJS)      | `4000`                    | **in use**    | `4006`      |
| postgres          | `5433`                    | **in use**    | `5434`      |
| redis             | `6379`                    | **in use**    | `6380`      |

**80/443 are already in use** by the existing host nginx — do **not** run a second
nginx in Docker. Add FocalDive as new server blocks to the existing host nginx and
use host `certbot`.

> The host ports are only for you / nginx to reach the containers. The
> api↔postgres↔redis traffic uses Docker's internal network (service names, ports
> `5432`/`6379` **inside** the network), so it is **unaffected** by the remap.

---

## 1. Edit the 4 host-port lines in `docker-compose.yml`

Bind them to `127.0.0.1` so they're reachable only by nginx on the box, never the
public internet:

```yaml
# postgres
    ports:
      - "127.0.0.1:5434:5432"     # was "5433:5432"

# redis
    ports:
      - "127.0.0.1:6380:6379"     # was "6379:6379"

# api
    ports:
      - "127.0.0.1:4006:4000"     # was "4000:4000"

# web
    ports:
      - "127.0.0.1:3000:3000"     # was "3000:3000"
```

> Prefer an override file? `ports` **appends** on merge (you'd end up with both
> `4000` and `4006` → still conflicting), so if you use `docker-compose.override.yml`
> you must force-replace with `ports: !override` then the new list. Editing the base
> file directly is simpler.

## 2. Fill in `.env.docker`

```bash
cd ~/clipshq
cp .env.docker.example .env.docker
nano .env.docker
```

Production values:

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com     # baked into web at BUILD time
API_PUBLIC_URL=https://api.yourdomain.com
BILLING_SUCCESS_URL=https://app.yourdomain.com/billing?ok=1
BILLING_CANCEL_URL=https://app.yourdomain.com/billing?canceled=1
POSTGRES_PASSWORD=<strong-random>
GROQ_API_KEY=<real>
GEMINI_API_KEY=<real>
# Polar live billing (if going live):
#   POLAR_BASE_URL=https://api.polar.sh, POLAR_MODE=production, prod token + product ids
```

> `NEXT_PUBLIC_API_URL` is inlined into the web bundle **at build time**. Set it
> correctly *before* building; changing it later requires a rebuild (`--build`), not
> just a restart.

## 3. DNS

Two A records → your VPS IP:

- `app.yourdomain.com`
- `api.yourdomain.com`

## 4. Build & start the containers

```bash
docker compose --env-file .env.docker up --build -d
docker compose ps
docker compose logs -f api      # first boot runs `prisma db push`; watch for "listening on 4000"
```

Quick local sanity check before touching nginx:

```bash
curl -I http://127.0.0.1:3000            # web
curl    http://127.0.0.1:4006/health     # api → expect 200
```

## 5. Add nginx server blocks (to the existing host nginx)

Create `/etc/nginx/sites-available/focaldive.conf`:

```nginx
# App (Next.js)
server {
    server_name app.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;      # HMR / websockets
        proxy_set_header Connection "upgrade";
    }
    listen 80;
}

# API (NestJS + pipeline + /files clip downloads)
server {
    server_name api.yourdomain.com;

    client_max_body_size 5g;          # large video uploads
    proxy_request_buffering off;      # stream uploads straight through

    location / {
        proxy_pass http://127.0.0.1:4006;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Long-running pipeline + SSE/streamed progress
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;          # don't buffer SSE / progress events

        # websocket upgrade support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    listen 80;
}
```

Enable + reload:

```bash
ln -s /etc/nginx/sites-available/focaldive.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

> `client_max_body_size 5g` and the SSE-friendly timeouts/buffering are safe
> defaults for a video app with progress streaming. Tune `5g` to your real max clip
> size; drop the `proxy_buffering off` lines if the API uses plain polling instead
> of SSE.

## 6. HTTPS with Certbot

```bash
certbot --nginx -d app.yourdomain.com -d api.yourdomain.com
```

It edits the server blocks to add `listen 443 ssl` + cert paths and sets up
auto-renewal. Verify renewal:

```bash
certbot renew --dry-run
```

## 7. Verify

- `https://app.yourdomain.com` loads the UI
- `https://api.yourdomain.com/health` → 200
- Run a real clip job end-to-end and confirm downloads work via `/files`

---

## Operational notes

- **Data lives in Docker volumes** (`pgdata`, `redisdata`, `workspace`).
  `docker compose down` keeps them; `down -v` **wipes** them. Back up `pgdata` +
  `workspace`.
- **Disk fills fast** — the `workspace` volume holds every source video + rendered
  clip. Add a cleanup job and watch `docker system df`.
- You share the host with other stacks (e.g. **spanly**) — always `cd ~/clipshq`
  first, and consider `docker compose -p focaldive ...` to give this stack a distinct
  project name so it never collides.
