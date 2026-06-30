# 로컬 env·서버 점검 (Windows PowerShell)
# 사용: .\scripts\check-local.ps1

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$frontendEnv = Join-Path $root "frontend\.env.local"
$backendEnv = Join-Path $root "backend\.env"

Write-Host "=== env 파일 ===" -ForegroundColor Cyan
if (Test-Path $frontendEnv) {
    Write-Host "[OK] frontend/.env.local"
} else {
    Write-Host "[--] frontend/.env.local 없음 → copy frontend\.env.example frontend\.env.local"
}

if (Test-Path $backendEnv) {
    Write-Host "[OK] backend/.env"
} else {
    Write-Host "[--] backend/.env 없음 → copy backend\.env.example backend\.env"
}

Write-Host "`n=== HTTP ===" -ForegroundColor Cyan
try {
    $h = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 3
    Write-Host "[OK] backend /health → $($h.status)"
} catch {
    Write-Host "[!!] backend 미실행 (uvicorn app.main:app --reload --port 8000)"
}

try {
    $db = Invoke-WebRequest -Uri "http://localhost:8000/health/db" -TimeoutSec 5 -UseBasicParsing
    Write-Host "[DB] /health/db → $($db.StatusCode) $($db.Content)"
} catch {
    Write-Host "[!!] /health/db 접근 실패 (backend/.env 또는 Supabase 확인)"
}

try {
    $f = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3 -UseBasicParsing
    Write-Host "[OK] frontend → $($f.StatusCode)"
} catch {
    Write-Host "[!!] frontend 미실행 (cd frontend && npm run dev)"
}

Write-Host "`nUI mock은 Supabase 없이도 동작합니다. 실DB는 migrations 001-014 + backend/.env 필요." -ForegroundColor DarkGray
