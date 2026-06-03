# test-users-routes.ps1
# Full coverage test suite for /api/users/* endpoints.
# Tests every route, every auth guard, every role gate, every validation branch,
# and every business-logic path. State changes are restored after each test.
#
# Usage:
#   .\scripts\test-users-routes.ps1
#   .\scripts\test-users-routes.ps1 -PainterEmail p@example.com -PainterPass Pass123# `
#                                   -OwnerEmail   o@example.com -OwnerPass   Pass123#
#
# Requires: npm run dev on $Base

param(
    [string]$Base         = "http://localhost:3000",
    [string]$AdminEmail   = "krishkrsquare@gmail.com",
    [string]$AdminPass    = "Krish123456#",
    [string]$PainterEmail = "kumarkrishofficial@gmail.com",
    [string]$PainterPass  = "Krish123456#",
    [string]$OwnerEmail   = "krishkumarart9@gmail.com",
    [string]$OwnerPass    = "Krish123456#"
)

$ErrorActionPreference = "Stop"

$script:Passed  = 0
$script:Failed  = 0
$script:Skipped = 0

$FAKE_ID    = "000000000000000000000001"   # valid ObjectId format, guaranteed non-existent
$FCM_TOKEN1 = "test-fcm-token-AAAA1111"   # used for FCM add/remove tests
$FCM_TOKEN2 = "test-fcm-token-BBBB2222"   # second token for multi-token tests

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
        $snippet = $R.Raw.Substring(0, [Math]::Min(150, $R.Raw.Length))
        FAIL $Label "expected $Code, got $($R.Code): $snippet"
    }
}

