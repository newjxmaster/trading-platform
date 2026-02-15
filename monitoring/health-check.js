// Trading Platform - Health Check Endpoints
// Comprehensive health monitoring for all services

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

const router = express.Router();
const prisma = new PrismaClient();

// Redis client for health checks
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Health check response structure
const createHealthResponse = (status, checks) => ({
  status,
  timestamp: new Date().toISOString(),
  version: process.env.RELEASE_VERSION || 'unknown',
  environment: process.env.NODE_ENV || 'development',
  uptime: process.uptime(),
  checks,
});

// Basic health check
router.get('/health', async (req, res) => {
  try {
    const checks = {
      api: { status: 'healthy', responseTime: 0 },
    };
    
    const startTime = Date.now();
    
    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'healthy',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        error: error.message,
      };
    }
    
    // Check Redis
    const redisStartTime = Date.now();
    try {
      await redis.ping();
      checks.redis = {
        status: 'healthy',
        responseTime: Date.now() - redisStartTime,
      };
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        error: error.message,
      };
    }
    
    // Determine overall status
    const allHealthy = Object.values(checks).every(
      (check) => check.status === 'healthy'
    );
    
    const status = allHealthy ? 'healthy' : 'unhealthy';
    const statusCode = allHealthy ? 200 : 503;
    
    res.status(statusCode).json(createHealthResponse(status, checks));
  } catch (error) {
    res.status(503).json(
      createHealthResponse('error', {
        api: { status: 'error', error: error.message },
      })
    );
  }
});

// Detailed health check (for monitoring systems)
router.get('/health/detailed', async (req, res) => {
  try {
    const checks = {};
    
    // API Health
    checks.api = {
      status: 'healthy',
      version: process.env.RELEASE_VERSION,
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    };
    
    // Database Health
    const dbStartTime = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      
      // Get connection pool stats
      const poolStats = await prisma.$queryRaw`
        SELECT count(*) as connections 
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `;
      
      checks.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStartTime,
        connections: parseInt(poolStats[0].connections),
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        error: error.message,
      };
    }
    
    // Redis Health
    const redisStartTime = Date.now();
    try {
      await redis.ping();
      const redisInfo = await redis.info('memory');
      const memoryMatch = redisInfo.match(/used_memory:(\d+)/);
      
      checks.redis = {
        status: 'healthy',
        responseTime: Date.now() - redisStartTime,
        memory: memoryMatch ? parseInt(memoryMatch[1]) : null,
      };
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        error: error.message,
      };
    }
    
    // External Services Health
    checks.externalServices = {};
    
    // Check Stripe (if configured)
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        await stripe.balance.retrieve();
        checks.externalServices.stripe = { status: 'healthy' };
      } catch (error) {
        checks.externalServices.stripe = {
          status: 'unhealthy',
          error: error.message,
        };
      }
    }
    
    // Check S3 (if configured)
    if (process.env.AWS_ACCESS_KEY_ID) {
      try {
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3();
        await s3.headBucket({ Bucket: process.env.AWS_S3_BUCKET }).promise();
        checks.externalServices.s3 = { status: 'healthy' };
      } catch (error) {
        checks.externalServices.s3 = {
          status: 'unhealthy',
          error: error.message,
        };
      }
    }
    
    // Determine overall status
    const allHealthy = Object.values(checks).every((check) => {
      if (typeof check === 'object' && check.status) {
        return check.status === 'healthy';
      }
      return true;
    });
    
    const status = allHealthy ? 'healthy' : 'degraded';
    const statusCode = allHealthy ? 200 : 503;
    
    res.status(statusCode).json(createHealthResponse(status, checks));
  } catch (error) {
    res.status(503).json(
      createHealthResponse('error', {
        error: error.message,
      })
    );
  }
});

// Readiness check (for Kubernetes)
router.get('/health/ready', async (req, res) => {
  try {
    // Check critical dependencies
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Liveness check (for Kubernetes)
router.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Database specific health check
router.get('/health/database', async (req, res) => {
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    
    // Get database metrics
    const metrics = await prisma.$queryRaw`
      SELECT 
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
        (SELECT pg_database_size(current_database())) as database_size
    `;
    
    res.status(200).json({
      status: 'healthy',
      responseTime: Date.now() - startTime,
      metrics: metrics[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Redis specific health check
router.get('/health/redis', async (req, res) => {
  try {
    const startTime = Date.now();
    await redis.ping();
    
    // Get Redis info
    const info = await redis.info();
    const memory = info.match(/used_memory:(\d+)/)?.[1];
    const connectedClients = info.match(/connected_clients:(\d+)/)?.[1];
    
    res.status(200).json({
      status: 'healthy',
      responseTime: Date.now() - startTime,
      memory: memory ? parseInt(memory) : null,
      connectedClients: connectedClients ? parseInt(connectedClients) : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Queue health check (Bull/Redis queues)
router.get('/health/queues', async (req, res) => {
  try {
    const Queue = require('bull');
    const queueNames = ['dividends', 'trades', 'notifications', 'emails'];
    
    const queueStatus = {};
    
    for (const name of queueNames) {
      const queue = new Queue(name, process.env.REDIS_URL);
      const jobCounts = await queue.getJobCounts();
      
      queueStatus[name] = {
        waiting: jobCounts.waiting,
        active: jobCounts.active,
        completed: jobCounts.completed,
        failed: jobCounts.failed,
        delayed: jobCounts.delayed,
      };
      
      await queue.close();
    }
    
    const hasFailedJobs = Object.values(queueStatus).some(
      (q) => q.failed > 0
    );
    
    res.status(hasFailedJobs ? 503 : 200).json({
      status: hasFailedJobs ? 'degraded' : 'healthy',
      queues: queueStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Metrics endpoint (for Prometheus)
router.get('/metrics', async (req, res) => {
  try {
    const metrics = [];
    
    // Node.js metrics
    const memoryUsage = process.memoryUsage();
    metrics.push(`nodejs_heap_size_total_bytes ${memoryUsage.heapTotal}`);
    metrics.push(`nodejs_heap_size_used_bytes ${memoryUsage.heapUsed}`);
    metrics.push(`nodejs_external_memory_bytes ${memoryUsage.external}`);
    metrics.push(`nodejs_uptime_seconds ${process.uptime()}`);
    
    // Database metrics
    try {
      const dbMetrics = await prisma.$queryRaw`
        SELECT 
          count(*) as connections 
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `;
      metrics.push(`database_connections ${dbMetrics[0].connections}`);
    } catch (e) {
      metrics.push(`database_connections -1`);
    }
    
    // Redis metrics
    try {
      await redis.ping();
      const info = await redis.info('memory');
      const memory = info.match(/used_memory:(\d+)/)?.[1];
      metrics.push(`redis_memory_bytes ${memory || -1}`);
    } catch (e) {
      metrics.push(`redis_memory_bytes -1`);
    }
    
    res.set('Content-Type', 'text/plain');
    res.send(metrics.join('\n'));
  } catch (error) {
    res.status(500).send(`# Error: ${error.message}`);
  }
});

module.exports = router;
