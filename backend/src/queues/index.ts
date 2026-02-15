/**
 * Trading Platform - Queue Module Index
 * 
 * Centralized exports for all Bull queue modules.
 * Provides a unified interface for queue initialization and management.
 */

// ============================================================================
// Payment Queue
// ============================================================================

export {
  initializePaymentQueue,
  getPaymentQueue,
  addDepositJob,
  addWithdrawalJob,
  addDividendPaymentJob,
  addTradeSettlementJob,
  addFeeCollectionJob,
  setupPaymentProcessors,
  getPaymentQueueMetrics,
  cleanupPaymentQueue,
  pausePaymentQueue,
  resumePaymentQueue,
  closePaymentQueue,
  paymentQueueConfig,
  type PaymentProcessor,
} from './paymentQueue';

// ============================================================================
// Dividend Queue
// ============================================================================

export {
  initializeDividendQueue,
  getDividendQueue,
  addDividendDistributionJob,
  addDividendPayoutJob,
  addBulkDividendPayoutJobs,
  addDividendNotificationJob,
  setupDividendProcessors,
  getDividendQueueMetrics,
  getFailedDividendJobs,
  retryDividendJob,
  retryAllFailedDividendJobs,
  cleanupDividendQueue,
  pauseDividendQueue,
  resumeDividendQueue,
  closeDividendQueue,
  isDividendDistributionComplete,
  getDividendDistributionProgress,
  dividendQueueConfig,
  type DividendProcessor,
} from './dividendQueue';

// ============================================================================
// Email Queue
// ============================================================================

export {
  initializeEmailQueue,
  getEmailQueue,
  addEmailJob,
  addWelcomeEmailJob,
  addKycVerifiedEmailJob,
  addKycRejectedEmailJob,
  addOrderFilledEmailJob,
  addDividendReceivedEmailJob,
  addWithdrawalCompletedEmailJob,
  addDepositCompletedEmailJob,
  addPriceAlertEmailJob,
  addCompanyUpdateEmailJob,
  addSecurityAlertEmailJob,
  addBulkEmailJobs,
  setupEmailProcessors,
  getEmailQueueMetrics,
  cleanupEmailQueue,
  pauseEmailQueue,
  resumeEmailQueue,
  closeEmailQueue,
  scheduleEmail,
  cancelScheduledEmail,
  emailQueueConfig,
  type EmailProcessor,
} from './emailQueue';

// ============================================================================
// Queue Initialization
// ============================================================================

import { initializePaymentQueue } from './paymentQueue';
import { initializeDividendQueue } from './dividendQueue';
import { initializeEmailQueue } from './emailQueue';
import { queueLogger as logger } from '../utils/logger';

export interface QueueInitializationOptions {
  redisUrl?: string;
  enablePaymentQueue?: boolean;
  enableDividendQueue?: boolean;
  enableEmailQueue?: boolean;
}

/**
 * Initialize all queues at once
 */
export function initializeAllQueues(
  options: QueueInitializationOptions = {}
): {
  paymentQueue?: ReturnType<typeof initializePaymentQueue>;
  dividendQueue?: ReturnType<typeof initializeDividendQueue>;
  emailQueue?: ReturnType<typeof initializeEmailQueue>;
} {
  const {
    redisUrl = process.env.REDIS_URL || 'redis://localhost:6379',
    enablePaymentQueue = true,
    enableDividendQueue = true,
    enableEmailQueue = true,
  } = options;

  logger.info('Initializing all queues', { redisUrl });

  const queues: {
    paymentQueue?: ReturnType<typeof initializePaymentQueue>;
    dividendQueue?: ReturnType<typeof initializeDividendQueue>;
    emailQueue?: ReturnType<typeof initializeEmailQueue>;
  } = {};

  if (enablePaymentQueue) {
    queues.paymentQueue = initializePaymentQueue(redisUrl);
  }

  if (enableDividendQueue) {
    queues.dividendQueue = initializeDividendQueue(redisUrl);
  }

  if (enableEmailQueue) {
    queues.emailQueue = initializeEmailQueue(redisUrl);
  }

  logger.info('All queues initialized successfully');

  return queues;
}

/**
 * Close all queue connections
 */
export async function closeAllQueues(): Promise<void> {
  logger.info('Closing all queue connections');

  await Promise.all([
    closePaymentQueue?.().catch(err => logger.error('Error closing payment queue', err)),
    closeDividendQueue?.().catch(err => logger.error('Error closing dividend queue', err)),
    closeEmailQueue?.().catch(err => logger.error('Error closing email queue', err)),
  ]);

  logger.info('All queue connections closed');
}

// Import close functions for cleanup
import { closePaymentQueue } from './paymentQueue';
import { closeDividendQueue } from './dividendQueue';
import { closeEmailQueue } from './emailQueue';

// ============================================================================
// Queue Health Check
// ============================================================================

import { getPaymentQueueMetrics } from './paymentQueue';
import { getDividendQueueMetrics } from './dividendQueue';
import { getEmailQueueMetrics } from './emailQueue';

export interface QueueHealthStatus {
  payment?: {
    waiting: number;
    active: number;
    failed: number;
    healthy: boolean;
  };
  dividend?: {
    waiting: number;
    active: number;
    failed: number;
    healthy: boolean;
  };
  email?: {
    waiting: number;
    active: number;
    failed: number;
    healthy: boolean;
  };
  overall: boolean;
}

/**
 * Get health status of all queues
 */
export async function getQueueHealthStatus(): Promise<QueueHealthStatus> {
  const status: QueueHealthStatus = {
    overall: true,
  };

  try {
    const paymentMetrics = await getPaymentQueueMetrics();
    status.payment = {
      waiting: paymentMetrics.waiting,
      active: paymentMetrics.active,
      failed: paymentMetrics.failed,
      healthy: paymentMetrics.failed < 100,  // Less than 100 failed jobs is healthy
    };
  } catch (error) {
    logger.error('Failed to get payment queue metrics', error as Error);
    status.payment = { waiting: 0, active: 0, failed: 0, healthy: false };
  }

  try {
    const dividendMetrics = await getDividendQueueMetrics();
    status.dividend = {
      waiting: dividendMetrics.waiting,
      active: dividendMetrics.active,
      failed: dividendMetrics.failed,
      healthy: dividendMetrics.failed < 50,  // Less than 50 failed jobs is healthy
    };
  } catch (error) {
    logger.error('Failed to get dividend queue metrics', error as Error);
    status.dividend = { waiting: 0, active: 0, failed: 0, healthy: false };
  }

  try {
    const emailMetrics = await getEmailQueueMetrics();
    status.email = {
      waiting: emailMetrics.waiting,
      active: emailMetrics.active,
      failed: emailMetrics.failed,
      healthy: emailMetrics.failed < 50,  // Less than 50 failed jobs is healthy
    };
  } catch (error) {
    logger.error('Failed to get email queue metrics', error as Error);
    status.email = { waiting: 0, active: 0, failed: 0, healthy: false };
  }

  // Overall health is only true if all queues are healthy
  status.overall = 
    (status.payment?.healthy ?? true) &&
    (status.dividend?.healthy ?? true) &&
    (status.email?.healthy ?? true);

  return status;
}
