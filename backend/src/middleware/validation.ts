/**
 * Request Validation Middleware
 * 
 * This module provides validation middleware using express-validator
 * for validating incoming request data.
 * 
 * @module middleware/validation
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import logger from '../utils/logger';

/**
 * Middleware to handle validation errors
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'general',
      message: error.msg,
    }));
    
    logger.warn('Validation failed', { 
      errors: formattedErrors,
      path: req.path,
      method: req.method,
    });
    
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
    return;
  }
  
  next();
};

/**
 * Validation middleware that checks for validation errors
 * Use this after validation chains in the middleware stack
 */
export const validate = (req: Request, res: Response, next: NextFunction): void => {
  handleValidationErrors(req, res, next);
};

/**
 * Helper to combine validation chains with error handling
 * @param validations - Array of validation chains
 * @returns Middleware array
 */
export const validateRequest = (...validations: ValidationChain[]): RequestHandler[] => {
  return [
    ...validations,
    handleValidationErrors,
  ];
};

// ============================================
// Authentication Validations
// ============================================

/**
 * User registration validation rules
 */
export const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('role')
    .optional()
    .isIn(['investor', 'business_owner'])
    .withMessage('Role must be either investor or business_owner'),
];

/**
 * User login validation rules
 */
export const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Refresh token validation rules
 */
export const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];

// ============================================
// Company Validations
// ============================================

/**
 * Company registration validation rules
 */
export const registerCompanyValidation = [
  body('businessName')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Business name must be between 2 and 255 characters'),
  body('businessType')
    .isIn(['small_business', 'medium_business'])
    .withMessage('Business type must be small_business or medium_business'),
  body('category')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  body('partnerBankName')
    .trim()
    .notEmpty()
    .withMessage('Partner bank name is required'),
  body('bankAccountNumber')
    .trim()
    .notEmpty()
    .withMessage('Bank account number is required'),
  body('initialValuation')
    .isFloat({ min: 1000 })
    .withMessage('Initial valuation must be at least 1000'),
  body('totalShares')
    .isInt({ min: 100, max: 10000000 })
    .withMessage('Total shares must be between 100 and 10,000,000'),
  body('availableShares')
    .isInt({ min: 0 })
    .withMessage('Available shares must be a non-negative number'),
  body('currentPrice')
    .isFloat({ min: 0.01 })
    .withMessage('Current price must be at least 0.01'),
];

/**
 * Company update validation rules
 */
export const updateCompanyValidation = [
  body('businessName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }),
  body('currentPrice')
    .optional()
    .isFloat({ min: 0.01 }),
];

// ============================================
// Trading Validations
// ============================================

/**
 * Order creation validation rules
 */
export const createOrderValidation = [
  body('companyId')
    .isUUID()
    .withMessage('Valid company ID is required'),
  body('orderType')
    .isIn(['market', 'limit'])
    .withMessage('Order type must be market or limit'),
  body('side')
    .isIn(['buy', 'sell'])
    .withMessage('Side must be buy or sell'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Price must be at least 0.01'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiration date format'),
];

/**
 * Order cancellation validation rules
 */
export const cancelOrderValidation = [
  param('id')
    .isUUID()
    .withMessage('Valid order ID is required'),
];

// ============================================
// Payment Validations
// ============================================

/**
 * Deposit validation rules
 */
export const depositValidation = [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least 1'),
  body('currency')
    .isIn(['USD', 'XOF', 'BTC', 'ETH', 'USDT'])
    .withMessage('Invalid currency'),
  body('paymentMethod')
    .isIn(['wave', 'orange_money', 'bank_transfer', 'card', 'crypto'])
    .withMessage('Invalid payment method'),
];

/**
 * Withdrawal validation rules
 */
export const withdrawalValidation = [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least 1'),
  body('currency')
    .isIn(['USD', 'XOF', 'BTC', 'ETH', 'USDT'])
    .withMessage('Invalid currency'),
  body('paymentMethod')
    .isIn(['wave', 'orange_money', 'bank_transfer', 'crypto'])
    .withMessage('Invalid payment method'),
  body('destinationDetails')
    .isObject()
    .withMessage('Destination details are required'),
];

// ============================================
// Pagination Validations
// ============================================

/**
 * Pagination query validation rules
 */
export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('sortBy')
    .optional()
    .isString()
    .trim(),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];

// ============================================
// UUID Parameter Validation
// ============================================

/**
 * UUID parameter validation
 * @param paramName - Name of the parameter to validate
 */
export const uuidParamValidation = (paramName: string) => [
  param(paramName)
    .isUUID()
    .withMessage(`Valid ${paramName} is required`),
];

// ============================================
// KYC Validations
// ============================================

/**
 * KYC verification validation rules
 */
export const kycValidation = [
  body('documentType')
    .isIn(['passport', 'national_id', 'drivers_license'])
    .withMessage('Invalid document type'),
];

export default {
  handleValidationErrors,
  validate,
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  registerCompanyValidation,
  updateCompanyValidation,
  createOrderValidation,
  cancelOrderValidation,
  depositValidation,
  withdrawalValidation,
  paginationValidation,
  uuidParamValidation,
  kycValidation,
};
