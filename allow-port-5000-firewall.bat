@echo off
:: Batch script to elevate and add Windows Firewall rule for Port 5000
echo Requesting administrator privileges to allow Port 5000 in Windows Firewall...
powershell -Command "Start-Process cmd -ArgumentList '/c netsh advfirewall firewall add rule name=\"TrustVault (Port 5000)\" dir=in action=allow protocol=TCP localport=5000 profile=any & pause' -Verb RunAs"
