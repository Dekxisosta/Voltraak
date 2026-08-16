# Voltraak IMS Deployment Guide

## Overview

This guide covers the complete deployment of the Voltraak Inventory Management System using multiple deployment strategies: Docker Compose, Kubernetes, and AWS ECS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Docker Compose Deployment](#docker-compose-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [AWS ECS Deployment](#aws-ecs-deployment)
6. [Monitoring & Logging](#monitoring--logging)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **CPU**: Minimum 4 cores, recommended 8+ cores
- **Memory**: Minimum 8GB RAM, recommended 16GB+
- **Storage**: Minimum 100GB, recommended 200GB+ SSD
- **Network**: Stable internet connection for container registry access

### Software Dependencies
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Kubernetes**: Version 1.24+ (if using K8s)
- **kubectl**: Version 1.24+
- **AWS CLI**: Version 2.0+ (if using ECS)

### Domain & SSL Requirements
- **Domain**: Registered domain (e.g., voltraak.com)
- **SSL Certificate**: Let's Encrypt or purchased certificate
- **DNS**: Properly configured A/CNAME records

## Environment Configuration

### Required Environment Variables

#### Backend Configuration
```bash
# Application
APP_NAME="Voltraak IMS"
APP_ENV=production
APP_KEY=base64:your-32-character-key-here
APP_DEBUG=false
APP_URL=https://your-domain.com

# Database
DB_CONNECTION=mysql
DB_HOST=mysql-host
DB_PORT=3306
DB_DATABASE=voltraak_ims
DB_USERNAME=voltraak_user
DB_PASSWORD=secure-password-here

# Cache & Sessions
CACHE_DRIVER=redis
REDIS_HOST=redis-host
REDIS_PASSWORD=redis-password-here
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Authentication
JWT_SECRET=your-jwt-secret-here
JWT_TTL=60
JWT_REFRESH_TTL=20160

# Mail Configuration
MAIL_MAILER=smtp
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=your-email@domain.com
MAIL_PASSWORD=your-email-password
MAIL_ENCRYPTION=tls

# File Storage (Production)
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=voltraak-storage

# Business Rules
IMS_FEFO_STRICT_MODE=true
IMS_AUTO_REORDER_ENABLED=true
IMS_BATCH_EXPIRY_WARNING_DAYS=60
IMS_VARIANCE_ALERT_THRESHOLD=5
```

#### Frontend Configuration
```bash
# Application
VITE_APP_NAME="Voltraak IMS"
VITE_APP_ENV=production
VITE_API_BASE_URL=https://api.your-domain.com/api

# Features
VITE_ENABLE_DEBUG_MODE=false
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true

# UI Settings
VITE_DEFAULT_THEME=light
VITE_ANIMATION_ENABLED=true
VITE_DEFAULT_PAGE_SIZE=15
```

### Generating Secrets
```bash
# Generate Laravel App Key
php artisan key:generate --show

# Generate JWT Secret
php artisan jwt:secret --show

# Generate random passwords
openssl rand -base64 32
```

## Docker Compose Deployment

### Quick Start (Development)
```bash
# Clone repository
git clone https://github.com/your-org/voltraak-ims.git
cd voltraak-ims

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit environment files with your configuration
nano backend/.env
nano frontend/.env

# Start services
docker-compose up -d

# Run database migrations
docker-compose exec backend php artisan migrate

# Create admin user
docker-compose exec backend php artisan db:seed --class=AdminUserSeeder
```

### Production Deployment
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Service URLs (Development)
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api
- **Database**: localhost:3306
- **Redis**: localhost:6379

## Kubernetes Deployment

### Prerequisites
```bash
# Ensure kubectl is configured
kubectl cluster-info

# Install cert-manager for SSL
kubectl apply -f https://github.com/jetstack/cert-manager/releases/latest/download/cert-manager.yaml

# Install nginx-ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
```

### Deployment Steps

#### 1. Create Namespace
```bash
kubectl apply -f k8s/namespace.yaml
```

#### 2. Configure Secrets
```bash
# Edit secrets with actual values
nano k8s/secrets.yaml

# Apply secrets
kubectl apply -f k8s/secrets.yaml
```

#### 3. Deploy Infrastructure
```bash
# Deploy ConfigMaps
kubectl apply -f k8s/configmap.yaml

# Deploy MySQL
kubectl apply -f k8s/mysql.yaml

# Deploy Redis  
kubectl apply -f k8s/redis.yaml

# Wait for database to be ready
kubectl wait --for=condition=ready pod -l app=mysql -n voltraak-ims --timeout=300s
```

#### 4. Deploy Applications
```bash
# Deploy Backend
kubectl apply -f k8s/backend.yaml

# Deploy Frontend
kubectl apply -f k8s/frontend.yaml

# Configure Ingress
kubectl apply -f k8s/ingress.yaml
```

#### 5. Verify Deployment
```bash
# Check pod status
kubectl get pods -n voltraak-ims

# Check services
kubectl get services -n voltraak-ims

# Check ingress
kubectl get ingress -n voltraak-ims

# View logs
kubectl logs -f deployment/voltraak-backend -n voltraak-ims
```

### Scaling
```bash
# Scale backend pods
kubectl scale deployment voltraak-backend --replicas=5 -n voltraak-ims

# Scale frontend pods
kubectl scale deployment voltraak-frontend --replicas=3 -n voltraak-ims

# Scale queue workers
kubectl scale deployment voltraak-queue-worker --replicas=4 -n voltraak-ims
```

## AWS ECS Deployment

### Prerequisites
```bash
# Configure AWS CLI
aws configure

# Install ECS CLI
sudo curl -Lo /usr/local/bin/ecs-cli https://amazon-ecs-cli.s3.amazonaws.com/ecs-cli-linux-amd64-latest
sudo chmod +x /usr/local/bin/ecs-cli
```

### Setup Infrastructure
```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name voltraak-production

# Create VPC and subnets (or use existing)
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Create RDS instance
aws rds create-db-instance \
    --db-instance-identifier voltraak-mysql \
    --db-instance-class db.t3.medium \
    --engine mysql \
    --master-username voltraak_user \
    --master-user-password your-password \
    --allocated-storage 100

# Create ElastiCache Redis
aws elasticache create-cache-cluster \
    --cache-cluster-id voltraak-redis \
    --cache-node-type cache.t3.micro \
    --engine redis
```

### Deploy Services
```bash
# Build and push images to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com

# Backend
docker build -t voltraak-backend ./backend
docker tag voltraak-backend:latest your-account.dkr.ecr.us-east-1.amazonaws.com/voltraak-backend:latest
docker push your-account.dkr.ecr.us-east-1.amazonaws.com/voltraak-backend:latest

# Frontend
docker build -t voltraak-frontend ./frontend
docker tag voltraak-frontend:latest your-account.dkr.ecr.us-east-1.amazonaws.com/voltraak-frontend:latest
docker push your-account.dkr.ecr.us-east-1.amazonaws.com/voltraak-frontend:latest

# Create and run task definitions
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
aws ecs create-service --cluster voltraak-production --service-name voltraak-backend --task-definition voltraak-backend:1 --desired-count 2
```

## Monitoring & Logging

### Prometheus Setup (Kubernetes)
```bash
# Deploy Prometheus
kubectl apply -f monitoring/prometheus.yaml

# Deploy Grafana
kubectl apply -f monitoring/grafana.yaml

# Access Grafana (port-forward)
kubectl port-forward svc/grafana 3000:3000 -n voltraak-ims
```

### Log Aggregation
```bash
# Deploy ELK Stack (optional)
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch -n logging --create-namespace
helm install kibana elastic/kibana -n logging
helm install filebeat elastic/filebeat -n logging
```

### Health Checks
```bash
# Backend health endpoint
curl https://api.your-domain.com/api/health

# Database connection test
kubectl exec -it deployment/mysql -n voltraak-ims -- mysql -u root -p -e "SELECT 1"

# Redis connection test
kubectl exec -it deployment/redis -n voltraak-ims -- redis-cli ping
```

## Security Considerations

### Network Security
- Use HTTPS/TLS for all external communication
- Implement WAF (Web Application Firewall)
- Configure network policies in Kubernetes
- Use private subnets for databases

### Authentication & Authorization
- Implement strong password policies
- Use JWT with appropriate expiration times
- Enable two-factor authentication for admin users
- Regular security audits and penetration testing

### Data Protection
- Encrypt sensitive data at rest
- Use secrets management (K8s secrets, AWS Secrets Manager)
- Regular database backups with encryption
- Implement audit logging for sensitive operations

### Container Security
- Use non-root containers
- Scan images for vulnerabilities
- Keep base images updated
- Use minimal base images (Alpine)

## Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check database connectivity
kubectl exec -it deployment/voltraak-backend -n voltraak-ims -- php artisan tinker
# In tinker: DB::connection()->getPdo();

# Check MySQL logs
kubectl logs deployment/mysql -n voltraak-ims

# Verify environment variables
kubectl exec -it deployment/voltraak-backend -n voltraak-ims -- env | grep DB_
```

#### Redis Connection Issues
```bash
# Test Redis connectivity
kubectl exec -it deployment/redis -n voltraak-ims -- redis-cli ping

# Check Redis configuration
kubectl describe configmap voltraak-backend-config -n voltraak-ims
```

#### SSL Certificate Issues
```bash
# Check certificate status
kubectl get certificate -n voltraak-ims

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Manual certificate request
kubectl describe certificaterequest -n voltraak-ims
```

#### Performance Issues
```bash
# Check resource usage
kubectl top pods -n voltraak-ims
kubectl top nodes

# Scale services
kubectl scale deployment voltraak-backend --replicas=5 -n voltraak-ims

# Check logs for errors
kubectl logs -f deployment/voltraak-backend -n voltraak-ims
```

### Log Analysis
```bash
# Backend application logs
kubectl logs deployment/voltraak-backend -n voltraak-ims --tail=100

# Database query logs
kubectl exec -it deployment/mysql -n voltraak-ims -- tail -f /var/log/mysql/slow.log

# Nginx access logs
kubectl logs deployment/voltraak-frontend -n voltraak-ims
```

### Backup & Recovery
```bash
# Database backup
kubectl exec deployment/mysql -n voltraak-ims -- mysqldump -u root -p voltraak_ims > backup.sql

# Restore database
kubectl exec -i deployment/mysql -n voltraak-ims -- mysql -u root -p voltraak_ims < backup.sql

# File storage backup (if using persistent volumes)
kubectl exec deployment/voltraak-backend -n voltraak-ims -- tar -czf /tmp/storage-backup.tar.gz /var/www/html/storage
```

## Maintenance

### Regular Tasks
- **Daily**: Monitor application logs and metrics
- **Weekly**: Review security alerts and apply patches
- **Monthly**: Database optimization and cleanup
- **Quarterly**: Security audits and penetration testing

### Updates & Patches
```bash
# Update application
docker build -t voltraak-backend:new-version ./backend
kubectl set image deployment/voltraak-backend backend=voltraak-backend:new-version -n voltraak-ims

# Rolling update with zero downtime
kubectl rollout status deployment/voltraak-backend -n voltraak-ims

# Rollback if needed
kubectl rollout undo deployment/voltraak-backend -n voltraak-ims
```

## Support & Documentation

- **API Documentation**: https://api.your-domain.com/docs
- **User Manual**: `/docs/User-Manual/`
- **Development Guide**: `/docs/Development/`
- **Troubleshooting**: Create GitHub issues for technical problems
- **Business Support**: Contact support@voltraak.com

For additional help, refer to the comprehensive API contracts in `/docs/API-Contracts/` and the detailed architecture documentation in `/docs/Architecture.md`.