@echo off
chcp 65001 > nul
echo =======================================================
echo   SISTEM INFORMASI PENGGAJIAN SMK PSKD 3 (A-TA)
echo   Mode: Docker Database (PostgreSQL) + Local BE & FE
echo =======================================================
echo.

echo [1/3] Menyalakan PostgreSQL Database di Docker...
docker compose up -d postgres
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gagal menyalakan PostgreSQL di Docker. Pastikan Docker Desktop sudah aktif!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Membuka Backend (Port 3040) di jendela baru...
start "A-TA Backend (Port 3040)" cmd /k "cd /d %~dp0be && npm run dev"

echo.
echo [3/3] Membuka Frontend (Port 3041) di jendela baru...
start "A-TA Frontend (Port 3041)" cmd /k "cd /d %~dp0fe && npm run dev"

echo.
echo =======================================================
echo   Sistem Berhasil Dijalankan!
echo   - Database PostgreSQL : localhost:5439 (di Docker)
echo   - Backend Service     : http://localhost:3040/api (Lokal)
echo   - Frontend Dashboard  : http://localhost:3041 (Lokal)
echo =======================================================
echo.
echo Jendela ini dapat ditutup. Untuk mematikan sistem, tutup
echo kedua jendela command prompt Backend dan Frontend.
echo.
pause
