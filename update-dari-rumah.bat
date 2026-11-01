@echo off
title MIS SHOP OPS - Update Otomatis dari Rumah (GitHub)

:: 0. Cegah glitch self-modifying batch dengan menjalankan dari folder TEMP
if not "%1"=="--in-temp" (
    copy /y "%~f0" "%temp%\run_update_mis.bat" >nul
    call "%temp%\run_update_mis.bat" --in-temp "%~dp0"
    exit /b
)

cd /d "%~2"
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
set "ts=%date:~-4%%date:~-10,2%%date:~-7,2%_%random%"
set "ts=%ts: =0%"
if exist "shop_ops.db" (
    copy /y "shop_ops.db" "backups\shop_ops_%ts%.db" >nul
    echo  -> Backup tersimpan di backups\shop_ops_%ts%.db
    for %%A in ("shop_ops.db") do (
        if %%~zA LSS 10000 (
            echo  -> shop_ops.db kosong / belum lengkap (%%~zA bytes).
            echo  -> Memulihkan database dari seed_template.db...
            copy /y "seed_template.db" "shop_ops.db" >nul
        )
    )
) else if exist "seed_template.db" (
    copy /y "seed_template.db" "shop_ops.db" >nul
    echo  -> Menyiapkan database lokal dari template.
)

echo.
echo [3/5] Mengambil kode kodingan terbaru dari GitHub...
git pull origin main
if errorlevel 1 (
    echo.
    echo [INFO] Mencoba sinkronisasi ulang dengan repository remote...
    git checkout -- .
    git pull origin main
    if errorlevel 1 (
        echo [ERROR] Gagal menarik update dari GitHub!
        echo Periksa koneksi internet kantor Anda.
        pause
        exit /b 1
    )
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
wscript.exe "%~2jalankan-silent-background.vbs"
timeout /t 5 >nul

echo.
echo ===================================================
echo [SUKSES] Aplikasi MIS SHOP OPS telah berhasil diupdate!
echo Server versi terbaru sekarang SUDAH AKTIF di background!
echo Database dan data operasional Anda tetap aman terjaga.
echo ===================================================
echo.
call "%~2status-server.bat"
