/**
 * Webhook Routes - Trading Platform
 * Handles all payment provider webhook callbacks
 */

import { Router, Request, Response, NextFunction } from 'express';
import { handleWebhook as handleWaveWebhook, verifyWebhookSignature as verifyWaveSignature } from '../services/waveService';
import { handleWebhook as handleOrangeMoneyWebhook, verifyWebhookSignature as verifyOrangeSignature } from '../services/orangeMoneyService';
import { handleWebhook as handleStripeWebhook, verifyWebhookSignature as verifyStripeSignature } from '../services/stripeService';
import { handleWebhook as handleCryptoWebhook } from '../services/cryptoService';
import logger from '../utils/logger';
import { InvalidSignatureError, WebhookError } from '../utils/errors';

const router = Router();

// ============================================================================
// WAVE WEBHOOK
// ============================================================================

/**
 * Wave Mobile Money Webhook
 * POST /api/payments/webhooks/wave
 */
router.post('/wave', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-wave-signature'] as string;
    const payload = req.body;

    logger.logWebhook('Wave', 'received', {
      signature: signature ? 'present' : 'missing',
      bodyKeys: Object.keys(payload),
    });

    // Verify signature if configured
    if (process.env.WAVE_WEBHOOK_SECRET) {
      const payloadString = JSON.stringify(payload);
      if (!verifyWaveSignature(payloadString, signature || '')) {
        logger.warn('Invalid Wave webhook signature', 'WebhookRoutes');
        return res.status(401).json({
          success: false,
          message: 'Invalid signature',
        });
      }
    }

    const result = await handleWaveWebhook(payload, signature || '');

    // Return 200 to acknowledge receipt
    res.status(200).json(result);
  } catch (error) {
    logger.error('Wave webhook error', error as Error, 'WebhookRoutes', {
      body: req.body,
    });

    // Return 200 even on error to prevent retries (log for manual review)
    res.status(200).json({
      success: false,
      message: (error as Error).message,
    });
  }
});

// ============================================================================
// ORANGE MONEY WEBHOOK
// ============================================================================

/**
 * Orange Money Webhook
 * POST /api/payments/webhooks/orange
 */
router.post('/orange', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-orange-signature'] as string;
    const payload = req.body;

    logger.logWebhook('OrangeMoney', 'received', {
      signature: signature ? 'present' : 'missing',
      bodyKeys: Object.keys(payload),
    });

    // Verify signature if configured
    if (process.env.ORANGE_WEBHOOK_SECRET) {
      const payloadString = JSON.stringify(payload);
      if (!verifyOrangeSignature(payloadString, signature || '')) {
        logger.warn('Invalid Orange Money webhook signature', 'WebhookRoutes');
        return res.status(401).json({
          success: false,
          message: 'Invalid signature',
        });
      }
    }

    const result = await handleOrangeMoneyWebhook(payload, signature || '');

    res.status(200).json(result);
  } catch (error) {
    logger.error('Orange Money webhook error', error as Error, 'WebhookRoutes', {
      body: req.body,
    });

    res.status(200).json({
      success: false,
      message: (error as Error).message,
    });
  }
});

// ============================================================================
// STRIPE WEBHOOK
// ============================================================================

/**
 * Stripe Webhook
 * POST /api/payments/webhooks/stripe
 * 
 * Note: Stripe requires the raw body for signature verification
 * Make sure to use express.raw({ type: 'application/json' }) middleware
 */
router.post('/stripe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload = req.body;

    logger.logWebhook('Stripe', 'received', {
      signature: signature ? 'present' : 'missing',
      type: payload.type,
    });

    if (!signature) {
      logger.warn('Missing Stripe signature', 'WebhookRoutes');
      return res.status(400).json({
        success: false,
        message: 'Missing stripe-signature header',
      });
    }

    // Verify signature and construct event
    const event = verifyStripeSignature(payload, signature);

    // Handle the event
    const result = await handleStripeWebhook(event);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Stripe webhook error', error as Error, 'WebhookRoutes', {
      body: req.body,
    });

    // Return error for Stripe to retry
    res.status(400).json({
      success: false,
      message: (error as Error).message,
    });
  }
});

