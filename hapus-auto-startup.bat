@echo off
title MIS SHOP OPS - Hapus Auto Startup
cd /d "%~dp0"
echo ===================================================
echo     HAPUS SERVER DARI STARTUP WINDOWS
echo ===================================================
echo.

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%temp%\del_shortcut.vbs"
echo Set FSO = CreateObject("Scripting.FileSystemObject") >> "%temp%\del_shortcut.vbs"
echo sLink = oWS.SpecialFolders("Startup") ^& "\MIS-Shop-Ops.lnk" >> "%temp%\del_shortcut.vbs"
echo If FSO.FileExists(sLink) Then FSO.DeleteFile(sLink) >> "%temp%\del_shortcut.vbs"

cscript //nologo "%temp%\del_shortcut.vbs"
del "%temp%\del_shortcut.vbs" >nul 2>&1

echo [SUKSES] Shortcut di folder Startup Windows telah dihapus.
echo Server tidak akan lagi otomatis berjalan saat komputer dihidupkan.
echo ===================================================
echo.
pause

