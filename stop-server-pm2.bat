@echo off
title MIS SHOP OPS - Hentikan Server Background
cd /d "%~dp0"
echo ===================================================
echo       MENGHENTIKAN SERVER MIS SHOP OPS
echo ===================================================
echo.
call pm2 stop mis-shop-ops
echo.
echo Server telah dinonaktifkan sementara.
echo Untuk menyalakan kembali, jalankan "jalankan-24jam-pm2.bat".
echo ===================================================
pause