// ============================================================================
// CRYPTO WEBHOOK
// ============================================================================

/**
 * Cryptocurrency Webhook
 * POST /api/payments/webhooks/crypto
 * 
 * Receives notifications from blockchain monitoring services
 * (e.g., BlockCypher, Alchemy, Infura webhooks)
 */
router.post('/crypto', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-crypto-signature'] as string;
    const payload = req.body;

    logger.logWebhook('Crypto', 'received', {
      signature: signature ? 'present' : 'missing',
      event: payload.event,
      currency: payload.currency,
    });

    // Verify signature if configured
    if (process.env.CRYPTO_WEBHOOK_SECRET && signature) {
      const crypto = await import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', process.env.CRYPTO_WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSignature) {
        logger.warn('Invalid crypto webhook signature', 'WebhookRoutes');
        return res.status(401).json({
          success: false,
          message: 'Invalid signature',
        });
      }
    }

    const result = await handleCryptoWebhook(payload, signature || '');

    res.status(200).json(result);
  } catch (error) {
    logger.error('Crypto webhook error', error as Error, 'WebhookRoutes', {
      body: req.body,
    });

    res.status(200).json({
      success: false,
      message: (error as Error).message,
    });
  }
});

// ============================================================================
// BLOCKCHAIN-SPECIFIC WEBHOOKS
// ============================================================================

/**
 * Bitcoin Transaction Webhook
 * POST /api/payments/webhooks/btc
 * 
 * Receives notifications from Bitcoin blockchain monitoring
 */
router.post('/btc', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;

    logger.logWebhook('Bitcoin', 'received', {
      event: payload.event,
      address: payload.address,
      txHash: payload.hash,
    });

    // Process Bitcoin transaction notification
    // This would typically trigger deposit processing

    res.status(200).json({
      success: true,
      message: 'Bitcoin webhook processed',
    });
  } catch (error) {
    logger.error('Bitcoin webhook error', error as Error, 'WebhookRoutes');
    res.status(200).json({ success: false, message: (error as Error).message });
  }
});

/**
 * Ethereum Transaction Webhook
 * POST /api/payments/webhooks/eth
 * 
 * Receives notifications from Ethereum blockchain monitoring
 */
router.post('/eth', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;

    logger.logWebhook('Ethereum', 'received', {
      event: payload.event,
      address: payload.address,
      txHash: payload.transactionHash,
    });

    // Process Ethereum transaction notification

    res.status(200).json({
      success: true,
      message: 'Ethereum webhook processed',
    });
  } catch (error) {
    logger.error('Ethereum webhook error', error as Error, 'WebhookRoutes');
    res.status(200).json({ success: false, message: (error as Error).message });
  }
});

// ============================================================================
// WEBHOOK STATUS & HEALTH CHECKS
// ============================================================================

/**
 * Webhook Health Check
 * GET /api/payments/webhooks/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      webhooks: {
        wave: 'active',
        orange: 'active',
        stripe: 'active',
        crypto: 'active',
      },
    },
    message: 'Webhook service is healthy',
  });
});

/**
 * Webhook Test Endpoint
 * POST /api/payments/webhooks/test/:provider
 * 
 * For testing webhook integrations in development
 */
router.post('/test/:provider', (req: Request, res: Response) => {
  const { provider } = req.params;
  const payload = req.body;

  logger.info(`Test webhook received for ${provider}`, 'WebhookRoutes', {
    provider,
    payload,
  });

  res.status(200).json({
    success: true,
    data: {
      provider,
      received: payload,
      timestamp: new Date().toISOString(),
    },
    message: 'Test webhook received',
  });
});

export default router;
