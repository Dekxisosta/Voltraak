#!/bin/bash

echo "========================================"
echo "Voltraak IMS - Quick Local Deployment"
echo "========================================"

# Check if Docker is running
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed"
    echo "Please install Docker and try again"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "ERROR: Docker is not running"
    echo "Please start Docker and try again"
    exit 1
fi

echo "✓ Docker is running"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "ERROR: Docker Compose is not available"
    exit 1
fi

echo "✓ Docker Compose is available"
echo ""

echo "Setting up environment files..."

# Create backend .env file
if [ ! -f "backend/.env" ]; then
    echo "Creating backend/.env..."
    cat > backend/.env << EOF
APP_NAME="Voltraak IMS"
APP_ENV=local
APP_KEY=base64:YourRandomKeyHere1234567890ABCDEFGHIJKLMNOP=
APP_DEBUG=true
APP_URL=http://localhost:8000

LOG_CHANNEL=stack
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=voltraak_ims
DB_USERNAME=voltraak
DB_PASSWORD=voltraak_password

REDIS_HOST=redis
REDIS_PORT=6379
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

JWT_SECRET=YourJWTSecretHere1234567890
JWT_TTL=60

MAIL_MAILER=log

IMS_FEFO_STRICT_MODE=true
IMS_AUTO_REORDER_ENABLED=true
IMS_BATCH_EXPIRY_WARNING_DAYS=60
IMS_VARIANCE_ALERT_THRESHOLD=5
EOF
    echo "✓ Created backend/.env"
else
    echo "✓ backend/.env already exists"
fi

# Create frontend .env file
if [ ! -f "frontend/.env" ]; then
    echo "Creating frontend/.env..."
    cat > frontend/.env << EOF
VITE_APP_NAME="Voltraak IMS"
VITE_APP_ENV=development
VITE_API_BASE_URL=http://localhost:8000/api
VITE_ENABLE_DEBUG_MODE=true
VITE_DEFAULT_THEME=light
VITE_ANIMATION_ENABLED=true
EOF
    echo "✓ Created frontend/.env"
else
    echo "✓ frontend/.env already exists"
fi

echo ""
echo "Starting services with Docker Compose..."
docker-compose up -d

echo ""
echo "Waiting for services to start..."
sleep 30

echo ""
echo "Checking service status..."
docker-compose ps

echo ""
echo "Setting up database..."
echo "Running migrations..."
docker-compose exec -T backend php artisan migrate --force

echo ""
echo "Creating sample data..."
docker-compose exec -T backend php artisan db:seed --force

echo ""
echo "========================================"
echo "🎉 Deployment Complete!"
echo "========================================"
echo ""
echo "Frontend: http://localhost:5173"
echo "Backend API: http://localhost:8000/api"
echo "API Health: http://localhost:8000/api/health"
echo ""
echo "Default Login Credentials:"
echo "Email: admin@voltraak.com"
echo "Password: admin123"
echo ""
echo "To stop: docker-compose down"
echo "To view logs: docker-compose logs -f"
echo "========================================"