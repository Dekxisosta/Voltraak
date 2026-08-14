@echo off
echo ========================================
echo 🚀 Voltraak IMS - Native Deployment
echo ========================================

echo Checking requirements...

REM Check PHP
php --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PHP not found
    echo Please install PHP from https://windows.php.net/download/
    pause
    exit /b 1
)
echo ✅ PHP found

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js found

REM Check if we're in the right directory
if not exist "backend" (
    echo ❌ Backend directory not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ❌ Frontend directory not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

echo.
echo 📦 Setting up Backend (Laravel)...

cd backend

REM Check if Composer is available
composer --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Composer not found
    echo Installing Composer...
    
    REM Download Composer installer
    php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
    php composer-setup.php
    php -r "unlink('composer-setup.php');"
    
    REM Use local composer
    set COMPOSER_CMD=php composer.phar
) else (
    echo ✅ Composer found
    set COMPOSER_CMD=composer
)

REM Install Laravel dependencies
echo Installing Laravel dependencies...
%COMPOSER_CMD% install --no-dev --optimize-autoloader

REM Setup environment
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
)

REM Generate app key
echo Generating application key...
php artisan key:generate

REM Create SQLite database for simplicity
echo Creating SQLite database...
echo. > database.sqlite

REM Update .env for SQLite
echo Configuring database...
echo DB_CONNECTION=sqlite > .env.temp
echo DB_DATABASE=%cd%\database.sqlite >> .env.temp
echo APP_NAME="Voltraak IMS" >> .env.temp
echo APP_ENV=local >> .env.temp
echo APP_DEBUG=true >> .env.temp
echo APP_URL=http://localhost:8000 >> .env.temp
echo LOG_CHANNEL=stack >> .env.temp
echo LOG_LEVEL=debug >> .env.temp
echo CACHE_DRIVER=file >> .env.temp
echo SESSION_DRIVER=file >> .env.temp
echo QUEUE_CONNECTION=sync >> .env.temp
echo JWT_SECRET=your-jwt-secret-here-make-it-long-and-random >> .env.temp
echo JWT_TTL=60 >> .env.temp
echo MAIL_MAILER=log >> .env.temp
echo IMS_FEFO_STRICT_MODE=true >> .env.temp
echo IMS_AUTO_REORDER_ENABLED=true >> .env.temp
echo IMS_BATCH_EXPIRY_WARNING_DAYS=60 >> .env.temp
echo IMS_VARIANCE_ALERT_THRESHOLD=5 >> .env.temp

move .env.temp .env

REM Run migrations
echo Running database migrations...
php artisan migrate --force

REM Seed database
echo Creating demo data...
php artisan db:seed --force

echo ✅ Backend setup complete!

cd..

echo.
echo 🎨 Setting up Frontend (React)...

cd frontend

REM Install Node.js dependencies
echo Installing Node.js dependencies...
npm install

echo ✅ Frontend setup complete!

cd..

echo.
echo 🚀 Starting Services...

REM Start backend server in background
echo Starting Laravel backend on http://localhost:8000
start "Voltraak Backend" cmd /k "cd backend && php artisan serve --host=0.0.0.0 --port=8000"

REM Wait a bit for backend to start
timeout /t 5 /nobreak > nul

REM Start frontend server in background
echo Starting React frontend on http://localhost:5173
start "Voltraak Frontend" cmd /k "cd frontend && npm run dev"

REM Wait for frontend to start
timeout /t 10 /nobreak > nul

echo.
echo ========================================
echo 🎉 DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo 🌐 Access Points:
echo   Frontend:     http://localhost:5173
echo   Backend API:  http://localhost:8000/api
echo   Backend Health: http://localhost:8000/api/health
echo.
echo 👤 Demo Login Credentials:
echo   Admin:        admin@voltraak.com / admin123
echo   Manager:      manager@voltraak.com / manager123
echo   Inventory:    inventory@voltraak.com / inventory123
echo   Warehouse:    warehouse@voltraak.com / warehouse123
echo.
echo 🔧 Management:
echo   - Two terminal windows will open automatically
echo   - Close terminal windows to stop servers
echo   - Backend data stored in: backend/database.sqlite
echo.
echo 🧪 Quick Test:
curl -s http://localhost:8000/api/health
echo.
echo.
echo 🎯 Ready to use! Open http://localhost:5173 in your browser
echo ========================================

pause