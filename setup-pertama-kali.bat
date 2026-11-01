@echo off
title MIS SHOP OPS - Setup Pertama Kali
cd /d "%~dp0"
echo ===================================================
echo     SETUP INSTALASI MIS SHOP OPS (PERTAMA KALI)
echo ===================================================
echo.

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
echo [2/4] Menginstall library dependensi...
call npm install
if errorlevel 1 (
    echo [ERROR] Gagal menginstall dependensi.
    pause
    exit /b
)

echo.
echo [3/4] Menyiapkan database lokal...
if not exist "shop_ops.db" (
    if exist "seed_template.db" (
        copy /y "seed_template.db" "shop_ops.db" >nul
        echo  -> Database siap digunakan dari template.
    )
)

echo.
echo [4/4] Melakukan build awal...
call npm run build
if errorlevel 1 (
    echo [ERROR] Gagal melakukan build aplikasi.
    pause
    exit /b
)

echo.
echo ===================================================
echo [SELESAI] Setup awal berhasil!
echo Silakan buka file "jalankan-server.bat" untuk memulai.
echo ===================================================
pause
