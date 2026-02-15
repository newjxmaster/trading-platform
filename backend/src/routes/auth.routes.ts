/**
 * Authentication Routes
 * 
 * This module defines all routes for authentication operations.
 * 
 * @module routes/auth
 */

import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  getCurrentUser,
  logout,
  logoutAll,
  changePassword,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  validate,
} from '../middleware/validation';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authRateLimiter,
  registerValidation,
  validate,
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authRateLimiter,
  loginValidation,
  validate,
  login
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh-token',
  refreshTokenValidation,
  validate,
  refreshToken
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  getCurrentUser
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  authenticate,
  logout
);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post(
  '/logout-all',
  authenticate,
  logoutAll
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  changePassword
);

export default router;
