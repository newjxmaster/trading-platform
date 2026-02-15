/**
 * Company Routes
 * 
 * This module defines all routes for company operations.
 * 
 * @module routes/company
 */

import { Router } from 'express';
import { authenticate, requireBusinessOwner } from '../middleware/auth';
import { paginationValidation, validate, uuidParamValidation } from '../middleware/validation';

const router = Router();

/**
 * @route   POST /api/companies/register
 * @desc    Register a new company
 * @access  Private (Business Owner)
 */
router.post(
  '/register',
  authenticate,
  requireBusinessOwner,
  (req, res) => {
    res.json({ message: 'Register company endpoint - to be implemented' });
  }
);

/**
 * @route   GET /api/companies
 * @desc    List all active companies
 * @access  Public
 */
router.get(
  '/',
  paginationValidation,
  validate,
  (req, res) => {
    res.json({ message: 'List companies endpoint - to be implemented' });
  }
);

/**
 * @route   GET /api/companies/:id
 * @desc    Get company details
 * @access  Public
 */
router.get(
  '/:id',
  uuidParamValidation('id'),
  validate,
  (req, res) => {
    res.json({ message: 'Get company endpoint - to be implemented', companyId: req.params.id });
  }
);

/**
 * @route   GET /api/companies/:id/financials
 * @desc    Get company financial reports
 * @access  Public
 */
router.get(
  '/:id/financials',
  uuidParamValidation('id'),
  validate,
  paginationValidation,
  validate,
  (req, res) => {
    res.json({ message: 'Get company financials endpoint - to be implemented', companyId: req.params.id });
  }
);

/**
 * @route   PATCH /api/companies/:id
 * @desc    Update company information
 * @access  Private (Company Owner or Admin)
 */
router.patch(
  '/:id',
  authenticate,
  uuidParamValidation('id'),
  validate,
  (req, res) => {
    res.json({ message: 'Update company endpoint - to be implemented', companyId: req.params.id });
  }
);

/**
 * @route   GET /api/companies/:id/shareholders
 * @desc    Get company shareholders list
 * @access  Public
 */
router.get(
  '/:id/shareholders',
  uuidParamValidation('id'),
  validate,
  paginationValidation,
  validate,
  (req, res) => {
    res.json({ message: 'Get shareholders endpoint - to be implemented', companyId: req.params.id });
  }
);

export default router;
