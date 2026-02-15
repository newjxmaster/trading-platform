/**
 * Wave Mobile Money Service - Trading Platform
 * Integration with Wave API for mobile money deposits
 */

import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import {
  WaveDepositRequest,
  WaveDepositResponse,
  WaveWebhookPayload,
  TransactionStatus,
  FiatCurrency,
  PaymentMethod,
  TransactionType,
} from '../types/payment.types';
import { PaymentError, InvalidSignatureError, PaymentProcessingError } from '../utils/errors';
import logger from '../utils/logger';
import * as walletService from './walletService';

// Wave API Configuration
const WAVE_API_BASE_URL = process.env.WAVE_API_URL || 'https://api.wave.com/v1';
const WAVE_API_KEY = process.env.WAVE_API_KEY || '';
const WAVE_SECRET = process.env.WAVE_SECRET || '';
const WAVE_WEBHOOK_SECRET = process.env.WAVE_WEBHOOK_SECRET || '';

// Axios instance for Wave API
let waveClient: AxiosInstance | null = null;

/**
 * Initialize Wave API client
 */
export function initializeWaveClient(): AxiosInstance {
  if (!waveClient) {
    waveClient = axios.create({
      baseURL: WAVE_API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${WAVE_API_KEY}`,
        'Content-Type': 'application/json',
        'X-API-Version': 'v1',
      },
      timeout: 30000,
    });

    // Add response interceptor for error handling
    waveClient.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('Wave API error', error, 'WaveService', {
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  return waveClient;
}

/**
 * Generate a unique reference for Wave transactions
 */
function generateReference(): string {
  return `WAVE_${Date.now()}_${uuidv4().slice(0, 8)}`;
}

/**
 * Format phone number for Wave (West Africa format)
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');

  // Ensure it starts with country code
  if (cleaned.startsWith('0')) {
    cleaned = '225' + cleaned.slice(1); // Default to Ivory Coast (225)
  }

  // Add + prefix if not present
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

/**
 * Validate phone number format
 */
function validatePhoneNumber(phone: string): boolean {
  // Basic validation for West African phone numbers
  const phoneRegex = /^\+225[0-9]{8}$/; // Ivory Coast format
  return phoneRegex.test(phone);
}

/**
 * Initiate a Wave deposit
 */
export async function initiateDeposit(
  request: WaveDepositRequest
): Promise<WaveDepositResponse> {
  const { amount, currency, phone, userId } = request;

  // Validate inputs
  if (!amount || amount <= 0) {
    throw new PaymentError('Invalid amount', PaymentMethod.WAVE);
  }

  if (!phone) {
    throw new PaymentError('Phone number is required', PaymentMethod.WAVE);
  }

  const formattedPhone = formatPhoneNumber(phone);

  if (!validatePhoneNumber(formattedPhone)) {
    throw new PaymentError('Invalid phone number format', PaymentMethod.WAVE);
  }

  try {
    const client = initializeWaveClient();
    const reference = generateReference();

    // Record pending transaction first
    const pendingTx = await walletService.recordTransaction(
      userId,
      TransactionType.DEPOSIT,
      PaymentMethod.WAVE,
      amount,
      currency,
      TransactionStatus.PENDING,
      reference,
      {
        phone: formattedPhone,
        originalAmount: amount,
      }
    );

    // Call Wave API to initiate payment
    const payload = {
      amount: Math.round(amount), // Wave expects integer amounts
      currency: currency === FiatCurrency.XOF ? 'XOF' : 'USD',
      phone_number: formattedPhone,
      reference,
      callback_url: `${process.env.API_URL}/api/payments/webhooks/wave`,
      description: `Wallet deposit for user ${userId}`,
      metadata: {
        userId,
        transactionId: pendingTx.id,
      },
    };

    // In sandbox mode, simulate the API call
    if (process.env.NODE_ENV === 'development' || !WAVE_API_KEY) {
      logger.info('Wave sandbox mode - simulating payment request', 'WaveService', {
        reference,
        amount,
        phone: formattedPhone,
      });

      // Simulate successful response
      return {
        transactionId: pendingTx.id,
        reference,
        status: TransactionStatus.PENDING,
        amount,
        currency,
        phone: formattedPhone,
        paymentUrl: `https://pay.wave.com/${reference}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      };
    }

    // Real API call
    const response = await client.post('/payments', payload);

    logger.logPayment('Wave', 'initiated', pendingTx.id, {
      amount,
      currency,
      phone: formattedPhone,
      waveRef: response.data.id,
    });

    return {
      transactionId: pendingTx.id,
      reference,
      status: TransactionStatus.PENDING,
      amount,
      currency,
      phone: formattedPhone,
      paymentUrl: response.data.payment_url,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  } catch (error) {
    logger.error('Wave deposit initiation failed', error as Error, 'WaveService', {
      userId,
      amount,
      phone: formattedPhone,
    });

    throw new PaymentProcessingError(
      `Failed to initiate Wave payment: ${(error as Error).message}`
    );
  }
}

/**
 * Verify a Wave payment status
 */
export async function verifyPayment(
  reference: string
): Promise<{
  status: TransactionStatus;
  amount: number;
  currency: string;
  verified: boolean;
}> {
  try {
    const client = initializeWaveClient();

    // In sandbox mode, simulate verification
    if (process.env.NODE_ENV === 'development' || !WAVE_API_KEY) {
      // For testing, randomly return completed or pending
      const isCompleted = Math.random() > 0.5;

      return {
        status: isCompleted ? TransactionStatus.COMPLETED : TransactionStatus.PENDING,
        amount: 0,
        currency: 'XOF',
        verified: isCompleted,
      };
    }

    const response = await client.get(`/payments/${reference}`);
    const paymentData = response.data;

    const status = mapWaveStatus(paymentData.status);

    return {
      status,
      amount: paymentData.amount,
      currency: paymentData.currency,
      verified: status === TransactionStatus.COMPLETED,
    };
  } catch (error) {
    logger.error('Wave payment verification failed', error as Error, 'WaveService', {
      reference,
    });

    return {
      status: TransactionStatus.FAILED,
      amount: 0,
      currency: 'XOF',
      verified: false,
    };
  }
}

/**
 * Map Wave status to our transaction status
 */
function mapWaveStatus(waveStatus: string): TransactionStatus {
  const statusMap: Record<string, TransactionStatus> = {
    'pending': TransactionStatus.PENDING,
    'processing': TransactionStatus.PROCESSING,
    'completed': TransactionStatus.COMPLETED,
    'success': TransactionStatus.COMPLETED,
    'failed': TransactionStatus.FAILED,
    'cancelled': TransactionStatus.CANCELLED,
    'expired': TransactionStatus.CANCELLED,
  };

  return statusMap[waveStatus.toLowerCase()] || TransactionStatus.PENDING;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!WAVE_WEBHOOK_SECRET) {
    logger.warn('Wave webhook secret not configured', 'WaveService');
    return true; // Allow in development
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', WAVE_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('Webhook signature verification failed', error as Error, 'WaveService');
    return false;
  }
}

/**
 * Handle Wave webhook
 */
export async function handleWebhook(
  payload: WaveWebhookPayload,
  signature: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Verify signature
    const payloadString = JSON.stringify(payload);
    if (!verifyWebhookSignature(payloadString, signature)) {
      throw new InvalidSignatureError();
    }

    logger.logWebhook('Wave', payload.status, payload);

    const { transaction_id, reference, status, amount, currency } = payload;

    // Find our transaction by reference
    const transaction = await walletService.getTransactionByReference(reference);

    if (!transaction) {
      logger.warn('Transaction not found for Wave webhook', 'WaveService', {
        reference,
        waveTransactionId: transaction_id,
      });
      return { success: false, message: 'Transaction not found' };
    }

    // Idempotency: Check if already processed
    if (transaction.status === TransactionStatus.COMPLETED) {
      logger.info('Transaction already completed, skipping', 'WaveService', {
        transactionId: transaction.id,
      });
      return { success: true, message: 'Already processed' };
    }

    const mappedStatus = mapWaveStatus(status);

    // Update transaction status
    await walletService.updateTransactionStatus(
      transaction.id,
      mappedStatus,
      {
        waveTransactionId: transaction_id,
        webhookReceivedAt: new Date().toISOString(),
      }
    );

    // If completed, credit the wallet
    if (mappedStatus === TransactionStatus.COMPLETED) {
      const feeCalculation = walletService.calculateDepositFee(
        amount,
        PaymentMethod.WAVE
      );

      await walletService.creditWallet({
        userId: transaction.userId,
        amount: feeCalculation.netAmount,
        currency: currency as FiatCurrency,
        transactionType: TransactionType.DEPOSIT,
        referenceId: `${reference}_credit`,
        metadata: {
          originalAmount: amount,
          feeAmount: feeCalculation.feeAmount,
          feePercentage: feeCalculation.feePercentage,
          paymentMethod: PaymentMethod.WAVE,
          waveTransactionId: transaction_id,
        },
      });

      logger.logPayment('Wave', 'completed', transaction.id, {
        amount,
        netAmount: feeCalculation.netAmount,
        fee: feeCalculation.feeAmount,
      });
    }

    return { success: true, message: 'Webhook processed successfully' };
  } catch (error) {
    logger.error('Wave webhook processing failed', error as Error, 'WaveService', {
      payload,
    });

    throw error;
  }
}

