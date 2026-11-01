@echo off
title MIS SHOP OPS - Status Server Background
cd /d "%~dp0"
echo ===================================================
echo             STATUS SERVER MIS SHOP OPS
echo ===================================================
echo.
call pm2 status
echo.
echo ===================================================
echo Menampilkan 20 baris log terakhir:
echo ===================================================
call pm2 logs mis-shop-ops --lines 20 --nostream
echo.
pause
