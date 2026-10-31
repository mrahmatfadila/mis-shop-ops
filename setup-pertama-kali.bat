@echo off
title MIS SHOP OPS - Setup Pertama Kali
echo ===================================================
echo     SETUP INSTALASI MIS SHOP OPS (PERTAMA KALI)
echo ===================================================
echo.
cd /d "%~dp0"

echo [1/3] Memeriksa Node.js dan Git...
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

echo [2/3] Menginstall library & dependensi (npm install)...
call npm install
if errorlevel 1 (
    echo [ERROR] Gagal menginstall dependensi.
    pause
    exit /b
)

echo.
echo [3/3] Melakukan kompilasi produksi awal (npm run build)...
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
