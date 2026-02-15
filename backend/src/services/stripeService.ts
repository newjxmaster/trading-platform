/**
 * Stripe Service - Trading Platform
 * Integration with Stripe for credit/debit card payments
 */

import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import {
  CardDepositRequest,
  CardDepositResponse,
  StripeWebhookPayload,
  TransactionStatus,
  FiatCurrency,
  PaymentMethod,
  TransactionType,
} from '../types/payment.types';
import { PaymentError, InvalidSignatureError, PaymentProcessingError } from '../utils/errors';
import logger from '../utils/logger';
import * as walletService from './walletService';

// Stripe Configuration
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';

// Initialize Stripe client
let stripeClient: Stripe | null = null;

/**
 * Initialize Stripe client
 */
export function initializeStripeClient(): Stripe {
  if (!stripeClient) {
    if (!STRIPE_SECRET_KEY) {
      logger.warn('Stripe secret key not configured', 'StripeService');
    }

    stripeClient = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });
  }

  return stripeClient;
}

/**
 * Generate a unique reference for Stripe transactions
 */
function generateReference(): string {
  return `STRIPE_${Date.now()}_${uuidv4().slice(0, 8)}`;
}

/**
 * Create a Stripe checkout session for deposit
 */
export async function createCheckoutSession(
  request: CardDepositRequest
): Promise<CardDepositResponse> {
  const { amount, currency, userId, successUrl, cancelUrl } = request;

  // Validate inputs
  if (!amount || amount <= 0) {
    throw new PaymentError('Invalid amount', PaymentMethod.CARD);
  }

  if (amount < 1) {
    throw new PaymentError('Minimum deposit amount is $1.00', PaymentMethod.CARD);
  }

  if (amount > 10000) {
    throw new PaymentError('Maximum deposit amount is $10,000', PaymentMethod.CARD);
  }

  try {
    const stripe = initializeStripeClient();
    const reference = generateReference();

    // Record pending transaction first
    const pendingTx = await walletService.recordTransaction(
      userId,
      TransactionType.DEPOSIT,
      PaymentMethod.CARD,
      amount,
      currency,
      TransactionStatus.PENDING,
      reference,
      {
        originalAmount: amount,
        stripeMode: process.env.NODE_ENV === 'production' ? 'live' : 'test',
      }
    );

    // Calculate fees
    const feeCalculation = walletService.calculateDepositFee(amount, PaymentMethod.CARD);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: 'Trading Platform Wallet Deposit',
              description: `Deposit to your trading wallet. Fee: $${feeCalculation.feeAmount.toFixed(2)}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${process.env.FRONTEND_URL}/wallet/deposit/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/wallet/deposit/cancel`,
      client_reference_id: reference,
      metadata: {
        userId,
        transactionId: pendingTx.id,
        reference,
        originalAmount: amount.toString(),
        feeAmount: feeCalculation.feeAmount.toString(),
        netAmount: feeCalculation.netAmount.toString(),
      },
      custom_text: {
        submit: {
          message: `You will receive $${feeCalculation.netAmount.toFixed(2)} after fees ($${feeCalculation.feeAmount.toFixed(2)})`,
        },
      },
    });

    logger.logPayment('Stripe', 'checkout_created', pendingTx.id, {
      amount,
      currency,
      sessionId: session.id,
      fee: feeCalculation.feeAmount,
    });

    return {
      transactionId: pendingTx.id,
      checkoutUrl: session.url!,
      sessionId: session.id,
      status: TransactionStatus.PENDING,
      amount,
      currency,
    };
  } catch (error) {
    logger.error('Stripe checkout creation failed', error as Error, 'StripeService', {
      userId,
      amount,
    });

    throw new PaymentProcessingError(
      `Failed to create checkout session: ${(error as Error).message}`
    );
  }
}

/**
 * Verify a Stripe payment intent
 */
export async function verifyPayment(
  sessionId: string
): Promise<{
  status: TransactionStatus;
  amount: number;
  currency: string;
  verified: boolean;
}> {
  try {
    const stripe = initializeStripeClient();

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    const status = mapStripeStatus(session.payment_status);
    const amount = (session.amount_total || 0) / 100; // Convert from cents
    const currency = session.currency?.toUpperCase() || 'USD';

    return {
      status,
      amount,
      currency,
      verified: status === TransactionStatus.COMPLETED,
    };
  } catch (error) {
    logger.error('Stripe payment verification failed', error as Error, 'StripeService', {
      sessionId,
    });

    return {
      status: TransactionStatus.FAILED,
      amount: 0,
      currency: 'USD',
      verified: false,
    };
  }
}

