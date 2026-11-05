#Requires -Version 5.1
<#
  ZekAI Hub — Kontrol Paneli (başlat / durdur / durum / log)
  Açmak için: ZekAI.cmd  (çift tık)  ·  ya da:
    powershell -STA -ExecutionPolicy Bypass -File ZekAI-Kontrol.ps1
  Test:  powershell -STA -ExecutionPolicy Bypass -File ZekAI-Kontrol.ps1 -SelfTest
#>
[CmdletBinding()]
param(
    [int]$Port = 8787,
    [switch]$SelfTest,
    [switch]$NoGui
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$LogPath = Join-Path $env:USERPROFILE '.zekai\server.log'
$PidPath = Join-Path $env:USERPROFILE '.zekai\server.pid'
$Base = "http://127.0.0.1:$Port"

function Get-Python {
    $p = Get-Command python -ErrorAction SilentlyContinue
    if ($p) { return $p.Source }
    $p = Get-Command py -ErrorAction SilentlyContinue
    if ($p) { return $p.Source }
    return $null
}
$script:Python = Get-Python

function Get-Health {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri "$Base/health" -TimeoutSec 2
        if ($r.StatusCode -eq 200) { return ($r.Content | ConvertFrom-Json) }
    } catch { }
    return $null
}

function Get-Settings {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri "$Base/api/settings" -TimeoutSec 2
        if ($r.StatusCode -eq 200) { return ($r.Content | ConvertFrom-Json) }
    } catch { }
    return $null
}

function Get-ServerPid {
    $list = @()
    try {
        $list += (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop).OwningProcess
    } catch { }
    if (Test-Path $PidPath) {
        $raw = (Get-Content $PidPath -ErrorAction SilentlyContinue | Select-Object -First 1)
        if ($raw -match '^\d+$') { $list += [int]$raw }
    }
    $list | Where-Object { $_ -and (Get-Process -Id $_ -ErrorAction SilentlyContinue) } | Select-Object -Unique
}

function Start-ZekaiServer {
    if (Get-Health) { return $true }
    if (-not $script:Python) { throw 'Python bulunamadı (PATH).' }
    New-Item -ItemType Directory -Force -Path (Split-Path $LogPath) | Out-Null
    $args = @('-u', 'tools\swarm_sim.py', 'serve', '--port', "$Port")
    $proc = Start-Process -FilePath $script:Python -ArgumentList $args -WorkingDirectory $Root `
        -WindowStyle Hidden -PassThru -RedirectStandardOutput $LogPath -RedirectStandardError "$LogPath.err"
    Set-Content -Path $PidPath -Value $proc.Id -Encoding ASCII
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Milliseconds 250
        if (Get-Health) { return $true }
        if ($proc.HasExited) { break }
    }
    return $false
}

function Stop-ZekaiServer {
    $pids = @(Get-ServerPid)
    foreach ($id in $pids) {
        try { & taskkill.exe /T /F /PID $id 2>$null | Out-Null } catch { }
    }
    Start-Sleep -Milliseconds 400
    Remove-Item $PidPath -ErrorAction SilentlyContinue
    return -not (Get-Health)
}

function Restart-ZekaiServer {
    $null = Stop-ZekaiServer
    return (Start-ZekaiServer)
}

function Format-Uptime([datetime]$start) {
    $d = (Get-Date) - $start
    if ($d.TotalHours -ge 1) { return ('{0:0}s {1:00}dk' -f [math]::Floor($d.TotalHours), $d.Minutes) }
    if ($d.TotalMinutes -ge 1) { return ('{0:0}dk {1:00}sn' -f [math]::Floor($d.TotalMinutes), $d.Seconds) }
    return ('{0:0}sn' -f $d.TotalSeconds)
}

function Get-StatusSnapshot {
    $h = Get-Health
    $s = if ($h) { Get-Settings } else { $null }
    $pidList = @(Get-ServerPid)
    $uptime = ''
    if ($pidList.Count -gt 0) {
        $p = Get-Process -Id $pidList[0] -ErrorAction SilentlyContinue
        if ($p) { $uptime = Format-Uptime $p.StartTime }
    }
    [pscustomobject]@{
        Running  = [bool]$h
        Port     = $Port
        Pid      = ($pidList -join ', ')
        Uptime   = $uptime
        Provider = if ($s) { "$($s.provider) · $($s.model)" } else { '—' }
        Cost     = if ($s) { ('${0:N4}' -f [double]$s.today_cost) } else { '—' }
        Events   = if ($h) { $h.events } else { '—' }
    }
}

function Get-LogTail([int]$Lines = 60) {
    $parts = @()
    foreach ($f in @($LogPath, "$LogPath.err")) {
        if (Test-Path $f) {
            $chunk = Get-Content $f -Tail $Lines -Encoding UTF8 -ErrorAction SilentlyContinue
            if ($chunk) { $parts += $chunk }
        }
    }
    if ($parts.Count -eq 0) { return '(log boş — sunucu henüz çıktı vermedi)' }
    ($parts | Select-Object -Last $Lines) -join [Environment]::NewLine
}

# ------------------------------------------------------------------ selftest
if ($SelfTest) {
    Write-Host "`n  ZekAI Hub · kontrol paneli öz testi (port $Port)`n" -ForegroundColor White
    if (-not $script:Python) { Write-Host '  ✗ Python yok' -ForegroundColor Red; exit 1 }
    Write-Host "  · python: $script:Python" -ForegroundColor DarkGray

    $wasRunning = [bool](Get-Health)
    if (-not $wasRunning) {
        Write-Host '  · başlatılıyor…' -ForegroundColor DarkGray
        $ok = Start-ZekaiServer
        if (-not $ok) { Write-Host '  ✗ başlatma başarısız' -ForegroundColor Red; exit 1 }
    } else {
        Write-Host '  · sunucu zaten çalışıyor, kullanılacak' -ForegroundColor DarkGray
    }

    $snap = Get-StatusSnapshot
    Write-Host ("  ✓ durum: çalışıyor · pid {0} · {1} · {2}" -f $snap.Pid, $snap.Provider, $snap.Cost) -ForegroundColor Green
    $log = Get-LogTail 3
    Write-Host ("  ✓ log: " + (($log -split "`n")[0])) -ForegroundColor Green

    if (-not $wasRunning) {
        Write-Host '  · durduruluyor…' -ForegroundColor DarkGray
        $stopped = Stop-ZekaiServer
        if (-not $stopped) { Write-Host '  ✗ durdurma başarısız' -ForegroundColor Red; exit 1 }
        $again = Get-StatusSnapshot
        if ($again.Running) { Write-Host '  ✗ sunucu hâlâ yanıt veriyor' -ForegroundColor Red; exit 1 }
        Write-Host '  ✓ durduruldu, port serbest' -ForegroundColor Green
    }
    Write-Host "`n  Sonuç: PASS`n" -ForegroundColor Green
    exit 0
}

