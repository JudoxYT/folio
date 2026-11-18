@echo off
title Vystara Studio stoppen
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name = 'node.exe' AND CommandLine LIKE '%%app.mjs%%'\" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
echo Vystara Studio is gestopt.
timeout /t 2 >nul
