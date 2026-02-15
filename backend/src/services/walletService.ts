/**
 * Wallet Service - Trading Platform
 * Manages user wallets, balances, and transaction recording
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import {
  WalletBalance,
  Transaction,
  WalletCreditRequest,
  WalletDebitRequest,
  TransactionType,
  PaymentMethod,
  TransactionStatus,
  FiatCurrency,
  CryptoCurrency,
  FeeCalculation,
  DEPOSIT_FEES,
  WITHDRAWAL_FEES,
} from '../types/payment.types';
import {
  WalletError,
  InsufficientFundsError,
  TransactionError,
  NotFoundError,
  ConflictError,
} from '../utils/errors';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// In-memory cache for processed transaction references (idempotency)
const processedTransactions = new Set<string>();

/**
 * Calculate fees for a deposit
 */
export function calculateDepositFee(
  amount: number,
  paymentMethod: PaymentMethod
): FeeCalculation {
  const feeConfig = DEPOSIT_FEES[paymentMethod];
  const feeAmount = amount * feeConfig.percentage + feeConfig.fixed;
  const netAmount = amount - feeAmount;

  return {
    amount,
    feeAmount,
    feePercentage: feeConfig.percentage,
    fixedFee: feeConfig.fixed,
    netAmount,
  };
}

/**
 * Calculate fees for a withdrawal
 */
export function calculateWithdrawalFee(
  amount: number,
  paymentMethod: PaymentMethod
): FeeCalculation {
  const feeConfig = WITHDRAWAL_FEES[paymentMethod];
  let feeAmount = amount * feeConfig.percentage + feeConfig.fixed;

  // Apply minimum fee if applicable
  if (feeConfig.min && feeAmount < feeConfig.min) {
    feeAmount = feeConfig.min;
  }

  const netAmount = amount - feeAmount;

  return {
    amount,
    feeAmount,
    feePercentage: feeConfig.percentage,
    fixedFee: feeConfig.fixed,
    netAmount,
  };
}

/**
 * Get wallet balance for a user
 */
export async function getBalance(userId: string): Promise<WalletBalance> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        walletFiat: true,
        walletCryptoUsdt: true,
        walletCryptoUsdc: true,
        walletCryptoBtc: true,
        walletCryptoEth: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      userId,
      fiat: {
        USD: parseFloat(user.walletFiat?.toString() || '0'),
        XOF: 0, // XOF is converted to USD for storage
      },
      crypto: {
        USDT: parseFloat(user.walletCryptoUsdt?.toString() || '0'),
        USDC: parseFloat(user.walletCryptoUsdc?.toString() || '0'),
        BTC: parseFloat(user.walletCryptoBtc?.toString() || '0'),
        ETH: parseFloat(user.walletCryptoEth?.toString() || '0'),
      },
    };
  } catch (error) {
    logger.error('Error fetching wallet balance', error as Error, 'WalletService', { userId });
    throw error;
  }
}

/**
 * Credit wallet (add funds)
 */
