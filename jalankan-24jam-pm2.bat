@echo off
title MIS SHOP OPS - Jalankan 24 Jam Non-Stop (PM2 Service)
echo ===================================================
echo   MEMASANG & MENJALANKAN SERVER 24 JAM NON-STOP
echo ===================================================
echo.
cd /d "%~dp0"

echo [1/3] Memeriksa Process Manager (PM2)...
call pm2 -v >nul 2>&1
if errorlevel 1 (
    echo  -> Menginstall library PM2 secara global...
    call npm install -g pm2
    if errorlevel 1 (
        echo [ERROR] Gagal menginstall PM2. Pastikan terhubung internet.
        pause
        exit /b
    )
)

echo.
echo [2/3] Memeriksa database lokal...
if not exist "shop_ops.db" (
    if exist "seed_template.db" (
        copy /y "seed_template.db" "shop_ops.db" >nul
        echo  -> Database lokal berhasil disiapkan!
    )
)

echo.
echo [3/3] Menjalankan MIS SHOP OPS di Background (Port 3000)...
call pm2 delete mis-shop-ops >nul 2>&1
call pm2 start npm --name "mis-shop-ops" -- run start

echo.
echo ===================================================
echo [SUKSES] Server sekarang BERJALAN DI BACKGROUND 24 JAM!
echo Tidak ada jendela CMD hitam yang menghalangi layar.
echo Jika komputer restart atau crash, server otomatis bangkit kembali.
echo.
echo Perintah berguna:
echo - Cek Status : Jalankan file "status-server-pm2.bat"
echo - Matikan    : Jalankan file "stop-server-pm2.bat"
echo ===================================================
echo.
call pm2 status
pause
