@echo off
title MIS SHOP OPS - Setup Pertama Kali
echo ===================================================
echo     SETUP INSTALASI MIS SHOP OPS (PERTAMA KALI)
echo ===================================================
echo.
cd /d "%~dp0"

echo [1/4] Memeriksa Node.js dan Git...
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js belum terinstall! Install dari https://nodejs.org
    pause
    exit /b
)
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git belum terinstall! Install dari https://git-scm.com
    pause
    exit /b
)

echo.
echo [2/4] Menginstall library & dependensi (npm install)...
call npm install
if errorlevel 1 (
    echo [ERROR] Gagal menginstall dependensi.
    pause
    exit /b
)

echo.
echo [3/4] Menyiapkan database lokal awal...
set DB_NEED_RESTORE=0
if not exist "shop_ops.db" set DB_NEED_RESTORE=1
if exist "shop_ops.db" (
    for %%A in ("shop_ops.db") do (
        if %%~zA LSS 10000 set DB_NEED_RESTORE=1
    )
)
if "%DB_NEED_RESTORE%"=="1" (
    if exist "seed_template.db" (
        copy /y "seed_template.db" "shop_ops.db" >nul
        echo  -> Database shop_ops.db berhasil disiapkan dari seed_template.db.
    ) else (
        echo  -> Template database tidak ditemukan.
    )
) else (
    echo  -> Database shop_ops.db sudah ada dan siap digunakan.
)

echo.
echo [4/4] Melakukan kompilasi produksi awal (npm run build)...
call npm run build
if errorlevel 1 (
    echo [ERROR] Gagal melakukan build aplikasi.
    pause
    exit /b
)

echo.
echo ===================================================
echo [SELESAI] Setup awal berhasil 100%!
echo.
echo Untuk menjalankan web server:
echo Cukup klik 2x file "jalankan-server.bat"
echo ===================================================
pause
