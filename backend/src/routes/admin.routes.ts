/**
 * Admin Routes
 * 
 * This module defines all routes for admin operations.
 * 
 * @module routes/admin
 */

import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { adminRateLimiter } from '../middleware/rateLimiter';
import { paginationValidation, validate, uuidParamValidation } from '../middleware/validation';

const router = Router();

// Apply admin rate limiter and authentication to all routes
router.use(authenticate);
router.use(requireAdmin);
router.use(adminRateLimiter);

// ============================================
// Dashboard Routes
// ============================================

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get platform statistics
 * @access  Private (Admin)
 */
router.get(
  '/dashboard/stats',
  (req, res) => {
    res.json({ message: 'Get dashboard stats endpoint - to be implemented' });
  }
);

// ============================================
// Company Management Routes
// ============================================

/**
 * @route   GET /api/admin/companies/pending
 * @desc    Get companies awaiting approval
 * @access  Private (Admin)
 */
router.get(
  '/companies/pending',
  paginationValidation,
  validate,
  (req, res) => {
    res.json({ message: 'Get pending companies endpoint - to be implemented' });
  }
);

/**
 * @route   PATCH /api/admin/companies/:id/verify
 * @desc    Approve or reject a company
 * @access  Private (Admin)
 */
router.patch(
  '/companies/:id/verify',
  uuidParamValidation('id'),
  validate,
  (req, res) => {
    res.json({ message: 'Verify company endpoint - to be implemented', companyId: req.params.id });
  }
);

// ============================================
// Revenue Verification Routes
// ============================================

/**
 * @route   GET /api/admin/revenue/pending
 * @desc    Get revenue reports pending verification
 * @access  Private (Admin)
 */
router.get(
  '/revenue/pending',
  paginationValidation,
  validate,
  (req, res) => {
    res.json({ message: 'Get pending revenue reports endpoint - to be implemented' });
  }
);

/**
 * @route   PATCH /api/admin/revenue/:id/verify
 * @desc    Verify or reject a revenue report
 * @access  Private (Admin)
 */
router.patch(
  '/revenue/:id/verify',
  uuidParamValidation('id'),
  validate,
  (req, res) => {
    res.json({ message: 'Verify revenue report endpoint - to be implemented', reportId: req.params.id });
  }
);

// ============================================
// User Management Routes
// ============================================

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Private (Admin)
 */
router.get(
  '/users',
  paginationValidation,
  validate,
  (req, res) => {
    res.json({ message: 'Get all users endpoint - to be implemented' });
  }
);

/**
 * @route   PATCH /api/admin/users/:id/kyc
 * @desc    Update user KYC status
 * @access  Private (Admin)
 */
router.patch(
  '/users/:id/kyc',
  uuidParamValidation('id'),
  validate,
  (req, res) => {
    res.json({ message: 'Update KYC status endpoint - to be implemented', userId: req.params.id });
  }
);

/**
 * @route   PATCH /api/admin/users/:id/suspend
 * @desc    Suspend or unsuspend a user
 * @access  Private (Admin)
 */
router.patch(
  '/users/:id/suspend',
  uuidParamValidation('id'),
  validate,
  (req, res) => {
    res.json({ message: 'Suspend user endpoint - to be implemented', userId: req.params.id });
  }
);

export default router;
