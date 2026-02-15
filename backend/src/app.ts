/**
 * Express App Configuration - Trading Platform
 * Main application setup with all routes and middleware
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Import routes
import paymentRoutes from './routes/payments';
import webhookRoutes from './routes/webhooks';

// Import middleware
import { authenticateToken } from './middleware/auth';

// Import utilities
import { AppError } from './utils/errors';
import logger from './utils/logger';

// Create Express application
const app: Application = express();

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================================================
// WEBHOOK ROUTES (Raw body needed for signature verification)
// =============================================================================

// Stripe webhook needs raw body for signature verification
app.use('/api/payments/webhooks/stripe', 
  express.raw({ type: 'application/json' }),
  webhookRoutes
);

// Other webhooks can use JSON body
app.use('/api/payments/webhooks', webhookRoutes);

// =============================================================================
// API ROUTES (Require authentication)
// =============================================================================

// Health check (public)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    },
    message: 'Service is healthy',
  });
});

// Payment routes (protected)
app.use('/api/payments', authenticateToken, paymentRoutes);

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log error
  logger.error('Unhandled error', err, 'App', {
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
  });

  // Handle known errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    });
  }

  // Handle validation errors from express-validator
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'VALIDATION_ERROR',
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED',
    });
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Resource already exists',
        code: 'DUPLICATE_ENTRY',
      });
    }
    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
        code: 'NOT_FOUND',
      });
    }
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    code: 'INTERNAL_ERROR',
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, 'App', {
    port: PORT,
    env: process.env.NODE_ENV,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully', 'App');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully', 'App');
  process.exit(0);
});

export default app;
