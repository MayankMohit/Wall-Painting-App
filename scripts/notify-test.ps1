# notify-test.ps1
# Automated test suite for the notification system - Phases 1, 2, 3, 6, 10.
#
# Usage:
#   .\notify-test.ps1
#   .\notify-test.ps1 -AdminEmail "a@x.com" -AdminPass "pw" ...
#   .\notify-test.ps1 -PendingOwnerId "6a1..." (enables Phase 6 approve/reject tests)
#
# Requires: npm run dev is running.
# Optional: npm run worker (Phase 3 jobs are enqueued - watch terminal for "completed").

param(
    [string]$AdminEmail     = "admin@example.com",
    [string]$AdminPass      = "password123",
    [string]$OwnerEmail     = "owner@example.com",
    [string]$OwnerPass      = "password123",
    [string]$PainterEmail   = "painter@example.com",
    [string]$PainterPass    = "password123",
    [string]$PendingOwnerId = "",
    [string]$Base           = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

$script:pass = 0
$script:fail = 0
$script:skip = 0

function Write-Pass([string]$label) {
    $script:pass++
    Write-Host "  [PASS] $label" -ForegroundColor Green
}
function Write-Fail([string]$label, [string]$detail = "") {
    $script:fail++
    if ($detail) { Write-Host "  [FAIL] $label  ($detail)" -ForegroundColor Red }
    else         { Write-Host "  [FAIL] $label" -ForegroundColor Red }
}
function Write-Skip([string]$label, [string]$reason = "") {
    $script:skip++
    if ($reason) { Write-Host "  [SKIP] $label  - $reason" -ForegroundColor Yellow }
    else         { Write-Host "  [SKIP] $label" -ForegroundColor Yellow }
}
function Write-Phase([string]$name) {
    Write-Host "`n-- $name --" -ForegroundColor Cyan
}

# Uses curl.exe (built into Windows 10/11) instead of Invoke-WebRequest /
# Invoke-RestMethod. PowerShell 5.1's .NET HTTP client drops the response body
# for Next.js GET routes that use chunked transfer encoding, producing HTTP 0.
# curl handles chunked encoding correctly for all methods.
function Invoke-API {
    param(
        [string]$Uri,
        [string]$Method      = "GET",
        [hashtable]$Headers  = @{},
        [string]$Body        = $null,
        [string]$ContentType = "application/json"
    )

    $outFile  = $null
    $bodyFile = $null

    try {
        $outFile = [System.IO.Path]::GetTempFileName()

        $curlArgs = @(
            "--silent",
            "--output",     $outFile,
            "--write-out",  "%{http_code}",
            "--request",    $Method,
            $Uri
        )

        foreach ($k in $Headers.Keys) {
            $curlArgs += "--header"
            $curlArgs += "${k}: $($Headers[$k])"
        }

        if ($null -ne $Body) {
            $bodyFile = [System.IO.Path]::GetTempFileName()
            [System.IO.File]::WriteAllText($bodyFile, $Body, [System.Text.Encoding]::UTF8)
            $curlArgs += @("--header", "Content-Type: $ContentType", "--data", "@$bodyFile")
        }

        $statusStr = & curl.exe @curlArgs
        $code = 0
        if ("$statusStr" -match '(\d{3})') { $code = [int]$Matches[1] }

        $raw  = [System.IO.File]::ReadAllText($outFile, [System.Text.Encoding]::UTF8).Trim()
        $data = $null
        if ($raw) { try { $data = $raw | ConvertFrom-Json } catch {} }

        return @{ Ok = ($code -ge 200 -and $code -lt 300); StatusCode = $code; Data = $data }

    } catch {
        return @{ Ok = $false; StatusCode = 0; Data = $null }
    } finally {
        if ($outFile  -and (Test-Path $outFile))  { Remove-Item $outFile  -Force -ErrorAction SilentlyContinue }
        if ($bodyFile -and (Test-Path $bodyFile)) { Remove-Item $bodyFile -Force -ErrorAction SilentlyContinue }
    }
}

# --- Pre-flight ---
Write-Phase "Pre-flight"
Write-Host "  Checking $Base ..." -ForegroundColor Gray
$ping = Invoke-API -Uri "$Base/api/auth/login" -Method POST -Body '{"identifier":"__ping__","password":"__ping__"}'
if ($ping.StatusCode -eq 0) {
    Write-Host "`n  ERROR: Cannot reach $Base. Start npm run dev first." -ForegroundColor Red
    exit 1
}
Write-Host "  Server is up (HTTP $($ping.StatusCode))" -ForegroundColor Gray

# --- Login ---
Write-Phase "Login"

function Get-UserInfo([string]$email, [string]$pass) {
    $body = "{`"identifier`":`"$email`",`"password`":`"$pass`"}"
    $r = Invoke-API -Uri "$Base/api/auth/login" -Method POST -Body $body
    if (-not $r.Ok) { throw "Login failed for $email (HTTP $($r.StatusCode))" }
    return @{ Token = $r.Data.data.token; UserId = $r.Data.data.user.id }
}

$adminInfo   = Get-UserInfo $AdminEmail $AdminPass
$ownerInfo   = Get-UserInfo $OwnerEmail $OwnerPass
$painterInfo = Get-UserInfo $PainterEmail $PainterPass

$adminToken   = $adminInfo.Token
$ownerToken   = $ownerInfo.Token
$painterToken = $painterInfo.Token
$painterId    = $painterInfo.UserId

$ADMIN   = @{ Authorization = "Bearer $adminToken" }
$OWNER   = @{ Authorization = "Bearer $ownerToken" }
$PAINTER = @{ Authorization = "Bearer $painterToken" }

Write-Host "  admin / owner / painter tokens OK" -ForegroundColor Gray

# =============================================================
# Phase 1 - Notification CRUD
# =============================================================
Write-Phase "Phase 1 - Notification CRUD"

# 1.1 Seed
$r = Invoke-API -Uri "$Base/api/notifications/test" -Method POST -Headers $ADMIN
if ($r.Ok -and $r.Data.data.message -eq "Test notification emitted") {
    Write-Pass "1.1  seed via admin test endpoint"
} else {
    Write-Fail "1.1  seed" "HTTP $($r.StatusCode)"
}

# 1.2 Fetch list
$r = Invoke-API -Uri "$Base/api/notifications" -Headers $ADMIN
$notifId = $null
if ($r.Ok -and $null -ne $r.Data.data.notifications) {
    Write-Pass "1.2  fetch list - notifications + unreadCount present"
    if ($r.Data.data.notifications.Count -gt 0) {
        $notifId = $r.Data.data.notifications[0]._id
    }
} else {
    Write-Fail "1.2  fetch list" "HTTP $($r.StatusCode)"
}

# 1.3 Unread filter
$r = Invoke-API -Uri "$Base/api/notifications?unread=true" -Headers $ADMIN
if ($r.Ok) {
    $leaked = $r.Data.data.notifications | Where-Object { $null -ne $_.readAt }
    if ($leaked.Count -eq 0) { Write-Pass "1.3  unread=true returns only unread items" }
    else { Write-Fail "1.3  unread filter" "found $($leaked.Count) item(s) with readAt set" }
} else { Write-Fail "1.3  unread filter" "HTTP $($r.StatusCode)" }

# 1.4 Limit = 3
$r = Invoke-API -Uri "$Base/api/notifications?limit=3" -Headers $ADMIN
if ($r.Ok -and $r.Data.data.notifications.Count -le 3) { Write-Pass "1.4  limit=3 returns 3 or fewer items" }
else { Write-Fail "1.4  limit=3" "count=$($r.Data.data.notifications.Count)" }

# 1.5 Limit cap at 50
$r = Invoke-API -Uri "$Base/api/notifications?limit=999" -Headers $ADMIN
if ($r.Ok -and $r.Data.data.notifications.Count -le 50) { Write-Pass "1.5  limit=999 capped at 50" }
else { Write-Fail "1.5  limit cap" "HTTP $($r.StatusCode)" }

# 1.6 Invalid limit falls back
$r = Invoke-API -Uri "$Base/api/notifications?limit=abc" -Headers $ADMIN
if ($r.Ok) { Write-Pass "1.6  invalid limit=abc falls back to default (200 OK)" }
else { Write-Fail "1.6  invalid limit fallback" "HTTP $($r.StatusCode)" }

# 1.7 Unread + limit combined
$r = Invoke-API -Uri "$Base/api/notifications?unread=true&limit=2" -Headers $ADMIN
if ($r.Ok -and $r.Data.data.notifications.Count -le 2) { Write-Pass "1.7  unread+limit=2 combined" }
else { Write-Fail "1.7  unread+limit" "count=$($r.Data.data.notifications.Count)" }

# 1.8 Sorted newest first
$r = Invoke-API -Uri "$Base/api/notifications" -Headers $ADMIN
if ($r.Ok -and $r.Data.data.notifications.Count -ge 2) {
    $dates  = $r.Data.data.notifications | ForEach-Object { [datetime]$_.createdAt }
    $sorted = $true
    for ($i = 1; $i -lt $dates.Count; $i++) {
        if ($dates[$i] -gt $dates[$i - 1]) { $sorted = $false; break }
    }
    if ($sorted) { Write-Pass "1.8  notifications sorted newest-first" }
    else { Write-Fail "1.8  sort order" "items not in descending order" }
} else { Write-Skip "1.8  sort order" "fewer than 2 notifications" }

# 1.9 Mark one read
if ($notifId) {
    $r = Invoke-API -Uri "$Base/api/notifications/$notifId/read" -Method PUT -Headers $ADMIN
    if ($r.Ok -and $null -ne $r.Data.data.readAt) { Write-Pass "1.9  mark one read - readAt set" }
    else { Write-Fail "1.9  mark one read" "HTTP $($r.StatusCode)" }
} else { Write-Skip "1.9  mark one read" "no notifId from 1.2" }

# 1.10 Idempotent mark read
if ($notifId) {
    $r = Invoke-API -Uri "$Base/api/notifications/$notifId/read" -Method PUT -Headers $ADMIN
    if ($r.Ok -and $null -ne $r.Data.data.readAt) { Write-Pass "1.10 mark read idempotent (still 200)" }
    else { Write-Fail "1.10 idempotent mark read" "HTTP $($r.StatusCode)" }
} else { Write-Skip "1.10 idempotent" "no notifId" }

# 1.11 Marked notification absent from unread list
if ($notifId) {
    $r = Invoke-API -Uri "$Base/api/notifications?unread=true" -Headers $ADMIN
    if ($r.Ok) {
        $stillUnread = $r.Data.data.notifications | Where-Object { $_._id -eq $notifId }
        if ($stillUnread.Count -eq 0) { Write-Pass "1.11 marked notification absent from unread list" }
        else { Write-Fail "1.11 unread count drop" "notification still in unread list" }
    } else { Write-Fail "1.11 unread refetch" "HTTP $($r.StatusCode)" }
} else { Write-Skip "1.11 unread drop" "no notifId" }

# 1.12 Painter has a valid notification list
$r = Invoke-API -Uri "$Base/api/notifications" -Headers $PAINTER
if ($r.Ok -and $null -ne $r.Data.data.notifications) {
    Write-Pass "1.12 painter GET /notifications - valid response"
} else { Write-Fail "1.12 painter notifications" "HTTP $($r.StatusCode)" }

# 1.13 Mark all read
$r = Invoke-API -Uri "$Base/api/notifications/read-all" -Method POST -Headers $ADMIN
if ($r.Ok -and $null -ne $r.Data.data.updated) { Write-Pass "1.13 mark-all-read - updated count returned" }
else { Write-Fail "1.13 mark all read" "HTTP $($r.StatusCode)" }

# 1.14 Mark all read again - 0 updated
$r = Invoke-API -Uri "$Base/api/notifications/read-all" -Method POST -Headers $ADMIN
if ($r.Ok -and [int]$r.Data.data.updated -eq 0) { Write-Pass "1.14 mark-all-read no-op - updated=0" }
else { Write-Fail "1.14 mark-all-read no-op" "updated=$($r.Data.data.updated)" }

# 1.15 Painter cannot see admin notifications
$r = Invoke-API -Uri "$Base/api/notifications" -Headers $PAINTER
if ($r.Ok) {
    $leaked = $r.Data.data.notifications | Where-Object { $_.eventId -eq "admin.bg_job_failed" }
    if ($leaked.Count -eq 0) { Write-Pass "1.15 notifications scoped per user" }
    else { Write-Fail "1.15 scoping" "painter sees $($leaked.Count) admin notification(s)" }
} else { Write-Fail "1.15 scoping fetch" "HTTP $($r.StatusCode)" }

# 1.16 Cross-user mark read -> 404
if ($notifId) {
    $r = Invoke-API -Uri "$Base/api/notifications/$notifId/read" -Method PUT -Headers $PAINTER
    if ($r.StatusCode -eq 404) { Write-Pass "1.16 cross-user mark read -> 404" }
    else { Write-Fail "1.16 cross-user mark read" "expected 404, got $($r.StatusCode)" }
} else { Write-Skip "1.16 cross-user" "no notifId" }

# 1.17 Valid ObjectId non-existent -> 404
$r = Invoke-API -Uri "$Base/api/notifications/000000000000000000000000/read" -Method PUT -Headers $ADMIN
if ($r.StatusCode -eq 404) { Write-Pass "1.17 non-existent ObjectId -> 404" }
else { Write-Fail "1.17 non-existent ObjectId" "expected 404, got $($r.StatusCode)" }

# 1.18 Invalid ObjectId format -> 404
$r = Invoke-API -Uri "$Base/api/notifications/not-an-id/read" -Method PUT -Headers $ADMIN
if ($r.StatusCode -eq 404) { Write-Pass "1.18 invalid ObjectId format -> 404" }
else { Write-Fail "1.18 invalid ObjectId format" "expected 404, got $($r.StatusCode)" }

# 1.19 No auth token -> 401
$r1 = Invoke-API -Uri "$Base/api/notifications"
$r2 = Invoke-API -Uri "$Base/api/notifications/read-all" -Method POST
$r3 = Invoke-API -Uri "$Base/api/notifications/000000000000000000000000/read" -Method PUT
if ($r1.StatusCode -eq 401 -and $r2.StatusCode -eq 401 -and $r3.StatusCode -eq 401) {
    Write-Pass "1.19 missing token -> 401 on all notification endpoints"
} else {
    Write-Fail "1.19 missing token" "got $($r1.StatusCode) $($r2.StatusCode) $($r3.StatusCode)"
}

# 1.20 Non-admin calling test endpoint -> 403
$rO = Invoke-API -Uri "$Base/api/notifications/test" -Method POST -Headers $OWNER
$rP = Invoke-API -Uri "$Base/api/notifications/test" -Method POST -Headers $PAINTER
if ($rO.StatusCode -eq 403 -and $rP.StatusCode -eq 403) {
    Write-Pass "1.20 non-admin test endpoint -> 403 (owner + painter)"
} else {
    Write-Fail "1.20 non-admin test endpoint" "owner=$($rO.StatusCode) painter=$($rP.StatusCode)"
}

# 1.21 Malformed JWT -> 401
$BAD = @{ Authorization = "Bearer thisisnotavalidjwt" }
$r   = Invoke-API -Uri "$Base/api/notifications" -Headers $BAD
if ($r.StatusCode -eq 401) { Write-Pass "1.21 malformed JWT -> 401" }
else { Write-Fail "1.21 malformed JWT" "expected 401, got $($r.StatusCode)" }


# =============================================================
# Phase 2 - Notification Preferences
# =============================================================
Write-Phase "Phase 2 - Notification Preferences"

# 2.1 Default preferences
$r = Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Headers $PAINTER
if ($r.Ok) {
    $d         = $r.Data.data
    $pushStar  = $d.push.PSObject.Properties["*"].Value
    $emailStar = $d.email.PSObject.Properties["*"].Value
    if ($pushStar -eq $true -and $emailStar -eq $true -and $d.digest -eq $false) {
        Write-Pass "2.1  default preferences - push.* + email.* = true, digest = false"
    } else {
        Write-Fail "2.1  default preferences" "push.*=$pushStar email.*=$emailStar digest=$($d.digest)"
    }
} else { Write-Fail "2.1  default preferences" "HTTP $($r.StatusCode)" }

# 2.2 First PUT - set push.* = false
$r = Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"push":{"*":false}}'
if ($r.Ok -and $r.Data.data.push.PSObject.Properties["*"].Value -eq $false) {
    Write-Pass "2.2  first PUT sets push.*=false"
} else { Write-Fail "2.2  first PUT" "HTTP $($r.StatusCode)" }

# 2.3 Second PUT - set email.* = false
$r = Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"email":{"*":false}}'
if ($r.Ok -and $r.Data.data.email.PSObject.Properties["*"].Value -eq $false) {
    Write-Pass "2.3  second PUT sets email.*=false"
} else { Write-Fail "2.3  second PUT" "HTTP $($r.StatusCode)" }

# 2.4 Partial update - only digest; push.* stays false
$r = Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"digest":true}'
$pushStillFalse = $r.Data.data.push.PSObject.Properties["*"].Value -eq $false
if ($r.Ok -and $r.Data.data.digest -eq $true -and $pushStillFalse) {
    Write-Pass "2.4  partial update - digest=true, push.* unchanged"
} else { Write-Fail "2.4  partial update" "digest=$($r.Data.data.digest) push.*=$pushStillFalse" }

# 2.5 Per-event override alongside wildcard
$r = Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"push":{"*":true,"submission.create":false}}'
if ($r.Ok) {
    $allPush = $r.Data.data.push.PSObject.Properties["*"].Value
    $subPush = $r.Data.data.push.PSObject.Properties["submission.create"].Value
    if ($allPush -eq $true -and $subPush -eq $false) {
        Write-Pass "2.5  per-event override - push.* true, push.submission.create false"
    } else { Write-Fail "2.5  per-event override" "push.*=$allPush submission.create=$subPush" }
} else { Write-Fail "2.5  per-event override" "HTTP $($r.StatusCode)" }

# 2.6 Set quiet hours
$r = Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"quietHours":{"start":"22:00","end":"08:00","tz":"Asia/Kolkata"}}'
if ($r.Ok -and $r.Data.data.quietHours.start -eq "22:00" -and $r.Data.data.quietHours.tz -eq "Asia/Kolkata") {
    Write-Pass "2.6  set quiet hours 22:00-08:00 Asia/Kolkata"
} else { Write-Fail "2.6  set quiet hours" "HTTP $($r.StatusCode)" }

# 2.7 Update quiet hours end time
$r = Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"quietHours":{"start":"22:00","end":"09:00","tz":"Asia/Kolkata"}}'
if ($r.Ok -and $r.Data.data.quietHours.end -eq "09:00" -and $r.Data.data.quietHours.start -eq "22:00") {
    Write-Pass "2.7  update quiet hours end to 09:00, start preserved"
} else { Write-Fail "2.7  update quiet hours" "HTTP $($r.StatusCode)" }

# 2.8 Clear quiet hours
$r = Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"quietHours":null}'
if ($r.Ok -and $null -eq $r.Data.data.quietHours) { Write-Pass "2.8  clear quiet hours -> null" }
else { Write-Fail "2.8  clear quiet hours" "quietHours=$($r.Data.data.quietHours) HTTP $($r.StatusCode)" }

# 2.9 GET reflects latest state
$r = Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Headers $PAINTER
if ($r.Ok -and $null -eq $r.Data.data.quietHours) { Write-Pass "2.9  GET is consistent with last PUT" }
else { Write-Fail "2.9  GET consistency" "quietHours=$($r.Data.data.quietHours)" }

# 2.10 Admin preferences are independent
$r = Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Headers $ADMIN
if ($r.Ok -and $r.Data.data.push.PSObject.Properties["*"].Value -eq $true) {
    Write-Pass "2.10 admin preferences unaffected by painter changes"
} else { Write-Fail "2.10 admin pref independence" }

# 2.11 Invalid quiet hours format -> 400
$r = Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"quietHours":{"start":"10pm","end":"8am","tz":"Asia/Kolkata"}}'
if ($r.StatusCode -eq 400) { Write-Pass "2.11 invalid time format -> 400" }
else { Write-Fail "2.11 invalid time format" "expected 400, got $($r.StatusCode)" }

# 2.12 quietHours missing tz -> 400
$r = Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"quietHours":{"start":"22:00","end":"08:00"}}'
if ($r.StatusCode -eq 400) { Write-Pass "2.12 quietHours missing tz -> 400" }
else { Write-Fail "2.12 missing tz" "expected 400, got $($r.StatusCode)" }

# 2.13 Empty body is a no-op -> 200
$r = Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{}'
if ($r.Ok) { Write-Pass "2.13 empty body is a no-op (200)" }
else { Write-Fail "2.13 empty body no-op" "expected 200, got $($r.StatusCode)" }

# 2.14 Non-boolean push value -> 400
$r = Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"push":{"*":"yes"}}'
if ($r.StatusCode -eq 400) { Write-Pass "2.14 non-boolean push value -> 400" }
else { Write-Fail "2.14 non-boolean push" "expected 400, got $($r.StatusCode)" }

# 2.15 No auth token -> 401
$r1 = Invoke-API -Uri "$Base/api/users/me/notification-preferences"
$r2 = Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT -Body '{"digest":true}'
if ($r1.StatusCode -eq 401 -and $r2.StatusCode -eq 401) { Write-Pass "2.15 no token -> 401 (GET + PUT)" }
else { Write-Fail "2.15 no token" "GET=$($r1.StatusCode) PUT=$($r2.StatusCode)" }

# 2.16 Reset painter to defaults
$r = Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"push":{"*":true},"email":{"*":true},"quietHours":null,"digest":false}'
if ($r.Ok) { Write-Pass "2.16 painter preferences reset to defaults" }
else { Write-Fail "2.16 reset preferences" "HTTP $($r.StatusCode)" }


# =============================================================
  # Phase 2B - SSE Stream
  # =============================================================
  Write-Phase "Phase 2B - SSE Stream"

  # 2B.1 No token -> 401
  $r = Invoke-API -Uri "$Base/api/notifications/stream"
  if ($r.StatusCode -eq 401) { Write-Pass "2B.1 SSE stream - no token -> 401" }
  else { Write-Fail "2B.1 SSE stream no token" "expected 401, got $($r.StatusCode)" }

  # 2B.2 Authenticated connect returns text/event-stream + ':connected' comment
  $sseOut = [System.IO.Path]::GetTempFileName()
  & curl.exe --silent --max-time 3 --no-buffer `
      --dump-header "$sseOut.headers" `
      --output "$sseOut.body" `
      -H "Authorization: Bearer $painterToken" `
      "$Base/api/notifications/stream" | Out-Null
  $sseHeaders = if (Test-Path "$sseOut.headers") { [System.IO.File]::ReadAllText("$sseOut.headers", [System.Text.Encoding]::UTF8) } else { "" }
  $sseBody    = if (Test-Path "$sseOut.body")    { [System.IO.File]::ReadAllText("$sseOut.body",    [System.Text.Encoding]::UTF8) } else { "" }
  Remove-Item "$sseOut.headers","$sseOut.body" -Force -ErrorAction SilentlyContinue
  if ($sseHeaders -match "text/event-stream") { Write-Pass "2B.2 SSE Content-Type is text/event-stream" }
  else { Write-Fail "2B.2 SSE Content-Type" "got: $($sseHeaders -replace '\r?\n',' ')" }

  # 2B.3 Body contains ':connected' SSE comment
  if ($sseBody -match ": connected") { Write-Pass "2B.3 SSE body contains ':connected' comment" }
  else { Write-Fail "2B.3 SSE connected comment" "body: $($sseBody.Substring(0, [Math]::Min(200,$sseBody.Length)))" }


# =============================================================
# Phase 2C - FCM Token
# =============================================================
Write-Phase "Phase 2C - FCM Token"

# 2C.1 Register a fake token -> 200
$r = Invoke-API -Uri "$Base/api/users/me/fcm-token" -Method POST `
    -Headers $PAINTER -Body '{"token":"test-fcm-token-abc123"}'
if ($r.Ok) { Write-Pass "2C.1 register FCM token -> 200" }
else { Write-Fail "2C.1 register FCM token" "HTTP $($r.StatusCode) $($r.Data.error)" }

# 2C.2 Register same token again (idempotent) -> 200
$r = Invoke-API -Uri "$Base/api/users/me/fcm-token" -Method POST `
    -Headers $PAINTER -Body '{"token":"test-fcm-token-abc123"}'
if ($r.Ok) { Write-Pass "2C.2 re-register same token (idempotent) -> 200" }
else { Write-Fail "2C.2 idempotent register" "HTTP $($r.StatusCode)" }

# 2C.3 Delete the token -> 200
$r = Invoke-API -Uri "$Base/api/users/me/fcm-token" -Method DELETE `
    -Headers $PAINTER -Body '{"token":"test-fcm-token-abc123"}'
if ($r.Ok) { Write-Pass "2C.3 delete FCM token -> 200" }
else { Write-Fail "2C.3 delete FCM token" "HTTP $($r.StatusCode) $($r.Data.error)" }

# 2C.4 Delete already-removed token (no-op) -> 200
$r = Invoke-API -Uri "$Base/api/users/me/fcm-token" -Method DELETE `
    -Headers $PAINTER -Body '{"token":"test-fcm-token-abc123"}'
if ($r.Ok) { Write-Pass "2C.4 delete non-existent token (no-op) -> 200" }
else { Write-Fail "2C.4 no-op delete" "HTTP $($r.StatusCode)" }

# 2C.5 No auth -> 401
$r1 = Invoke-API -Uri "$Base/api/users/me/fcm-token" -Method POST   -Body '{"token":"x"}'
$r2 = Invoke-API -Uri "$Base/api/users/me/fcm-token" -Method DELETE -Body '{"token":"x"}'
if ($r1.StatusCode -eq 401 -and $r2.StatusCode -eq 401) { Write-Pass "2C.5 no auth -> 401 (POST + DELETE)" }
else { Write-Fail "2C.5 no auth" "POST=$($r1.StatusCode) DELETE=$($r2.StatusCode)" }


# =============================================================
# Phase 2D - Audience Targeting
# =============================================================
Write-Phase "Phase 2D - Audience Targeting"

# Trigger admin.bg_job_failed - targets role:admin only (in-app row is synchronous)
Invoke-API -Uri "$Base/api/notifications/test" -Method POST -Headers $ADMIN | Out-Null

# 2D.1 Admin received the role-targeted notification
$r = Invoke-API -Uri "$Base/api/notifications?limit=50" -Headers $ADMIN
$adminHas = ($r.Data.data.notifications | Where-Object { $_.eventId -eq "admin.bg_job_failed" }).Count -gt 0
if ($r.Ok -and $adminHas) { Write-Pass "2D.1 role:admin - admin receives admin.bg_job_failed" }
else { Write-Fail "2D.1 admin receives role-targeted notification" "found=$adminHas HTTP=$($r.StatusCode)" }

# 2D.2 Painter does NOT receive it
$r = Invoke-API -Uri "$Base/api/notifications?limit=50" -Headers $PAINTER
$painterHas = ($r.Data.data.notifications | Where-Object { $_.eventId -eq "admin.bg_job_failed" }).Count -gt 0
if ($r.Ok -and -not $painterHas) { Write-Pass "2D.2 role:admin - painter excluded from admin.bg_job_failed" }
else { Write-Fail "2D.2 painter excluded from role-targeted notification" "found=$painterHas" }

# 2D.3 Owner does NOT receive it
$r = Invoke-API -Uri "$Base/api/notifications?limit=50" -Headers $OWNER
$ownerHas = ($r.Data.data.notifications | Where-Object { $_.eventId -eq "admin.bg_job_failed" }).Count -gt 0
if ($r.Ok -and -not $ownerHas) { Write-Pass "2D.3 role:admin - owner excluded from admin.bg_job_failed" }
else { Write-Fail "2D.3 owner excluded from role-targeted notification" "found=$ownerHas" }


# =============================================================
# Phase 2E - Preference Enforcement in Worker
# =============================================================
Write-Phase "Phase 2E - Preference Enforcement"

function Get-QueueTotal {
    $r = Invoke-API -Uri "$Base/api/admin/queue-stats" -Headers $ADMIN
    if (-not $r.Ok) { return -1 }
    $d = $r.Data.data
    return [int]$d.waiting + [int]$d.paused + [int]$d.active + [int]$d.completed + [int]$d.delayed + [int]$d.failed
}

# Each 2E emit uses a unique timestamp in data so the SHA1 jobId hash never
# collides with a previously completed job (BullMQ deduplicates by jobId).
$ts1 = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$ts2 = $ts1 + 1
$ts3 = $ts1 + 2

# 2E.1 Push disabled -> in-app still created, push job NOT enqueued
Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"push":{"*":false}}' | Out-Null

$before = Get-QueueTotal
Invoke-API -Uri "$Base/api/notifications/test" -Method POST -Headers $ADMIN `
    -Body "{`"eventId`":`"submission.create`",`"recipientId`":`"$painterId`",`"data`":{`"ts`":`"$ts1`"}}" | Out-Null
$after = Get-QueueTotal

$rList = Invoke-API -Uri "$Base/api/notifications?limit=50" -Headers $PAINTER
$inAppCreated = ($rList.Data.data.notifications | Where-Object { $_.eventId -eq "submission.create" }).Count -gt 0
if ($inAppCreated) { Write-Pass "2E.1a push disabled - in-app notification still created" }
else { Write-Fail "2E.1a in-app created when push off" "no submission.create in painter list" }

if ($before -ge 0 -and $after -ge 0 -and $after -eq $before) {
    Write-Pass "2E.1b push disabled - no new push job enqueued (queue total unchanged)"
} else {
    Write-Fail "2E.1b push job skipped" "queue before=$before after=$after"
}

# 2E.2 Push re-enabled -> push job IS enqueued
Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"push":{"*":true}}' | Out-Null

$before2 = Get-QueueTotal
Invoke-API -Uri "$Base/api/notifications/test" -Method POST -Headers $ADMIN `
    -Body "{`"eventId`":`"submission.create`",`"recipientId`":`"$painterId`",`"data`":{`"ts`":`"$ts2`"}}" | Out-Null
$after2 = Get-QueueTotal

if ($before2 -ge 0 -and $after2 -gt $before2) {
    Write-Pass "2E.2 push re-enabled - push job enqueued (queue total increased)"
} else {
    Write-Fail "2E.2 push job enqueued" "queue before=$before2 after=$after2"
}

# 2E.3 Per-event override: push.* true but submission.create false -> no push job
Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"push":{"*":true,"submission.create":false}}' | Out-Null

$before3 = Get-QueueTotal
Invoke-API -Uri "$Base/api/notifications/test" -Method POST -Headers $ADMIN `
    -Body "{`"eventId`":`"submission.create`",`"recipientId`":`"$painterId`",`"data`":{`"ts`":`"$ts3`"}}" | Out-Null
$after3 = Get-QueueTotal

if ($before3 -ge 0 -and $after3 -eq $before3) {
    Write-Pass "2E.3 per-event override push.submission.create=false - push job skipped"
} else {
    Write-Fail "2E.3 per-event push override" "queue before=$before3 after=$after3"
}

# Reset painter preferences
Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"push":{"*":true},"email":{"*":true},"quietHours":null,"digest":false}' | Out-Null


# =============================================================
# Phase 2F - actorId Exclusion
# =============================================================
Write-Phase "Phase 2F - actorId Exclusion"

$tsF1 = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$tsF2 = $tsF1 + 1

# Use unreadCount — a separate countDocuments query unaffected by the limit=50 cap.
# Filtered-array counting breaks once the painter accumulates >50 notifications.

# 2F.1 actorId == recipientId -> actor should NOT receive their own notification
$rBefore     = Invoke-API -Uri "$Base/api/notifications" -Headers $PAINTER
$countBefore = $rBefore.Data.data.unreadCount

Invoke-API -Uri "$Base/api/notifications/test" -Method POST -Headers $ADMIN `
    -Body "{`"eventId`":`"submission.create`",`"recipientId`":`"$painterId`",`"actorId`":`"$painterId`",`"data`":{`"ts`":`"$tsF1`"}}" | Out-Null

$rAfter      = Invoke-API -Uri "$Base/api/notifications" -Headers $PAINTER
$countAfter  = $rAfter.Data.data.unreadCount

if ($countAfter -eq $countBefore) { Write-Pass "2F.1 actorId=recipientId - actor excluded, no notification created" }
else { Write-Fail "2F.1 actorId exclusion" "unread before=$countBefore after=$countAfter (should be equal)" }

# 2F.2 actorId != recipientId -> recipient DOES receive the notification
Invoke-API -Uri "$Base/api/notifications/test" -Method POST -Headers $ADMIN `
    -Body "{`"eventId`":`"submission.create`",`"recipientId`":`"$painterId`",`"actorId`":`"$($ownerInfo.UserId)`",`"data`":{`"ts`":`"$tsF2`"}}" | Out-Null

$rAfter2     = Invoke-API -Uri "$Base/api/notifications" -Headers $PAINTER
$countAfter2 = $rAfter2.Data.data.unreadCount

if ($countAfter2 -gt $countAfter) { Write-Pass "2F.2 actorId!=recipientId - recipient receives notification" }
else { Write-Fail "2F.2 different actorId" "unread before=$countAfter after=$countAfter2 (should increase)" }


# =============================================================
# Phase 2G - Quiet Hours Enforcement
# =============================================================
Write-Phase "Phase 2G - Quiet Hours Enforcement"

# Use a unique time base well above previous phases to avoid BullMQ dedup
$tsG1 = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + 200
$tsG2 = $tsG1 + 1
$tsG3 = $tsG1 + 2

# Set quiet hours 00:00-23:59 UTC = covers the entire UTC day regardless of clock
Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER `
    -Body '{"push":{"*":true},"quietHours":{"start":"00:00","end":"23:59","tz":"UTC"}}' | Out-Null

# 2G.1a Normal-urgency event during quiet hours - in-app still created
$before = Get-QueueTotal
Invoke-API -Uri "$Base/api/notifications/test" -Method POST -Headers $ADMIN `
    -Body "{`"eventId`":`"submission.create`",`"recipientId`":`"$painterId`",`"data`":{`"ts`":`"$tsG1`"}}" | Out-Null
$after = Get-QueueTotal

$rG = Invoke-API -Uri "$Base/api/notifications?limit=50" -Headers $PAINTER
$hasInApp = ($rG.Data.data.notifications | Where-Object { $_.eventId -eq "submission.create" }).Count -gt 0
if ($hasInApp) { Write-Pass "2G.1a quiet hours - in-app created for normal event" }
else { Write-Fail "2G.1a quiet hours in-app" "no submission.create in painter list" }

# 2G.1b Normal-urgency push job blocked
if ($before -ge 0 -and $after -eq $before) { Write-Pass "2G.1b quiet hours - push job blocked for normal event" }
else { Write-Fail "2G.1b quiet hours blocks push" "queue before=$before after=$after" }

# 2G.2 Urgent event during quiet hours - push bypasses quiet hours
$before2 = Get-QueueTotal
Invoke-API -Uri "$Base/api/notifications/test" -Method POST -Headers $ADMIN `
    -Body "{`"eventId`":`"submission.reject`",`"recipientId`":`"$painterId`",`"data`":{`"ts`":`"$tsG2`"}}" | Out-Null
$after2 = Get-QueueTotal

if ($before2 -ge 0 -and $after2 -gt $before2) { Write-Pass "2G.2 urgent event bypasses quiet hours - push job enqueued" }
else { Write-Fail "2G.2 urgent bypass quiet hours" "queue before=$before2 after=$after2" }

# 2G.3 Clear quiet hours - normal push resumes
Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"quietHours":null}' | Out-Null

$before3 = Get-QueueTotal
Invoke-API -Uri "$Base/api/notifications/test" -Method POST -Headers $ADMIN `
    -Body "{`"eventId`":`"submission.create`",`"recipientId`":`"$painterId`",`"data`":{`"ts`":`"$tsG3`"}}" | Out-Null
