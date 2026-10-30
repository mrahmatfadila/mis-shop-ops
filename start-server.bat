@echo off
title MIS SHOP OPS SERVER (IT SUPPORT AND SPV)
cls
color 0B

:: 1. Pastikan folder kerja selalu berada di lokasi file .bat ini (Cegah error System32 saat Run as Administrator)
cd /d "%~dp0"

echo ======================================================================
echo             MIS SHOP OPS - ASSET AND POS SUPPORT SERVER
echo ======================================================================
echo.

:: 2. Bebaskan Port 3000 jika ada proses lama/nyangkut (Cegah EADDRINUSE)
echo [1/3] Memeriksa dan membersihkan Port 3000...
powershell -NoProfile -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue"

:: 3. Deteksi IP Aktif Komputer (Prioritaskan Wi-Fi atau Ethernet Fisik)
echo [2/3] Mendeteksi IP Jaringan Lokal Komputer...
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { ($_.InterfaceAlias -like '*Wi-Fi*' -or $_.InterfaceAlias -eq 'Ethernet') -and $_.IPAddress -notlike '169.254*' -and $_.IPAddress -notlike '127.*' }).IPAddress | Select-Object -First 1"`) do (
    set LOCAL_IP=%%i
)

if "%LOCAL_IP%"=="" (
    for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'WSL|Hyper-V|VMware|Virtual|Loopback|Bluetooth' -and $_.IPAddress -notlike '169.254*' -and $_.IPAddress -notlike '127.*' }).IPAddress | Select-Object -First 1"`) do (
        set LOCAL_IP=%%i
    )
)

if "%LOCAL_IP%"=="" (
    set LOCAL_IP=192.168.0.90
)

echo.
echo ======================================================================
echo [INFO] Server Komputer IT Support Siap Digunakan!
echo ======================================================================
echo.
echo   * Halaman Login Utama          : http://localhost:3000
echo   * Akses Jaringan (HP SPV/POS)  : http://%LOCAL_IP%:3000
echo   * Dashboard Kontrol            : http://localhost:3000/dashboard
echo.
echo ----------------------------------------------------------------------
echo SPV atau kasir di toko cukup membuka browser di HP dan ketik:
echo http://%LOCAL_IP%:3000
echo Lalu klik "Tambahkan ke Layar Utama" untuk menginstall sebagai App PWA.
echo ======================================================================
echo.
echo [3/3] Menjalankan Server Next.js di port 3000 (0.0.0.0)...
echo Tekan CTRL + C untuk menghentikan server.
echo.

:: 4. Buka browser otomatis
start "" http://localhost:3000

:: 5. Jalankan server Next.js di Mode Produksi Kinerja Tinggi (Instant 0ms Load)
if exist ".next\BUILD_ID" (
    echo [INFO] Menjalankan server dalam Mode Produksi Kinerja Tinggi (Instant 0ms)...
    call npm run start
) else (
    echo [INFO] Menyiapkan cache produksi aplikasi...
    call npm run build
    call npm run start
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ======================================================================
    echo [ERROR] Server berhenti dengan kode error: %ERRORLEVEL%
    echo Jika port bentrok atau node_modules bermasalah, silakan hubungi MIS.
    echo ======================================================================
    pause
)