function Expect-Assert {
    param([string]$Label, [hashtable]$R, [int]$Code, [scriptblock]$Check)
    if ($R.Code -ne $Code) {
        $snippet = $R.Raw.Substring(0, [Math]::Min(150, $R.Raw.Length))
        FAIL $Label "expected $Code, got $($R.Code): $snippet"
        return
    }
    $ok = $false
    try { $ok = ($R | ForEach-Object $Check) -eq $true } catch { $ok = $false }
    if ($ok) { PASS $Label }
    else {
        $snippet = $R.Raw.Substring(0, [Math]::Min(150, $R.Raw.Length))
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
Write-Host "  USER ROUTES TEST SUITE" -ForegroundColor White
Write-Host "  Target: $Base" -ForegroundColor DarkGray
Write-Host ""

# ======= Authenticate all roles ===============================================
Section "Setup: Login"

$adminToken = Login-User -Email $AdminEmail -Password $AdminPass -Label "admin"
if (-not $adminToken) { Write-Host "Cannot continue without admin token." -ForegroundColor Red; exit 1 }

$painterToken = $null
$painterId    = $null
if ($PainterEmail -and $PainterPass) {
    $painterToken = Login-User -Email $PainterEmail -Password $PainterPass -Label "painter"
    if ($painterToken) {
        $pr = Invoke-Api -Uri "$Base/api/users/me" -Method GET -Token $painterToken
        try { $painterId = $pr.Json.data._id } catch {}
        Write-Host "  Painter ID: $painterId" -ForegroundColor DarkGray
    }
}

$ownerToken = $null
$ownerId    = $null
if ($OwnerEmail -and $OwnerPass) {
    $ownerToken = Login-User -Email $OwnerEmail -Password $OwnerPass -Label "owner"
    if ($ownerToken) {
        $or = Invoke-Api -Uri "$Base/api/users/me" -Method GET -Token $ownerToken
        try { $ownerId = $or.Json.data._id } catch {}
        Write-Host "  Owner ID: $ownerId" -ForegroundColor DarkGray
    }
}

# Fetch admin identity for [userId] tests and state restoration
$adminMe   = Invoke-Api -Uri "$Base/api/users/me" -Method GET -Token $adminToken
$adminId   = $null
$adminName = $null
try { $adminId   = $adminMe.Json.data._id  } catch {}
try { $adminName = $adminMe.Json.data.name } catch {}
Write-Host "  Admin ID: $adminId  Name: $adminName" -ForegroundColor DarkGray

# ==============================================================================
Section "1. Auth Guards -- every endpoint must reject unauthenticated requests"

$guards = @(
    @{ L="GET  /api/users";                             M="GET";    U="$Base/api/users" },
    @{ L="GET  /api/users/me";                          M="GET";    U="$Base/api/users/me" },
    @{ L="PUT  /api/users/me";                          M="PUT";    U="$Base/api/users/me" },
    @{ L="PUT  /api/users/me/password";                 M="PUT";    U="$Base/api/users/me/password" },
    @{ L="POST /api/users/me/fcm-token";                M="POST";   U="$Base/api/users/me/fcm-token" },
    @{ L="DEL  /api/users/me/fcm-token";                M="DELETE"; U="$Base/api/users/me/fcm-token" },
    @{ L="GET  /api/users/me/notification-preferences"; M="GET";    U="$Base/api/users/me/notification-preferences" },
    @{ L="PUT  /api/users/me/notification-preferences"; M="PUT";    U="$Base/api/users/me/notification-preferences" },
    @{ L="POST /api/users/verify-email/send";           M="POST";   U="$Base/api/users/verify-email/send" },
    @{ L="POST /api/users/verify-email/confirm";        M="POST";   U="$Base/api/users/verify-email/confirm" },
    @{ L="POST /api/users/change-email/send";           M="POST";   U="$Base/api/users/change-email/send" },
    @{ L="POST /api/users/change-email/confirm";        M="POST";   U="$Base/api/users/change-email/confirm" },
    @{ L="GET  /api/users/{adminId}";                   M="GET";    U="$Base/api/users/$adminId" },
    @{ L="PUT  /api/users/{adminId}";                   M="PUT";    U="$Base/api/users/$adminId" },
    @{ L="DEL  /api/users/{adminId}";                   M="DELETE"; U="$Base/api/users/$adminId" }
)

foreach ($g in $guards) {
    $r = Invoke-Api -Uri $g.U -Method $g.M
    Expect-Status "No token -> 401: $($g.L)" $r 401
}

# ==============================================================================
Section "2. GET /api/users -- List Users"

# Admin: baseline list returns pagination envelope
$r = Invoke-Api -Uri "$Base/api/users" -Method GET -Token $adminToken
Expect-Assert "Admin: 200 with users/total/page/pages fields" $r 200 {
    param($x)
    ($null -ne $x.Json.data.users) -and
    ($null -ne $x.Json.data.total) -and
    ($null -ne $x.Json.data.page)  -and
    ($null -ne $x.Json.data.pages)
}

# Admin: filter role=painter -> all results have role=painter
$r = Invoke-Api -Uri "$Base/api/users?role=painter" -Method GET -Token $adminToken
Expect-Assert "Admin: ?role=painter returns only painters" $r 200 {
    param($x)
    $users = $x.Json.data.users
    if ($users.Count -eq 0) { return $true }
    $bad = $users | Where-Object { $_.role -ne "painter" }
    ($null -eq $bad) -or (@($bad).Count -eq 0)
}

# Admin: filter role=owner -> all results have role=owner
$r = Invoke-Api -Uri "$Base/api/users?role=owner" -Method GET -Token $adminToken
Expect-Assert "Admin: ?role=owner returns only owners" $r 200 {
    param($x)
    $users = $x.Json.data.users
    if ($users.Count -eq 0) { return $true }
    $bad = $users | Where-Object { $_.role -ne "owner" }
    ($null -eq $bad) -or (@($bad).Count -eq 0)
}

# Admin: filter role=admin -> finds at least self
$r = Invoke-Api -Uri "$Base/api/users?role=admin" -Method GET -Token $adminToken
Expect-Assert "Admin: ?role=admin finds at least 1 admin (self)" $r 200 {
    param($x); $x.Json.data.total -ge 1
}

# Admin: status filters accepted
$r = Invoke-Api -Uri "$Base/api/users?status=active" -Method GET -Token $adminToken
Expect-Assert "Admin: ?status=active returns 200" $r 200 { param($x); $null -ne $x.Json.data.users }

$r = Invoke-Api -Uri "$Base/api/users?status=inactive" -Method GET -Token $adminToken
Expect-Assert "Admin: ?status=inactive returns 200" $r 200 { param($x); $null -ne $x.Json.data.users }

# Admin: ?q searches name, email, phone
$emailPart = $AdminEmail.Substring(0, 5)
$r = Invoke-Api -Uri "$Base/api/users?q=$emailPart" -Method GET -Token $adminToken
Expect-Assert "Admin: ?q=<email prefix> finds admin account" $r 200 {
    param($x)
    $match = $x.Json.data.users | Where-Object { $_.email -like "*$emailPart*" }
    ($null -ne $match) -and (@($match).Count -ge 1)
}

# Admin: far-out page returns empty array, still 200
$r = Invoke-Api -Uri "$Base/api/users?page=99999" -Method GET -Token $adminToken
Expect-Assert "Admin: ?page=99999 returns empty users array" $r 200 {
    param($x); @($x.Json.data.users).Count -eq 0
}

# Admin: response includes role field on each user (was a bug fix)
$r = Invoke-Api -Uri "$Base/api/users?role=admin" -Method GET -Token $adminToken
Expect-Assert "Admin: list includes role field on users" $r 200 {
    param($x)
    $first = $x.Json.data.users | Select-Object -First 1
    ($null -ne $first) -and ($null -ne $first.role)
}

# Admin: password never exposed in list
Expect-Assert "Admin: list excludes password field" $r 200 {
    param($x)
    $first = $x.Json.data.users | Select-Object -First 1
    if ($null -eq $first) { return $true }
    -not ($first.PSObject.Properties.Name -contains 'password')
}

# Owner: can access, result is forced to painters-only regardless of ?role param
if ($ownerToken) {
    $r = Invoke-Api -Uri "$Base/api/users" -Method GET -Token $ownerToken
    Expect-Assert "Owner: 200, all returned users are painters" $r 200 {
        param($x)
        $users = $x.Json.data.users
        if ($users.Count -eq 0) { return $true }
        $bad = $users | Where-Object { $_.role -ne "painter" }
        ($null -eq $bad) -or (@($bad).Count -eq 0)
    }

    # ?role=admin silently overridden to painter for owners
    $r = Invoke-Api -Uri "$Base/api/users?role=admin" -Method GET -Token $ownerToken
    Expect-Assert "Owner: ?role=admin silently ignored, still painters only" $r 200 {
        param($x)
        $users = $x.Json.data.users
        if ($users.Count -eq 0) { return $true }
        $bad = $users | Where-Object { $_.role -ne "painter" }
        ($null -eq $bad) -or (@($bad).Count -eq 0)
    }

    # ?status filter silently ignored for owners (code only applies it when role=admin)
    $r = Invoke-Api -Uri "$Base/api/users?status=inactive" -Method GET -Token $ownerToken
    Expect-Status "Owner: ?status filter silently ignored, 200" $r 200
} else {
    SKIP "Owner list / filter tests" "No owner credentials provided"
}

# Painter: role-gated -> 403
if ($painterToken) {
    $r = Invoke-Api -Uri "$Base/api/users" -Method GET -Token $painterToken
    Expect-Status "Painter: GET /api/users -> 403" $r 403
} else {
    SKIP "Painter: GET /api/users -> 403" "No painter credentials provided"
}

# ==============================================================================
Section "3. GET /api/users/me -- Current User Profile"

$r = Invoke-Api -Uri "$Base/api/users/me" -Method GET -Token $adminToken
Expect-Assert "Admin: 200 with _id, name, email, role fields" $r 200 {
    param($x)
    $d = $x.Json.data
    ($null -ne $d._id) -and ($null -ne $d.name) -and ($null -ne $d.email) -and ($null -ne $d.role)
}
Expect-Assert "Admin: response excludes password" $r 200 {
    param($x); -not ($x.Json.data.PSObject.Properties.Name -contains 'password')
}
Expect-Assert "Admin: response excludes resetPasswordToken" $r 200 {
    param($x); -not ($x.Json.data.PSObject.Properties.Name -contains 'resetPasswordToken')
}
Expect-Assert "Admin: response excludes resetPasswordExpires" $r 200 {
    param($x); -not ($x.Json.data.PSObject.Properties.Name -contains 'resetPasswordExpires')
}
Expect-Assert "Admin: role field equals 'admin'" $r 200 {
    param($x); $x.Json.data.role -eq "admin"
}

if ($painterToken) {
    $r = Invoke-Api -Uri "$Base/api/users/me" -Method GET -Token $painterToken
    Expect-Assert "Painter: /me returns 200 with role=painter" $r 200 {
        param($x); $x.Json.data.role -eq "painter"
    }
} else {
    SKIP "Painter /me" "No painter credentials provided"
}

if ($ownerToken) {
    $r = Invoke-Api -Uri "$Base/api/users/me" -Method GET -Token $ownerToken
    Expect-Assert "Owner: /me returns 200 with role=owner" $r 200 {
        param($x); $x.Json.data.role -eq "owner"
    }
} else {
    SKIP "Owner /me" "No owner credentials provided"
}

# ==============================================================================
Section "4. PUT /api/users/me -- Update Profile"

# Valid update: change name, then restore immediately
$tempName = "Test Name $([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
$r = Invoke-Api -Uri "$Base/api/users/me" -Method PUT -Token $adminToken `
    -Body "{`"name`":`"$tempName`"}"
Expect-Assert "Valid name update -> 200 with new name in response" $r 200 {
    param($x); $x.Json.data.name -eq $tempName
}

if ($adminName) {
    $restore = Invoke-Api -Uri "$Base/api/users/me" -Method PUT -Token $adminToken `
        -Body "{`"name`":`"$adminName`"}"
    if ($restore.Code -eq 200) { Write-Host "  (restored admin name to '$adminName')" -ForegroundColor DarkGray }
    else { Write-Host "  WARNING: failed to restore admin name!" -ForegroundColor Yellow }
}

# Empty name string fails min(1) validation
$r = Invoke-Api -Uri "$Base/api/users/me" -Method PUT -Token $adminToken -Body '{"name":""}'
Expect-Status "Empty string name -> 400 validation" $r 400

# name is optional in UpdateProfileSchema, so {} is valid (no-op)
$r = Invoke-Api -Uri "$Base/api/users/me" -Method PUT -Token $adminToken -Body '{}'
Expect-Status "Empty body {} -- name optional, no-op -> 200" $r 200

# Non-JSON body triggers validateBody to throw 400
$r = Invoke-Api -Uri "$Base/api/users/me" -Method PUT -Token $adminToken -Body 'not json'
Expect-Status "Non-JSON body -> 400" $r 400

# ==============================================================================
Section "5. PUT /api/users/me/password -- Change Password"

# Wrong current password
$r = Invoke-Api -Uri "$Base/api/users/me/password" -Method PUT -Token $adminToken `
    -Body '{"currentPassword":"WrongPass999!","newPassword":"NewPass123x"}'
Expect-ErrorCode "Wrong currentPassword -> 400 INVALID_CREDENTIALS" $r 400 "INVALID_CREDENTIALS"

# Missing currentPassword (required field)
$r = Invoke-Api -Uri "$Base/api/users/me/password" -Method PUT -Token $adminToken `
    -Body '{"newPassword":"NewPass123x"}'
Expect-Status "Missing currentPassword -> 400 validation" $r 400

# Missing newPassword (required field)
$r = Invoke-Api -Uri "$Base/api/users/me/password" -Method PUT -Token $adminToken `
    -Body '{"currentPassword":"Krish123456x"}'
Expect-Status "Missing newPassword -> 400 validation" $r 400

# newPassword too short (min 8 chars)
$r = Invoke-Api -Uri "$Base/api/users/me/password" -Method PUT -Token $adminToken `
    -Body '{"currentPassword":"Krish123456x","newPassword":"abc"}'
Expect-Status "newPassword < 8 chars -> 400 validation" $r 400

# Both fields missing
$r = Invoke-Api -Uri "$Base/api/users/me/password" -Method PUT -Token $adminToken -Body '{}'
Expect-Status "Empty body -> 400 (both required fields missing)" $r 400

Write-Host "  NOTE: valid password change not tested to protect admin credentials." -ForegroundColor DarkGray

# ==============================================================================
Section "6. POST /api/users/me/fcm-token -- Register FCM Token"

# Add first token
$r = Invoke-Api -Uri "$Base/api/users/me/fcm-token" -Method POST -Token $adminToken `
    -Body "{`"token`":`"$FCM_TOKEN1`"}"
Expect-Assert "Add FCM_TOKEN1 -> 200, token present in array" $r 200 {
    param($x)
    $tokens = @($x.Json.data.fcmTokens)
    $tokens -contains $FCM_TOKEN1
}

# Add same token again -- $addToSet ensures no duplicates
$r = Invoke-Api -Uri "$Base/api/users/me/fcm-token" -Method POST -Token $adminToken `
    -Body "{`"token`":`"$FCM_TOKEN1`"}"
Expect-Assert "Add same token again -> 200, no duplicates (addToSet)" $r 200 {
    param($x)
    $tokens = @($x.Json.data.fcmTokens)
    ($tokens | Where-Object { $_ -eq $FCM_TOKEN1 }).Count -eq 1
}

# Add second distinct token
$r = Invoke-Api -Uri "$Base/api/users/me/fcm-token" -Method POST -Token $adminToken `
    -Body "{`"token`":`"$FCM_TOKEN2`"}"
Expect-Assert "Add FCM_TOKEN2 -> 200, both tokens in array" $r 200 {
    param($x)
    $tokens = @($x.Json.data.fcmTokens)
    ($tokens -contains $FCM_TOKEN1) -and ($tokens -contains $FCM_TOKEN2)
}

# Missing token field
$r = Invoke-Api -Uri "$Base/api/users/me/fcm-token" -Method POST -Token $adminToken -Body '{}'
Expect-Status "Missing token field -> 400" $r 400

# Empty token string fails min(1)
$r = Invoke-Api -Uri "$Base/api/users/me/fcm-token" -Method POST -Token $adminToken `
    -Body '{"token":""}'
Expect-Status "Empty token string -> 400 (min 1)" $r 400

# Non-JSON body
$r = Invoke-Api -Uri "$Base/api/users/me/fcm-token" -Method POST -Token $adminToken `
    -Body 'garbage'
Expect-Status "Non-JSON body -> 400" $r 400

# ==============================================================================
Section "7. DELETE /api/users/me/fcm-token -- Remove FCM Token"

# Remove FCM_TOKEN1
$r = Invoke-Api -Uri "$Base/api/users/me/fcm-token" -Method DELETE -Token $adminToken `
    -Body "{`"token`":`"$FCM_TOKEN1`"}"
Expect-Assert "Remove FCM_TOKEN1 -> 200, no longer in array" $r 200 {
    param($x)
    $tokens = @($x.Json.data.fcmTokens)
    -not ($tokens -contains $FCM_TOKEN1)
}

# Remove non-existent token -- $pull is idempotent, no error
$r = Invoke-Api -Uri "$Base/api/users/me/fcm-token" -Method DELETE -Token $adminToken `
    -Body '{"token":"fcm-token-that-was-never-added"}'
Expect-Status "Remove non-existent token -> 200 (idempotent pull)" $r 200

# Remove FCM_TOKEN2 -- cleanup
$r = Invoke-Api -Uri "$Base/api/users/me/fcm-token" -Method DELETE -Token $adminToken `
    -Body "{`"token`":`"$FCM_TOKEN2`"}"
Expect-Status "Remove FCM_TOKEN2 (cleanup) -> 200" $r 200

# Missing token field
$r = Invoke-Api -Uri "$Base/api/users/me/fcm-token" -Method DELETE -Token $adminToken -Body '{}'
Expect-Status "Missing token field -> 400" $r 400

# ==============================================================================
Section "8. GET /api/users/me/notification-preferences -- Get Preferences"

$r = Invoke-Api -Uri "$Base/api/users/me/notification-preferences" -Method GET -Token $adminToken
Expect-Assert "Admin: 200 with push/email/quietHours/digest structure" $r 200 {
    param($x)
    $d = $x.Json.data
    ($d.PSObject.Properties.Name -contains 'push')       -and
    ($d.PSObject.Properties.Name -contains 'email')      -and
    ($d.PSObject.Properties.Name -contains 'quietHours') -and
    ($d.PSObject.Properties.Name -contains 'digest')
}
Expect-Assert "Admin: push is an object" $r 200 {
    param($x); $x.Json.data.push -is [System.Management.Automation.PSCustomObject]
}
Expect-Assert "Admin: digest is a boolean" $r 200 {
    param($x); $x.Json.data.digest -is [bool]
}

# Capture original preferences for later restoration
$origDigest = $null
try { $origDigest = $r.Json.data.digest } catch {}

if ($painterToken) {
    $r = Invoke-Api -Uri "$Base/api/users/me/notification-preferences" -Method GET -Token $painterToken
    Expect-Status "Painter: GET preferences -> 200" $r 200
} else {
    SKIP "Painter GET preferences" "No painter credentials"
}

# ==============================================================================
Section "9. PUT /api/users/me/notification-preferences -- Update Preferences"

# Set digest=true
$r = Invoke-Api -Uri "$Base/api/users/me/notification-preferences" -Method PUT -Token $adminToken `
    -Body '{"digest":true}'
Expect-Assert "Set digest=true -> 200" $r 200 { param($x); $x.Json.data.digest -eq $true }

# Set digest=false
$r = Invoke-Api -Uri "$Base/api/users/me/notification-preferences" -Method PUT -Token $adminToken `
    -Body '{"digest":false}'
Expect-Assert "Set digest=false -> 200" $r 200 { param($x); $x.Json.data.digest -eq $false }

# Set quietHours with valid HH:MM values
$r = Invoke-Api -Uri "$Base/api/users/me/notification-preferences" -Method PUT -Token $adminToken `
    -Body '{"quietHours":{"start":"22:00","end":"07:00","tz":"UTC"}}'
Expect-Assert "Set quietHours -> 200 with start/end/tz" $r 200 {
    param($x)
    $qh = $x.Json.data.quietHours
    ($null -ne $qh) -and ($qh.start -eq "22:00") -and ($qh.end -eq "07:00") -and ($qh.tz -eq "UTC")
}

# Clear quietHours with null
$r = Invoke-Api -Uri "$Base/api/users/me/notification-preferences" -Method PUT -Token $adminToken `
    -Body '{"quietHours":null}'
Expect-Assert "Set quietHours=null (clear) -> 200, field is null" $r 200 {
    param($x); $null -eq $x.Json.data.quietHours
}

# Set push preferences (record<string, boolean>)
$r = Invoke-Api -Uri "$Base/api/users/me/notification-preferences" -Method PUT -Token $adminToken `
    -Body '{"push":{"submission.create":true,"submission.approve":false}}'
Expect-Status "Set push preferences -> 200" $r 200

# Set email preferences
$r = Invoke-Api -Uri "$Base/api/users/me/notification-preferences" -Method PUT -Token $adminToken `
    -Body '{"email":{"owner.registered":true}}'
Expect-Status "Set email preferences -> 200" $r 200

# Empty body -- all fields optional, no DB write, returns current prefs
$r = Invoke-Api -Uri "$Base/api/users/me/notification-preferences" -Method PUT -Token $adminToken `
    -Body '{}'
Expect-Status "Empty body {} -- all optional, no-op -> 200" $r 200

# Invalid quietHours.start (not HH:MM)
$r = Invoke-Api -Uri "$Base/api/users/me/notification-preferences" -Method PUT -Token $adminToken `
    -Body '{"quietHours":{"start":"10pm","end":"07:00","tz":"UTC"}}'
Expect-Status "Invalid quietHours.start format -> 400" $r 400

# Invalid quietHours.end
$r = Invoke-Api -Uri "$Base/api/users/me/notification-preferences" -Method PUT -Token $adminToken `
    -Body '{"quietHours":{"start":"22:00","end":"7am","tz":"UTC"}}'
Expect-Status "Invalid quietHours.end format -> 400" $r 400

# Missing quietHours.tz
$r = Invoke-Api -Uri "$Base/api/users/me/notification-preferences" -Method PUT -Token $adminToken `
    -Body '{"quietHours":{"start":"22:00","end":"07:00"}}'
Expect-Status "Missing quietHours.tz -> 400" $r 400

# Push value is not boolean (z.record(z.boolean()) rejects strings)
$r = Invoke-Api -Uri "$Base/api/users/me/notification-preferences" -Method PUT -Token $adminToken `
    -Body '{"push":{"submission.create":"yes"}}'
Expect-Status "Push pref value is string not bool -> 400" $r 400

# Restore preferences (restore original digest value, clear quietHours)
if ($null -ne $origDigest) {
    $digestVal = if ($origDigest -eq $true) { "true" } else { "false" }
    $rr = Invoke-Api -Uri "$Base/api/users/me/notification-preferences" -Method PUT `
        -Token $adminToken -Body "{`"digest`":$digestVal,`"quietHours`":null}"
    if ($rr.Code -eq 200) { Write-Host "  (restored preferences: digest=$digestVal)" -ForegroundColor DarkGray }
    else { Write-Host "  WARNING: failed to restore notification preferences!" -ForegroundColor Yellow }
}

