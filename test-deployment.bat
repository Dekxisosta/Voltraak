@echo off
echo ========================================
echo Testing Voltraak IMS Deployment
echo ========================================

echo Testing API Health Check...
curl -s http://localhost:8000/api/health
if %errorlevel% neq 0 (
    echo ❌ Backend API is not responding
) else (
    echo ✅ Backend API is healthy
)

echo.
echo Testing Frontend...
curl -s -o nul -w "%%{http_code}" http://localhost:5173
if %errorlevel% neq 0 (
    echo ❌ Frontend is not responding
) else (
    echo ✅ Frontend is accessible
)

echo.
echo Testing Database Connection...
docker-compose exec -T backend php artisan tinker --execute="DB::connection()->getPdo(); echo 'Database connected successfully';"
if %errorlevel% neq 0 (
    echo ❌ Database connection failed
) else (
    echo ✅ Database connection successful
)

echo.
echo Testing Authentication API...
curl -s -X POST http://localhost:8000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@voltraak.com\",\"password\":\"admin123\"}"

echo.
echo ========================================
echo Access Points:
echo ========================================
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:8000/api
echo Database Admin: http://localhost:8080
echo ========================================