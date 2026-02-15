/**
 * Payment Controller - Trading Platform
 * Handles all payment-related HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, body, query, param } from 'express-validator';
import {
  WaveDepositRequest,
  OrangeMoneyDepositRequest,
  CardDepositRequest,
  CryptoDepositRequest,
  WithdrawalRequest,
  FiatCurrency,
  CryptoCurrency,
  PaymentMethod,
  WithdrawalMethod,
  TransactionType,
  TransactionStatus,
} from '../types/payment.types';
import { AppError, ValidationError, AuthenticationError } from '../utils/errors';
import logger from '../utils/logger';

// Import services
import * as waveService from '../services/waveService';
import * as orangeMoneyService from '../services/orangeMoneyService';
import * as stripeService from '../services/stripeService';
import * as cryptoService from '../services/cryptoService';
import * as walletService from '../services/walletService';

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

export const validateWaveDeposit = [
  body('amount')
    .isFloat({ min: 100 })
    .withMessage('Amount must be at least 100'),
  body('currency')
    .isIn([FiatCurrency.XOF, FiatCurrency.USD])
    .withMessage('Currency must be XOF or USD'),
  body('phone')
    .matches(/^\+?[0-9]{8,15}$/)
    .withMessage('Invalid phone number format'),
];

export const validateOrangeMoneyDeposit = [
  body('amount')
    .isFloat({ min: 100 })
    .withMessage('Amount must be at least 100'),
  body('currency')
    .isIn([FiatCurrency.XOF, FiatCurrency.USD])
    .withMessage('Currency must be XOF or USD'),
  body('phone')
    .matches(/^\+?[0-9]{8,15}$/)
    .withMessage('Invalid phone number format'),
];

export const validateCardDeposit = [
  body('amount')
    .isFloat({ min: 1, max: 10000 })
    .withMessage('Amount must be between $1 and $10,000'),
  body('currency')
    .optional()
    .isIn([FiatCurrency.USD])
    .withMessage('Only USD is supported for card payments'),
];

export const validateCryptoDeposit = [
  body('amount')
    .isFloat({ min: 0.0001 })
    .withMessage('Amount must be at least 0.0001'),
  body('currency')
    .isIn(Object.values(CryptoCurrency))
    .withMessage(`Currency must be one of: ${Object.values(CryptoCurrency).join(', ')}`),
];

export const validateWithdrawal = [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least 1'),
  body('currency')
    .isString()
    .withMessage('Currency is required'),
  body('method')
    .isIn(Object.values(WithdrawalMethod))
    .withMessage(`Method must be one of: ${Object.values(WithdrawalMethod).join(', ')}`),
  body('phone')
    .optional()
    .matches(/^\+?[0-9]{8,15}$/)
    .withMessage('Invalid phone number format'),
  body('bankAccount')
    .optional()
    .isObject()
    .withMessage('Bank account must be an object'),
  body('cryptoAddress')
    .optional()
    .isString()
    .withMessage('Crypto address must be a string'),
];

export const validateTransactionHistory = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  query('status')
    .optional()
    .isIn(Object.values(TransactionStatus))
    .withMessage('Invalid status'),
  query('type')
    .optional()
    .isIn(Object.values(TransactionType))
    .withMessage('Invalid transaction type'),
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
}

function getUserIdFromRequest(req: Request): string {
  // Assuming user is attached by auth middleware
  const userId = (req as any).user?.id;
  if (!userId) {
    throw new AuthenticationError('User not authenticated');
  }
  return userId;
}

// ============================================================================
// DEPOSIT CONTROLLERS
// ============================================================================

/**
 * Wave Mobile Money Deposit
 * POST /api/payments/deposit/wave
 */
export async function waveDeposit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserIdFromRequest(req);
    const { amount, currency, phone } = req.body;

    const request: WaveDepositRequest = {
      amount: parseFloat(amount),
      currency: currency as FiatCurrency,
      phone,
      userId,
    };

    const result = await waveService.initiateDeposit(request);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Wave deposit initiated successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Orange Money Deposit
 * POST /api/payments/deposit/orange
 */
export async function orangeMoneyDeposit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserIdFromRequest(req);
    const { amount, currency, phone } = req.body;

    const request: OrangeMoneyDepositRequest = {
      amount: parseFloat(amount),
      currency: currency as FiatCurrency,
      phone,
      userId,
    };

    const result = await orangeMoneyService.initiateDeposit(request);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Orange Money deposit initiated successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Card Deposit (Stripe)
 * POST /api/payments/deposit/card
 */
export async function cardDeposit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserIdFromRequest(req);
    const { amount, currency, successUrl, cancelUrl } = req.body;

    const request: CardDepositRequest = {
      amount: parseFloat(amount),
      currency: (currency as FiatCurrency) || FiatCurrency.USD,
      userId,
      successUrl,
      cancelUrl,
    };

    const result = await stripeService.createCheckoutSession(request);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Card deposit session created successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Crypto Deposit
 * POST /api/payments/deposit/crypto
 */
