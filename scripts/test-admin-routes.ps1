# test-admin-routes.ps1
# Full coverage test suite for all admin API routes:
#   GET  /api/admin/stats
#   GET  /api/admin/logs
#   GET  /api/admin/background-jobs
#   POST /api/admin/background-jobs/:id/retry
#   GET  /api/admin/storage
#   GET  /api/admin/queue-stats
#   POST /api/admin/queue-stats
#
# Usage:
#   .\scripts\test-admin-routes.ps1
#   .\scripts\test-admin-routes.ps1 -AdminEmail a@example.com -AdminPass Pass123#
#
# Requires: npm run dev on $Base

param(
    [string]$Base          = "http://localhost:3000",
    [string]$AdminEmail    = "krishkrsquare@gmail.com",
    [string]$AdminPass     = "Krish123456#",
    [string]$PainterEmail  = "kumarkrishofficial@gmail.com",
    [string]$PainterPass   = "Krish123456#",
    [string]$OwnerEmail    = "krishkumarart9@gmail.com",
    [string]$OwnerPass     = "Krish123456#"
)

$ErrorActionPreference = "Stop"

$script:Passed  = 0
$script:Failed  = 0
$script:Skipped = 0

$FAKE_ID = "000000000000000000000001"

# ======= Core HTTP helper =====================================================
function Invoke-Api {
    param(
        [string]$Uri,
        [string]$Method = "GET",
        [string]$Token  = "",
        [string]$Body   = ""
    )
    $outFile  = [System.IO.Path]::GetTempFileName()
    $bodyFile = $null
    $curlArgs = @("--silent","--output",$outFile,"--write-out","%{http_code}",
                  "--request",$Method,$Uri)
    if ($Token) { $curlArgs += @("--header","Authorization: Bearer $Token") }
    if ($Body) {
        $bodyFile = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($bodyFile, $Body, [System.Text.Encoding]::UTF8)
        $curlArgs += @("--header","Content-Type: application/json","--data","@$bodyFile")
    }
    $code = [int](& curl.exe @curlArgs)
    $raw  = [System.IO.File]::ReadAllText($outFile, [System.Text.Encoding]::UTF8).Trim()
    Remove-Item $outFile -Force -ErrorAction SilentlyContinue
    if ($null -ne $bodyFile) { Remove-Item $bodyFile -Force -ErrorAction SilentlyContinue }
    $json = $null
    try { $json = $raw | ConvertFrom-Json } catch {}
    return @{ Code = $code; Raw = $raw; Json = $json }
}

# ======= Assertion helpers ====================================================
function PASS { param([string]$L); $script:Passed++; Write-Host "  [PASS] $L" -ForegroundColor Green }
function FAIL {
    param([string]$L, [string]$D = "")
    $script:Failed++
    $msg = "  [FAIL] $L"
    if ($D) { $msg = "$msg -- $D" }
    Write-Host $msg -ForegroundColor Red
}
function SKIP { param([string]$L, [string]$R); $script:Skipped++; Write-Host "  [SKIP] $L  ($R)" -ForegroundColor Yellow }

function Expect-Status {
    param([string]$Label, [hashtable]$R, [int]$Code)
    if ($R.Code -eq $Code) { PASS $Label }
    else {
        $snippet = $R.Raw.Substring(0, [Math]::Min(200, $R.Raw.Length))
        FAIL $Label "expected $Code, got $($R.Code): $snippet"
    }
}

function Expect-Assert {
    param([string]$Label, [hashtable]$R, [int]$Code, [scriptblock]$Check)
    if ($R.Code -ne $Code) {
        $snippet = $R.Raw.Substring(0, [Math]::Min(200, $R.Raw.Length))
        FAIL $Label "expected $Code, got $($R.Code): $snippet"
        return
    }
    $ok = $false
    try { $ok = ($R | ForEach-Object $Check) -eq $true } catch { $ok = $false }
    if ($ok) { PASS $Label }
    else {
        $snippet = $R.Raw.Substring(0, [Math]::Min(200, $R.Raw.Length))
        FAIL $Label "HTTP $Code OK but assertion failed: $snippet"
    }
}

function Expect-ErrorCode {
    param([string]$Label, [hashtable]$R, [int]$Code, [string]$ErrorCode)
    if ($R.Code -ne $Code) {
        FAIL $Label "expected HTTP $Code, got $($R.Code)"
        return
    }
    $actual = $null
    try { $actual = $R.Json.error.code } catch {}
    if ($actual -eq $ErrorCode) { PASS $Label }
    else { FAIL $Label "expected errorCode=$ErrorCode, got $actual" }
}