if ($NoGui) { exit 0 }

# ------------------------------------------------------------------ gui
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$bg = [System.Drawing.Color]::FromArgb(11, 15, 22)
$panel = [System.Drawing.Color]::FromArgb(17, 24, 34)
$line = [System.Drawing.Color]::FromArgb(38, 50, 66)
$text = [System.Drawing.Color]::FromArgb(231, 236, 243)
$dim = [System.Drawing.Color]::FromArgb(138, 150, 168)
$amber = [System.Drawing.Color]::FromArgb(232, 180, 90)
$green = [System.Drawing.Color]::FromArgb(111, 211, 160)
$rose = [System.Drawing.Color]::FromArgb(240, 138, 138)

$form = New-Object System.Windows.Forms.Form
$form.Text = 'ZekAI Hub — Kontrol'
$form.Size = New-Object System.Drawing.Size(720, 560)
$form.StartPosition = 'CenterScreen'
$form.BackColor = $bg
$form.ForeColor = $text
$form.Font = New-Object System.Drawing.Font('Segoe UI', 9)
$form.MinimumSize = New-Object System.Drawing.Size(640, 480)
$ico = Join-Path $PSScriptRoot '..\assets\zekai.ico'
if (Test-Path $ico) { try { $form.Icon = New-Object System.Drawing.Icon((Resolve-Path $ico).Path) } catch { } }

function New-Label {
    param([object[]]$A)
    $x = [int]$A[0]; $y = [int]$A[1]; $w = [int]$A[2]; $h = [int]$A[3]
    $txt = [string]$A[4]
    $size = if ($A.Count -gt 5 -and $A[5]) { [double]$A[5] } else { 9 }
    $color = if ($A.Count -gt 6 -and $A[6]) { $A[6] } else { $text }
    $style = if ($A.Count -gt 7 -and $A[7]) { [string]$A[7] } else { 'Regular' }
    $l = New-Object System.Windows.Forms.Label
    $l.Location = New-Object System.Drawing.Point($x, $y)
    $l.Size = New-Object System.Drawing.Size($w, $h)
    $l.Text = $txt
    $l.ForeColor = $color
    $l.BackColor = [System.Drawing.Color]::Transparent
    $l.Font = New-Object System.Drawing.Font('Segoe UI', $size, [System.Drawing.FontStyle]::$style)
    return $l
}