# ==============================================================================
Section "10. GET /api/users/{userId} -- Get Specific User"

# Admin gets self
$r = Invoke-Api -Uri "$Base/api/users/$adminId" -Method GET -Token $adminToken
Expect-Assert "Admin: get own profile by ID -> 200" $r 200 {
    param($x); $x.Json.data._id -eq $adminId
}
Expect-Assert "Admin: [userId] response excludes password" $r 200 {
    param($x); -not ($x.Json.data.PSObject.Properties.Name -contains 'password')
}

# Admin gets painter by ID
if ($painterId) {
    $r = Invoke-Api -Uri "$Base/api/users/$painterId" -Method GET -Token $adminToken
    Expect-Assert "Admin: get painter by ID -> 200" $r 200 {
        param($x); $x.Json.data._id -eq $painterId
    }
} else {
    SKIP "Admin: get painter by ID" "No painter credentials provided"
}

# Admin with non-existent ObjectId -> 404
$r = Invoke-Api -Uri "$Base/api/users/$FAKE_ID" -Method GET -Token $adminToken
Expect-Status "Admin: fake ObjectId -> 404" $r 404

# Owner: admin is not a painter so never in any job's painters list -> 403
if ($ownerToken) {
    $r = Invoke-Api -Uri "$Base/api/users/$adminId" -Method GET -Token $ownerToken
    Expect-Status "Owner: get admin (not assigned) -> 403" $r 403

    if ($painterId) {
        # 200 if painter is assigned to owner's job, 403 if not -- both are valid
        $r = Invoke-Api -Uri "$Base/api/users/$painterId" -Method GET -Token $ownerToken
        $valid = ($r.Code -eq 200) -or ($r.Code -eq 403)
        if ($valid) { PASS "Owner: get painter -> 200 (assigned) or 403 (not assigned) [got $($r.Code)]" }
        else { FAIL "Owner: get painter -> unexpected HTTP $($r.Code)" }
    } else {
        SKIP "Owner: get painter by ID" "No painter credentials"
    }
} else {
    SKIP "Owner: GET /api/users/{userId} tests" "No owner credentials"
}