$after3 = Get-QueueTotal

if ($before3 -ge 0 -and $after3 -gt $before3) { Write-Pass "2G.3 quiet hours cleared - push resumes for normal event" }
else { Write-Fail "2G.3 quiet hours cleared" "queue before=$before3 after=$after3" }

# Reset preferences
Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"push":{"*":true},"email":{"*":true},"quietHours":null,"digest":false}' | Out-Null


# =============================================================
# Phase 2H - Mandatory Events Bypass Preferences
# =============================================================
Write-Phase "Phase 2H - Mandatory Events"

$tsH1 = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + 300
$tsH2 = $tsH1 + 1

# Disable email for painter
Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"email":{"*":false}}' | Out-Null

# Pause the queue so the worker can't consume jobs before we count them.
# Without this, BullMQ v5's instant pub/sub pickup means a job can be
# added, processed, and removed before Get-QueueTotal runs.
Invoke-API -Uri "$Base/api/admin/queue-stats" -Method POST `
    -Headers $ADMIN -Body '{"action":"pause"}' | Out-Null

# 2H.1 Non-mandatory event with email disabled - email job NOT enqueued
# submission.reject has push+email; with email off only the push job should appear
$before1 = Get-QueueTotal
Invoke-API -Uri "$Base/api/notifications/test" -Method POST -Headers $ADMIN `
    -Body "{`"eventId`":`"submission.reject`",`"recipientId`":`"$painterId`",`"data`":{`"ts`":`"$tsH1`"}}" | Out-Null
$after1 = Get-QueueTotal
$increase1 = $after1 - $before1

if ($before1 -ge 0 -and $increase1 -eq 1) { Write-Pass "2H.1 email=false - non-mandatory email job blocked (only push enqueued)" }
else { Write-Fail "2H.1 non-mandatory email blocked" "queue increased by $increase1 (expected 1)" }

# 2H.2 Mandatory event (user.suspended) with email=false - email job IS still enqueued
# user.suspended is mandatory:true with channels [email, inApp] - must ignore email=false
$before2 = Get-QueueTotal
Invoke-API -Uri "$Base/api/notifications/test" -Method POST -Headers $ADMIN `
    -Body "{`"eventId`":`"user.suspended`",`"recipientId`":`"$painterId`",`"data`":{`"ts`":`"$tsH2`",`"reason`":`"test suspension`"}}" | Out-Null
$after2 = Get-QueueTotal

if ($before2 -ge 0 -and $after2 -gt $before2) { Write-Pass "2H.2 mandatory event bypasses email=false - email job enqueued" }
else { Write-Fail "2H.2 mandatory bypasses preference" "queue before=$before2 after=$after2" }

# Resume the queue so the worker can process the jobs we just added
Invoke-API -Uri "$Base/api/admin/queue-stats" -Method POST `
    -Headers $ADMIN -Body '{"action":"resume"}' | Out-Null

# Reset preferences
Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"push":{"*":true},"email":{"*":true},"quietHours":null,"digest":false}' | Out-Null


# =============================================================
# Phase 3 - Worker triggers (watch worker terminal for "completed")
# =============================================================
Write-Phase "Phase 3 - Worker triggers  (check worker terminal for completed lines)"

$r = Invoke-API -Uri "$Base/api/notifications/test" -Method POST -Headers $ADMIN
if ($r.Ok) { Write-Pass "3.2  test endpoint accepted - push job enqueued" }
else { Write-Fail "3.2  trigger push job" "HTTP $($r.StatusCode)" }

$r1 = Invoke-API -Uri "$Base/api/notifications/test" -Method POST -Headers $ADMIN
$r2 = Invoke-API -Uri "$Base/api/notifications/test" -Method POST -Headers $ADMIN
if ($r1.Ok -and $r2.Ok) {
    Write-Pass "3.7  dedup - two rapid emits both accepted (worker shows 1 push job per admin)"
} else { Write-Fail "3.7  dedup trigger" "r1=$($r1.StatusCode) r2=$($r2.StatusCode)" }


# =============================================================
# Phase 6 - Refactored routes
# =============================================================
Write-Phase "Phase 6 - Refactored routes"

$fcmCount = (Get-ChildItem -Recurse "src\app\api" -Filter "*.ts" |
    Select-String "admin\.messaging\(\)").Count
if ($fcmCount -eq 0) { Write-Pass "6.1a no admin.messaging() in API routes" }
else { Write-Fail "6.1a admin.messaging() still present" "found $fcmCount match(es)" }

$createCount = (Get-ChildItem -Recurse "src\app\api" -Filter "*.ts" |
    Select-String "Notification\.create\b").Count
if ($createCount -eq 0) { Write-Pass "6.1b no Notification.create() in API routes" }
else { Write-Fail "6.1b Notification.create() still present" "found $createCount match(es)" }

if ($PendingOwnerId) {
    $r = Invoke-API -Uri "$Base/api/admin/users/$PendingOwnerId/approve" -Method PATCH -Headers $ADMIN
    if ($r.Ok) { Write-Pass "6.4  approve pending owner -> 200" }
    else { Write-Fail "6.4  approve" "HTTP $($r.StatusCode) - $($r.Data.error)" }

    $r = Invoke-API -Uri "$Base/api/admin/users/$PendingOwnerId/approve" -Method PATCH -Headers $ADMIN
    if ($r.StatusCode -eq 400) { Write-Pass "6.5  double-approve (now active) -> 400" }
    else { Write-Fail "6.5  double-approve" "expected 400, got $($r.StatusCode)" }
} else {
    Write-Skip "6.4  approve pending owner" "pass -PendingOwnerId to enable"
    Write-Skip "6.5  double-approve" "pass -PendingOwnerId to enable"
}

if ($painterId) {
    $r = Invoke-API -Uri "$Base/api/admin/users/$painterId/approve" -Method PATCH -Headers $ADMIN
    if ($r.StatusCode -eq 400) { Write-Pass "6.6  approve wrong-role user (painter) -> 400" }
    else { Write-Fail "6.6  approve wrong role" "expected 400, got $($r.StatusCode)" }
} else { Write-Skip "6.6  wrong-role approve" "no painterId" }

$r = Invoke-API -Uri "$Base/api/admin/users/000000000000000000000000/approve" -Method PATCH -Headers $ADMIN
if ($r.StatusCode -eq 404) { Write-Pass "6.7  approve non-existent user -> 404" }
else { Write-Fail "6.7  non-existent approve" "expected 404, got $($r.StatusCode)" }


# =============================================================
# Phase 10 - Stress
# =============================================================
Write-Phase "Phase 10 - Stress"

$allOk = $true
1..10 | ForEach-Object {
    $r = Invoke-API -Uri "$Base/api/notifications/test" -Method POST -Headers $ADMIN
    if (-not $r.Ok) { $allOk = $false }
}
if ($allOk) { Write-Pass "10.1 10 rapid emits - all 200 (worker deduplicates push jobs)" }
else { Write-Fail "10.1 rapid emits" "one or more calls failed" }

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$r  = Invoke-API -Uri "$Base/api/notifications?limit=50" -Headers $ADMIN
$sw.Stop()
$ms = $sw.ElapsedMilliseconds
if ($r.Ok -and $ms -lt 500) {
    Write-Pass "10.2 GET /notifications?limit=50 in ${ms}ms (< 500ms)"
} elseif ($r.Ok) {
    Write-Fail "10.2 performance" "${ms}ms - check MongoDB indexes (Phase 9.2)"
} else {
    Write-Fail "10.2 performance" "HTTP $($r.StatusCode)"
}


# =============================================================
# Cleanup
# =============================================================
Write-Phase "Cleanup"

$r = Invoke-API -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
    -Headers $PAINTER -Body '{"push":{"*":true},"email":{"*":true},"quietHours":null,"digest":false}'
if ($r.Ok) { Write-Host "  Painter preferences reset." -ForegroundColor Gray }
else { Write-Host "  Could not reset painter preferences (HTTP $($r.StatusCode))." -ForegroundColor Yellow }

Write-Host ""
Write-Host "  To remove test notifications from MongoDB:" -ForegroundColor Gray
Write-Host '  db.notifications.deleteMany({ eventId: "admin.bg_job_failed" })' -ForegroundColor Gray


# =============================================================
# Summary
# =============================================================
$total = $script:pass + $script:fail + $script:skip
Write-Host ""
Write-Host "========================================" -ForegroundColor White
Write-Host "  $total tests  |  PASS $($script:pass)  FAIL $($script:fail)  SKIP $($script:skip)" -ForegroundColor White
Write-Host "========================================" -ForegroundColor White

if ($script:fail -gt 0) {
    Write-Host "  Some tests failed - see [FAIL] lines above." -ForegroundColor Red
    exit 1
}
Write-Host "  All executed tests passed." -ForegroundColor Green
exit 0
