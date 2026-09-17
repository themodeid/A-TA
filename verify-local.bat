@echo off
echo =======================================================
echo    MEMULAI VERIFIKASI LOKAL CI (A-TA PSKD Payroll)
echo =======================================================
echo.
echo [1/2] Menjalankan Automated Unit Tests Backend...
cd be
node -r ts-node/register src/__tests__/run-tests.ts
if %errorlevel% neq 0 (
    echo.
    echo ❌ [ERROR] Unit test backend gagal!
    cd ..
    exit /b %errorlevel%
)

echo.
echo [2/2] Menguji Kompilasi TypeScript Backend...
call npm.cmd run build
if %errorlevel% neq 0 (
    echo.
    echo ❌ [ERROR] Kompilasi TypeScript backend gagal!
    cd ..
    exit /b %errorlevel%
)

cd ..
echo.
echo =======================================================
echo ✅ [SUKSES BESAR] Seluruh pemeriksaan lokal berhasil!
echo    Sistem Penggajian SMK PSKD 3 siap untuk produksi!
echo =======================================================