/**
 * Map Stripe payment status to our transaction status
 */
function mapStripeStatus(stripeStatus: string): TransactionStatus {
  const statusMap: Record<string, TransactionStatus> = {
    'unpaid': TransactionStatus.PENDING,
    'paid': TransactionStatus.COMPLETED,
    'no_payment_required': TransactionStatus.COMPLETED,
    'canceled': TransactionStatus.CANCELLED,
    'processing': TransactionStatus.PROCESSING,
  };

  return statusMap[stripeStatus.toLowerCase()] || TransactionStatus.PENDING;
}

/**
 * Map Stripe event type to transaction status
 */
function mapStripeEventToStatus(eventType: string): TransactionStatus {
  const eventMap: Record<string, TransactionStatus> = {
    'checkout.session.completed': TransactionStatus.COMPLETED,
    'payment_intent.succeeded': TransactionStatus.COMPLETED,
    'payment_intent.payment_failed': TransactionStatus.FAILED,
    'checkout.session.expired': TransactionStatus.CANCELLED,
    'payment_intent.canceled': TransactionStatus.CANCELLED,
  };

  return eventMap[eventType] || TransactionStatus.PENDING;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = initializeStripeClient();

  if (!STRIPE_WEBHOOK_SECRET) {
    logger.warn('Stripe webhook secret not configured', 'StripeService');
    // In development, parse without verification
    if (process.env.NODE_ENV === 'development') {
      return JSON.parse(payload.toString()) as Stripe.Event;
    }
    throw new InvalidSignatureError('Stripe webhook secret not configured');
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    logger.error('Stripe webhook signature verification failed', error as Error, 'StripeService');
    throw new InvalidSignatureError(`Webhook signature verification failed: ${(error as Error).message}`);
  }
}

/**
 * Handle Stripe webhook
 */
