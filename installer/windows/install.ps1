#Requires -Version 5.1
<#
  ZekAI Hub — Windows kurulum / teşhis
  Tek tık: ZekAI-Setup.cmd  (bu dosyayı çift tıklayın)
  Sessiz:  powershell -ExecutionPolicy Bypass -File install.ps1 -Launch
#>
[CmdletBinding()]
param(
    [int]$Port = 8787,
    [switch]$NoShortcut,
    [switch]$Launch,
    [switch]$DryRun,
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
$AppName = 'ZekAI Hub'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ConfigPath = Join-Path $PSScriptRoot '.install.json'
$IconPath = (Resolve-Path (Join-Path $PSScriptRoot '..\assets\zekai.ico') -ErrorAction SilentlyContinue)
if ($IconPath) { $IconPath = $IconPath.Path }

function Line { param([string]$Color = 'DarkGray') Write-Host ('  ' + ('─' * 62)) -ForegroundColor $Color }
function Step { param([string]$Text) Write-Host "  · $Text" -ForegroundColor DarkGray }
function Ok { param([string]$Text) Write-Host "  ✓ $Text" -ForegroundColor Green }
function Warn { param([string]$Text) Write-Host "  ! $Text" -ForegroundColor Yellow }
function Fail { param([string]$Text) Write-Host "  ✗ $Text" -ForegroundColor Red }

function Get-ShortcutPaths {
    @(
        (Join-Path ([Environment]::GetFolderPath('Desktop')) "$AppName.lnk"),
        (Join-Path ([Environment]::GetFolderPath('Programs')) "$AppName.lnk")
    )
}

# ---------------------------------------------------------------- uninstall
if ($Uninstall) {
    Write-Host "`n  $AppName — kaldırma`n" -ForegroundColor White
    foreach ($p in Get-ShortcutPaths) {
        if (Test-Path $p) { Remove-Item $p -Force; Ok "kaldırıldı: $p" }
    }
    if (Test-Path $ConfigPath) { Remove-Item $ConfigPath -Force; Ok 'kurulum kaydı silindi' }
    Write-Host "`n  Depo dosyalarına dokunulmadı.`n" -ForegroundColor DarkGray
    return
}

# ---------------------------------------------------------------- checks
Write-Host ''
Write-Host "  $AppName · Lean Hybrid Agent Swarm" -ForegroundColor White
Write-Host '  Ops Floor + CLI — kurulum ve teşhis' -ForegroundColor DarkGray
Line
Write-Host '  Sistem kontrolü' -ForegroundColor White

$problems = 0

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Fail 'Python bulunamadı. https://python.org adresinden 3.10+ kurun (PATH''e ekleyin).'
    $problems++
} else {
    $ver = (& python -c "import sys; print('%d.%d' % sys.version_info[:2])" 2>$null)
    if ([version]$ver -ge [version]'3.10') { Ok "Python $ver" }
    else { Fail "Python $ver bulundu, en az 3.10 gerekli."; $problems++ }
}

$tool = Join-Path $Root 'tools\swarm_sim.py'
$ui = Join-Path $Root 'apps\ops-floor\index.html'
if (Test-Path $tool) { Ok 'CLI + olay sunucusu bulundu' } else { Fail "eksik: $tool"; $problems++ }
if (Test-Path $ui) { Ok 'Ops Floor arayüzü bulundu' } else { Fail "eksik: $ui"; $problems++ }

try {
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($listener) { Warn "port $Port kullanımda — kurulum çalışır, başlatmada çakışabilir." }
    else { Ok "port $Port boş" }
} catch { Warn 'port kontrolü atlandı (yetki/komut yok).' }

$free = [System.IO.DriveInfo]::new((Split-Path $Root -Qualifier)).AvailableFreeSpace
if ($free -gt 200MB) { Ok ('disk: {0:N0} GB boş' -f ($free / 1GB)) } else { Warn 'disk alanı düşük.' }

Line
if ($problems -gt 0) {
    Write-Host "  Kurulum tamamlanamadı: $problems sorun giderilmeli." -ForegroundColor Red
    if (-not $DryRun) { exit 1 }
}

# ---------------------------------------------------------------- dry run
if ($DryRun) {
    Write-Host '  Teşhis tamam (DryRun — sisteme yazılmadı).' -ForegroundColor DarkGray
    Write-Host "  Başlatmak için: powershell -File `"$PSScriptRoot\start.ps1`" -Port $Port" -ForegroundColor DarkGray
    return
}

# ---------------------------------------------------------------- shortcuts
if (-not $NoShortcut) {
    $shell = New-Object -ComObject WScript.Shell
    foreach ($path in Get-ShortcutPaths) {
        $dir = Split-Path $path -Parent
        if (-not (Test-Path $dir)) { continue }
        $sc = $shell.CreateShortcut($path)
        $sc.TargetPath = 'powershell.exe'
        $sc.Arguments = "-NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSScriptRoot\ZekAI-Kontrol.ps1`" -Port $Port"
        $sc.WorkingDirectory = $Root
        if ($IconPath) { $sc.IconLocation = "$IconPath,0" }
        $sc.Description = 'ZekAI Hub — kontrol paneli (başlat / durdur)'
        $sc.Save()
        Ok "kısayol: $path"
    }
}

# ---------------------------------------------------------------- config
@{
    app        = $AppName
    version    = '0.1.0'
    root       = $Root
    port       = $Port
    installed  = (Get-Date).ToString('s')
    python     = $python.Source
} | ConvertTo-Json | Set-Content -Path $ConfigPath -Encoding UTF8
Ok 'kurulum kaydı yazıldı'

Line
Write-Host '  Kurulum tamam. Masaüstündeki "ZekAI Hub" kısayolu kontrol panelini açar.' -ForegroundColor Green
Write-Host "  Kontrol paneli: `"$PSScriptRoot\ZekAI.cmd`"  ·  doğrudan: powershell -STA -File `"$PSScriptRoot\ZekAI-Kontrol.ps1`" -Port $Port" -ForegroundColor DarkGray
Write-Host ''

if ($Launch) {
    Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', (Join-Path $PSScriptRoot 'ZekAI-Kontrol.ps1'), '-Port', "$Port")
}
