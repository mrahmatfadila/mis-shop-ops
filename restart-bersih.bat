@echo off
title MIS SHOP OPS - Restart Bersih & Rebuild
cd /d "%~dp0"
echo ===================================================
echo           RESTART BERSIH SERVER MIS SHOP OPS
echo ===================================================
echo.

echo [1/4] Menghentikan semua proses server lama di port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo  -> Mematikan PID %%a...
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo [2/4] Memastikan database lokal terisi penuh...
if exist "seed_template.db" (
    if not exist "shop_ops.db" (
        copy /y "seed_template.db" "shop_ops.db" >nul
        echo  -> Database disiapkan dari template.
    ) else (
        for %%A in ("shop_ops.db") do (
            if %%~zA LSS 10000 (
                echo  -> shop_ops.db kosong (%%~zA bytes). Memulihkan dari template...
                copy /y "seed_template.db" "shop_ops.db" >nul
            )
        )
    )
)

echo.
echo [3/4] Mengompilasi ulang kodingan terbaru (Build)...
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Gagal melakukan build aplikasi.
    pause
    exit /b 1
)

echo.
echo [4/4] Memulai server produksi di Port 3000...
echo ===================================================
echo Web siap diakses di:
echo - Dari PC ini       : http://localhost:3000
echo - Dari PC Lain (LAN): http://0.0.0.0:3000
echo.
echo JANGAN TUTUP JENDELA INI SELAMA SERVER DIGUNAKAN.
echo ===================================================
echo.
call npm run start
pause
