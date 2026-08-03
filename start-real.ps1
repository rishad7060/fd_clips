# YT Shorts Clips - start the REAL stack (API + web) on this machine.
# Web (localhost:3000) -> NestJS API (localhost:4000) -> real Python pipeline
# (Gemini scoring + faster-whisper CPU transcription + FFmpeg cuts), driven by .env.
#
#   powershell -ExecutionPolicy Bypass -File .\start-real.ps1
#
# Ctrl+C stops both. Outputs land in workspace/<job-id>/clips/.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# 0. Load the repo-root .env into this process so the Prisma CLI (db push) and any
#    child process sees DATABASE_URL etc. NestJS also reads .env on its own.
#    IMPORTANT: .env ALWAYS WINS. Previously this skipped vars already set in the
#    shell ("don't clobber the caller"), but a STALE var lingering in the
#    PowerShell session (e.g. an old MOCK_AUTH=true) then silently overrode .env -
#    which put the API in mock-auth mode where EVERY user shares one org (same
#    credits + projects for different logins). Overwriting from .env each run
#    prevents that class of stale-env bug.
$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  foreach ($line in Get-Content $envFile) {
    $t = $line.Trim()
    if ($t -eq "" -or $t.StartsWith("#")) { continue }
    $i = $t.IndexOf("=")
    if ($i -lt 1) { continue }
    $k = $t.Substring(0, $i).Trim()
    $v = $t.Substring($i + 1).Trim()
    Set-Item -Path "Env:$k" -Value $v   # .env wins - overwrite any stale value
  }
}

# 1. Make sure FFmpeg is reachable for the API process (the pipeline also reads
#    FFMPEG_PATH from .env, but exporting it on PATH covers yt-dlp + child procs).
# Derive the ffmpeg bin dir from FFMPEG_PATH in .env (per-machine, not hardcoded).
$ffbin = ""
if ($env:FFMPEG_PATH) { $ffbin = Split-Path -Parent $env:FFMPEG_PATH }
if ($ffbin -and (Test-Path $ffbin)) { $env:Path = "$ffbin;$env:Path" }
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Write-Warning "ffmpeg not on PATH and FFMPEG_PATH not set/valid. Real ingest may fail. Set FFMPEG_PATH in .env."
}

# 2. API env: real pipeline worker + serve local clip files.
#    NOTE: MOCK_AUTH is deliberately NOT forced here anymore. It used to be
#    hardcoded to "true", which put EVERY logged-in user into one shared org
#    (identical credits + projects across different accounts). It now comes from
#    .env (MOCK_AUTH=false => real per-user Google auth). Same for API_PUBLIC_URL.
$env:USE_REAL_PIPELINE = "true"
$env:LOCAL_FILES        = "true"
$env:API_PORT           = "4000"
if (-not $env:API_PUBLIC_URL) { $env:API_PUBLIC_URL = "http://localhost:4000" }
$env:PIPELINE_REPO_ROOT = $root

# npm is npm.cmd (a batch script); Start-Process can't launch it directly on
# Windows ("%1 is not a valid Win32 application"). Launch it via cmd.exe /c.
Write-Host "Starting NestJS API (real pipeline) on :4000 ..." -ForegroundColor Cyan
Push-Location "$root/app/api"
# Sync the Prisma schema to Postgres when DATABASE_URL is set (infra in Docker).
# Idempotent - creates tables on first run, no-ops once in sync. Skipped when
# DATABASE_URL is blank (the API then falls back to its in-memory store).
if ($env:DATABASE_URL) {
  Write-Host "Syncing Prisma schema to Postgres (db push) ..." -ForegroundColor Cyan
  & cmd.exe /c "npx prisma db push"
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "prisma db push failed - is the infra running? (docker compose -f docker-compose.infra.yml up -d)"
  }
}
# Always rebuild so the running API reflects the latest source (a stale dist/ is
# a classic gotcha - e.g. a DTO change not taking effect). Skip only with -NoBuild.
if (-not $env:SKIP_API_BUILD) { & cmd.exe /c "npm run build" }
$api = Start-Process -FilePath "node" -ArgumentList "dist/main.js" -PassThru -NoNewWindow
Pop-Location

Start-Sleep -Seconds 3
Write-Host "Starting Next.js web on :3000 (points at the real API) ..." -ForegroundColor Cyan
$env:NEXT_PUBLIC_API_URL = "http://localhost:4000"
# Clear the Next.js dev cache so a restart always serves the latest source - a
# stale .next is a classic gotcha (e.g. the caption style/size picker change not
# showing up). Skip with -SKIP_WEB_CLEAN.
if (-not $env:SKIP_WEB_CLEAN) {
  $nextCache = Join-Path $root "app/web/.next"
  if (Test-Path $nextCache) { Remove-Item -Recurse -Force $nextCache -ErrorAction SilentlyContinue }
}
$web = Start-Process -FilePath "cmd.exe" -ArgumentList "/c","npm run dev" `
  -WorkingDirectory "$root/app/web" -PassThru -NoNewWindow

Write-Host ""
Write-Host "  Web : http://localhost:3000   (paste a YouTube URL on /new)" -ForegroundColor Green
Write-Host "  API : http://localhost:4000/health" -ForegroundColor Green
Write-Host "  Note: CPU transcription is slow (~1-3x real time). Use speech-heavy videos, a few minutes long." -ForegroundColor DarkGray
Write-Host "  Press Ctrl+C to stop both." -ForegroundColor DarkGray

try { Wait-Process -Id $api.Id } finally {
  foreach ($p in @($api, $web)) { if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } }
}
