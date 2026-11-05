@echo off
setlocal
chcp 65001 >nul
title ZekAI Hub - Kontrol
rem WinForms kontrol panelini konsol penceresi olmadan acar.
start "" powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0ZekAI-Kontrol.ps1" %*
exit /b 0