export async function creditWallet(request: WalletCreditRequest): Promise<Transaction> {
  const { userId, amount, currency, transactionType, referenceId, metadata } = request;

  // Idempotency check
  if (processedTransactions.has(referenceId)) {
    logger.warn('Duplicate transaction attempt', 'WalletService', { referenceId });
    const existingTx = await prisma.transaction.findFirst({
      where: { referenceId },
    });
    if (existingTx) {
      return existingTx as Transaction;
    }
    throw new ConflictError('Transaction already processed');
  }

  try {
    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update wallet based on currency
      if (currency === FiatCurrency.USD) {
        await tx.user.update({
          where: { id: userId },
          data: {
            walletFiat: {
              increment: amount,
            },
          },
        });
      } else if (currency === CryptoCurrency.USDT) {
        await tx.user.update({
          where: { id: userId },
          data: {
            walletCryptoUsdt: {
              increment: amount,
            },
          },
        });
      } else if (currency === CryptoCurrency.USDC) {
        await tx.user.update({
          where: { id: userId },
          data: {
            walletCryptoUsdc: {
              increment: amount,
            },
          },
        });
      } else if (currency === CryptoCurrency.BTC) {
        await tx.user.update({
          where: { id: userId },
          data: {
            walletCryptoBtc: {
              increment: amount,
            },
          },
        });
      } else if (currency === CryptoCurrency.ETH) {
        await tx.user.update({
          where: { id: userId },
          data: {
            walletCryptoEth: {
              increment: amount,
            },
          },
        });
      }

      // Record transaction
      const transaction = await tx.transaction.create({
        data: {
          id: uuidv4(),
          userId,
          transactionType,
          paymentMethod: metadata?.paymentMethod || PaymentMethod.BANK_TRANSFER,
          amount,
          currency,
          status: TransactionStatus.COMPLETED,
          referenceId,
          metadata: metadata || {},
        },
      });

      return transaction;
    });

    // Mark as processed
    processedTransactions.add(referenceId);

    // Clean up old entries from set (keep last 10000)
    if (processedTransactions.size > 10000) {
      const entries = Array.from(processedTransactions);
      processedTransactions.clear();
      entries.slice(-5000).forEach((entry) => processedTransactions.add(entry));
    }

    logger.logWallet(userId, 'credit', amount, currency);

    return result as Transaction;
  } catch (error) {
    logger.error('Error crediting wallet', error as Error, 'WalletService', {
      userId,
      amount,
      currency,
    });
    throw new WalletError(`Failed to credit wallet: ${(error as Error).message}`);
  }
}

/**
 * Debit wallet (deduct funds)
 */
export async function debitWallet(request: WalletDebitRequest): Promise<Transaction> {
  const { userId, amount, currency, transactionType, referenceId, metadata } = request;

  // Idempotency check
  if (processedTransactions.has(referenceId)) {
    logger.warn('Duplicate transaction attempt', 'WalletService', { referenceId });
    const existingTx = await prisma.transaction.findFirst({
      where: { referenceId },
    });
    if (existingTx) {
      return existingTx as Transaction;
    }
    throw new ConflictError('Transaction already processed');
  }

  try {
    // Check balance first
    const balance = await getBalance(userId);
    let currentBalance = 0;

    if (currency === FiatCurrency.USD) {
      currentBalance = balance.fiat.USD;
    } else {
      currentBalance = balance.crypto[currency as CryptoCurrency] || 0;
    }

    if (currentBalance < amount) {
      throw new InsufficientFundsError(
        `Insufficient balance. Available: ${currentBalance} ${currency}, Required: ${amount} ${currency}`
      );
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update wallet based on currency
      if (currency === FiatCurrency.USD) {
        await tx.user.update({
          where: { id: userId },
          data: {
            walletFiat: {
              decrement: amount,
            },
          },
        });
      } else if (currency === CryptoCurrency.USDT) {
        await tx.user.update({
          where: { id: userId },
          data: {
            walletCryptoUsdt: {
              decrement: amount,
            },
          },
        });
      } else if (currency === CryptoCurrency.USDC) {
        await tx.user.update({
          where: { id: userId },
          data: {
            walletCryptoUsdc: {
              decrement: amount,
            },
          },
        });
      } else if (currency === CryptoCurrency.BTC) {
        await tx.user.update({
          where: { id: userId },
          data: {
            walletCryptoBtc: {
              decrement: amount,
            },
          },
        });
      } else if (currency === CryptoCurrency.ETH) {
        await tx.user.update({
          where: { id: userId },
          data: {
            walletCryptoEth: {
              decrement: amount,
            },
          },
        });
      }

      // Record transaction
      const transaction = await tx.transaction.create({
        data: {
          id: uuidv4(),
          userId,
          transactionType,
          paymentMethod: metadata?.paymentMethod || PaymentMethod.BANK_TRANSFER,
          amount: -amount, // Negative for debit
          currency,
          status: TransactionStatus.COMPLETED,
          referenceId,
          metadata: metadata || {},
        },
      });

      return transaction;
    });

    // Mark as processed
    processedTransactions.add(referenceId);

    logger.logWallet(userId, 'debit', amount, currency);

    return result as Transaction;
  } catch (error) {
    if (error instanceof InsufficientFundsError) {
      throw error;
    }
    logger.error('Error debiting wallet', error as Error, 'WalletService', {
      userId,
      amount,
      currency,
    });
    throw new WalletError(`Failed to debit wallet: ${(error as Error).message}`);
  }
}

