/**
 * Error Handling Middleware
 * 
 * This module provides centralized error handling for the application.
 * It catches all errors and formats them into consistent API responses.
 * 
 * @module middleware/errorHandler
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';
import { ApiError, ErrorResponse } from '../types';

/**
 * Custom error response interface
 */
interface ErrorResponseBody {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
  stack?: string;
  code?: string;
}

/**
 * Handle Prisma-specific errors
 * @param error - Prisma error object
 * @returns ErrorResponseBody
 */
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): ErrorResponseBody => {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const fields = error.meta?.target as string[] || ['unknown'];
      return {
        success: false,
        message: `Duplicate value for: ${fields.join(', ')}`,
        errors: fields.map(field => ({
          field,
          message: `A record with this ${field} already exists`,
        })),
        code: 'DUPLICATE_ENTRY',
      };
      
    case 'P2003':
      // Foreign key constraint violation
      return {
        success: false,
        message: 'Referenced record not found',
        code: 'FOREIGN_KEY_VIOLATION',
      };
      
    case 'P2025':
      // Record not found
      return {
        success: false,
        message: 'Record not found',
        code: 'NOT_FOUND',
      };
      
    case 'P2014':
      // Invalid ID
      return {
        success: false,
        message: 'Invalid ID provided',
        code: 'INVALID_ID',
      };
      
    default:
      logger.error('Unhandled Prisma error', { code: error.code, error });
      return {
        success: false,
        message: 'Database error occurred',
        code: error.code,
      };
  }
};

/**
 * Handle validation errors
 * @param error - Error object
 * @returns ErrorResponseBody
 */
const handleValidationError = (error: Error & { errors?: Array<{ field: string; message: string }> }): ErrorResponseBody => {
  return {
    success: false,
    message: error.message || 'Validation failed',
    errors: error.errors,
    code: 'VALIDATION_ERROR',
  };
};

/**
 * Handle JWT errors
 * @param error - Error object
 * @returns ErrorResponseBody
 */
const handleJWTError = (error: Error): ErrorResponseBody => {
  if (error.name === 'TokenExpiredError') {
    return {
      success: false,
      message: 'Token has expired',
      code: 'TOKEN_EXPIRED',
    };
  }
  
  if (error.name === 'JsonWebTokenError') {
    return {
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
    };
  }
  
  return {
    success: false,
    message: 'Token error',
    code: 'TOKEN_ERROR',
  };
};

/**
 * Main error handling middleware
 * This should be the last middleware in the stack
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  let response: ErrorResponseBody;
  let statusCode = 500;

  // Handle specific error types
  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    response = {
      success: false,
      message: error.message,
      errors: error.errors,
    };
  }
  // Handle Prisma errors
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    response = handlePrismaError(error);
  }
  // Handle Prisma validation errors
  else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    response = {
      success: false,
      message: 'Invalid data provided',
      code: 'VALIDATION_ERROR',
    };
  }
  // Handle JWT errors
  else if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
    statusCode = 401;
    response = handleJWTError(error);
  }
  // Handle validation errors
  else if (error.name === 'ValidationError' || error.errors) {
    statusCode = 400;
    response = handleValidationError(error);
  }
  // Handle syntax errors (malformed JSON)
  else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    response = {
      success: false,
      message: 'Invalid JSON in request body',
      code: 'INVALID_JSON',
    };
  }
  // Default error response
  else {
    response = {
      success: false,
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message || 'Internal server error',
    };
    
    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      response.stack = error.stack;
    }
  }

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found handler
 * This should be placed before the error handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
  });
};

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors automatically
 * @param fn - Async function to wrap
 * @returns Wrapped function
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Request timeout middleware
 * Sets a timeout for requests and returns 408 if exceeded
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 */
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timeout',
          code: 'REQUEST_TIMEOUT',
        });
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  requestTimeout,
};
