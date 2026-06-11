# Smoke test: assumes the API is already running on $env:API_PORT (default 4000).
# Hits /health, POST /jobs, GET /jobs/:id, GET /clips, /billing/balance.
$ErrorActionPreference = 'Stop'
$port = if ($env:API_PORT) { $env:API_PORT } else { '4000' }
$base = "http://localhost:$port"

Write-Host "== GET /health =="
$health = Invoke-RestMethod "$base/health"
$health | ConvertTo-Json -Depth 5

Write-Host "`n== POST /jobs =="
$body = @{ sourceType = 'url'; sourceUrl = 'https://www.youtube.com/watch?v=EXAMPLE'; clipCount = 5; durationSec = 142 } | ConvertTo-Json
$job = Invoke-RestMethod "$base/jobs" -Method Post -ContentType 'application/json' -Body $body
$job | ConvertTo-Json -Depth 5
$jobId = $job.jobId

Write-Host "`n== GET /billing/balance =="
Invoke-RestMethod "$base/billing/balance" | ConvertTo-Json

Start-Sleep -Seconds 2  # let the mock worker finish

Write-Host "`n== GET /jobs/$jobId =="
Invoke-RestMethod "$base/jobs/$jobId" | ConvertTo-Json -Depth 5

Write-Host "`n== GET /clips?jobId=$jobId =="
Invoke-RestMethod "$base/clips?jobId=$jobId" | ConvertTo-Json -Depth 5
