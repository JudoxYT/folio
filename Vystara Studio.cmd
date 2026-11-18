@echo off
title Vystara Studio
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is niet gevonden. Installeer Node 22 of nieuwer via https://nodejs.org & pause & exit /b 1)
echo Vystara Studio start... Laat dit venster open zolang je werkt. Sluiten = Studio uit.
node app.mjs
if errorlevel 1 pause
