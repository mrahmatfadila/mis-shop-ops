@echo off
title MIS SHOP OPS - Jalankan di Background
cd /d "%~dp0"
echo ===================================================
echo     MENJALANKAN SERVER MIS SHOP OPS DI BACKGROUND
echo ===================================================
echo.
echo Menjalankan server Next.js di background (Port 3000)...
wscript.exe jalankan-silent-background.vbs
echo.
echo [SUKSES] Server sudah berjalan di background!
echo Tidak ada jendela CMD hitam yang menghalangi layar Anda.
echo.
echo - Cek status : Klik 2x file "status-server.bat"
echo - Matikan    : Klik 2x file "stop-server.bat"
echo - Buka web   : http://localhost:3000
echo ===================================================
echo.
pause

