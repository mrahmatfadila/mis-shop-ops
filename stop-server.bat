@echo off
title MIS SHOP OPS - Hentikan Server
cd /d "%~dp0"
echo ===================================================
echo           MENGHENTIKAN SERVER MIS SHOP OPS
echo ===================================================
echo.

set KILLED=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo Menghentikan proses PID %%a di Port 3000...
    taskkill /f /pid %%a >nul 2>&1
    set KILLED=1
)

if "%KILLED%"=="1" (
    echo.
    echo [SUKSES] Server MIS SHOP OPS berhasil dihentikan.
) else (
    echo [INFO] Server sedang tidak berjalan di Port 3000.
)

echo ===================================================
echo.
pause