/**
 * Process a refund for Wave payment
 */
export async function processRefund(
  reference: string,
  amount?: number
): Promise<{ success: boolean; refundReference: string }> {
  try {
    const client = initializeWaveClient();

    const refundReference = `REFUND_${generateReference()}`;

    if (process.env.NODE_ENV === 'development' || !WAVE_API_KEY) {
      logger.info('Wave sandbox mode - simulating refund', 'WaveService', {
        reference,
        amount,
      });

      return { success: true, refundReference };
    }

    await client.post(`/payments/${reference}/refund`, {
      amount,
      reference: refundReference,
      reason: 'Customer request',
    });

    return { success: true, refundReference };
  } catch (error) {
    logger.error('Wave refund failed', error as Error, 'WaveService', {
      reference,
    });

    throw new PaymentProcessingError(`Refund failed: ${(error as Error).message}`);
  }
}

/**
 * Get Wave transaction details
 */
export async function getTransactionDetails(
  reference: string
): Promise<Record<string, any> | null> {
  try {
    const client = initializeWaveClient();

    if (process.env.NODE_ENV === 'development' || !WAVE_API_KEY) {
      return {
        reference,
        status: 'completed',
        amount: 1000,
        currency: 'XOF',
        phone: '+22501234567',
        created_at: new Date().toISOString(),
      };
    }

    const response = await client.get(`/payments/${reference}`);
    return response.data;
  } catch (error) {
    logger.error('Failed to get Wave transaction details', error as Error, 'WaveService', {
      reference,
    });
    return null;
  }
}

export default {
  initiateDeposit,
  verifyPayment,
  handleWebhook,
  verifyWebhookSignature,
  processRefund,
  getTransactionDetails,
  initializeWaveClient,
};
