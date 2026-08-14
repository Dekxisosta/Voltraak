@echo off
echo ========================================
echo 🚀 Voltraak IMS - Quick PHP Demo
echo ========================================

REM Check if PHP is available
php --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PHP not found. 
    echo.
    echo Please install PHP or use Docker option:
    echo 1. Download PHP: https://windows.php.net/download/
    echo 2. Or install Docker Desktop and run deploy-now.bat
    echo.
    pause
    exit /b 1
)

echo ✅ PHP found
echo.
echo 🌐 Starting demo server...
echo   API Demo: http://localhost:8080/demo-server.php/api/health
echo   Try login: POST http://localhost:8080/demo-server.php/api/auth/login
echo.
echo 👤 Demo credentials:
echo   admin@voltraak.com / admin123
echo   manager@voltraak.com / manager123
echo.
echo ⚡ Starting PHP server on port 8080...
echo Press Ctrl+C to stop
echo.

php -S localhost:8080