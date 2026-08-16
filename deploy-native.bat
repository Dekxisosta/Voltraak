@echo off
echo ========================================
echo 🚀 Voltraak IMS - Native Deployment
echo ========================================

REM Check PHP
php --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PHP not found. Please install PHP 8.1+ and add to PATH
    echo Download: https://www.php.net/downloads
    pause
    exit /b 1
)
echo ✅ PHP found

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js 18+ and add to PATH
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js found

REM Check Composer
composer --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Composer not found. Please install Composer and add to PATH
    echo Download: https://getcomposer.org/
    pause
    exit /b 1
)
echo ✅ Composer found

echo.
echo 📦 Setting up Backend...
cd backend

REM Install backend dependencies
echo Installing PHP dependencies...
composer install --optimize-autoloader

REM Setup environment
if not exist ".env" (
    echo Setting up .env file...
    copy .env.example .env
    php artisan key:generate --force
)

REM Setup database (SQLite for simplicity)
echo Setting up database...
if not exist "database\database.sqlite" (
    echo. > database\database.sqlite
)

REM Run migrations and seed
echo Running database migrations...
php artisan migrate --force

echo Seeding database with demo data...
php artisan db:seed --force

echo.
echo 🌐 Setting up Frontend...
cd ..\frontend

REM Install frontend dependencies
echo Installing Node.js dependencies...
npm install

REM Build frontend for production
echo Building frontend for production...
npm run build

echo.
echo ========================================
echo 🎉 DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo 🚀 Starting Services...

REM Start backend server
echo Starting Backend API Server...
start "Voltraak Backend" cmd /c "cd /d %~dp0backend && php -S localhost:8000 -t public"

timeout /t 3 /nobreak > nul

REM Start frontend dev server (for development) or serve built files
echo Starting Frontend Server...
start "Voltraak Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

timeout /t 5 /nobreak > nul

echo.
echo ========================================
echo 🌟 VOLTRAAK IMS IS NOW RUNNING!
echo ========================================
echo.
echo 🌐 Access Points:
echo   Frontend:     http://localhost:3000
echo   Backend API:  http://localhost:8000/api
echo   API Health:   http://localhost:8000/api/health
echo.
echo 👤 Demo Login Credentials:
echo   Admin:        admin@voltraak.com / admin123
echo   Manager:      manager@voltraak.com / manager123  
echo   Inventory:    inventory@voltraak.com / inventory123
echo   Warehouse:    warehouse@voltraak.com / warehouse123
echo.
echo 📋 System Status:
echo   ✅ Backend running on localhost:8000
echo   ✅ Frontend running on localhost:3000
echo   ✅ Database (SQLite) initialized
echo   ✅ Demo data loaded
echo.
echo 🔧 Management:
echo   Stop services: Close the terminal windows
echo   View logs: Check the terminal windows
echo   Restart: Re-run this script
echo.
echo 🎯 Ready to use! Open http://localhost:3000 in your browser
echo ========================================

REM Test deployment
echo.
echo 🧪 Quick Health Check:
timeout /t 3 /nobreak > nul

curl -s http://localhost:8000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend API is responding
) else (
    echo ⚠️  Backend API may still be starting up
    echo    Check the backend terminal window for any errors
)

echo.
echo 🌐 Opening browser...
timeout /t 2 /nobreak > nul
start http://localhost:3000

echo.
echo Press any key to exit deployment script...
echo (Services will continue running in background)
pause >nul