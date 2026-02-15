/**
 * Payment Routes
 * 
 * This module defines all routes for payment operations.
 * 
 * @module routes/payment
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { sensitiveRateLimiter, webhookRateLimiter } from '../middleware/rateLimiter';
import { depositValidation, withdrawalValidation, paginationValidation, validate } from '../middleware/validation';

const router = Router();

// ============================================
// Deposit Routes
// ============================================

/**
 * @route   POST /api/payments/deposit/wave
 * @desc    Deposit via Wave (Mobile Money)
 * @access  Private
 */
router.post(
  '/deposit/wave',
  authenticate,
  sensitiveRateLimiter,
  depositValidation,
  validate,
  (req, res) => {
    res.json({ message: 'Wave deposit endpoint - to be implemented' });
  }
);

/**
 * @route   POST /api/payments/deposit/orange
 * @desc    Deposit via Orange Money
 * @access  Private
 */
router.post(
  '/deposit/orange',
  authenticate,
  sensitiveRateLimiter,
  depositValidation,
  validate,
  (req, res) => {
    res.json({ message: 'Orange Money deposit endpoint - to be implemented' });
  }
);

/**
 * @route   POST /api/payments/deposit/card
 * @desc    Deposit via Credit/Debit Card (Stripe)
 * @access  Private
 */
router.post(
  '/deposit/card',
  authenticate,
  sensitiveRateLimiter,
  depositValidation,
  validate,
  (req, res) => {
    res.json({ message: 'Card deposit endpoint - to be implemented' });
  }
);

/**
 * @route   POST /api/payments/deposit/crypto
 * @desc    Deposit via Cryptocurrency
 * @access  Private
 */
router.post(
  '/deposit/crypto',
  authenticate,
  sensitiveRateLimiter,
  depositValidation,
  validate,
  (req, res) => {
    res.json({ message: 'Crypto deposit endpoint - to be implemented' });
  }
);

// ============================================
// Withdrawal Routes
// ============================================

/**
 * @route   POST /api/payments/withdraw
 * @desc    Withdraw funds
 * @access  Private
 */
router.post(
  '/withdraw',
  authenticate,
  sensitiveRateLimiter,
  withdrawalValidation,
  validate,
  (req, res) => {
    res.json({ message: 'Withdraw endpoint - to be implemented' });
  }
);

// ============================================
// Transaction Routes
// ============================================

/**
 * @route   GET /api/payments/transactions
 * @desc    Get user's transaction history
 * @access  Private
 */
router.get(
  '/transactions',
  authenticate,
  paginationValidation,
  validate,
  (req, res) => {
    res.json({ message: 'Get transactions endpoint - to be implemented' });
  }
);

// ============================================
// Webhook Routes (Public - called by payment providers)
// ============================================

/**
 * @route   POST /api/payments/webhooks/wave
 * @desc    Wave payment webhook
 * @access  Public
 */
router.post(
  '/webhooks/wave',
  webhookRateLimiter,
  (req, res) => {
    res.json({ message: 'Wave webhook endpoint - to be implemented' });
  }
);

/**
 * @route   POST /api/payments/webhooks/orange
 * @desc    Orange Money payment webhook
 * @access  Public
 */
router.post(
  '/webhooks/orange',
  webhookRateLimiter,
  (req, res) => {
    res.json({ message: 'Orange Money webhook endpoint - to be implemented' });
  }
);

/**
 * @route   POST /api/payments/webhooks/stripe
 * @desc    Stripe payment webhook
 * @access  Public
 */
router.post(
  '/webhooks/stripe',
  webhookRateLimiter,
  (req, res) => {
    res.json({ message: 'Stripe webhook endpoint - to be implemented' });
  }
);

/**
 * @route   POST /api/payments/webhooks/crypto
 * @desc    Crypto payment webhook
 * @access  Public
 */
router.post(
  '/webhooks/crypto',
  webhookRateLimiter,
  (req, res) => {
    res.json({ message: 'Crypto webhook endpoint - to be implemented' });
  }
);

export default router;
