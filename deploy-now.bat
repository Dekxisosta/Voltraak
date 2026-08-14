@echo off
echo ========================================
echo 🚀 Voltraak IMS - One-Click Deployment
echo ========================================

REM Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker not found. Please install Docker Desktop
    echo Download: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo ✅ Docker found

REM Clean previous deployment
echo.
echo Cleaning previous deployment...
docker-compose -f docker-compose.dev.yml down -v 2>nul

echo.
echo 📦 Starting Voltraak IMS...
docker-compose -f docker-compose.dev.yml up -d

echo.
echo ⏳ Waiting for services to initialize...
timeout /t 45 /nobreak > nul

echo.
echo 🔧 Setting up database...
docker-compose -f docker-compose.dev.yml exec -T backend bash -c "php artisan migrate --force && php artisan db:seed --force"

echo.
echo ========================================
echo 🎉 DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo 🌐 Access Points:
echo   Frontend:     http://localhost:5173
echo   Backend API:  http://localhost:8000/api
echo   DB Admin:     http://localhost:8080
echo.
echo 👤 Demo Login Credentials:
echo   Admin:        admin@voltraak.com / admin123
echo   Manager:      manager@voltraak.com / manager123  
echo   Inventory:    inventory@voltraak.com / inventory123
echo   Warehouse:    warehouse@voltraak.com / warehouse123
echo.
echo 🔧 Management Commands:
echo   View logs:    docker-compose -f docker-compose.dev.yml logs -f
echo   Stop all:     docker-compose -f docker-compose.dev.yml down
echo   Restart:      docker-compose -f docker-compose.dev.yml restart
echo.
echo 📊 Database Admin (Adminer):
echo   Server: mysql
echo   Username: voltraak
echo   Password: voltraak_password
echo   Database: voltraak_ims
echo ========================================

REM Test deployment
echo.
echo 🧪 Quick Health Check:
timeout /t 5 /nobreak > nul
curl -s http://localhost:8000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ API is responding
) else (
    echo ⚠️  API may still be starting up
)

echo.
echo 🎯 Ready to test! Open http://localhost:5173 in your browser
echo.
pause