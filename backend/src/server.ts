/**
 * Trading Platform Backend Server
 * Company Management Module Entry Point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import routes from './routes';

// Import middleware
import { handleMulterError } from './middleware/auth';

// ============================================================================
// APP INITIALIZATION
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'trading-platform-api',
    version: '1.0.0',
  });
});

// API Routes
app.use('/', routes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Handle multer errors
app.use(handleMulterError);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.message,
    });
    return;
  }

  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
    return;
  }

  if (err.code === 'P2002') {
    res.status(409).json({
      success: false,
      error: 'Duplicate entry',
      details: err.meta,
    });
    return;
  }

  if (err.code === 'P2025') {
    res.status(404).json({
      success: false,
      error: 'Record not found',
    });
    return;
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ============================================================================
// SERVER START
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     Trading Platform API Server                            ║
║     Company Management Module                              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

🚀 Server running on port ${PORT}
📚 API Documentation:
   - Auth:      http://localhost:${PORT}/api/auth
   - Users:     http://localhost:${PORT}/api/users
   - Companies: http://localhost:${PORT}/api/companies
   - Trading:   http://localhost:${PORT}/api/trading
   - Payments:  http://localhost:${PORT}/api/payments
   - Admin:     http://localhost:${PORT}/api/admin
   - Health:    http://localhost:${PORT}/health

🔧 Environment: ${process.env.NODE_ENV || 'development'}
  `);
});

export default app;
