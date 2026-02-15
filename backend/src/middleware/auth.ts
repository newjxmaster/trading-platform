/**
 * Authentication & Authorization Middleware
 * Trading Platform for Small & Medium Businesses
 * 
 * Provides JWT authentication and role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { UserRole } from '../types/company.types';

const prisma = new PrismaClient();

// ============================================================================
// TYPES
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
    full_name: string;
  };
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
      });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;

    // Get user from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        full_name: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Attach user to request with userId
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
      return;
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Alias for authenticate - used in some imports
 */
export const authenticateToken = authenticate;

/**
 * Optional authentication - attaches user if token is valid, but doesn't require it
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;

    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        full_name: true,
      },
    });

    if (user) {
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      };
    }

    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
};

// ============================================================================
// AUTHORIZATION MIDDLEWARE
// ============================================================================

/**
 * Require specific role(s)
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

/**
 * Require admin role
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== UserRole.ADMIN) {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return;
  }

  next();
};

/**
 * Require business owner role
 */
export const requireBusinessOwner = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== UserRole.BUSINESS_OWNER && req.user.role !== UserRole.ADMIN) {
    res.status(403).json({
      success: false,
      error: 'Business owner access required',
    });
    return;
  }

  next();
};

/**
 * Require investor role
 */
export const requireInvestor = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== UserRole.INVESTOR && req.user.role !== UserRole.ADMIN) {
    res.status(403).json({
      success: false,
      error: 'Investor access required',
    });
    return;
  }

  next();
};

// ============================================================================
// RESOURCE OWNERSHIP MIDDLEWARE
// ============================================================================

/**
 * Check if user owns a company or is admin
 */
export const requireCompanyOwnerOrAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Admin can access any company
    if (req.user.role === UserRole.ADMIN) {
      next();
      return;
    }

    const { id } = req.params;
    const company = await prisma.company.findUnique({
      where: { id },
      select: { owner_id: true },
    });

    if (!company) {
      res.status(404).json({
        success: false,
        error: 'Company not found',
      });
      return;
    }

    if (company.owner_id !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to access this company',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Ownership check error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization check failed',
    });
  }
};

// ============================================================================
// RATE LIMITING HELPERS
// ============================================================================

/**
 * Create a simple in-memory rate limiter
 */
export const createRateLimiter = (
  maxRequests: number,
  windowMs: number
) => {
  const requests = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.ip || 'unknown';
    const now = Date.now();

    // Get existing requests for this identifier
    const userRequests = requests.get(identifier) || [];
    
    // Filter out old requests outside the window
    const validRequests = userRequests.filter(
      (timestamp) => now - timestamp < windowMs
    );

    // Check if limit exceeded
    if (validRequests.length >= maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
      return;
    }

    // Add current request
    validRequests.push(now);
    requests.set(identifier, validRequests);

    next();
  };
};

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

/**
 * Handle multer file upload errors
 */
export const handleMulterError = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      success: false,
      error: 'File size too large. Maximum size is 10MB.',
    });
    return;
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    res.status(400).json({
      success: false,
      error: 'Unexpected file field.',
    });
    return;
  }

  if (err.message && err.message.includes('Invalid file type')) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
    return;
  }

  next(err);
};

// ============================================================================
// REQUEST VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validate request body against a schema
 */
export const validateBody = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
      return;
    }

    next();
  };
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireBusinessOwner,
  requireInvestor,
  requireCompanyOwnerOrAdmin,
  createRateLimiter,
  handleMulterError,
  validateBody,
};