# Painter: role not in [admin, owner] -> 403
if ($painterToken) {
    $r = Invoke-Api -Uri "$Base/api/users/$adminId" -Method GET -Token $painterToken
    Expect-Status "Painter: GET /api/users/{userId} -> 403" $r 403
} else {
    SKIP "Painter: GET /api/users/{userId} -> 403" "No painter credentials"
}

# ==============================================================================
Section "11. PUT /api/users/{userId} -- Admin Update User"

# Admin: update own name then restore
$tempAdminName = "AdminTemp $([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
$r = Invoke-Api -Uri "$Base/api/users/$adminId" -Method PUT -Token $adminToken `
    -Body "{`"name`":`"$tempAdminName`"}"
Expect-Assert "Admin: update name -> 200 with new name" $r 200 {
    param($x); $x.Json.data.name -eq $tempAdminName
}
if ($adminName) {
    $rr = Invoke-Api -Uri "$Base/api/users/$adminId" -Method PUT -Token $adminToken `
        -Body "{`"name`":`"$adminName`"}"
    if ($rr.Code -eq 200) { Write-Host "  (restored admin name)" -ForegroundColor DarkGray }
    else { Write-Host "  WARNING: failed to restore admin name via [userId] PUT!" -ForegroundColor Yellow }
}

