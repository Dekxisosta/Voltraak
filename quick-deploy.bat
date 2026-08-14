@echo off
echo ========================================
echo Voltraak IMS - Quick Local Deployment
echo ========================================

REM Check if Docker is running
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or running
    echo Please install Docker Desktop and try again
    pause
    exit /b 1
)

echo Checking Docker Compose...
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker Compose is not available
    pause
    exit /b 1
)

echo.
echo Setting up environment files...

REM Create backend .env file
if not exist "backend\.env" (
    echo Creating backend/.env...
    (
        echo APP_NAME="Voltraak IMS"
        echo APP_ENV=local
        echo APP_KEY=base64:YourRandomKeyHere1234567890ABCDEFGHIJKLMNOP=
        echo APP_DEBUG=true
        echo APP_URL=http://localhost:8000
        echo.
        echo LOG_CHANNEL=stack
        echo LOG_LEVEL=debug
        echo.
        echo DB_CONNECTION=mysql
        echo DB_HOST=mysql
        echo DB_PORT=3306
        echo DB_DATABASE=voltraak_ims
        echo DB_USERNAME=voltraak
        echo DB_PASSWORD=voltraak_password
        echo.
        echo REDIS_HOST=redis
        echo REDIS_PORT=6379
        echo CACHE_DRIVER=redis
        echo SESSION_DRIVER=redis
        echo QUEUE_CONNECTION=redis
        echo.
        echo JWT_SECRET=YourJWTSecretHere1234567890
        echo JWT_TTL=60
        echo.
        echo MAIL_MAILER=log
        echo.
        echo IMS_FEFO_STRICT_MODE=true
        echo IMS_AUTO_REORDER_ENABLED=true
        echo IMS_BATCH_EXPIRY_WARNING_DAYS=60
        echo IMS_VARIANCE_ALERT_THRESHOLD=5
    ) > backend\.env
    echo ✓ Created backend/.env
) else (
    echo ✓ backend/.env already exists
)

REM Create frontend .env file
if not exist "frontend\.env" (
    echo Creating frontend/.env...
    (
        echo VITE_APP_NAME="Voltraak IMS"
        echo VITE_APP_ENV=development
        echo VITE_API_BASE_URL=http://localhost:8000/api
        echo VITE_ENABLE_DEBUG_MODE=true
        echo VITE_DEFAULT_THEME=light
        echo VITE_ANIMATION_ENABLED=true
    ) > frontend\.env
    echo ✓ Created frontend/.env
) else (
    echo ✓ frontend/.env already exists
)

echo.
echo Starting services with Docker Compose...
docker-compose up -d

echo.
echo Waiting for services to start...
timeout /t 30 /nobreak > nul

echo.
echo Checking service status...
docker-compose ps

echo.
echo Setting up database...
echo Running migrations...
docker-compose exec -T backend php artisan migrate --force

echo.
echo Creating sample data...
docker-compose exec -T backend php artisan db:seed --force

echo.
echo ========================================
echo 🎉 Deployment Complete!
echo ========================================
echo.
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:8000/api
echo API Health: http://localhost:8000/api/health
echo.
echo Default Login Credentials:
echo Email: admin@voltraak.com
echo Password: admin123
echo.
echo To stop: docker-compose down
echo To view logs: docker-compose logs -f
echo ========================================

pause