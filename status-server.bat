@echo off
title MIS SHOP OPS - Status Server
cd /d "%~dp0"
echo ===================================================
echo             STATUS SERVER MIS SHOP OPS
echo ===================================================
echo.

set SERVER_RUNNING=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    set SERVER_RUNNING=1
    set SERVER_PID=%%a
)

if "%SERVER_RUNNING%"=="1" goto is_running
goto is_offline

:is_running
echo [STATUS: AKTIF / ONLINE]
echo Server SEDANG BERJALAN di Port 3000 (Process ID: %SERVER_PID%)
echo.
echo Alamat Akses:
echo - Dari PC ini       : http://localhost:3000
echo - Dari PC Lain (LAN): http://[IP-KOMPUTER-KANTOR]:3000
echo.
echo Cek respon web:
curl.exe -I -s http://localhost:3000 | findstr /i "HTTP"
echo.
echo Web siap digunakan!
goto selesai

:is_offline
echo [STATUS: OFFLINE / TIDAK BERJALAN]
echo Server saat ini TIDAK sedang berjalan di Port 3000.
echo.
if exist "server_background.log" (
    echo Log Aktivitas Terakhir (server_background.log):
    echo ---------------------------------------------------
    powershell -Command "Get-Content server_background.log -Tail 10 -ErrorAction SilentlyContinue"
    echo ---------------------------------------------------
    echo.
)
echo Untuk Menyalakan Server:
echo 1. Di Background : Klik 2x file "jalankan-background.bat"
echo 2. Normal (CMD)  : Klik 2x file "jalankan-server.bat"
goto selesai

:selesai
echo.
echo ===================================================
pause