export async function handleWebhook(
  event: Stripe.Event
): Promise<{ success: boolean; message: string }> {
  try {
    logger.logWebhook('Stripe', event.type, {
      id: event.id,
      type: event.type,
    });

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        return await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);

      case 'payment_intent.succeeded':
        return await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);

      case 'payment_intent.payment_failed':
        return await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);

      case 'checkout.session.expired':
        return await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);

      case 'charge.refunded':
        return await handleChargeRefunded(event.data.object as Stripe.Charge);

      default:
        logger.info(`Unhandled Stripe event type: ${event.type}`, 'StripeService');
        return { success: true, message: 'Event type not handled' };
    }
  } catch (error) {
    logger.error('Stripe webhook processing failed', error as Error, 'StripeService', {
      eventId: event.id,
      eventType: event.type,
    });

    throw error;
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<{ success: boolean; message: string }> {
  const { client_reference_id, metadata } = session;

  if (!client_reference_id || !metadata) {
    return { success: false, message: 'Missing reference or metadata' };
  }

  const transaction = await walletService.getTransactionByReference(client_reference_id);

  if (!transaction) {
    logger.warn('Transaction not found for Stripe webhook', 'StripeService', {
      reference: client_reference_id,
    });
    return { success: false, message: 'Transaction not found' };
  }

  // Idempotency check
  if (transaction.status === TransactionStatus.COMPLETED) {
    logger.info('Transaction already completed, skipping', 'StripeService', {
      transactionId: transaction.id,
    });
    return { success: true, message: 'Already processed' };
  }

  // Update transaction status
  await walletService.updateTransactionStatus(
    transaction.id,
    TransactionStatus.COMPLETED,
    {
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      customerId: session.customer,
      webhookReceivedAt: new Date().toISOString(),
    }
  );

  // Credit wallet with net amount (after fees)
  const netAmount = parseFloat(metadata.netAmount || '0');
  const originalAmount = parseFloat(metadata.originalAmount || '0');
  const feeAmount = parseFloat(metadata.feeAmount || '0');

  await walletService.creditWallet({
    userId: transaction.userId,
    amount: netAmount,
    currency: FiatCurrency.USD,
    transactionType: TransactionType.DEPOSIT,
    referenceId: `${client_reference_id}_credit`,
    metadata: {
      originalAmount,
      feeAmount,
      feePercentage: 0.029,
      fixedFee: 0.30,
      paymentMethod: PaymentMethod.CARD,
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
    },
  });

  logger.logPayment('Stripe', 'completed', transaction.id, {
    originalAmount,
    netAmount,
    fee: feeAmount,
    sessionId: session.id,
  });

  return { success: true, message: 'Payment processed successfully' };
}

/**
 * Handle payment_intent.succeeded event
 */
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<{ success: boolean; message: string }> {
  // This is usually handled by checkout.session.completed
  // But we handle it here for direct payment intents
  logger.info('Payment intent succeeded', 'StripeService', {
    paymentIntentId: paymentIntent.id,
  });

  return { success: true, message: 'Payment intent processed' };
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<{ success: boolean; message: string }> {
  const metadata = paymentIntent.metadata;

  if (!metadata?.reference) {
    return { success: false, message: 'Missing reference in metadata' };
  }

  const transaction = await walletService.getTransactionByReference(metadata.reference);

  if (!transaction) {
    return { success: false, message: 'Transaction not found' };
  }

  await walletService.updateTransactionStatus(
    transaction.id,
    TransactionStatus.FAILED,
    {
      stripePaymentIntentId: paymentIntent.id,
      failureMessage: paymentIntent.last_payment_error?.message,
      webhookReceivedAt: new Date().toISOString(),
    }
  );

  logger.logPayment('Stripe', 'failed', transaction.id, {
    paymentIntentId: paymentIntent.id,
    error: paymentIntent.last_payment_error?.message,
  });

  return { success: true, message: 'Payment failure recorded' };
}

/**
 * Handle checkout.session.expired event
 */
async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session
): Promise<{ success: boolean; message: string }> {
  const reference = session.client_reference_id;

  if (!reference) {
    return { success: false, message: 'Missing reference' };
  }

  const transaction = await walletService.getTransactionByReference(reference);

  if (!transaction) {
    return { success: false, message: 'Transaction not found' };
  }

  await walletService.updateTransactionStatus(
    transaction.id,
    TransactionStatus.CANCELLED,
    {
      stripeSessionId: session.id,
      reason: 'Session expired',
      webhookReceivedAt: new Date().toISOString(),
    }
  );

  return { success: true, message: 'Expired session recorded' };
}

/**
 * Handle charge.refunded event
 */
async function handleChargeRefunded(
  charge: Stripe.Charge
): Promise<{ success: boolean; message: string }> {
  logger.info('Charge refunded', 'StripeService', {
    chargeId: charge.id,
    amountRefunded: charge.amount_refunded,
  });

  // Handle refund logic here if needed
  // You might want to debit the user's wallet

  return { success: true, message: 'Refund recorded' };
}

/**
 * Process a refund
 */
export async function processRefund(
  paymentIntentId: string,
  amount?: number
): Promise<{ success: boolean; refundId: string }> {
  try {
    const stripe = initializeStripeClient();

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason: 'requested_by_customer',
    });

    logger.info('Refund processed', 'StripeService', {
      refundId: refund.id,
      paymentIntentId,
      amount,
    });

    return { success: true, refundId: refund.id };
  } catch (error) {
    logger.error('Stripe refund failed', error as Error, 'StripeService', {
      paymentIntentId,
    });

    throw new PaymentProcessingError(`Refund failed: ${(error as Error).message}`);
  }
}

/**
 * Get Stripe session details
 */
export async function getSessionDetails(
  sessionId: string
): Promise<Stripe.Checkout.Session | null> {
  try {
    const stripe = initializeStripeClient();

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'customer'],
    });

    return session;
  } catch (error) {
    logger.error('Failed to get Stripe session details', error as Error, 'StripeService', {
      sessionId,
    });
    return null;
  }
}

/**
 * Create a customer for future payments
 */
export async function createCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  try {
    const stripe = initializeStripeClient();

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    });

    return customer.id;
  } catch (error) {
    logger.error('Failed to create Stripe customer', error as Error, 'StripeService', {
      userId,
    });
    throw new PaymentProcessingError(`Failed to create customer: ${(error as Error).message}`);
  }
}

/**
 * Get publishable key for frontend
 */
export function getPublishableKey(): string {
  return STRIPE_PUBLISHABLE_KEY;
}

export default {
  createCheckoutSession,
  verifyPayment,
  handleWebhook,
  verifyWebhookSignature,
  processRefund,
  getSessionDetails,
  createCustomer,
  getPublishableKey,
  initializeStripeClient,
};
