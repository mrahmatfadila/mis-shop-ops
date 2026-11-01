@echo off
title MIS SHOP OPS - Pasang Auto Startup
cd /d "%~dp0"
echo ===================================================
echo     PASANG AUTO STARTUP (SERVER OTOMATIS NYALA)
echo ===================================================
echo.
echo Sedang mendaftarkan server ke Startup Windows...

set "VBS_FILE=%~dp0jalankan-silent-background.vbs"
set "WORK_DIR=%~dp0"

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%temp%\create_shortcut.vbs"
echo sLink = oWS.SpecialFolders("Startup") ^& "\MIS-Shop-Ops.lnk" >> "%temp%\create_shortcut.vbs"
echo Set oLink = oWS.CreateShortcut(sLink) >> "%temp%\create_shortcut.vbs"
echo oLink.TargetPath = "wscript.exe" >> "%temp%\create_shortcut.vbs"
echo oLink.Arguments = Chr(34) ^& "%VBS_FILE%" ^& Chr(34) >> "%temp%\create_shortcut.vbs"
echo oLink.WorkingDirectory = "%WORK_DIR%" >> "%temp%\create_shortcut.vbs"
echo oLink.Save >> "%temp%\create_shortcut.vbs"

cscript //nologo "%temp%\create_shortcut.vbs"
del "%temp%\create_shortcut.vbs" >nul 2>&1

echo.
echo [SUKSES] Server MIS SHOP OPS berhasil didaftarkan ke Startup Windows!
echo Komputer kantor sekarang otomatis menjalankan server setiap kali dihidupkan/restart.
echo.
echo ===================================================
pause
