@echo off
title TrustVault Public Platform
echo =======================================================
echo    Starting TrustVault Secure Document Sharing...
echo =======================================================
echo.
cd /d "%~dp0server"
start /b node dist/index.js
timeout /t 2 /nobreak >nul
echo Starting Cloudflare Secure Public Tunnel...
"C:\Users\dhanu\AppData\Local\Programs\cloudflared\cloudflared.exe" tunnel --url http://localhost:5000
pause
