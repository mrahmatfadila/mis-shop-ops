@echo off
title MIS SHOP OPS - Server
cd /d "%~dp0"
echo ===================================================
echo          MEMULAI SERVER MIS SHOP OPS
echo ===================================================
echo.

if exist "shop_ops.db-wal" del /f /q "shop_ops.db-wal" >nul 2>&1
if exist "shop_ops.db-shm" del /f /q "shop_ops.db-shm" >nul 2>&1
node -e "const { createClient } = require('@libsql/client'); const fs = require('fs'); async function check() { try { if (!fs.existsSync('shop_ops.db') || fs.statSync('shop_ops.db').size < 10000) throw new Error('empty'); const c = createClient({ url: 'file:shop_ops.db' }); const r = await c.execute('PRAGMA quick_check;'); const val = Object.values(r.rows[0]||{})[0]; if (val !== 'ok') throw new Error('corrupt: ' + val); } catch(e) { try{fs.unlinkSync('shop_ops.db-wal')}catch(_){} try{fs.unlinkSync('shop_ops.db-shm')}catch(_){} if (fs.existsSync('seed_template.db')) fs.copyFileSync('seed_template.db', 'shop_ops.db'); } } check();"

if not exist ".next" (
    echo Menyiapkan build pertama kali...
    call npm run build
)

echo Web dapat diakses di:
echo - PC Ini  : http://localhost:3000
echo - LAN     : http://0.0.0.0:3000
echo.
echo Tekan Ctrl + C untuk mematikan server.
echo ===================================================
call npm run start
pause
