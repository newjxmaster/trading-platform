/**
 * Rate Limiting Middleware
 * 
 * This module provides rate limiting middleware to prevent abuse
 * and protect the API from brute force attacks.
 * 
 * @module middleware/rateLimiter
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Request, Response } from 'express';
import { redisClient } from '../config/redis';
import logger from '../utils/logger';

/**
 * Rate limit window in milliseconds (default: 15 minutes)
 */
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);

/**
 * Maximum requests per window (default: 100)
 */
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

/**
 * Maximum auth requests per window (default: 5)
 */
const AUTH_RATE_LIMIT_MAX = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10);

/**
 * Skip rate limiting for specific routes or conditions
 * @param req - Express request object
 * @returns boolean - True if should skip rate limiting
 */
const skipSuccessfulRequests = (req: Request): boolean => {
  // Skip rate limiting for health checks
  if (req.path === '/health' || req.path === '/api/health') {
    return true;
  }
  
  // Skip for whitelisted IPs (internal services)
  const whitelistedIPs = process.env.WHITELISTED_IPS?.split(',') || [];
  if (whitelistedIPs.includes(req.ip || '')) {
    return true;
  }
  
  return false;
};

/**
 * Generate rate limit key based on user ID or IP
 * @param req - Express request object
 * @returns string - Rate limit key
 */
const generateKey = (req: Request): string => {
  // Use user ID if authenticated, otherwise use IP
  const identifier = (req as Request & { user?: { userId: string } }).user?.userId || req.ip;
  return `rate_limit:${req.path}:${identifier}`;
};

/**
 * Standard API rate limiter
 * Applied to all routes by default
 */
export const standardRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: skipSuccessfulRequests,
  keyGenerator: generateKey,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login/register
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: AUTH_RATE_LIMIT_MAX, // 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests including successful ones
  keyGenerator: (req: Request) => {
    // Always use IP for auth endpoints to prevent user switching
    return `auth_limit:${req.ip}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      email: req.body?.email,
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: 900, // 15 minutes in seconds
    });
  },
});

/**
 * Stricter rate limiter for sensitive operations
 * Used for password reset, KYC submission, etc.
 */
export const sensitiveRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as Request & { user?: { userId: string } }).user?.userId;
    return `sensitive_limit:${userId || req.ip}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Sensitive operation rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many attempts for this sensitive operation. Please try again later.',
      code: 'SENSITIVE_RATE_LIMIT_EXCEEDED',
      retryAfter: 3600, // 1 hour in seconds
    });
  },
});

/**
 * Trading rate limiter
 * Limits the number of trading operations per user
 */
export const tradingRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 trades per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as Request & { user?: { userId: string } }).user?.userId;
    return `trading_limit:${userId}`;
  },
  skip: (req: Request) => {
    // Skip for GET requests (viewing order book, etc.)
    return req.method === 'GET';
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Trading rate limit exceeded', {
      userId: (req as Request & { user?: { userId: string } }).user?.userId,
      path: req.path,
    });
    
    res.status(429).json({
      success: false,
      message: 'Trading limit exceeded. Please wait a moment before placing more orders.',
      code: 'TRADING_RATE_LIMIT_EXCEEDED',
      retryAfter: 60,
    });
  },
});

/**
 * Webhook rate limiter
 * More lenient for payment webhooks but still protected
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 webhooks per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use the webhook provider name from the path
    const provider = req.path.split('/').pop() || 'unknown';
    return `webhook_limit:${provider}:${req.ip}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Webhook rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    
    res.status(429).json({
      success: false,
      message: 'Webhook rate limit exceeded',
      code: 'WEBHOOK_RATE_LIMIT_EXCEEDED',
    });
  },
});

/**
 * Admin rate limiter
 * More lenient for admin operations
 */
export const adminRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS * 2, // Double the standard limit
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as Request & { user?: { userId: string } }).user?.userId;
    return `admin_limit:${userId}`;
  },
  skip: (req: Request) => {
    // Skip if user is not admin (will be caught by auth middleware)
    return (req as Request & { user?: { role: string } }).user?.role !== 'admin';
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Admin rate limit exceeded', {
      userId: (req as Request & { user?: { userId: string } }).user?.userId,
      path: req.path,
    });
    
    res.status(429).json({
      success: false,
      message: 'Admin rate limit exceeded',
      code: 'ADMIN_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    });
  },
});

/**
 * Create custom rate limiter
 * @param options - Rate limit options
 * @returns Rate limit middleware
 */
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  keyPrefix?: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const identifier = (req as Request & { user?: { userId: string } }).user?.userId || req.ip;
      return `${options.keyPrefix || 'custom_limit'}:${identifier}`;
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Custom rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        keyPrefix: options.keyPrefix,
      });
      
      res.status(429).json({
        success: false,
        message: options.message || 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
  });
};

export default {
  standardRateLimiter,
  authRateLimiter,
  sensitiveRateLimiter,
  tradingRateLimiter,
  webhookRateLimiter,
  adminRateLimiter,
  createRateLimiter,
};