function New-Button {
    param([object[]]$A)
    $x = [int]$A[0]; $y = [int]$A[1]; $w = [int]$A[2]
    $txt = [string]$A[3]
    $primary = if ($A.Count -gt 4) { [bool]$A[4] } else { $false }
    $b = New-Object System.Windows.Forms.Button
    $b.Location = New-Object System.Drawing.Point($x, $y)
    $b.Size = New-Object System.Drawing.Size($w, 34)
    $b.Text = $txt
    $b.FlatStyle = 'Flat'
    $b.FlatAppearance.BorderColor = if ($primary) { $amber } else { $line }
    $b.BackColor = if ($primary) { [System.Drawing.Color]::FromArgb(43, 34, 20) } else { $panel }
    $b.ForeColor = if ($primary) { $amber } else { $text }
    $b.Cursor = 'Hand'
    return $b
}

$title = New-Label 20, 16, 380, 28, 'ZekAI Hub', 15, $text, 'Bold'
$sub = New-Label 20, 44, 420, 18, 'Lean Hybrid Agent Swarm · yerel kontrol paneli', 8.5, $dim
$form.Controls.AddRange(@($title, $sub))

$pill = New-Object System.Windows.Forms.Label
$pill.Location = New-Object System.Drawing.Point(560, 20)
$pill.Size = New-Object System.Drawing.Size(130, 26)
$pill.TextAlign = 'MiddleCenter'
$pill.Font = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Bold)
$pill.Text = 'KAPALI'
$form.Controls.Add($pill)

$card = New-Object System.Windows.Forms.Panel
$card.Location = New-Object System.Drawing.Point(20, 78)
$card.Size = New-Object System.Drawing.Size(664, 92)
$card.BackColor = $panel
$form.Controls.Add($card)

$info = @{}
$labels = @(
    @{ k = 'port'; t = 'PORT'; x = 16 },
    @{ k = 'pid'; t = 'PID'; x = 120 },
    @{ k = 'uptime'; t = 'SÜRE'; x = 250 },
    @{ k = 'provider'; t = 'SAĞLAYICI'; x = 360 },
    @{ k = 'cost'; t = 'BUGÜN'; x = 560 }
)
foreach ($it in $labels) {
    $cap = New-Label $it.x, 12, 180, 14, $it.t, 7.5, $dim
    $val = New-Label $it.x, 30, 190, 18, '—', 9.5, $text, 'Bold'
    $card.Controls.AddRange(@($cap, $val))
    $info[$it.k] = $val
}
$eventsLbl = New-Label 16, 58, 620, 18, 'olay: —', 8, $dim
$card.Controls.Add($eventsLbl)

$btnStart = New-Button 20, 184, 120, 'Başlat', $true
$btnStop = New-Button 148, 184, 110, 'Durdur'
$btnRestart = New-Button 266, 184, 120, 'Yeniden başlat'
$btnOpen = New-Button 394, 184, 120, 'Paneli aç'
$btnFolder = New-Button 522, 184, 162, 'Klasörü aç'
$form.Controls.AddRange(@($btnStart, $btnStop, $btnRestart, $btnOpen, $btnFolder))

$btnDiag = New-Button 20, 226, 150, 'Teşhis (doctor)'
$btnLog = New-Button 178, 226, 130, 'Log dosyası'
$btnRefresh = New-Button 316, 226, 110, 'Yenile'
$chkAuto = New-Object System.Windows.Forms.CheckBox
$chkAuto.Location = New-Object System.Drawing.Point(440, 232)
$chkAuto.Size = New-Object System.Drawing.Size(240, 22)
$chkAuto.Text = 'Açılışta sunucuyu başlat'
$chkAuto.ForeColor = $dim
$chkAuto.BackColor = [System.Drawing.Color]::Transparent
$chkAuto.FlatStyle = 'Flat'
$form.Controls.AddRange(@($btnDiag, $btnLog, $btnRefresh, $chkAuto))

$guiCfg = Join-Path $env:USERPROFILE '.zekai\gui.json'
try {
    if (Test-Path $guiCfg) { $chkAuto.Checked = [bool]((Get-Content $guiCfg -Raw -Encoding UTF8 | ConvertFrom-Json).autostart) }
} catch { }
$chkAuto.Add_CheckedChanged({
    try {
        New-Item -ItemType Directory -Force -Path (Split-Path $guiCfg) | Out-Null
        @{ autostart = $chkAuto.Checked } | ConvertTo-Json | Set-Content -Path $guiCfg -Encoding UTF8
    } catch { }
})

