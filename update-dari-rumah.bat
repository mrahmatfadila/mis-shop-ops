@echo off
title MIS SHOP OPS - Update Otomatis dari Rumah (GitHub)
echo ===================================================
echo     UPDATE SISTEM MIS SHOP OPS DARI GITHUB
echo ===================================================
echo.
cd /d "%~dp0"

echo [1/4] Mengamankan backup database lokal...
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
echo [2/4] Mengambil kode kodingan terbaru dari GitHub...
git pull origin main
if errorlevel 1 (
    echo.
    echo [ERROR] Gagal menarik update dari GitHub!
    echo Periksa koneksi internet kantor Anda.
    pause
    exit /b
)

echo.
echo [3/4] Menginstall dependensi paket (jika ada)...
call npm install --prefer-offline

echo.
echo [4/4] Membangun ulang (Build) aplikasi versi terbaru...
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Build gagal! Silakan periksa log di atas.
    pause
    exit /b
)

echo.
echo ===================================================
echo [SUKSES] Aplikasi MIS SHOP OPS telah berhasil diupdate!
echo Database dan data operasional Anda tetap aman terjaga.
echo.
echo Silakan jalankan kembali file "jalankan-server.bat"
echo ===================================================
pause
