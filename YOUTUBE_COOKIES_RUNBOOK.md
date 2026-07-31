# YouTube "Sign in to confirm you're not a bot" — Fix Runbook

## What's happening
YouTube now challenges your **server's datacenter IP** with an anti-bot gate:

```
ERROR: [youtube] <id>: Sign in to confirm you're not a bot.
Use --cookies-from-browser or --cookies ...
```

This hits **both** yt-dlp code paths:
- The **free transcript / tags tools** (`pipeline/transcript.py`, `pipeline/yt_tags.py`)
- The **paid clip pipeline ingest** (`pipeline/ingest.py`)

There is no player-client trick that reliably beats this from a clean VPS IP.
The fix YouTube itself names is **cookies** — make yt-dlp look like a signed-in
user. The code already supports it via two env vars; you just need to supply a
cookies file on the server.

---

## Recommended fix: `cookies.txt` (free, ~10 min)

### Step 1 — Export cookies from a logged-in browser (on YOUR machine)
Use a **throwaway / secondary Google account**, not your primary one — YouTube
can rate-limit or flag accounts used for automation.

1. Log into `https://www.youtube.com` in Chrome/Edge/Firefox with that account.
2. Install a "Get cookies.txt" style extension (e.g. **"Get cookies.txt LOCALLY"**
   for Chrome — the *LOCALLY* one keeps data on-device).
3. Open `youtube.com`, click the extension, **Export** → save as `cookies.txt`
   (Netscape format — that's what the extension produces by default).

> ⚠️ Treat `cookies.txt` like a password. It grants access to that YouTube
> session. Never commit it (it's gitignored below), never share it.

### Step 2 — Upload it to the server (via PuTTY / pscp)
From your local machine (PowerShell), replace host/user/path as needed:

```powershell
pscp cookies.txt user@clipshq.pro:/home/user/clipshq/secrets/cookies.txt
```

Or paste it in on the server with a heredoc if pscp isn't set up:
```bash
mkdir -p ~/clipshq/secrets
nano ~/clipshq/secrets/cookies.txt   # paste, save (Ctrl-O, Enter, Ctrl-X)
chmod 600 ~/clipshq/secrets/cookies.txt
```

### Step 3 — Point the containers at it
The pipeline runs **inside the api/worker containers**, so the file must be
mounted in and the env var must point at the in-container path.

**a) Mount the secrets dir** — in `docker-compose.yml`, add a volume to the
services that run yt-dlp (api, and worker if present):

```yaml
  api:
    volumes:
      - ./secrets:/secrets:ro          # host ./secrets → /secrets (read-only)
```
(Repeat under `worker:` if you have a separate worker service.)

**b) Set the env var** — in the server root `.env`:

```env
YTDLP_COOKIES=/secrets/cookies.txt
```

Make sure `docker-compose.yml` passes `YTDLP_COOKIES` into the api/worker env
(add `YTDLP_COOKIES: ${YTDLP_COOKIES:-}` under each service's `environment:` if
it isn't already forwarded).

### Step 4 — Restart & verify
```bash
cd ~/clipshq/fd_clips
git pull origin main                       # gets the hardened transcript.py/yt_tags.py
docker compose up -d --build api worker     # rebuild the python-carrying services
# Test the free tool end to end:
curl -s -X POST https://api.clipshq.pro/transcript \
  -H 'content-type: application/json' \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' | head -c 400
```
Expect `"ok":true` with real `segments`. If you still get
`"errorCode":"bot_check"`, the cookies didn't load — see Troubleshooting.

---

## Alternative: read cookies straight from a browser on the server
Only works if the server actually has a logged-in desktop browser profile
(usually it does NOT — a headless VPS has none). If it does:

```env
YTDLP_COOKIES_FROM_BROWSER=chrome    # or edge|firefox|brave
```
On a headless VPS, use the `cookies.txt` route above instead.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `errorCode:"bot_check"` still after setup | File not mounted into the container, or `YTDLP_COOKIES` path is the **host** path not the **in-container** path (`/secrets/cookies.txt`). Check `docker compose exec api ls -l /secrets/`. |
| Worked, then broke again days later | Cookies **expire**. Re-export a fresh `cookies.txt` and re-upload. Sessions typically last weeks, not forever. |
| "cookie file may be stale/expired" message | Same — re-export. The code detects it had cookies but YouTube still refused. |
| Account got a warning / logged out | You used your primary account. Switch to a throwaway account for automation. |

## Cookie rotation (keeping it alive)
Cookies decay. Practical options, cheapest first:
1. **Manual re-export** every few weeks when you see `bot_check` errors again.
2. **Residential proxy** (paid) if the free tool gets heavy traffic and cookies
   alone stop being enough — this is the next escalation, not needed yet. The
   code already has a `YTDLP_PROXY` seam that can be added if you go this route.

## Security checklist
- [ ] `cookies.txt` is **gitignored** (see `.gitignore` entry added).
- [ ] File perms are `600`, mounted **read-only** (`:ro`) into the container.
- [ ] Used a **throwaway** YouTube/Google account, not your main one.
- [ ] Never pasted cookie contents into chat, a PR, or a commit.
