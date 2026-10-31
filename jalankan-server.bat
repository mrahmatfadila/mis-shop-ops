@echo off
title MIS SHOP OPS - Production Server
echo ===================================================
echo     MEMULAI SERVER MIS SHOP OPS (LOCAL PC)
echo ===================================================
echo.
cd /d "%~dp0"

echo [1/2] Memeriksa instalasi Node.js...
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js belum terinstall di komputer ini!
    echo Silakan install Node.js dari https://nodejs.org terlebih dahulu.
    pause
    exit /b
)

echo [2/2] Menjalankan Server Produksi di Port 3000...
echo Web dapat diakses di:
echo - Dari PC ini       : http://localhost:3000
echo - Dari PC Lain (LAN): http://[IP-KOMPUTER-INI]:3000
echo.
echo Tekan Ctrl + C untuk menghentikan server.
echo ===================================================
npm run start
pause
