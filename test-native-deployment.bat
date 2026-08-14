@echo off
echo ========================================
echo 🧪 Testing Voltraak Native Deployment
echo ========================================

echo Testing Backend API...
echo.

REM Test health endpoint
echo 1. Health Check:
curl -s http://localhost:8000/api/health
echo.
echo.

REM Test authentication
echo 2. Authentication Test:
curl -s -X POST http://localhost:8000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@voltraak.com\",\"password\":\"admin123\"}"
echo.
echo.

REM Test products endpoint
echo 3. Products Endpoint:
curl -s http://localhost:8000/api/inventory/products
echo.
echo.

REM Test KPI dashboard
echo 4. KPI Dashboard:
curl -s http://localhost:8000/api/reports/dashboard/kpi
echo.
echo.

echo ========================================
echo Frontend Test:
echo Open http://localhost:5173 in your browser
echo ========================================

pause