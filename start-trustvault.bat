@echo off
title TrustVault Enterprise Platform
echo =======================================================
echo    Starting TrustVault Secure Document Sharing...
echo =======================================================
cd /d "%~dp0server"
node dist/index.js
pause