export async function cryptoDeposit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserIdFromRequest(req);
    const { amount, currency } = req.body;

    const request: CryptoDepositRequest = {
      amount: parseFloat(amount),
      currency: currency as CryptoCurrency,
      userId,
    };

    const result = await cryptoService.generateDepositAddress(request);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Crypto deposit address generated successfully',
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// WITHDRAWAL CONTROLLERS
// ============================================================================

/**
 * Withdrawal Request
 * POST /api/payments/withdraw
 */
export async function withdraw(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserIdFromRequest(req);
    const { amount, currency, method, phone, bankAccount, cryptoAddress, cryptoCurrency } = req.body;

    // Validate method-specific fields
    if (method === WithdrawalMethod.WAVE || method === WithdrawalMethod.ORANGE_MONEY) {
      if (!phone) {
        throw new ValidationError('Phone number is required for mobile money withdrawals');
      }
    }

    if (method === WithdrawalMethod.BANK_TRANSFER) {
      if (!bankAccount) {
        throw new ValidationError('Bank account details are required for bank transfers');
      }
    }

    if (method === WithdrawalMethod.CRYPTO) {
      if (!cryptoAddress || !cryptoCurrency) {
        throw new ValidationError('Crypto address and currency are required for crypto withdrawals');
      }
      // Validate crypto address
      if (!cryptoService.validateAddress(cryptoAddress, cryptoCurrency as CryptoCurrency)) {
        throw new ValidationError('Invalid cryptocurrency address');
      }
    }

    // Check balance
    const balance = await walletService.getBalance(userId);
    const isCrypto = Object.values(CryptoCurrency).includes(currency as CryptoCurrency);
    const currentBalance = isCrypto
      ? balance.crypto[currency as CryptoCurrency] || 0
      : balance.fiat[currency as FiatCurrency] || 0;

    if (currentBalance < amount) {
      throw new ValidationError(
        `Insufficient balance. Available: ${currentBalance} ${currency}, Requested: ${amount} ${currency}`
      );
    }

    // Calculate fees
    const feeCalculation = walletService.calculateWithdrawalFee(
      amount,
      method as PaymentMethod
    );

    // Create withdrawal record
    const reference = `WD_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Debit wallet first (hold funds)
    await walletService.debitWallet({
      userId,
      amount,
      currency: currency as FiatCurrency | CryptoCurrency,
      transactionType: TransactionType.WITHDRAWAL,
      referenceId: reference,
      metadata: {
        method,
        feeAmount: feeCalculation.feeAmount,
        netAmount: feeCalculation.netAmount,
        phone,
        bankAccount,
        cryptoAddress,
        cryptoCurrency,
        status: 'pending_processing',
      },
    });

    // Record pending withdrawal transaction
    const withdrawalTx = await walletService.recordTransaction(
      userId,
      TransactionType.WITHDRAWAL,
      method as PaymentMethod,
      -amount,
      currency as FiatCurrency | CryptoCurrency,
      TransactionStatus.PENDING,
      reference,
      {
        method,
        feeAmount: feeCalculation.feeAmount,
        netAmount: feeCalculation.netAmount,
        phone,
        bankAccount,
        cryptoAddress,
        cryptoCurrency,
      }
    );

    // TODO: Process withdrawal based on method
    // This would typically be handled by a background job or separate service
    // For now, we just record the pending withdrawal

    logger.info('Withdrawal request created', 'PaymentController', {
      userId,
      withdrawalId: withdrawalTx.id,
      amount,
      currency,
      method,
    });

    res.status(200).json({
      success: true,
      data: {
        withdrawalId: withdrawalTx.id,
        status: TransactionStatus.PENDING,
        amount,
        currency,
        method,
        fee: feeCalculation.feeAmount,
        netAmount: feeCalculation.netAmount,
        reference,
        estimatedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
      message: 'Withdrawal request submitted successfully',
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// TRANSACTION HISTORY CONTROLLERS
// ============================================================================

/**
 * Get Transaction History
 * GET /api/payments/transactions
 */
export async function getTransactionHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserIdFromRequest(req);
    const { limit, offset, status, type, startDate, endDate } = req.query;

    const result = await walletService.getTransactionHistory(userId, {
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
      status: status as TransactionStatus,
      transactionType: type as TransactionType,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.status(200).json({
      success: true,
      data: {
        transactions: result.transactions,
        pagination: {
          total: result.total,
          limit: limit ? parseInt(limit as string) : 20,
          offset: offset ? parseInt(offset as string) : 0,
          hasMore: result.total > (offset ? parseInt(offset as string) : 0) + (limit ? parseInt(limit as string) : 20),
        },
      },
      message: 'Transaction history retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// WALLET CONTROLLERS
// ============================================================================

/**
 * Get Wallet Balance
 * GET /api/payments/wallet/balance
 */
export async function getWalletBalance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserIdFromRequest(req);

    const balance = await walletService.getBalance(userId);

    res.status(200).json({
      success: true,
      data: balance,
      message: 'Wallet balance retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// VERIFICATION CONTROLLERS
// ============================================================================

/**
 * Verify Payment Status
 * GET /api/payments/verify/:transactionId
 */
export async function verifyPaymentStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { transactionId } = req.params;

    const transaction = await walletService.getTransactionById(transactionId);

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
      return;
    }

    // If pending, try to verify with payment provider
    if (transaction.status === TransactionStatus.PENDING) {
      switch (transaction.paymentMethod) {
        case PaymentMethod.WAVE:
          if (transaction.referenceId) {
            const waveStatus = await waveService.verifyPayment(transaction.referenceId);
            if (waveStatus.verified && waveStatus.status === TransactionStatus.COMPLETED) {
              // Update transaction and credit wallet
              await walletService.updateTransactionStatus(
                transactionId,
                TransactionStatus.COMPLETED
              );
              transaction.status = TransactionStatus.COMPLETED;
            }
          }
          break;

        case PaymentMethod.ORANGE_MONEY:
          if (transaction.referenceId) {
            const orangeStatus = await orangeMoneyService.verifyPayment(transaction.referenceId);
            if (orangeStatus.verified && orangeStatus.status === TransactionStatus.COMPLETED) {
              await walletService.updateTransactionStatus(
                transactionId,
                TransactionStatus.COMPLETED
              );
              transaction.status = TransactionStatus.COMPLETED;
            }
          }
          break;

        case PaymentMethod.CARD:
          // Stripe status is handled via webhooks
          break;

        case PaymentMethod.CRYPTO:
          // Crypto status is handled via monitoring
          break;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        transactionId: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentMethod: transaction.paymentMethod,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
      message: 'Payment status retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// FEE CALCULATION CONTROLLERS
// ============================================================================

/**
 * Calculate Deposit Fees
 * POST /api/payments/fees/deposit
 */
export async function calculateDepositFees(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { amount, method } = req.body;

    if (!amount || !method) {
      throw new ValidationError('Amount and method are required');
    }

    const feeCalculation = walletService.calculateDepositFee(
      parseFloat(amount),
      method as PaymentMethod
    );

    res.status(200).json({
      success: true,
      data: feeCalculation,
      message: 'Deposit fees calculated successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Calculate Withdrawal Fees
 * POST /api/payments/fees/withdrawal
 */
export async function calculateWithdrawalFees(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { amount, method } = req.body;

    if (!amount || !method) {
      throw new ValidationError('Amount and method are required');
    }

    const feeCalculation = walletService.calculateWithdrawalFee(
      parseFloat(amount),
      method as PaymentMethod
    );

    res.status(200).json({
      success: true,
      data: feeCalculation,
      message: 'Withdrawal fees calculated successfully',
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// CRYPTO-SPECIFIC CONTROLLERS
// ============================================================================

/**
 * Validate Crypto Address
 * POST /api/payments/crypto/validate-address
 */
export async function validateCryptoAddress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { address, currency } = req.body;

    if (!address || !currency) {
      throw new ValidationError('Address and currency are required');
    }

    const isValid = cryptoService.validateAddress(address, currency as CryptoCurrency);

    res.status(200).json({
      success: true,
      data: {
        valid: isValid,
        address,
        currency,
      },
      message: isValid ? 'Address is valid' : 'Address is invalid',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Crypto Network Fees
 * GET /api/payments/crypto/network-fees
 */
export async function getCryptoNetworkFees(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { currency } = req.query;

    if (!currency) {
      throw new ValidationError('Currency is required');
    }

    const fees = await cryptoService.getNetworkFees(currency as CryptoCurrency);

    res.status(200).json({
      success: true,
      data: fees,
      message: 'Network fees retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// STRIPE-SPECIFIC CONTROLLERS
// ============================================================================

/**
 * Get Stripe Publishable Key
 * GET /api/payments/stripe/config
 */
export async function getStripeConfig(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const publishableKey = stripeService.getPublishableKey();

    res.status(200).json({
      success: true,
      data: {
        publishableKey,
        mode: process.env.NODE_ENV === 'production' ? 'live' : 'test',
      },
      message: 'Stripe configuration retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
}

export default {
  // Validations
  validateWaveDeposit,
  validateOrangeMoneyDeposit,
  validateCardDeposit,
  validateCryptoDeposit,
  validateWithdrawal,
  validateTransactionHistory,

  // Controllers
  waveDeposit,
  orangeMoneyDeposit,
  cardDeposit,
  cryptoDeposit,
  withdraw,
  getTransactionHistory,
  getWalletBalance,
  verifyPaymentStatus,
  calculateDepositFees,
  calculateWithdrawalFees,
  validateCryptoAddress,
  getCryptoNetworkFees,
  getStripeConfig,
};