# Admin: update painter status (idempotent set to active)
if ($painterId) {
    $r = Invoke-Api -Uri "$Base/api/users/$painterId" -Method PUT -Token $adminToken `
        -Body '{"status":"active"}'
    Expect-Status "Admin: update painter status=active -> 200" $r 200
} else {
    SKIP "Admin: update painter status" "No painter credentials"
}

# Admin: invalid role value (not in enum)
$r = Invoke-Api -Uri "$Base/api/users/$adminId" -Method PUT -Token $adminToken `
    -Body '{"role":"superuser"}'
Expect-Status "Admin: invalid role value -> 400 validation" $r 400

# Admin: invalid status value
$r = Invoke-Api -Uri "$Base/api/users/$adminId" -Method PUT -Token $adminToken `
    -Body '{"status":"banned"}'
Expect-Status "Admin: invalid status value -> 400 validation" $r 400

# Admin: non-existent user -> 404
$r = Invoke-Api -Uri "$Base/api/users/$FAKE_ID" -Method PUT -Token $adminToken `
    -Body '{"name":"Ghost"}'
Expect-Status "Admin: PUT non-existent user -> 404" $r 404

# Owner: not in admin role -> 403
if ($ownerToken) {
    $r = Invoke-Api -Uri "$Base/api/users/$adminId" -Method PUT -Token $ownerToken `
        -Body '{"name":"Hacked"}'
    Expect-Status "Owner: PUT /api/users/{userId} -> 403" $r 403
} else {
    SKIP "Owner: PUT /api/users/{userId} -> 403" "No owner credentials"
}

# Painter: not in admin role -> 403
if ($painterToken) {
    $r = Invoke-Api -Uri "$Base/api/users/$adminId" -Method PUT -Token $painterToken `
        -Body '{"name":"Hacked"}'
    Expect-Status "Painter: PUT /api/users/{userId} -> 403" $r 403
} else {
    SKIP "Painter: PUT /api/users/{userId} -> 403" "No painter credentials"
}

# ==============================================================================
Section "12. DELETE /api/users/{userId} -- Admin Deactivate User"

# Admin: non-existent ObjectId -> 404
$r = Invoke-Api -Uri "$Base/api/users/$FAKE_ID" -Method DELETE -Token $adminToken
Expect-Status "Admin: DELETE fake ObjectId -> 404" $r 404

# Admin: deactivate painter, verify status=inactive, then reactivate
if ($painterId) {
    $r = Invoke-Api -Uri "$Base/api/users/$painterId" -Method DELETE -Token $adminToken
    Expect-Assert "Admin: deactivate painter -> 200 with message" $r 200 {
        param($x); -not [string]::IsNullOrEmpty($x.Json.data.message)
    }
    # Verify status actually changed
    $check = Invoke-Api -Uri "$Base/api/users/$painterId" -Method GET -Token $adminToken
    Expect-Assert "Painter status is now inactive" $check 200 {
        param($x); $x.Json.data.status -eq "inactive"
    }
    # Restore painter to active
    $restore = Invoke-Api -Uri "$Base/api/users/$painterId" -Method PUT -Token $adminToken `
        -Body '{"status":"active"}'
    if ($restore.Code -eq 200) { Write-Host "  (restored painter status to active)" -ForegroundColor DarkGray }
    else { Write-Host "  WARNING: failed to restore painter status!" -ForegroundColor Yellow }
} else {
    SKIP "Admin: deactivate + restore painter" "No painter credentials"
}

# Owner: not admin -> 403
if ($ownerToken) {
    $r = Invoke-Api -Uri "$Base/api/users/$adminId" -Method DELETE -Token $ownerToken
    Expect-Status "Owner: DELETE /api/users/{userId} -> 403" $r 403
} else {
    SKIP "Owner: DELETE /api/users/{userId} -> 403" "No owner credentials"
}

# Painter: not admin -> 403
if ($painterToken) {
    $r = Invoke-Api -Uri "$Base/api/users/$adminId" -Method DELETE -Token $painterToken
    Expect-Status "Painter: DELETE /api/users/{userId} -> 403" $r 403
} else {
    SKIP "Painter: DELETE /api/users/{userId} -> 403" "No painter credentials"
}

# ==============================================================================
Section "13. POST /api/users/verify-email/send -- Send Verification OTP"

# Admin email is already verified -> 409 VALIDATION_ERROR
$r = Invoke-Api -Uri "$Base/api/users/verify-email/send" -Method POST -Token $adminToken
Expect-ErrorCode "Already verified -> 409 VALIDATION_ERROR" $r 409 "VALIDATION_ERROR"

# Painter: unverified -> 200 (sessionId), already verified -> 409
if ($painterToken) {
    $r = Invoke-Api -Uri "$Base/api/users/verify-email/send" -Method POST -Token $painterToken
    $valid = ($r.Code -eq 200) -or ($r.Code -eq 409)
    if ($valid) { PASS "Painter: send -> 200 (unverified) or 409 (verified) [got $($r.Code)]" }
    else { FAIL "Painter: send -> unexpected HTTP $($r.Code)" }
} else {
    SKIP "Painter: verify-email/send" "No painter credentials"
}

Write-Host "  NOTE: rateLimit=strict applied on this endpoint (IP-level throttle)." -ForegroundColor DarkGray

# ==============================================================================
Section "14. POST /api/users/verify-email/confirm -- Confirm Email Verification"

# Missing sessionId (otp provided, sessionId omitted)
$r = Invoke-Api -Uri "$Base/api/users/verify-email/confirm" -Method POST -Token $adminToken `
    -Body '{"otp":"123456"}'
Expect-Status "Missing sessionId -> 400" $r 400

# Missing otp
$r = Invoke-Api -Uri "$Base/api/users/verify-email/confirm" -Method POST -Token $adminToken `
    -Body '{"sessionId":"some-session-id"}'
Expect-Status "Missing otp -> 400" $r 400

# OTP too short (5 chars, schema requires exactly 6)
$r = Invoke-Api -Uri "$Base/api/users/verify-email/confirm" -Method POST -Token $adminToken `
    -Body '{"sessionId":"some-session-id","otp":"12345"}'
Expect-Status "OTP length=5 (not 6) -> 400" $r 400

# OTP too long (7 chars)
$r = Invoke-Api -Uri "$Base/api/users/verify-email/confirm" -Method POST -Token $adminToken `
    -Body '{"sessionId":"some-session-id","otp":"1234567"}'
Expect-Status "OTP length=7 (not 6) -> 400" $r 400

# Valid shape but fake session -> 401 INVALID_CREDENTIALS
$r = Invoke-Api -Uri "$Base/api/users/verify-email/confirm" -Method POST -Token $adminToken `
    -Body '{"sessionId":"00000000-0000-0000-0000-000000000000","otp":"000000"}'
Expect-ErrorCode "Fake sessionId -> 401 INVALID_CREDENTIALS" $r 401 "INVALID_CREDENTIALS"

# Empty body
$r = Invoke-Api -Uri "$Base/api/users/verify-email/confirm" -Method POST -Token $adminToken `
    -Body '{}'
Expect-Status "Empty body -> 400 (both fields required)" $r 400

# ==============================================================================
Section "15. POST /api/users/change-email/send -- Send Change-Email OTP"

# Wrong password -> 401 INVALID_CREDENTIALS
$r = Invoke-Api -Uri "$Base/api/users/change-email/send" -Method POST -Token $adminToken `
    -Body '{"newEmail":"newemail@example.com","password":"WrongPassword!"}'
Expect-ErrorCode "Wrong password -> 401 INVALID_CREDENTIALS" $r 401 "INVALID_CREDENTIALS"

# Invalid email format
$r = Invoke-Api -Uri "$Base/api/users/change-email/send" -Method POST -Token $adminToken `
    -Body "{`"newEmail`":`"not-an-email`",`"password`":`"$AdminPass`"}"
Expect-Status "Invalid email format -> 400 validation" $r 400

# Missing newEmail
$r = Invoke-Api -Uri "$Base/api/users/change-email/send" -Method POST -Token $adminToken `
    -Body "{`"password`":`"$AdminPass`"}"
Expect-Status "Missing newEmail -> 400 validation" $r 400

# Missing password
$r = Invoke-Api -Uri "$Base/api/users/change-email/send" -Method POST -Token $adminToken `
    -Body '{"newEmail":"newemail@example.com"}'
Expect-Status "Missing password -> 400 validation" $r 400

# Empty body
$r = Invoke-Api -Uri "$Base/api/users/change-email/send" -Method POST -Token $adminToken `
    -Body '{}'
Expect-Status "Empty body -> 400 (both fields required)" $r 400

# Admin's own current email -> 409 EMAIL_TAKEN
$r = Invoke-Api -Uri "$Base/api/users/change-email/send" -Method POST -Token $adminToken `
    -Body "{`"newEmail`":`"$AdminEmail`",`"password`":`"$AdminPass`"}"
