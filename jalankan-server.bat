@echo off
title MIS SHOP OPS - Production Server
cd /d "%~dp0"
echo ===================================================
echo     MEMULAI SERVER MIS SHOP OPS (LOCAL PC)
echo ===================================================
echo.

echo [1/4] Memeriksa instalasi Node.js...
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js belum terinstall di komputer ini!
    echo Silakan install Node.js dari https://nodejs.org terlebih dahulu.
    if not "%1"=="--background" pause
    exit /b 1
)

echo [2/4] Memeriksa database lokal...
set DB_NEED_RESTORE=0
if not exist "shop_ops.db" set DB_NEED_RESTORE=1
if exist "shop_ops.db" (
    for %%A in ("shop_ops.db") do (
        if %%~zA LSS 10000 set DB_NEED_RESTORE=1
    )
)
if "%DB_NEED_RESTORE%"=="1" (
    if exist "seed_template.db" (
        echo  -> Menyiapkan database shop_ops.db dari seed_template.db...
        copy /y "seed_template.db" "shop_ops.db" >nul
        echo  -> Database siap digunakan!
    )
)

echo [3/4] Memeriksa build Next.js...
if not exist ".next" (
    echo  -> Folder build .next belum ada. Menjalankan kompilasi awal npm run build...
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Gagal melakukan build aplikasi.
        if not "%1"=="--background" pause
        exit /b 1
    )
)

echo [4/4] Menjalankan Server Produksi di Port 3000...
echo Web dapat diakses di:
echo - Dari PC ini       : http://localhost:3000
echo - Dari PC Lain (LAN): http://0.0.0.0:3000
echo.
echo ===================================================
call npm run start
if errorlevel 1 (
    echo.
    echo [WARNING] Server Next.js berhenti tidak terduga pada %date% %time%
    if not "%1"=="--background" pause
)
