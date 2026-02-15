/**
 * Revenue & Dividend Routes
 * 
 * This module defines all routes for revenue and dividend operations.
 * 
 * @module routes/revenue
 */

import { Router } from 'express';
import { authenticate, requireAdmin, requireBusinessOwner } from '../middleware/auth';
import { paginationValidation, validate, uuidParamValidation } from '../middleware/validation';

const router = Router();

// ============================================
// Revenue Report Routes
// ============================================

/**
 * @route   GET /api/revenue/reports/:companyId
 * @desc    Get monthly revenue reports for a company
 * @access  Public
 */
router.get(
  '/reports/:companyId',
  uuidParamValidation('companyId'),
  validate,
  paginationValidation,
  validate,
  (req, res) => {
    res.json({ message: 'Get revenue reports endpoint - to be implemented', companyId: req.params.companyId });
  }
);

/**
 * @route   POST /api/revenue/sync
 * @desc    Trigger bank API sync for revenue data
 * @access  Private (Business Owner or Admin)
 */
router.post(
  '/sync',
  authenticate,
  requireBusinessOwner,
  (req, res) => {
    res.json({ message: 'Sync revenue endpoint - to be implemented' });
  }
);

// ============================================
// Dividend Routes
// ============================================

/**
 * @route   GET /api/dividends/upcoming
 * @desc    Get upcoming dividend payments
 * @access  Private
 */
router.get(
  '/dividends/upcoming',
  authenticate,
  (req, res) => {
    res.json({ message: 'Get upcoming dividends endpoint - to be implemented' });
  }
);

/**
 * @route   GET /api/dividends/history
 * @desc    Get user's dividend history
 * @access  Private
 */
router.get(
  '/dividends/history',
  authenticate,
  paginationValidation,
  validate,
  (req, res) => {
    res.json({ message: 'Get dividend history endpoint - to be implemented' });
  }
);

/**
 * @route   POST /api/dividends/distribute
 * @desc    Distribute dividends (Admin only)
 * @access  Private (Admin)
 */
router.post(
  '/dividends/distribute',
  authenticate,
  requireAdmin,
  (req, res) => {
    res.json({ message: 'Distribute dividends endpoint - to be implemented' });
  }
);

export default router;
