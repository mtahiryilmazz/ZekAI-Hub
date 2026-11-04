@echo off
setlocal
chcp 65001 >nul
title ZekAI Hub - Kaldirma
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" -Uninstall
echo.
pause
