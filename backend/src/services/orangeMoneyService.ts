/**
 * Orange Money Service - Trading Platform
 * Integration with Orange Money API for mobile money deposits
 */

import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import {
  OrangeMoneyDepositRequest,
  OrangeMoneyDepositResponse,
  OrangeMoneyWebhookPayload,
  TransactionStatus,
  FiatCurrency,
  PaymentMethod,
  TransactionType,
} from '../types/payment.types';
import { PaymentError, InvalidSignatureError, PaymentProcessingError } from '../utils/errors';
import logger from '../utils/logger';
import * as walletService from './walletService';

// Orange Money API Configuration
const ORANGE_MONEY_API_BASE_URL = process.env.ORANGE_MONEY_API_URL || 'https://api.orange.com/orange-money-webdev/dev/v1';
const ORANGE_MONEY_API_KEY = process.env.ORANGE_API_KEY || '';
const ORANGE_MONEY_SECRET = process.env.ORANGE_SECRET || '';
const ORANGE_MONEY_MERCHANT_ID = process.env.ORANGE_MERCHANT_ID || '';
const ORANGE_MONEY_WEBHOOK_SECRET = process.env.ORANGE_WEBHOOK_SECRET || '';

// Axios instance for Orange Money API
let orangeMoneyClient: AxiosInstance | null = null;

/**
 * Initialize Orange Money API client
 */
