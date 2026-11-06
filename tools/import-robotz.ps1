#Requires -Version 5.1
<#
  ROBOTZ — export edilen .glb dosyalarını ofise aktarır.
  Kullanım:
    .\tools\import-robotz.ps1 -Source "C:\Users\BT\Downloads"
    .\tools\import-robotz.ps1 -Source "C:\Users\BT\Downloads" -DryRun
#>
[CmdletBinding()]
param(
    [string]$Source = "$env:USERPROFILE\Downloads",
    [string]$Dest = '',
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$here = if ($PSCommandPath) { Split-Path -Parent $PSCommandPath } else { (Get-Location).Path }
if (-not $Dest) { $Dest = Join-Path $here '..\apps\ops-floor\models\robots' }
$Dest = [System.IO.Path]::GetFullPath($Dest)
if (-not (Test-Path $Dest)) { New-Item -ItemType Directory -Force -Path $Dest | Out-Null }

$files = @(Get-ChildItem -LiteralPath $Source -Recurse -File -Filter '*.glb' -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match 'robot' })

if (-not $files.Count) {
    Write-Host "  Bulunamadi: $Source altinda 'robot*.glb' yok." -ForegroundColor Yellow
    Write-Host "  Once Blender'da export et: apps/ops-floor/models/robots/README.md" -ForegroundColor DarkGray
    exit 1
}

$i = 0
foreach ($f in $files) {
    $i++
    $target = Join-Path $Dest ("robot{0}.glb" -f $i)
    $mb = [math]::Round($f.Length / 1MB, 2)
    if ($DryRun) {
        Write-Host ("  [dry] {0}  ({1} MB) -> {2}" -f $f.Name, $mb, (Split-Path $target -Leaf)) -ForegroundColor DarkGray
        continue
    }
    Copy-Item -LiteralPath $f.FullName -Destination $target -Force
    Write-Host ("  kopyalandi: {0}  ({1} MB)" -f (Split-Path $target -Leaf), $mb) -ForegroundColor Green
}

Write-Host ''
Write-Host ("  Hedef: {0}" -f $Dest) -ForegroundColor DarkGray
Write-Host '  Arayuzde: Maskot -> model sec -> /models/robots/robotN.glb -> Yeni ekle' -ForegroundColor DarkGray