Expect-ErrorCode "Own current email -> 409 EMAIL_TAKEN" $r 409 "EMAIL_TAKEN"

# Valid send with a unique throwaway address (sends a real OTP email)
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$testNewEmail = "change-email-test-$ts@mailinator.com"
Write-Host "  NOTE: next test sends an OTP email to $testNewEmail" -ForegroundColor DarkGray
$r = Invoke-Api -Uri "$Base/api/users/change-email/send" -Method POST -Token $adminToken `
    -Body "{`"newEmail`":`"$testNewEmail`",`"password`":`"$AdminPass`"}"
Expect-Assert "Valid send -> 200 with sessionId" $r 200 {
    param($x); -not [string]::IsNullOrEmpty($x.Json.data.sessionId)
}
$changeEmailSessionId = $null
try { $changeEmailSessionId = $r.Json.data.sessionId } catch {}

# ==============================================================================
Section "16. POST /api/users/change-email/confirm -- Confirm Email Change"

# Missing sessionId
$r = Invoke-Api -Uri "$Base/api/users/change-email/confirm" -Method POST -Token $adminToken `
    -Body '{"otp":"123456"}'
Expect-Status "Missing sessionId -> 400" $r 400

# Missing otp
$r = Invoke-Api -Uri "$Base/api/users/change-email/confirm" -Method POST -Token $adminToken `
    -Body '{"sessionId":"some-session-id"}'