function Section {
    param([string]$Title)
    Write-Host ""
    Write-Host ("=" * 72) -ForegroundColor DarkGray
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host ("=" * 72) -ForegroundColor DarkGray
}

# ======= Login helper =========================================================
function Login-User {
    param([string]$Email, [string]$Password, [string]$Label)
    $body = "{`"identifier`":`"$Email`",`"password`":`"$Password`"}"
    $r = Invoke-Api -Uri "$Base/api/auth/login" -Method POST -Body $body
    if ($r.Code -ne 200) {
        Write-Host "  Login FAILED for $Label ($Email) HTTP $($r.Code)" -ForegroundColor Red
        return $null
    }
    $token = $null
    try { $token = $r.Json.data.token } catch {}
    if (-not $token) { Write-Host "  No token for $Label" -ForegroundColor Red; return $null }
    Write-Host "  Authenticated: $Label" -ForegroundColor DarkGray
    return $token
}

# ==============================================================================
Write-Host ""
Write-Host "  ADMIN ROUTES TEST SUITE" -ForegroundColor White
Write-Host "  Target: $Base" -ForegroundColor DarkGray
Write-Host ""

# ======= Authenticate =========================================================
Section "Setup: Login"

$AdminToken   = Login-User -Email $AdminEmail   -Password $AdminPass   -Label "Admin"
$PainterToken = $null
$OwnerToken   = $null

if ($PainterEmail -and $PainterPass) {
    $PainterToken = Login-User -Email $PainterEmail -Password $PainterPass -Label "Painter"
}
if ($OwnerEmail -and $OwnerPass) {
    $OwnerToken = Login-User -Email $OwnerEmail -Password $OwnerPass -Label "Owner"
}

if (-not $AdminToken) {
    Write-Host ""
    Write-Host "  Admin login failed -- cannot run any tests." -ForegroundColor Red
    exit 1
}

# ==============================================================================
# 1. GET /api/admin/stats
# ==============================================================================
Section "GET /api/admin/stats"

$r = Invoke-Api -Uri "$Base/api/admin/stats" -Token $AdminToken
Expect-Assert "stats: 200 with data shape" $r 200 {
    $null -ne $_.Json.data -and
    $null -ne $_.Json.data.users -and
    $null -ne $_.Json.data.jobs -and
    $null -ne $_.Json.data.submissions -and
    $null -ne $_.Json.data.storage -and
    $null -ne $_.Json.data.queues
}

Expect-Assert "stats: queues has all 3 queues" $r 200 {
    $q = $_.Json.data.queues
    $null -ne $q.fileGen -and $null -ne $q.notify -and $null -ne $q.assetCleanup
}

Expect-Assert "stats: storage.totalBytes is a number" $r 200 {
    $t = $_.Json.data.storage.totalBytes
    $t -is [int] -or $t -is [long] -or $t -ge 0
}

# Auth guards
$r = Invoke-Api -Uri "$Base/api/admin/stats"
Expect-Status "stats: 401 without token" $r 401

if ($PainterToken) {
    $r = Invoke-Api -Uri "$Base/api/admin/stats" -Token $PainterToken
    Expect-Status "stats: 403 for painter" $r 403
} else { SKIP "stats: 403 for painter" "no painter credentials" }

if ($OwnerToken) {
    $r = Invoke-Api -Uri "$Base/api/admin/stats" -Token $OwnerToken
    Expect-Status "stats: 403 for owner" $r 403
} else { SKIP "stats: 403 for owner" "no owner credentials" }

# ==============================================================================
# 2. GET /api/admin/logs
# ==============================================================================
Section "GET /api/admin/logs"

$r = Invoke-Api -Uri "$Base/api/admin/logs" -Token $AdminToken
Expect-Assert "logs: 200 with pagination envelope" $r 200 {
    $d = $_.Json.data
    $null -ne $d.logs -and
    ($d.total -ge 0) -and
    ($d.page -eq 1) -and
    ($d.limit -eq 50)
}

$r = Invoke-Api -Uri "$Base/api/admin/logs?limit=5" -Token $AdminToken
Expect-Assert "logs: limit=5 respected" $r 200 {
    $_.Json.data.limit -eq 5 -and $_.Json.data.logs.Count -le 5
}

$r = Invoke-Api -Uri "$Base/api/admin/logs?limit=200" -Token $AdminToken
Expect-Assert "logs: limit capped at 100" $r 200 {
    $_.Json.data.limit -eq 100
}

$r = Invoke-Api -Uri "$Base/api/admin/logs?action=AUTH_LOGIN" -Token $AdminToken
Expect-Assert "logs: filter by action" $r 200 {
    $d = $_.Json.data
    # Either no logs returned or every log matches the action filter
    $d.logs.Count -eq 0 -or ($d.logs | ForEach-Object { $_.action } | Where-Object { $_ -ne 'AUTH_LOGIN' }).Count -eq 0
}

$r = Invoke-Api -Uri "$Base/api/admin/logs?from=2025-01-01&to=2030-01-01" -Token $AdminToken
Expect-Status "logs: from/to date filter accepted" $r 200

$r = Invoke-Api -Uri "$Base/api/admin/logs?page=2&limit=5" -Token $AdminToken
Expect-Assert "logs: page 2 returns correct page number" $r 200 {
    $_.Json.data.page -eq 2
}

# Auth guards
$r = Invoke-Api -Uri "$Base/api/admin/logs"
Expect-Status "logs: 401 without token" $r 401

if ($PainterToken) {
    $r = Invoke-Api -Uri "$Base/api/admin/logs" -Token $PainterToken
    Expect-Status "logs: 403 for painter" $r 403
} else { SKIP "logs: 403 for painter" "no painter credentials" }

# ==============================================================================
# 3. GET /api/admin/background-jobs
# ==============================================================================
Section "GET /api/admin/background-jobs"

$r = Invoke-Api -Uri "$Base/api/admin/background-jobs" -Token $AdminToken
Expect-Assert "bg-jobs: 200 default (fileGen, failed)" $r 200 {
    # PS5.1 ConvertFrom-Json returns $null for empty JSON arrays, so allow both
    $null -eq $_.Json.data -or $_.Json.data -is [array]
}

$r = Invoke-Api -Uri "$Base/api/admin/background-jobs?queue=notify&state=failed" -Token $AdminToken
Expect-Status "bg-jobs: notify queue failed jobs" $r 200

$r = Invoke-Api -Uri "$Base/api/admin/background-jobs?queue=fileGen&state=completed" -Token $AdminToken
Expect-Status "bg-jobs: fileGen completed jobs" $r 200

$r = Invoke-Api -Uri "$Base/api/admin/background-jobs?queue=assetCleanup&state=waiting" -Token $AdminToken
Expect-Status "bg-jobs: assetCleanup waiting jobs" $r 200

$r = Invoke-Api -Uri "$Base/api/admin/background-jobs?queue=notify&state=active" -Token $AdminToken
Expect-Status "bg-jobs: active jobs" $r 200

$r = Invoke-Api -Uri "$Base/api/admin/background-jobs?queue=notify&state=delayed" -Token $AdminToken
Expect-Status "bg-jobs: delayed jobs" $r 200

# Validate job object shape if jobs exist
$r = Invoke-Api -Uri "$Base/api/admin/background-jobs?queue=notify&state=completed" -Token $AdminToken
$jobList = @($r.Json.data)   # @() ensures array even for single-element PS5.1 results
if ($r.Code -eq 200 -and $jobList.Count -gt 0) {
    Expect-Assert "bg-jobs: job object has expected fields" $r 200 {
        $job = @($_.Json.data)[0]
        $null -ne $job.id -and $null -ne $job.name -and ($job.attempts -ge 0)
    }
} else { SKIP "bg-jobs: job shape validation" "no completed jobs to inspect" }

# Invalid params
$r = Invoke-Api -Uri "$Base/api/admin/background-jobs?queue=badQueue" -Token $AdminToken
Expect-Status "bg-jobs: 400 for unknown queue" $r 400

$r = Invoke-Api -Uri "$Base/api/admin/background-jobs?state=badState" -Token $AdminToken
Expect-Status "bg-jobs: 400 for unknown state" $r 400

# Auth guards
$r = Invoke-Api -Uri "$Base/api/admin/background-jobs"
Expect-Status "bg-jobs: 401 without token" $r 401

if ($PainterToken) {
    $r = Invoke-Api -Uri "$Base/api/admin/background-jobs" -Token $PainterToken
    Expect-Status "bg-jobs: 403 for painter" $r 403
} else { SKIP "bg-jobs: 403 for painter" "no painter credentials" }

# ==============================================================================
# 4. POST /api/admin/background-jobs/:id/retry
# ==============================================================================
Section "POST /api/admin/background-jobs/:id/retry"

# Find a real failed job across all queues to retry
$retryQueueName = $null
$retryJobId     = $null
foreach ($q in @('notify', 'fileGen', 'assetCleanup')) {
    $res = Invoke-Api -Uri "$Base/api/admin/background-jobs?queue=$q&state=failed" -Token $AdminToken
    $list = @($res.Json.data)
    if ($list.Count -gt 0 -and $null -ne $list[0].id) {
        $retryQueueName = $q
        $retryJobId     = $list[0].id
        break
    }
}

if ($retryJobId) {
    $r = Invoke-Api -Uri "$Base/api/admin/background-jobs/$retryJobId/retry?queue=$retryQueueName" -Method POST -Token $AdminToken
    Expect-Assert "retry: 200 retried=true ($retryQueueName / $retryJobId)" $r 200 {
        $_.Json.data.retried -eq $true
    }
} else {
    SKIP "retry: real failed job" "no failed jobs in any queue"
}

# Non-existent job ID
$r = Invoke-Api -Uri "$Base/api/admin/background-jobs/nonexistent-job-id-99999/retry?queue=notify" -Method POST -Token $AdminToken
Expect-Status "retry: 404 for non-existent job" $r 404

# Unknown queue
$r = Invoke-Api -Uri "$Base/api/admin/background-jobs/someId/retry?queue=badQueue" -Method POST -Token $AdminToken
Expect-Status "retry: 400 for unknown queue" $r 400

# Auth guards
$r = Invoke-Api -Uri "$Base/api/admin/background-jobs/someId/retry" -Method POST
Expect-Status "retry: 401 without token" $r 401

if ($PainterToken) {
    $r = Invoke-Api -Uri "$Base/api/admin/background-jobs/someId/retry" -Method POST -Token $PainterToken
    Expect-Status "retry: 403 for painter" $r 403
} else { SKIP "retry: 403 for painter" "no painter credentials" }

# ==============================================================================
# 5. GET /api/admin/storage
# ==============================================================================
Section "GET /api/admin/storage"

$r = Invoke-Api -Uri "$Base/api/admin/storage" -Token $AdminToken
Expect-Assert "storage: 200 with cloudinary/r2/mongodb keys" $r 200 {
    $d = $_.Json.data
    # All three keys present (value can be error object if not configured)
    $d.PSObject.Properties.Name -contains 'cloudinary' -and
    $d.PSObject.Properties.Name -contains 'r2' -and
    $d.PSObject.Properties.Name -contains 'mongodb'
}

Expect-Assert "storage: mongodb block has dataSize" $r 200 {
    $m = $_.Json.data.mongodb
    # Either successful with dataSize, or degraded with error key
    ($null -ne $m.dataSize) -or ($m.error -eq 'unavailable')
}

Expect-Assert "storage: cloudinary block present" $r 200 {
    $c = $_.Json.data.cloudinary
    $null -ne $c
}

# Auth guards
$r = Invoke-Api -Uri "$Base/api/admin/storage"
Expect-Status "storage: 401 without token" $r 401

if ($PainterToken) {
    $r = Invoke-Api -Uri "$Base/api/admin/storage" -Token $PainterToken
    Expect-Status "storage: 403 for painter" $r 403
} else { SKIP "storage: 403 for painter" "no painter credentials" }

# ==============================================================================
# 6. GET /api/admin/queue-stats
# ==============================================================================
Section "GET /api/admin/queue-stats"

$r = Invoke-Api -Uri "$Base/api/admin/queue-stats" -Token $AdminToken
Expect-Assert "queue-stats GET: 200 with all 3 queues" $r 200 {
    $d = $_.Json.data
    $null -ne $d.fileGen -and $null -ne $d.notify -and $null -ne $d.assetCleanup
}

Expect-Assert "queue-stats GET: notify has waiting/failed/active keys" $r 200 {
    $n = $_.Json.data.notify
    $n.PSObject.Properties.Name -contains 'waiting' -and
    $n.PSObject.Properties.Name -contains 'failed' -and
    $n.PSObject.Properties.Name -contains 'active'
}

# Auth guards
$r = Invoke-Api -Uri "$Base/api/admin/queue-stats"
Expect-Status "queue-stats GET: 401 without token" $r 401

if ($PainterToken) {
    $r = Invoke-Api -Uri "$Base/api/admin/queue-stats" -Token $PainterToken
    Expect-Status "queue-stats GET: 403 for painter" $r 403
} else { SKIP "queue-stats GET: 403 for painter" "no painter credentials" }

# ==============================================================================
# 7. POST /api/admin/queue-stats (pause / resume / status)
# ==============================================================================
Section "POST /api/admin/queue-stats"

# Status check (no state change)
$r = Invoke-Api -Uri "$Base/api/admin/queue-stats" -Method POST -Token $AdminToken `
    -Body '{"action":"status","queue":"notify"}'
Expect-Assert "queue-stats POST: status action returns paused bool" $r 200 {
    $d = $_.Json.data
    $d.queue -eq 'notify' -and ($d.paused -eq $true -or $d.paused -eq $false)
}

# Pause then resume notify queue
$r = Invoke-Api -Uri "$Base/api/admin/queue-stats" -Method POST -Token $AdminToken `
    -Body '{"action":"pause","queue":"notify"}'
Expect-Assert "queue-stats POST: pause notify -> paused=true" $r 200 {
    $_.Json.data.paused -eq $true
}

$r = Invoke-Api -Uri "$Base/api/admin/queue-stats" -Method POST -Token $AdminToken `
    -Body '{"action":"resume","queue":"notify"}'
Expect-Assert "queue-stats POST: resume notify -> paused=false" $r 200 {
    $_.Json.data.paused -eq $false
}

# Pause/resume fileGen queue
$r = Invoke-Api -Uri "$Base/api/admin/queue-stats" -Method POST -Token $AdminToken `
    -Body '{"action":"pause","queue":"fileGen"}'
Expect-Assert "queue-stats POST: pause fileGen -> paused=true" $r 200 {
    $_.Json.data.paused -eq $true -and $_.Json.data.queue -eq 'fileGen'
}

$r = Invoke-Api -Uri "$Base/api/admin/queue-stats" -Method POST -Token $AdminToken `
    -Body '{"action":"resume","queue":"fileGen"}'
Expect-Assert "queue-stats POST: resume fileGen -> paused=false" $r 200 {
    $_.Json.data.paused -eq $false
}

# Pause/resume assetCleanup queue
$r = Invoke-Api -Uri "$Base/api/admin/queue-stats" -Method POST -Token $AdminToken `
    -Body '{"action":"pause","queue":"assetCleanup"}'
Expect-Assert "queue-stats POST: pause assetCleanup -> paused=true" $r 200 {
    $_.Json.data.paused -eq $true
}

$r = Invoke-Api -Uri "$Base/api/admin/queue-stats" -Method POST -Token $AdminToken `
    -Body '{"action":"resume","queue":"assetCleanup"}'
Expect-Assert "queue-stats POST: resume assetCleanup -> paused=false" $r 200 {
    $_.Json.data.paused -eq $false
}

# Default values (no body -> status on notify)
$r = Invoke-Api -Uri "$Base/api/admin/queue-stats" -Method POST -Token $AdminToken -Body '{}'
Expect-Assert "queue-stats POST: empty body uses defaults (status, notify)" $r 200 {
    $d = $_.Json.data
    $d.queue -eq 'notify' -and ($d.paused -eq $true -or $d.paused -eq $false)
}

# Invalid queue name
$r = Invoke-Api -Uri "$Base/api/admin/queue-stats" -Method POST -Token $AdminToken `
    -Body '{"action":"pause","queue":"badQueue"}'
Expect-Status "queue-stats POST: 400 for invalid queue" $r 400

# Invalid action
$r = Invoke-Api -Uri "$Base/api/admin/queue-stats" -Method POST -Token $AdminToken `
    -Body '{"action":"nuke","queue":"notify"}'
Expect-Status "queue-stats POST: 400 for invalid action" $r 400

# Auth guards
$r = Invoke-Api -Uri "$Base/api/admin/queue-stats" -Method POST -Body '{"action":"status","queue":"notify"}'
Expect-Status "queue-stats POST: 401 without token" $r 401

if ($PainterToken) {
    $r = Invoke-Api -Uri "$Base/api/admin/queue-stats" -Method POST -Token $PainterToken `
        -Body '{"action":"status","queue":"notify"}'
    Expect-Status "queue-stats POST: 403 for painter" $r 403
} else { SKIP "queue-stats POST: 403 for painter" "no painter credentials" }

# ==============================================================================
# Summary
# ==============================================================================
Write-Host ""
Write-Host ("=" * 72) -ForegroundColor DarkGray
Write-Host "  RESULTS" -ForegroundColor White
Write-Host ("=" * 72) -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Passed:  $($script:Passed)" -ForegroundColor Green
Write-Host "  Failed:  $($script:Failed)" -ForegroundColor $(if ($script:Failed -gt 0) { "Red" } else { "Green" })
Write-Host "  Skipped: $($script:Skipped)" -ForegroundColor Yellow
Write-Host ""
if ($script:Failed -gt 0) { exit 1 } else { exit 0 }