export function initializeOrangeMoneyClient(): AxiosInstance {
  if (!orangeMoneyClient) {
    orangeMoneyClient = axios.create({
      baseURL: ORANGE_MONEY_API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${ORANGE_MONEY_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Merchant-ID': ORANGE_MONEY_MERCHANT_ID,
      },
      timeout: 30000,
    });

    // Add response interceptor for error handling
    orangeMoneyClient.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('Orange Money API error', error, 'OrangeMoneyService', {
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  return orangeMoneyClient;
}

/**
 * Generate a unique reference for Orange Money transactions
 */
function generateReference(): string {
  return `OM_${Date.now()}_${uuidv4().slice(0, 8)}`;
}

/**
 * Format phone number for Orange Money (West Africa format)
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
 * Get Orange Money access token
 */
async function getAccessToken(): Promise<string> {
  try {
    const client = initializeOrangeMoneyClient();

    const response = await client.post('/oauth/token', {
      grant_type: 'client_credentials',
      client_id: ORANGE_MONEY_API_KEY,
      client_secret: ORANGE_MONEY_SECRET,
    });

    return response.data.access_token;
  } catch (error) {
    logger.error('Failed to get Orange Money access token', error as Error, 'OrangeMoneyService');
    throw new PaymentProcessingError('Failed to authenticate with Orange Money');
  }
}

/**
 * Initiate an Orange Money deposit
 */
export async function initiateDeposit(
  request: OrangeMoneyDepositRequest
): Promise<OrangeMoneyDepositResponse> {
  const { amount, currency, phone, userId } = request;

  // Validate inputs
  if (!amount || amount <= 0) {
    throw new PaymentError('Invalid amount', PaymentMethod.ORANGE_MONEY);
  }

  if (!phone) {
    throw new PaymentError('Phone number is required', PaymentMethod.ORANGE_MONEY);
  }

  const formattedPhone = formatPhoneNumber(phone);

  if (!validatePhoneNumber(formattedPhone)) {
    throw new PaymentError('Invalid phone number format', PaymentMethod.ORANGE_MONEY);
  }

  try {
    const client = initializeOrangeMoneyClient();
    const reference = generateReference();

    // Record pending transaction first
    const pendingTx = await walletService.recordTransaction(
      userId,
      TransactionType.DEPOSIT,
      PaymentMethod.ORANGE_MONEY,
      amount,
      currency,
      TransactionStatus.PENDING,
      reference,
      {
        phone: formattedPhone,
        originalAmount: amount,
      }
    );

    // In sandbox mode, simulate the API call
    if (process.env.NODE_ENV === 'development' || !ORANGE_MONEY_API_KEY) {
      logger.info('Orange Money sandbox mode - simulating payment request', 'OrangeMoneyService', {
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
        paymentUrl: `https://pay.orange.com/${reference}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      };
    }

    // Get access token for API call
    const accessToken = await getAccessToken();

    // Call Orange Money API to initiate payment
    const payload = {
      merchant_id: ORANGE_MONEY_MERCHANT_ID,
      amount: {
        value: amount.toFixed(2),
        unit: currency === FiatCurrency.XOF ? 'XOF' : 'USD',
      },
      subscriber: {
        country: 'CIV', // Ivory Coast
        msisdn: formattedPhone.replace('+', ''),
      },
      reference,
      callback_url: `${process.env.API_URL}/api/payments/webhooks/orange`,
      description: `Wallet deposit for user ${userId}`,
      metadata: {
        userId,
        transactionId: pendingTx.id,
      },
    };

    const response = await client.post('/payment', payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    logger.logPayment('OrangeMoney', 'initiated', pendingTx.id, {
      amount,
      currency,
      phone: formattedPhone,
      orangeRef: response.data.payment_id,
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
    logger.error('Orange Money deposit initiation failed', error as Error, 'OrangeMoneyService', {
      userId,
      amount,
      phone: formattedPhone,
    });

    throw new PaymentProcessingError(
      `Failed to initiate Orange Money payment: ${(error as Error).message}`
    );
  }
}

/**
 * Verify an Orange Money payment status
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
    // In sandbox mode, simulate verification
    if (process.env.NODE_ENV === 'development' || !ORANGE_MONEY_API_KEY) {
      const isCompleted = Math.random() > 0.5;

      return {
        status: isCompleted ? TransactionStatus.COMPLETED : TransactionStatus.PENDING,
        amount: 0,
        currency: 'XOF',
        verified: isCompleted,
      };
    }

    const client = initializeOrangeMoneyClient();
    const accessToken = await getAccessToken();

    const response = await client.get(`/payment/${reference}/status`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const paymentData = response.data;
    const status = mapOrangeMoneyStatus(paymentData.status);

    return {
      status,
      amount: parseFloat(paymentData.amount?.value || '0'),
      currency: paymentData.amount?.unit || 'XOF',
      verified: status === TransactionStatus.COMPLETED,
    };
  } catch (error) {
    logger.error('Orange Money payment verification failed', error as Error, 'OrangeMoneyService', {
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
 * Map Orange Money status to our transaction status
 */
function mapOrangeMoneyStatus(orangeStatus: string): TransactionStatus {
  const statusMap: Record<string, TransactionStatus> = {
    'PENDING': TransactionStatus.PENDING,
    'INITIATED': TransactionStatus.PENDING,
    'IN_PROGRESS': TransactionStatus.PROCESSING,
    'SUCCESS': TransactionStatus.COMPLETED,
    'SUCCESSFUL': TransactionStatus.COMPLETED,
    'COMPLETED': TransactionStatus.COMPLETED,
    'FAILED': TransactionStatus.FAILED,
    'CANCELLED': TransactionStatus.CANCELLED,
    'EXPIRED': TransactionStatus.CANCELLED,
    'REJECTED': TransactionStatus.FAILED,
  };

  return statusMap[orangeStatus.toUpperCase()] || TransactionStatus.PENDING;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!ORANGE_MONEY_WEBHOOK_SECRET) {
    logger.warn('Orange Money webhook secret not configured', 'OrangeMoneyService');
    return true; // Allow in development
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', ORANGE_MONEY_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('Webhook signature verification failed', error as Error, 'OrangeMoneyService');
    return false;
  }
}

/**
 * Handle Orange Money webhook
 */
export async function handleWebhook(
  payload: OrangeMoneyWebhookPayload,
  signature: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Verify signature
    const payloadString = JSON.stringify(payload);
    if (!verifyWebhookSignature(payloadString, signature)) {
      throw new InvalidSignatureError();
    }

    logger.logWebhook('OrangeMoney', payload.status, payload);

    const { transaction_id, reference, status, amount, currency } = payload;

    // Find our transaction by reference
    const transaction = await walletService.getTransactionByReference(reference);

    if (!transaction) {
      logger.warn('Transaction not found for Orange Money webhook', 'OrangeMoneyService', {
        reference,
        orangeTransactionId: transaction_id,
      });
      return { success: false, message: 'Transaction not found' };
    }

    // Idempotency: Check if already processed
    if (transaction.status === TransactionStatus.COMPLETED) {
      logger.info('Transaction already completed, skipping', 'OrangeMoneyService', {
        transactionId: transaction.id,
      });
      return { success: true, message: 'Already processed' };
    }

    const mappedStatus = mapOrangeMoneyStatus(status);

    // Update transaction status
    await walletService.updateTransactionStatus(
      transaction.id,
      mappedStatus,
      {
        orangeTransactionId: transaction_id,
        webhookReceivedAt: new Date().toISOString(),
      }
    );

    // If completed, credit the wallet
    if (mappedStatus === TransactionStatus.COMPLETED) {
      const feeCalculation = walletService.calculateDepositFee(
        amount,
        PaymentMethod.ORANGE_MONEY
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
          paymentMethod: PaymentMethod.ORANGE_MONEY,
          orangeTransactionId: transaction_id,
        },
      });

      logger.logPayment('OrangeMoney', 'completed', transaction.id, {
        amount,
        netAmount: feeCalculation.netAmount,
        fee: feeCalculation.feeAmount,
      });
    }

    return { success: true, message: 'Webhook processed successfully' };
  } catch (error) {
    logger.error('Orange Money webhook processing failed', error as Error, 'OrangeMoneyService', {
      payload,
    });

    throw error;
  }
}

/**
 * Process a refund for Orange Money payment
 */
export async function processRefund(
  reference: string,
  amount?: number
): Promise<{ success: boolean; refundReference: string }> {
  try {
    const refundReference = `REFUND_${generateReference()}`;

    if (process.env.NODE_ENV === 'development' || !ORANGE_MONEY_API_KEY) {
      logger.info('Orange Money sandbox mode - simulating refund', 'OrangeMoneyService', {
        reference,
        amount,
      });

      return { success: true, refundReference };
    }

    const client = initializeOrangeMoneyClient();
    const accessToken = await getAccessToken();

    await client.post(`/payment/${reference}/refund`, {
      amount: amount ? { value: amount.toFixed(2) } : undefined,
      reference: refundReference,
      reason: 'Customer request',
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return { success: true, refundReference };
  } catch (error) {
    logger.error('Orange Money refund failed', error as Error, 'OrangeMoneyService', {
      reference,
    });

    throw new PaymentProcessingError(`Refund failed: ${(error as Error).message}`);
  }
}

/**
 * Get Orange Money transaction details
 */
export async function getTransactionDetails(
  reference: string
): Promise<Record<string, any> | null> {
  try {
    if (process.env.NODE_ENV === 'development' || !ORANGE_MONEY_API_KEY) {
      return {
        reference,
        status: 'SUCCESS',
        amount: { value: '1000.00', unit: 'XOF' },
        subscriber: { msisdn: '22501234567' },
        created_at: new Date().toISOString(),
      };
    }

    const client = initializeOrangeMoneyClient();
    const accessToken = await getAccessToken();

    const response = await client.get(`/payment/${reference}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    logger.error('Failed to get Orange Money transaction details', error as Error, 'OrangeMoneyService', {
      reference,
    });
    return null;
  }
}

/**
 * Check Orange Money service availability
 */
export async function checkServiceAvailability(): Promise<boolean> {
  try {
    if (process.env.NODE_ENV === 'development' || !ORANGE_MONEY_API_KEY) {
      return true;
    }

    const client = initializeOrangeMoneyClient();
    const accessToken = await getAccessToken();

    await client.get('/health', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return true;
  } catch (error) {
    logger.error('Orange Money service unavailable', error as Error, 'OrangeMoneyService');
    return false;
  }
}

export default {
  initiateDeposit,
  verifyPayment,
  handleWebhook,
  verifyWebhookSignature,
  processRefund,
  getTransactionDetails,
  checkServiceAvailability,
  initializeOrangeMoneyClient,
};
