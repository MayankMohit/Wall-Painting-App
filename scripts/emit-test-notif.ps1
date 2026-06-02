# emit-test-notif.ps1
# Logs in as admin and fires a test notification via /api/notifications/test.
#
# Usage:
#   .\emit-test-notif.ps1                                            # default: admin.bg_job_failed -> self
#   .\emit-test-notif.ps1 -EventId "submission.create" -RecipientId "<painterId>"
#   .\emit-test-notif.ps1 -EventId "submission.reject" -RecipientId "<painterId>" `
#                         -Data '{"code":"42","reason":"blurry"}'
#
# Requires: npm run dev running on $Base.
# Uses curl.exe + a temp output file because PowerShell 5.1's piped capture of
# Next.js chunked responses returns an empty string.

param(
    [string]$Base         = "http://localhost:3000",
    [string]$AdminEmail   = "krishkrsquare@gmail.com",
    [string]$AdminPass    = "Krish123456#",
    [string]$EventId      = "",
    [string]$RecipientId  = "",
    [string]$Data         = ""   # JSON string, e.g. '{"foo":"bar"}'
)

$ErrorActionPreference = "Stop"

function Invoke-Curl {
    param([string]$Uri, [string]$Method, [hashtable]$Headers, [string]$Body)

    $outFile = [System.IO.Path]::GetTempFileName()
    $curlArgs = @("--silent", "--output", $outFile, "--write-out", "%{http_code}",
                  "--request", $Method, $Uri)
    foreach ($k in $Headers.Keys) { $curlArgs += @("--header", "${k}: $($Headers[$k])") }
    if ($Body) {
        $bodyFile = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($bodyFile, $Body, [System.Text.Encoding]::UTF8)
        $curlArgs += @("--header", "Content-Type: application/json", "--data", "@$bodyFile")
    }

    $code = [int](& curl.exe @curlArgs)
    $raw  = [System.IO.File]::ReadAllText($outFile, [System.Text.Encoding]::UTF8).Trim()
    Remove-Item $outFile -Force -ErrorAction SilentlyContinue
    if ($bodyFile) { Remove-Item $bodyFile -Force -ErrorAction SilentlyContinue }

    return @{ Code = $code; Raw = $raw }
}

# 1. Login
$loginBody = "{`"identifier`":`"$AdminEmail`",`"password`":`"$AdminPass`"}"
$login = Invoke-Curl -Uri "$Base/api/auth/login" -Method "POST" -Headers @{} -Body $loginBody

$token = $null
try { $token = ($login.Raw | ConvertFrom-Json).data.token } catch {}

if (-not $token) {
    Write-Host "Login failed (HTTP $($login.Code)): $($login.Raw)" -ForegroundColor Red
    exit 1
}
Write-Host "Logged in as $AdminEmail" -ForegroundColor Gray

# 2. Build emit body
# BullMQ dedups by SHA1(channel:eventId:userId:data). If no -Data is passed, we
# inject a unique timestamp so each invocation enqueues a fresh push job
# instead of being silently dropped as a duplicate.
$parts = @()
if ($EventId)     { $parts += "`"eventId`":`"$EventId`"" }
if ($RecipientId) { $parts += "`"recipientId`":`"$RecipientId`"" }
if ($Data) {
    $parts += "`"data`":$Data"
} else {
    $ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $parts += "`"data`":{`"queue`":`"test`",`"jobId`":`"test-$ts`",`"error`":`"manual test trigger $ts`"}"
}
$body = "{" + ($parts -join ",") + "}"

# 3. Fire
Write-Host "POST $Base/api/notifications/test"
Write-Host "body: $body"

$resp = Invoke-Curl -Uri "$Base/api/notifications/test" -Method "POST" `
    -Headers @{ Authorization = "Bearer $token" } -Body $body

Write-Host "HTTP $($resp.Code)"
Write-Host $resp.Raw
