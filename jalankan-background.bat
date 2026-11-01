@echo off
title MIS SHOP OPS - Jalankan di Background
cd /d "%~dp0"
echo ===================================================
echo     MENJALANKAN SERVER MIS SHOP OPS DI BACKGROUND
echo ===================================================
echo.
echo [1/2] Menjalankan server Next.js di background (Port 3000)...
wscript.exe "%~dp0jalankan-silent-background.vbs"
echo.
echo [2/2] Server sedang melakukan proses booting...
echo Menunggu 5 detik untuk memeriksa status koneksi...
timeout /t 5 >nul
echo.
call "%~dp0status-server.bat"
