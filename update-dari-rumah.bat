@echo off
title MIS SHOP OPS - Update dari Rumah
cd /d "%~dp0"
echo ===================================================
echo       UPDATE SISTEM MIS SHOP OPS DARI GITHUB
echo ===================================================
echo.

echo [1/3] Menarik kodingan terbaru dari GitHub...
git pull origin main
if errorlevel 1 (
    echo.
    echo [ERROR] Gagal menarik update dari GitHub!
    echo Periksa koneksi internet atau status Git Anda.
    pause
    exit /b 1
)

echo.
echo [2/3] Memeriksa dan memulihkan database lokal...
if exist "shop_ops.db-wal" del /f /q "shop_ops.db-wal" >nul 2>&1
if exist "shop_ops.db-shm" del /f /q "shop_ops.db-shm" >nul 2>&1
node -e "const { createClient } = require('@libsql/client'); const fs = require('fs'); async function check() { try { if (!fs.existsSync('shop_ops.db') || fs.statSync('shop_ops.db').size < 10000) throw new Error('empty'); const c = createClient({ url: 'file:shop_ops.db' }); const r = await c.execute('PRAGMA quick_check;'); const val = Object.values(r.rows[0]||{})[0]; if (val !== 'ok') throw new Error('corrupt: ' + val); console.log('  -> Database sehat dan siap digunakan.'); } catch(e) { console.log('  -> Database rusak/korup atau kosong (' + e.message + ').'); console.log('  -> Memulihkan dari seed_template.db...'); try{fs.unlinkSync('shop_ops.db-wal')}catch(_){} try{fs.unlinkSync('shop_ops.db-shm')}catch(_){} fs.copyFileSync('seed_template.db', 'shop_ops.db'); console.log('  -> Database BERHASIL dipulihkan!'); } } check();"

echo.
echo [3/3] Melakukan kompilasi (Build)...
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Build gagal!
    pause
    exit /b 1
)

echo.
echo ===================================================
echo [SUKSES] Update aplikasi telah selesai 100%!
echo.
echo Silakan jalankan server dengan membuka file:
echo "jalankan-server.bat"
echo ===================================================
echo.
pause
