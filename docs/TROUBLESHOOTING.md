# Trading Platform - Troubleshooting Guide

Common issues and their solutions for the Trading Platform.

## Table of Contents

1. [Deployment Issues](#deployment-issues)
2. [Database Issues](#database-issues)
3. [API Issues](#api-issues)
4. [Frontend Issues](#frontend-issues)
5. [Payment Issues](#payment-issues)
6. [Performance Issues](#performance-issues)
7. [Security Issues](#security-issues)

---

## Deployment Issues

### Container Fails to Start

**Symptoms:**
```
Error: Container trading-platform-app exited with code 1
```

**Diagnosis:**
```bash
# Check container logs
docker-compose -f docker/docker-compose.yml logs app

# Check for missing environment variables
docker-compose -f docker/docker-compose.yml config
```

**Solutions:**

1. **Missing Environment Variables**
```bash
# Verify .env file exists and is loaded
cat .env | grep -E "^(DATABASE_URL|JWT_SECRET)"

# Reload environment
source .env
docker-compose -f docker/docker-compose.yml up -d
```

2. **Port Already in Use**
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process or change port
sudo kill -9 <PID>
```

3. **Image Build Failure**
```bash
# Rebuild without cache
docker-compose -f docker/docker-compose.yml build --no-cache

# Check Dockerfile syntax
docker build -f docker/Dockerfile.backend .
```

---

### SSL Certificate Issues

**Symptoms:**
```
nginx: [emerg] cannot load certificate "/etc/letsencrypt/live/..."
```

**Diagnosis:**
```bash
# Check certificate status
sudo certbot certificates

# Test certificate renewal
sudo certbot renew --dry-run
```

**Solutions:**

1. **Certificate Expired**
```bash
# Force renewal
sudo certbot renew --force-renewal

# Restart nginx
docker-compose -f docker/docker-compose.yml restart nginx
```

2. **Certificate Not Found**
```bash
# Obtain new certificate
sudo certbot certonly --standalone -d tradingplatform.com

# Update nginx configuration
docker-compose -f docker/docker-compose.yml restart nginx
```

3. **Permission Issues**
```bash
# Fix permissions
sudo chown -R root:root /etc/letsencrypt
sudo chmod -R 755 /etc/letsencrypt
```

---

## Database Issues

### Connection Refused

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Diagnosis:**
```bash
# Check if database container is running
docker-compose -f docker/docker-compose.yml ps db

# Check database logs
docker-compose -f docker/docker-compose.yml logs db

# Test connection
docker-compose -f docker/docker-compose.yml exec db pg_isready
```

**Solutions:**

1. **Database Not Running**
```bash
# Start database
docker-compose -f docker/docker-compose.yml up -d db

# Wait and check status
sleep 10
docker-compose -f docker/docker-compose.yml exec db pg_isready
```

2. **Wrong Connection String**
```bash
# Verify DATABASE_URL format
# Should be: postgresql://user:pass@db:5432/dbname?schema=public

echo $DATABASE_URL
```

3. **Database Corruption**
```bash
# Restore from backup
./scripts/backup.sh --restore /opt/backups/<backup-file>
```

---

### Migration Failures

**Symptoms:**
```
Error: P3006 - Migration failed
```

**Diagnosis:**
```bash
# Check migration status
./scripts/migrate.sh status

# View migration logs
docker-compose -f docker/docker-compose.yml logs app | grep -i migration
```

**Solutions:**

1. **Failed Migration**
```bash
# Rollback last migration
./scripts/migrate.sh rollback

# Fix the migration file
# Then redeploy
./scripts/migrate.sh deploy
```

2. **Migration Lock**
```bash
# Remove migration lock (be careful!)
docker-compose -f docker/docker-compose.yml exec db psql -U trading_platform \
  -c "DELETE FROM _prisma_migrations WHERE finished_at IS NULL;"
```

3. **Schema Drift**
```bash
# Validate schema
./scripts/migrate.sh validate

# Reset database (WARNING: DATA LOSS)
./scripts/migrate.sh reset
```

---

### High Connection Count

**Symptoms:**
```
FATAL: sorry, too many clients already
```

**Diagnosis:**
```bash
# Check active connections
docker-compose -f docker/docker-compose.yml exec db psql -U trading_platform \
  -c "SELECT count(*) FROM pg_stat_activity;"

# Check connection details
docker-compose -f docker/docker-compose.yml exec db psql -U trading_platform \
  -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

**Solutions:**

1. **Increase Connection Limit**
```sql
-- In postgresql.conf or via SQL
ALTER SYSTEM SET max_connections = 200;
SELECT pg_reload_conf();
```

2. **Kill Idle Connections**
```sql
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND state_change < NOW() - INTERVAL '1 hour';
```

3. **Restart Database**
```bash
docker-compose -f docker/docker-compose.yml restart db
```

---

## API Issues

### 500 Internal Server Error

**Symptoms:**
```json
{
  "error": "Internal Server Error",
  "message": "Something went wrong"
}
```

**Diagnosis:**
```bash
# Check application logs
docker-compose -f docker/docker-compose.yml logs -f app --tail 100

# Check Sentry for error details
# Visit: https://sentry.io/organizations/your-org/issues/
```

**Solutions:**

1. **Application Error**
```bash
# Restart API containers
docker-compose -f docker/docker-compose.yml restart app

# Check for recent changes
git log --oneline -5
```

2. **Database Connection Issue**
```bash
# Test database connection
docker-compose -f docker/docker-compose.yml exec app node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.\$queryRaw\`SELECT 1\`.then(() => console.log('OK')).catch(e => console.error(e));
"
```

3. **Memory Issue**
```bash
# Check memory usage
docker stats --no-stream

# Increase memory limit in docker-compose.yml
```

---

### High Response Time

**Symptoms:**
- API responses taking > 500ms
- Timeout errors

**Diagnosis:**
```bash
# Check response times in logs
docker-compose -f docker/docker-compose.yml logs app | grep -i "response time"

# Monitor database queries
docker-compose -f docker/docker-compose.yml exec db psql -U trading_platform \
  -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

**Solutions:**

1. **Slow Database Queries**
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_orders_company_status ON orders(company_id, status);
CREATE INDEX CONCURRENTLY idx_trades_executed_at ON trades(executed_at);

-- Analyze tables
ANALYZE orders;
ANALYZE trades;
```

2. **Redis Cache Issues**
```bash
# Check Redis connection
docker-compose -f docker/docker-compose.yml exec redis redis-cli ping

# Clear cache if needed
docker-compose -f docker/docker-compose.yml exec redis redis-cli FLUSHDB
```

3. **Scale Up**
```bash
# Add more API instances
docker-compose -f docker/docker-compose.yml up -d --scale app=4
```

---

### WebSocket Connection Issues

**Symptoms:**
```
WebSocket connection failed
Socket.io connection timeout
```

**Diagnosis:**
```bash
# Check nginx configuration
docker-compose -f docker/docker-compose.yml exec nginx nginx -t

# Test WebSocket endpoint
wscat -c wss://api.tradingplatform.com/socket.io/
```

**Solutions:**

1. **Nginx Configuration**
```nginx
# Ensure WebSocket support in nginx.conf
location /socket.io/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}
```

2. **Firewall Issues**
```bash
# Check firewall rules
sudo ufw status

# Allow WebSocket port if needed
sudo ufw allow 443/tcp
```

---

## Frontend Issues

### Blank Page / White Screen

**Symptoms:**
- Page loads but shows blank content
- Console errors in browser

**Diagnosis:**
```bash
# Check frontend logs
docker-compose -f docker/docker-compose.yml logs web

# Check nginx error logs
docker-compose -f docker/docker-compose.yml exec nginx cat /var/log/nginx/error.log
```

**Solutions:**

1. **Build Failure**
```bash
# Rebuild frontend
docker-compose -f docker/docker-compose.yml build --no-cache web
docker-compose -f docker/docker-compose.yml up -d web
```

2. **Missing Environment Variables**
```bash
# Check REACT_APP_* variables are set
cat .env | grep REACT_APP

# Rebuild with correct variables
docker-compose -f docker/docker-compose.yml build web
```

3. **Static Files Not Found**
```bash
# Check nginx configuration
docker-compose -f docker/docker-compose.yml exec nginx ls -la /usr/share/nginx/html
```

---

### CORS Errors

**Symptoms:**
```
Access to fetch at 'https://api.tradingplatform.com/...' 
from origin 'https://tradingplatform.com' has been blocked by CORS policy
```

**Solutions:**

1. **Update CORS Configuration**
```javascript
// In backend CORS configuration
app.use(cors({
  origin: [
    'https://tradingplatform.com',
    'https://app.tradingplatform.com'
  ],
  credentials: true
}));
```

2. **Check Environment Variables**
```bash
# Ensure FRONTEND_URL is correct
echo $FRONTEND_URL
# Should be: https://tradingplatform.com
```

---

## Payment Issues

### Stripe Webhook Failures

**Symptoms:**
```
Stripe webhook error: No signatures found matching the expected signature
```

**Diagnosis:**
```bash
# Check webhook endpoint configuration
curl https://api.stripe.com/v1/webhook_endpoints \
  -u "sk_live_...:" | jq

# Check webhook logs
docker-compose -f docker/docker-compose.yml logs app | grep -i stripe
```

**Solutions:**

1. **Verify Webhook Secret**
```bash
# Update STRIPE_WEBHOOK_SECRET in .env
# Get from Stripe Dashboard: Developers > Webhooks
```

2. **Check Endpoint URL**
```bash
# Ensure webhook URL is correct
# Should be: https://api.tradingplatform.com/api/payments/webhooks/stripe
```

---

### Wave/Orange Money Payment Failures

**Symptoms:**
```
Payment failed: Invalid API key
```

**Diagnosis:**
```bash
# Check API credentials
echo $WAVE_API_KEY
echo $ORANGE_API_KEY

# Test API connectivity
curl -I https://api.wave.com
```

**Solutions:**

1. **Update API Keys**
```bash
# Get new keys from Wave/Orange dashboard
# Update in .env file
nano .env

# Restart application
docker-compose -f docker/docker-compose.yml restart app
```

2. **Check IP Whitelisting**
```bash
# Get server IP
curl ifconfig.me

# Add to Wave/Orange whitelist
```

---

## Performance Issues

### High CPU Usage

**Diagnosis:**
```bash
# Check CPU usage
docker stats --no-stream

# Find high CPU processes
top -c -p $(docker inspect -f '{{.State.Pid}}' trading-platform-app)
```

**Solutions:**

1. **Optimize Database Queries**
```sql
-- Add query logging
SET log_min_duration_statement = 1000;

-- Identify slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

2. **Enable Query Caching**
```bash
# Check Redis cache hit rate
docker-compose -f docker/docker-compose.yml exec redis redis-cli INFO stats
```

3. **Scale Horizontally**
```bash
# Add more instances
docker-compose -f docker/docker-compose.yml up -d --scale app=4
```

---

### High Memory Usage

**Diagnosis:**
```bash
# Check memory usage
docker stats --no-stream | grep trading-platform

# Check Node.js memory
docker-compose -f docker/docker-compose.yml exec app ps aux | grep node
```

**Solutions:**

1. **Increase Memory Limit**
```yaml
# In docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

2. **Enable Garbage Collection**
```bash
# Add to Dockerfile or docker-compose
NODE_OPTIONS="--max-old-space-size=1536"
```

3. **Restart Containers**
```bash
docker-compose -f docker/docker-compose.yml restart app
```

---

## Security Issues

### Rate Limiting Triggered

**Symptoms:**
```json
{
  "error": "Too Many Requests",
  "retry_after": 60
}
```

**Solutions:**

1. **Adjust Rate Limits**
```nginx
# In nginx/rate-limit.conf
limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;
```

2. **Whitelist IPs**
```nginx
# In nginx.conf
location /api/ {
    allow 1.2.3.4;  # Your IP
    deny all;
}
```

---

### Suspicious Activity

**Symptoms:**
- Multiple failed login attempts
- Unusual API traffic patterns

**Diagnosis:**
```bash
# Check fail2ban status
sudo fail2ban-client status

# Check nginx access logs
docker-compose -f docker/docker-compose.yml exec nginx tail -f /var/log/nginx/access.log
```

**Solutions:**

1. **Block IP Address**
```bash
# Using fail2ban
sudo fail2ban-client set nginx-botsearch banip <IP>

# Using UFW
sudo ufw deny from <IP>
```

2. **Enable Enhanced Logging**
```bash
# Add to nginx.conf
log_format security '$remote_addr - $remote_user [$time_local] '
                   '"$request" $status $body_bytes_sent '
                   '"$http_referer" "$http_user_agent" '
                   '$request_time $upstream_response_time';
```

---

## Emergency Procedures

### Complete System Failure

```bash
# 1. Check system resources
free -h
df -h
docker system df

# 2. Restart all services
docker-compose -f docker/docker-compose.yml down
docker-compose -f docker/docker-compose.yml up -d

# 3. Check service health
curl https://api.tradingplatform.com/api/health

# 4. If still failing, restore from backup
./scripts/backup.sh --restore <latest-backup>
```

### Database Corruption

```bash
# 1. Stop application
docker-compose -f docker/docker-compose.yml stop app

# 2. Backup current state (even if corrupted)
docker-compose -f docker/docker-compose.yml exec db pg_dump -U trading_platform trading_platform > /tmp/corrupted-backup.sql

# 3. Restore from last known good backup
./scripts/backup.sh --restore /opt/backups/<good-backup>

# 4. Restart services
docker-compose -f docker/docker-compose.yml up -d
```

---

## Getting Help

If issues persist:

1. **Check Documentation**
   - [Deployment Guide](./DEPLOYMENT.md)
   - [Infrastructure Guide](./INFRASTRUCTURE.md)

2. **Review Logs**
   ```bash
   # Collect all logs
   docker-compose -f docker/docker-compose.yml logs > /tmp/trading-platform-logs.txt
   ```

3. **Contact Support**
   - Email: devops@tradingplatform.com
   - Slack: #incidents channel
   - Emergency: +1-XXX-XXX-XXXX

4. **Create Issue**
   - GitHub: https://github.com/your-org/trading-platform/issues
   - Include logs and reproduction steps
