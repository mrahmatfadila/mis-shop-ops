@echo off
title MIS SHOP OPS - Update dari Rumah
cd /d "%~dp0"
echo ===================================================
echo       UPDATE SISTEM MIS SHOP OPS DARI GITHUB
echo ===================================================
echo.

echo [1/3] Menarik kodingan terbaru dari GitHub...
git pull origin main
if errorlevel 1 (
    echo.
    echo [ERROR] Gagal menarik update dari GitHub!
    echo Periksa koneksi internet atau status Git Anda.
    pause
    exit /b 1
)

echo.
echo [2/3] Memeriksa database...
if not exist "shop_ops.db" (
    if exist "seed_template.db" (
        copy /y "seed_template.db" "shop_ops.db" >nul
        echo  -> Database siap digunakan dari template.
    )
)

echo.
echo [3/3] Melakukan kompilasi (Build)...
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Build gagal!
    pause
    exit /b 1
)

echo.
echo ===================================================
echo [SUKSES] Update aplikasi telah selesai 100%!
echo.
echo Silakan jalankan server dengan membuka file:
echo "jalankan-server.bat"
echo ===================================================
echo.
pause