$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Location = New-Object System.Drawing.Point(20, 270)
$logBox.Size = New-Object System.Drawing.Size(664, 210)
$logBox.Multiline = $true
$logBox.ReadOnly = $true
$logBox.ScrollBars = 'Vertical'
$logBox.BackColor = [System.Drawing.Color]::FromArgb(8, 11, 16)
$logBox.ForeColor = $dim
$logBox.BorderStyle = 'FixedSingle'
$logBox.Font = New-Object System.Drawing.Font('Consolas', 8.5)
$logBox.Anchor = 'Top,Left,Right,Bottom'
$form.Controls.Add($logBox)

$status = New-Label 20, 490, 660, 18, 'hazır', 8, $dim
$status.Anchor = 'Left,Bottom,Right'
$form.Controls.Add($status)

function Set-Status([string]$msg) { $status.Text = $msg }

function Update-View {
    $s = Get-StatusSnapshot
    $info['port'].Text = "$($s.Port)"
    $info['pid'].Text = if ($s.Pid) { $s.Pid } else { '—' }
    $info['uptime'].Text = if ($s.Uptime) { $s.Uptime } else { '—' }
    $info['provider'].Text = $s.Provider
    $info['cost'].Text = $s.Cost
    $eventsLbl.Text = "olay: $($s.Events) · demo verisi sayılmaz"
    if ($s.Running) {
        $pill.Text = 'ÇALIŞIYOR'
        $pill.BackColor = [System.Drawing.Color]::FromArgb(18, 43, 34)
        $pill.ForeColor = $green
    } else {
        $pill.Text = 'KAPALI'
        $pill.BackColor = [System.Drawing.Color]::FromArgb(45, 22, 26)
        $pill.ForeColor = $rose
    }
    $btnStart.Enabled = -not $s.Running
    $btnStop.Enabled = [bool]$s.Running
    $btnRestart.Enabled = [bool]$s.Running
    $btnOpen.Enabled = [bool]$s.Running
    $logBox.Text = Get-LogTail 40
    $logBox.SelectionStart = $logBox.Text.Length
    $logBox.ScrollToCaret()
}

$btnStart.Add_Click({
    Set-Status 'başlatılıyor…'
    $form.Cursor = 'Wait'
    try {
        if (Start-ZekaiServer) {
            Set-Status "sunucu hazır · http://127.0.0.1:$Port/"
            Start-Process "http://127.0.0.1:$Port/" | Out-Null
        } else {
            Set-Status 'başlatma başarısız — logu kontrol edin'
        }
    } catch { Set-Status "hata: $($_.Exception.Message)" }
    $form.Cursor = 'Default'
    Update-View
})

$btnStop.Add_Click({
    Set-Status 'durduruluyor…'
    $form.Cursor = 'Wait'
    if (Stop-ZekaiServer) { Set-Status 'sunucu durduruldu' } else { Set-Status 'durdurma başarısız' }
    $form.Cursor = 'Default'
    Update-View
})

$btnRestart.Add_Click({
    Set-Status 'yeniden başlatılıyor…'
    $form.Cursor = 'Wait'
    if (Restart-ZekaiServer) { Set-Status 'sunucu yeniden başladı' } else { Set-Status 'yeniden başlatma başarısız' }
    $form.Cursor = 'Default'
    Update-View
})

$btnOpen.Add_Click({ Start-Process "http://127.0.0.1:$Port/" | Out-Null })
$btnFolder.Add_Click({ Start-Process explorer.exe $Root | Out-Null })
$btnLog.Add_Click({ if (Test-Path $LogPath) { Start-Process notepad.exe $LogPath | Out-Null } else { Set-Status 'log henüz yok' } })
$btnRefresh.Add_Click({ Update-View; Set-Status 'yenilendi' })
$btnDiag.Add_Click({
    Set-Status 'teşhis çalışıyor…'
    $out = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'install.ps1') -Port $Port -DryRun -NoShortcut 2>&1
    $logBox.Text = ($out | Out-String)
    Set-Status 'teşhis tamam (DryRun)'
})

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 2500
$timer.Add_Tick({ try { Update-View } catch { } })
$timer.Start()

$form.Add_Shown({
    Update-View
    if ($chkAuto.Checked -and -not (Get-Health)) { $null = Start-ZekaiServer; Update-View }
})
$form.Add_FormClosed({ $timer.Stop() })

if ($chkAuto.Checked) { }
[void]$form.ShowDialog()
