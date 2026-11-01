@echo off
title MIS SHOP OPS - Update Otomatis dari Rumah (GitHub)
cd /d "%~dp0"
echo ===================================================
echo     UPDATE SISTEM MIS SHOP OPS DARI GITHUB
echo ===================================================
echo.

echo [1/5] Menghentikan server lama yang sedang berjalan...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo  -> Mematikan proses lama (PID %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo [2/5] Mengamankan backup database lokal...
if not exist "backups" mkdir backups
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set datetime=%%I
if defined datetime (
    set timestamp=%datetime:~0,8%_%datetime:~8,6%
) else (
    set timestamp=%random%
)
if exist "shop_ops.db" (
    copy /y "shop_ops.db" "backups\shop_ops_%timestamp%.db" >nul
    echo  -> Backup database tersimpan di backups\shop_ops_%timestamp%.db
) else if exist "seed_template.db" (
    copy /y "seed_template.db" "shop_ops.db" >nul
    echo  -> Menyiapkan database lokal dari template.
)

echo.
echo [3/5] Mengambil kode kodingan terbaru dari GitHub...
git pull origin main
if errorlevel 1 (
    echo.
    echo [ERROR] Gagal menarik update dari GitHub!
    echo Periksa koneksi internet kantor Anda.
    pause
    exit /b 1
)

echo.
echo [4/5] Membangun ulang (Build) aplikasi versi terbaru...
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Build gagal! Silakan periksa log di atas.
    pause
    exit /b 1
)

echo.
echo [5/5] Menyalakan kembali server terbaru di background...
wscript.exe "%~dp0jalankan-silent-background.vbs"
timeout /t 5 >nul

echo.
echo ===================================================
echo [SUKSES] Aplikasi MIS SHOP OPS telah berhasil diupdate!
echo Server versi terbaru sekarang SUDAH AKTIF di background!
echo Database dan data operasional Anda tetap aman terjaga.
echo ===================================================
echo.
call "%~dp0status-server.bat"
