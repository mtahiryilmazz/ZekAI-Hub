#Requires -Version 5.1
<#
  ZekAI Hub — tek komut yöneticisi
    .\Swarm.ps1 install     kurulum + masaüstü kısayolu + kontrol paneli
    .\Swarm.ps1 start       sunucuyu başlat ve tarayıcıyı aç
    .\Swarm.ps1 gui         kontrol paneli (başlat / durdur / log)
    .\Swarm.ps1 doctor      sistem teşhisi (yazmaz)
    .\Swarm.ps1 uninstall   kısayolları ve kurulum kaydını kaldır
#>
[CmdletBinding()]
param(
    [ValidateSet('install', 'start', 'gui', 'doctor', 'uninstall')]
    [string]$Command = 'start',
    [int]$Port = 8787
)

$win = Join-Path $PSScriptRoot 'installer\windows'

switch ($Command) {
    'install' { & (Join-Path $win 'install.ps1') -Port $Port -Launch }
    'start' { & (Join-Path $win 'start.ps1') -Port $Port }
    'gui' {
        Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', (Join-Path $win 'ZekAI-Kontrol.ps1'), '-Port', "$Port")
    }
    'doctor' {
        & (Join-Path $win 'install.ps1') -Port $Port -DryRun -NoShortcut
        Write-Host ''
        try {
            $h = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/health" -TimeoutSec 2
            Write-Host "  Sunucu: $($h.Content)" -ForegroundColor Green
        } catch {
            Write-Host '  Sunucu: kapalı (start ile açın)' -ForegroundColor DarkGray
        }
    }
    'uninstall' { & (Join-Path $win 'install.ps1') -Uninstall }
}