Expect-Status "Missing otp -> 400" $r 400

# OTP too short
$r = Invoke-Api -Uri "$Base/api/users/change-email/confirm" -Method POST -Token $adminToken `
    -Body '{"sessionId":"some-session-id","otp":"12345"}'
Expect-Status "OTP length=5 -> 400 validation" $r 400

# OTP too long
$r = Invoke-Api -Uri "$Base/api/users/change-email/confirm" -Method POST -Token $adminToken `
    -Body '{"sessionId":"some-session-id","otp":"1234567"}'
Expect-Status "OTP length=7 -> 400 validation" $r 400

# Empty body
$r = Invoke-Api -Uri "$Base/api/users/change-email/confirm" -Method POST -Token $adminToken `
    -Body '{}'
Expect-Status "Empty body -> 400" $r 400

# Completely fake sessionId -> 401
$r = Invoke-Api -Uri "$Base/api/users/change-email/confirm" -Method POST -Token $adminToken `
    -Body '{"sessionId":"00000000-0000-0000-0000-000000000000","otp":"000000"}'
Expect-ErrorCode "Fake sessionId -> 401 INVALID_CREDENTIALS" $r 401 "INVALID_CREDENTIALS"

# Real sessionId from section 15 but wrong OTP
if ($changeEmailSessionId) {
    $r = Invoke-Api -Uri "$Base/api/users/change-email/confirm" -Method POST -Token $adminToken `
        -Body "{`"sessionId`":`"$changeEmailSessionId`",`"otp`":`"999999`"}"
    Expect-ErrorCode "Real sessionId + wrong OTP -> 401 INVALID_CREDENTIALS" $r 401 "INVALID_CREDENTIALS"

    # Cross-user attack: use painter token with admin's sessionId -- userId mismatch -> 401
    if ($painterToken) {
        $r = Invoke-Api -Uri "$Base/api/users/change-email/confirm" -Method POST -Token $painterToken `
            -Body "{`"sessionId`":`"$changeEmailSessionId`",`"otp`":`"000000`"}"
        Expect-ErrorCode "Cross-user: painter token + admin sessionId -> 401" $r 401 "INVALID_CREDENTIALS"
    } else {
        SKIP "Cross-user sessionId theft -> 401" "No painter credentials"
    }
} else {
    SKIP "Real sessionId OTP mismatch tests" "change-email/send did not return a sessionId"
}

# ==============================================================================
Section "Summary"

$total = $script:Passed + $script:Failed + $script:Skipped
Write-Host ""
Write-Host "  Total  : $total" -ForegroundColor White
Write-Host "  Passed : $($script:Passed)" -ForegroundColor Green
if ($script:Failed -gt 0) {
    Write-Host "  Failed : $($script:Failed)" -ForegroundColor Red
} else {
    Write-Host "  Failed : 0" -ForegroundColor Green
}
Write-Host "  Skipped: $($script:Skipped)" -ForegroundColor Yellow
Write-Host ""

if ($script:Failed -gt 0) {
    Write-Host "  RESULT: SOME TESTS FAILED" -ForegroundColor Red
    exit 1
} else {
    Write-Host "  RESULT: ALL TESTS PASSED" -ForegroundColor Green
    exit 0
}
