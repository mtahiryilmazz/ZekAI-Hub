#Requires -Version 5.1
<#
  ZekAI Hub — başlatıcı
  Sunucu çalışmıyorsa arka planda başlatır, sonra tarayıcıyı açar.
#>
[CmdletBinding()]
param([int]$Port = 8787)

$ErrorActionPreference = 'SilentlyContinue'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Url = "http://127.0.0.1:$Port/"

function Test-Health {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri "$($Url)health" -TimeoutSec 2
        return $r.StatusCode -eq 200
    } catch { return $false }
}

if (-not (Test-Health)) {
    $python = (Get-Command python).Source
    Start-Process -FilePath $python `
        -ArgumentList @('tools\swarm_sim.py', 'serve', '--port', "$Port") `
        -WorkingDirectory $Root -WindowStyle Hidden

    $ok = $false
    for ($i = 0; $i -lt 48; $i++) {
        Start-Sleep -Milliseconds 250
        if (Test-Health) { $ok = $true; break }
    }
    if (-not $ok) {
        $shell = New-Object -ComObject WScript.Shell
        $null = $shell.Popup(
            "Sunucu başlatılamadı.`n`nElle deneyin:`ncd `"$Root`"`npython tools\swarm_sim.py serve --port $Port",
            0, 'ZekAI Hub', 16)
        exit 1
    }
}

Start-Process $Url
