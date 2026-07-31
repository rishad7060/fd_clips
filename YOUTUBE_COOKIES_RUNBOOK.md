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
It must land at **`<repo>/secrets/cookies.txt`** — the same dir docker-compose
bind-mounts as `/secrets`. Replace `<repo>` with your checkout path on the
server (e.g. `~/clipshq/fd_clips`). From your local machine (PowerShell):

```powershell
pscp cookies.txt user@clipshq.pro:/home/user/clipshq/fd_clips/secrets/cookies.txt
```

Or paste it in on the server with a heredoc if pscp isn't set up:
```bash
cd <repo>                              # e.g. cd ~/clipshq/fd_clips
mkdir -p secrets
nano secrets/cookies.txt               # paste, save (Ctrl-O, Enter, Ctrl-X)
chmod 600 secrets/cookies.txt
```

### Step 3 — Point the containers at it (ALREADY WIRED IN-REPO)
You don't need to edit compose anymore — it's done:
- `docker-compose.yml` mounts `./secrets:/secrets:ro` into the **api** service.
- It forwards `YTDLP_COOKIES` (default `/secrets/cookies.txt`) into the container.
- `app/api/Dockerfile` installs **Deno** so yt-dlp can solve YouTube's nsig JS
  challenge (required for the cookie'd `web` client to actually return formats).

So on the server you only need the file at `./secrets/cookies.txt` (the repo
already ships an empty `./secrets/` dir with a `.gitkeep`, so the bind mount has
a source). Optionally override the path in `.env`:
```env
# only if you keep cookies elsewhere; default is /secrets/cookies.txt
YTDLP_COOKIES=/secrets/cookies.txt
```

### Step 4 — Restart & verify
The pipeline runs inside the **api** service (it bundles the Python code — there
is no separate worker service in this stack). Rebuild it so the new Dockerfile
(with Deno) and the hardened scripts take effect:
```bash
cd <repo>                                  # e.g. cd ~/clipshq/fd_clips
git pull origin main                       # hardened scripts + compose + Dockerfile
docker compose up -d --build api           # rebuilds api (Deno + pipeline)
# Confirm the mount + Deno landed:
docker compose exec api ls -l /secrets/cookies.txt   # should exist
docker compose exec api deno --version               # should print a version
# Test the free tool end to end (a video that previously bot-blocked):
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
| `errorCode:"bot_check"` still after setup | Cookies not seen by yt-dlp. Check `docker compose exec api ls -l /secrets/cookies.txt` — if missing, the file isn't in `<repo>/secrets/` on the host, or the container wasn't recreated (`docker compose up -d api`). |
| `"Requested format is not available"` / captions "could not be fetched" **with cookies** | The cookie'd `web` client needs **Deno** for the nsig challenge. Verify `docker compose exec api deno --version`. If missing, rebuild: `docker compose build --no-cache api`. |
| Worked, then broke again days later | Cookies **expire**. Re-export a fresh `cookies.txt`, drop it in `<repo>/secrets/`, `docker compose up -d api`. Sessions last weeks, not forever. |
| "cookie file may be stale/expired" message | Same — re-export. The code detects it had cookies but YouTube still refused. |
| Account got a warning / logged out | You used your primary account. Switch to a throwaway account for automation. |
| `no such file or directory: ./secrets` on `up` | The `./secrets` dir is missing on the host. `mkdir -p <repo>/secrets` (a fresh `git pull` ships it via `.gitkeep`). |

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