/**
 * Record a transaction (for pending/completed/failed states)
 */
export async function recordTransaction(
  userId: string,
  transactionType: TransactionType,
  paymentMethod: PaymentMethod,
  amount: number,
  currency: FiatCurrency | CryptoCurrency,
  status: TransactionStatus,
  referenceId?: string,
  metadata?: Record<string, any>
): Promise<Transaction> {
  try {
    const transaction = await prisma.transaction.create({
      data: {
        id: uuidv4(),
        userId,
        transactionType,
        paymentMethod,
        amount,
        currency,
        status,
        referenceId: referenceId || uuidv4(),
        metadata: metadata || {},
      },
    });

    logger.logTransaction(transaction.id, status, {
      userId,
      amount,
      currency,
      paymentMethod,
    });

    return transaction as Transaction;
  } catch (error) {
    logger.error('Error recording transaction', error as Error, 'WalletService', {
      userId,
      amount,
      currency,
    });
    throw new TransactionError(`Failed to record transaction: ${(error as Error).message}`);
  }
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
  metadata?: Record<string, any>
): Promise<Transaction> {
  try {
    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status,
        metadata: metadata ? { ...metadata } : undefined,
        updatedAt: new Date(),
      },
    });

    logger.logTransaction(transactionId, status);

    return transaction as Transaction;
  } catch (error) {
    logger.error('Error updating transaction status', error as Error, 'WalletService', {
      transactionId,
      status,
    });
    throw new TransactionError(`Failed to update transaction: ${(error as Error).message}`);
  }
}

/**
 * Get transaction by ID
 */
export async function getTransactionById(transactionId: string): Promise<Transaction | null> {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    return transaction as Transaction | null;
  } catch (error) {
    logger.error('Error fetching transaction', error as Error, 'WalletService', {
      transactionId,
    });
    throw new TransactionError(`Failed to fetch transaction: ${(error as Error).message}`);
  }
}

/**
 * Get transaction by reference ID
 */
export async function getTransactionByReference(referenceId: string): Promise<Transaction | null> {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { referenceId },
    });

    return transaction as Transaction | null;
  } catch (error) {
    logger.error('Error fetching transaction by reference', error as Error, 'WalletService', {
      referenceId,
    });
    throw new TransactionError(`Failed to fetch transaction: ${(error as Error).message}`);
  }
}

/**
 * Get transaction history for a user
 */
export async function getTransactionHistory(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    transactionType?: TransactionType;
    status?: TransactionStatus;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{ transactions: Transaction[]; total: number }> {
  const { limit = 20, offset = 0, transactionType, status, startDate, endDate } = options;

  try {
    const where: any = { userId };

    if (transactionType) {
      where.transactionType = transactionType;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions: transactions as Transaction[],
      total,
    };
  } catch (error) {
    logger.error('Error fetching transaction history', error as Error, 'WalletService', {
      userId,
    });
    throw new TransactionError(`Failed to fetch history: ${(error as Error).message}`);
  }
}

/**
 * Hold funds (for pending trades)
 */
export async function holdFunds(
  userId: string,
  amount: number,
  currency: FiatCurrency = FiatCurrency.USD,
  referenceId: string
): Promise<void> {
  // This would require a separate 'holds' table in the database
  // For now, we'll just verify the balance exists
  const balance = await getBalance(userId);

  if (balance.fiat.USD < amount) {
    throw new InsufficientFundsError('Insufficient funds for trade');
  }

  logger.info(`Funds held for user ${userId}`, 'WalletService', {
    userId,
    amount,
    currency,
    referenceId,
  });
}

/**
 * Release held funds
 */
export async function releaseHeldFunds(
  userId: string,
  referenceId: string
): Promise<void> {
  logger.info(`Funds released for user ${userId}`, 'WalletService', {
    userId,
    referenceId,
  });
}

export default {
  getBalance,
  creditWallet,
  debitWallet,
  recordTransaction,
  updateTransactionStatus,
  getTransactionById,
  getTransactionByReference,
  getTransactionHistory,
  calculateDepositFee,
  calculateWithdrawalFee,
  holdFunds,
  releaseHeldFunds,
};
