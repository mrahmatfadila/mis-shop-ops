@echo off
title MIS SHOP OPS - Update dari Rumah
cd /d "%~dp0"
echo ===================================================
echo       UPDATE SISTEM MIS SHOP OPS DARI GITHUB
echo ===================================================
echo.

echo [1/4] Menarik kodingan terbaru dari GitHub...
git pull origin main
if errorlevel 1 (
    echo.
    echo [ERROR] Gagal menarik update dari GitHub!
    echo Periksa koneksi internet atau status Git Anda.
    pause
    exit /b 1
)

echo.
echo [2/4] Memeriksa database...
if exist "shop_ops.db-wal" del /f /q "shop_ops.db-wal" >nul 2>&1
if exist "shop_ops.db-shm" del /f /q "shop_ops.db-shm" >nul 2>&1
if not exist "shop_ops.db" (
    if exist "seed_template.db" copy /y "seed_template.db" "shop_ops.db" >nul
)

echo.
echo [3/4] Membersihkan cache lama (.next)...
if exist ".next" rmdir /s /q ".next"

echo.
echo [4/4] Membangun ulang (Build) aplikasi bersih...
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Build gagal!
    pause
    exit /b 1
)

echo.
echo ===================================================
echo [SUKSES] Update & Build berhasil 100%!
echo.
echo Silakan jalankan server dengan membuka file:
echo "jalankan-server.bat"
echo ===================================================
echo.
pause
