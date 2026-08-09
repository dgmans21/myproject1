<#
.SYNOPSIS
  Sync frontend/backend local env when the PC LAN IP changes.
  Also enables CORS / Next allowedDevOrigins for the same /24 octets .100-.250
  so DHCP churn inside that range does not break phone login.

.EXAMPLE
  .\scripts\set-lan-ip.ps1 -Ip 192.168.0.10
#>
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^\d{1,3}(\.\d{1,3}){3}$')]
  [string]$Ip
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$feEnv = Join-Path $root "frontend\.env.local"
$beEnv = Join-Path $root "backend\.env"

function Write-Utf8NoBom([string]$path, [string[]]$lines) {
  $text = ($lines -join "`n") + "`n"
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($path, $text, $utf8)
}

function Set-EnvLine([string]$path, [string]$key, [string]$value) {
  if (-not (Test-Path $path)) {
    throw "Missing file: $path"
  }
  $lines = [System.IO.File]::ReadAllLines($path)
  $found = $false
  $next = foreach ($line in $lines) {
    if ($line -match "^\s*#") { $line; continue }
    if ($line -match "^\s*$key\s*=") {
      $found = $true
      "$key=$value"
    } else {
      $line
    }
  }
  if (-not $found) {
    $next = @($next) + "$key=$value"
  }
  Write-Utf8NoBom $path $next
}

$parts = $Ip.Split(".")
if ($parts.Count -ne 4) {
  throw "Invalid IPv4: $Ip"
}
$lanPrefix = "{0}.{1}.{2}" -f $parts[0], $parts[1], $parts[2]

Set-EnvLine $feEnv "DEV_LAN_IP" $Ip
Set-EnvLine $feEnv "NEXT_PUBLIC_API_URL" "http://${Ip}:8000"
# 초대·공유 링크 — PC가 localhost여도 폰이 열 수 있는 origin
Set-EnvLine $feEnv "NEXT_PUBLIC_APP_URL" "http://${Ip}:3000"

# localhost만 명시 — LAN 대역(.100~.250)은 CORS_LAN_PREFIX 로 백엔드가 전개
$cors = "http://localhost:3000,http://127.0.0.1:3000"
Set-EnvLine $beEnv "CORS_ORIGINS" $cors
Set-EnvLine $beEnv "CORS_LAN_PREFIX" $lanPrefix

Write-Host "Updated:"
Write-Host "  frontend/.env.local  DEV_LAN_IP=$Ip"
Write-Host "  frontend/.env.local  NEXT_PUBLIC_API_URL=http://${Ip}:8000"
Write-Host "  frontend/.env.local  NEXT_PUBLIC_APP_URL=http://${Ip}:3000  (invite share origin)"
Write-Host "  backend/.env         CORS_ORIGINS=$cors"
Write-Host "  backend/.env         CORS_LAN_PREFIX=$lanPrefix  (expands .100-.250:3000)"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1) Restart frontend: cd frontend; npm run dev"
Write-Host "  2) Restart backend:  cd backend; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
Write-Host "  3) Phone browser:    http://${Ip}:3000"
Write-Host "  4) Manual consoles (Supabase Redirect / Kakao JS domain / Naver callback):"
Write-Host "     see .cursor/rules/lan-dev-ip.mdc"
