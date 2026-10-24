@echo off
title TrustVault Enterprise Platform
echo =======================================================
echo    Starting TrustVault Secure Document Sharing...
echo =======================================================
echo.
echo Laptop URL:         http://localhost:5000
echo Mobile (Port 8080): http://10.77.74.205:8080
echo Mobile (Port 5000): http://10.77.74.205:5000
echo.
echo =======================================================
cd /d "%~dp0server"
node dist/index.js
pause
