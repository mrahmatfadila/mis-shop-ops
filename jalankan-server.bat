@echo off
title MIS SHOP OPS - Production Server
echo ===================================================
echo     MEMULAI SERVER MIS SHOP OPS (LOCAL PC)
echo ===================================================
echo.
cd /d "%~dp0"

echo [1/3] Memeriksa instalasi Node.js...
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js belum terinstall di komputer ini!
    echo Silakan install Node.js dari https://nodejs.org terlebih dahulu.
    pause
    exit /b
)

echo [2/3] Memeriksa database lokal...
if not exist "shop_ops.db" (
    if exist "seed_template.db" (
        echo  -> Menyiapkan shop_ops.db dari template awal...
        copy /y "seed_template.db" "shop_ops.db" >nul
        echo  -> Database siap digunakan!
    )
)

echo [3/3] Menjalankan Server Produksi di Port 3000...
echo Web dapat diakses di:
echo - Dari PC ini       : http://localhost:3000
echo - Dari PC Lain (LAN): http://[IP-KOMPUTER-INI]:3000
echo.
echo Tekan Ctrl + C untuk menghentikan server.
echo ===================================================
npm run start
pause
