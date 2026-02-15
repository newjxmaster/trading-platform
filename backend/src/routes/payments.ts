/**
 * Payment Routes - Trading Platform
 * Main payment API routes
 */

import { Router } from 'express';
import * as paymentController from '../controllers/paymentController';

const router = Router();

// ============================================================================
// DEPOSIT ROUTES
// ============================================================================

/**
 * Wave Mobile Money Deposit
 * POST /api/payments/deposit/wave
 */
router.post(
  '/deposit/wave',
  paymentController.validateWaveDeposit,
  paymentController.waveDeposit
);

/**
 * Orange Money Deposit
 * POST /api/payments/deposit/orange
 */
router.post(
  '/deposit/orange',
  paymentController.validateOrangeMoneyDeposit,
  paymentController.orangeMoneyDeposit
);

/**
 * Card Deposit (Stripe)
 * POST /api/payments/deposit/card
 */
router.post(
  '/deposit/card',
  paymentController.validateCardDeposit,
  paymentController.cardDeposit
);

/**
 * Crypto Deposit
 * POST /api/payments/deposit/crypto
 */
router.post(
  '/deposit/crypto',
  paymentController.validateCryptoDeposit,
  paymentController.cryptoDeposit
);

// ============================================================================
// WITHDRAWAL ROUTES
// ============================================================================

/**
 * Withdrawal Request
 * POST /api/payments/withdraw
 */
router.post(
  '/withdraw',
  paymentController.validateWithdrawal,
  paymentController.withdraw
);

// ============================================================================
// TRANSACTION ROUTES
// ============================================================================

/**
 * Get Transaction History
 * GET /api/payments/transactions
 */
router.get(
  '/transactions',
  paymentController.validateTransactionHistory,
  paymentController.getTransactionHistory
);

/**
 * Verify Payment Status
 * GET /api/payments/verify/:transactionId
 */
router.get(
  '/verify/:transactionId',
  paymentController.verifyPaymentStatus
);

// ============================================================================
// WALLET ROUTES
// ============================================================================

/**
 * Get Wallet Balance
 * GET /api/payments/wallet/balance
 */
router.get(
  '/wallet/balance',
  paymentController.getWalletBalance
);

// ============================================================================
// FEE CALCULATION ROUTES
// ============================================================================

/**
 * Calculate Deposit Fees
 * POST /api/payments/fees/deposit
 */
router.post(
  '/fees/deposit',
  paymentController.calculateDepositFees
);

/**
 * Calculate Withdrawal Fees
 * POST /api/payments/fees/withdrawal
 */
router.post(
  '/fees/withdrawal',
  paymentController.calculateWithdrawalFees
);

// ============================================================================
// CRYPTO-SPECIFIC ROUTES
// ============================================================================

/**
 * Validate Crypto Address
 * POST /api/payments/crypto/validate-address
 */
router.post(
  '/crypto/validate-address',
  paymentController.validateCryptoAddress
);

/**
 * Get Crypto Network Fees
 * GET /api/payments/crypto/network-fees
 */
router.get(
  '/crypto/network-fees',
  paymentController.getCryptoNetworkFees
);

// ============================================================================
// STRIPE-SPECIFIC ROUTES
// ============================================================================

/**
 * Get Stripe Configuration
 * GET /api/payments/stripe/config
 */
router.get(
  '/stripe/config',
  paymentController.getStripeConfig
);

export default router;
