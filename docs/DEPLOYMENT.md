# Trading Platform - Deployment Guide

Complete step-by-step guide for deploying the Trading Platform to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Server Setup](#initial-server-setup)
3. [Environment Configuration](#environment-configuration)
4. [SSL Certificate Setup](#ssl-certificate-setup)
5. [Database Setup](#database-setup)
6. [Application Deployment](#application-deployment)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Updating the Application](#updating-the-application)
9. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Server Requirements

- **OS**: Ubuntu 22.04 LTS (recommended)
- **CPU**: 4+ cores
- **RAM**: 8GB+ (16GB recommended for production)
- **Storage**: 100GB+ SSD
- **Network**: Static IP address, ports 80, 443 open

### Software Requirements

- Docker 24.0+
- Docker Compose 2.20+
- Git
- AWS CLI (for S3 backups)

### Domain & DNS

- Domain name registered
- DNS A records pointing to server IP:
  - `tradingplatform.com` → Server IP
  - `api.tradingplatform.com` → Server IP
  - `admin.tradingplatform.com` → Server IP

### Required Accounts

- AWS Account (for S3 storage)
- Stripe Account (for payments)
- Sentry Account (for error tracking)
- LogRocket Account (for session replay)
- Let's Encrypt (free SSL)

---

## Initial Server Setup

### 1. Provision Server

Create a new server (AWS EC2, DigitalOcean Droplet, etc.) with:
- Ubuntu 22.04 LTS
- 4 vCPUs, 8GB RAM minimum
- 100GB SSD storage
- Security group allowing ports 22, 80, 443

### 2. Run Setup Script

SSH into your server and run the setup script:

```bash
# Clone the repository
git clone https://github.com/your-org/trading-platform.git
cd trading-platform

# Run the setup script
sudo ./scripts/setup.sh -d tradingplatform.com -e admin@tradingplatform.com
```

This script will:
- Update system packages
- Install Docker and Docker Compose
- Configure firewall (UFW)
- Setup Fail2Ban for security
- Create application directories
- Configure system limits
- Setup log rotation

### 3. Verify Docker Installation

```bash
docker --version
docker-compose --version
docker ps
```

---

## Environment Configuration

### 1. Create Environment File

```bash
cd /opt/trading-platform
cp .env.production .env
```

### 2. Edit Environment Variables

Open `.env` and configure all required variables:

```bash
nano .env
```

**Critical variables to set:**

```bash
# Database (generate secure passwords)
DB_PASSWORD=$(openssl rand -base64 32)

# JWT Secrets (generate secure secrets)
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)

# Payment APIs (from your accounts)
STRIPE_SECRET_KEY=sk_live_...
WAVE_API_KEY=...
ORANGE_API_KEY=...

# AWS S3 (from AWS Console)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...

# Monitoring (from Sentry/LogRocket)
SENTRY_DSN=https://...
LOGROCKET_ID=...
```

### 3. Load Environment Variables

```bash
set -a
source .env
set +a
```

---

## SSL Certificate Setup

### 1. Initial Certificate (Using Certbot)

```bash
# Stop any running services
docker-compose -f docker/docker-compose.yml down

# Obtain certificate
sudo certbot certonly --standalone \
  -d tradingplatform.com \
  -d api.tradingplatform.com \
  -d admin.tradingplatform.com \
  --agree-tos \
  --email admin@tradingplatform.com
```

### 2. Verify Certificate

```bash
sudo ls -la /etc/letsencrypt/live/tradingplatform.com/
```

### 3. Auto-Renewal

Certbot auto-renewal is already configured by the setup script. Verify:

```bash
sudo certbot renew --dry-run
```

---

## Database Setup

### 1. Start Database Services

```bash
cd /opt/trading-platform
docker-compose -f docker/docker-compose.yml up -d db redis
```

### 2. Wait for Database to be Ready

```bash
# Check database status
docker-compose -f docker/docker-compose.yml ps db

# Wait for PostgreSQL to accept connections
sleep 30
```

### 3. Run Database Migrations

```bash
./scripts/migrate.sh deploy
```

### 4. Verify Database

```bash
# Connect to database
docker-compose -f docker/docker-compose.yml exec db psql -U trading_platform -d trading_platform

# Check tables
\dt

# Exit
\q
```

---

## Application Deployment

### 1. Build Docker Images

```bash
cd /opt/trading-platform

# Build all images
docker-compose -f docker/docker-compose.yml build
```

### 2. Start All Services

```bash
# Start all services in detached mode
docker-compose -f docker/docker-compose.yml up -d
```

### 3. Verify Services are Running

```bash
# Check all containers
docker-compose -f docker/docker-compose.yml ps

# Check logs
docker-compose -f docker/docker-compose.yml logs -f
```

### 4. Scale Services (Production)

```bash
# Scale API servers
docker-compose -f docker/docker-compose.yml up -d --scale app=2

# Scale frontend servers
docker-compose -f docker/docker-compose.yml up -d --scale web=2
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# API health check
curl https://api.tradingplatform.com/api/health

# Frontend health check
curl https://tradingplatform.com/health

# Detailed health check
curl https://api.tradingplatform.com/api/health/detailed
```

### 2. Test Key Endpoints

```bash
# Test API endpoints
curl https://api.tradingplatform.com/api/companies
curl https://api.tradingplatform.com/api/trading/orderbook

# Test WebSocket (using wscat)
npm install -g wscat
wscat -c wss://api.tradingplatform.com/socket.io/
```

### 3. Verify SSL Certificate

```bash
# Check SSL certificate
echo | openssl s_client -servername tradingplatform.com -connect tradingplatform.com:443 2>/dev/null | openssl x509 -noout -dates

# SSL Labs test (optional)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=tradingplatform.com
```

### 4. Check Logs

```bash
# Application logs
docker-compose -f docker/docker-compose.yml logs -f app

# Nginx logs
docker-compose -f docker/docker-compose.yml logs -f nginx

# Database logs
docker-compose -f docker/docker-compose.yml logs -f db
```

---

## Updating the Application

### Automated Deployment (Recommended)

The CI/CD pipeline automatically deploys on merge to main:

1. Push changes to `main` branch
2. GitHub Actions runs tests
3. On success, builds and pushes Docker images
4. Deploys to production server

### Manual Deployment

```bash
cd /opt/trading-platform

# Pull latest changes
git pull origin main

# Run deployment script
sudo ./scripts/deploy.sh production $(git rev-parse --short HEAD)
```

### Blue-Green Deployment (Zero Downtime)

```bash
# Scale up new version
docker-compose -f docker/docker-compose.yml up -d --no-deps --scale app=4 app

# Wait for health checks
sleep 30

# Verify new containers
curl -f http://localhost:3000/api/health

# Scale down old containers
docker-compose -f docker/docker-compose.yml up -d --no-deps --scale app=2 app
```

---

## Rollback Procedures

### Automatic Rollback

The deployment script automatically rolls back on failure. To check status:

```bash
# Check deployment logs
tail -f /var/log/trading-platform/deploy-*.log
```

### Manual Rollback

```bash
cd /opt/trading-platform

# Stop current containers
docker-compose -f docker/docker-compose.yml down

# Restore from backup
BACKUP_FILE=$(ls -t /opt/backups/*/database.sql.gz | head -1)
gunzip -c "$BACKUP_FILE" | docker-compose -f docker/docker-compose.yml exec -T db psql -U trading_platform

# Checkout previous version
git log --oneline -5
git checkout <previous-commit>

# Redeploy
docker-compose -f docker/docker-compose.yml up -d
```

### Database Rollback

```bash
# Rollback last migration
./scripts/migrate.sh rollback

# Or restore from backup
./scripts/backup.sh --restore <backup-file>
```

---

## Maintenance Tasks

### Daily

- Check application logs for errors
- Monitor disk space usage
- Verify backup completion

### Weekly

- Review security logs
- Check SSL certificate expiration
- Update system packages

### Monthly

- Review and rotate secrets
- Analyze performance metrics
- Clean up old Docker images

---

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

---

## Security Checklist

- [ ] All secrets are stored in environment variables
- [ ] Database password is strong and unique
- [ ] JWT secrets are at least 64 characters
- [ ] Firewall is configured (UFW)
- [ ] Fail2Ban is running
- [ ] SSL certificate is valid
- [ ] Security headers are configured in Nginx
- [ ] Rate limiting is enabled
- [ ] Database is not publicly accessible
- [ ] S3 buckets are private
- [ ] API keys are rotated regularly

---

## Support

For deployment support:
- Email: devops@tradingplatform.com
- Slack: #deployments channel
- Emergency: +1-XXX-XXX-XXXX
