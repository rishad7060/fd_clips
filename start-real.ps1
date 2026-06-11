# FocalDive Clips — start the REAL stack (API + web) on this machine.
# Web (localhost:3000) -> NestJS API (localhost:4000) -> real Python pipeline
# (Gemini scoring + faster-whisper CPU transcription + FFmpeg cuts), driven by .env.
#
#   pwsh ./start-real.ps1
#
# Ctrl+C stops both. Outputs land in workspace/<job-id>/clips/.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# 1. Make sure FFmpeg is reachable for the API process (the pipeline also reads
#    FFMPEG_PATH from .env, but exporting it on PATH covers yt-dlp + child procs).
$ffbin = "C:/Users/Rs Computers/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.1-full_build/bin"
if (Test-Path $ffbin) { $env:Path = "$ffbin;$env:Path" }
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Write-Warning "ffmpeg not on PATH and not at the expected WinGet location. Real ingest may fail. Set FFMPEG_PATH in .env."
}

# 2. API env: real pipeline worker + serve local clip files + mock auth (no Clerk key needed).
$env:USE_REAL_PIPELINE = "true"
$env:LOCAL_FILES        = "true"
$env:MOCK_AUTH          = "true"
$env:API_PORT           = "4000"
$env:API_PUBLIC_URL     = "http://localhost:4000"
$env:PIPELINE_REPO_ROOT = $root

Write-Host "Starting NestJS API (real pipeline) on :4000 ..." -ForegroundColor Cyan
Push-Location "$root/app/api"
if (-not (Test-Path "dist/main.js")) { npm run build }
$api = Start-Process -FilePath "node" -ArgumentList "dist/main.js" -PassThru -NoNewWindow
Pop-Location

Start-Sleep -Seconds 3
Write-Host "Starting Next.js web on :3000 (points at the real API) ..." -ForegroundColor Cyan
Push-Location "$root/app/web"
$env:NEXT_PUBLIC_API_URL = "http://localhost:4000"
$web = Start-Process -FilePath "npm" -ArgumentList "run","dev" -PassThru -NoNewWindow
Pop-Location

Write-Host ""
Write-Host "  Web : http://localhost:3000   (paste a YouTube URL on /new)" -ForegroundColor Green
Write-Host "  API : http://localhost:4000/health" -ForegroundColor Green
Write-Host "  Note: CPU transcription is slow (~1-3x real time). Use speech-heavy videos, a few minutes long." -ForegroundColor DarkGray
Write-Host "  Press Ctrl+C to stop both." -ForegroundColor DarkGray

try { Wait-Process -Id $api.Id } finally {
  foreach ($p in @($api, $web)) { if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } }
}
