/**
 * User Routes
 * 
 * This module defines all routes for user operations.
 * 
 * @module routes/user
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { paginationValidation, validate } from '../middleware/validation';
import {
  getWallet,
  uploadKyc,
  getTransactions,
  updateProfile,
} from '../controllers/user.controller';

const router = Router();

/**
 * @route   GET /api/users/wallet
 * @desc    Get user wallet balance
 * @access  Private
 */
router.get('/wallet', authenticate, getWallet);

/**
 * @route   POST /api/users/kyc/upload
 * @desc    Upload KYC documents
 * @access  Private
 */
router.post('/kyc/upload', authenticate, uploadKyc);

/**
 * @route   GET /api/users/transactions
 * @desc    Get user transaction history
 * @access  Private
 */
router.get(
  '/transactions',
  authenticate,
  paginationValidation,
  validate,
  getTransactions
);

/**
 * @route   PATCH /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.patch('/profile', authenticate, updateProfile);

export default router;
