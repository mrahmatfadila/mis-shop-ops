@echo off
title MIS SHOP OPS - Server
cd /d "%~dp0"
echo ===================================================
echo          MEMULAI SERVER MIS SHOP OPS
echo ===================================================
echo.

if not exist "shop_ops.db" (
    if exist "seed_template.db" (
        copy /y "seed_template.db" "shop_ops.db" >nul
        echo Database lokal siap digunakan!
    )
)

if not exist ".next" (
    echo Menyiapkan build pertama kali...
    call npm run build
)

echo Web dapat diakses di:
echo - PC Ini  : http://localhost:3000
echo - LAN     : http://0.0.0.0:3000
echo.
echo Tekan Ctrl + C untuk mematikan server.
echo ===================================================
call npm run start
pause
