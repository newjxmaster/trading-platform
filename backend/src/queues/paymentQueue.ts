/**
 * Trading Platform - Payment Queue
 * 
 * Bull queue for processing payment-related jobs asynchronously.
 * Uses Redis as the backing store for job persistence and reliability.
 * 
 * Job Types:
 * - deposit: Process wallet deposits
 * - withdrawal: Process withdrawal requests
 * - dividend: Process dividend payments
 * - trade: Process trade settlements
 * - fee: Process platform fee collection
 */

import Bull from 'bull';
import { queueLogger as logger } from '../utils/logger';
import { PaymentJobData, QueueJobOptions, QueueMetrics } from '../types';

// ============================================================================
// Queue Configuration
// ============================================================================

const QUEUE_NAME = 'payment-processing';

const DEFAULT_JOB_OPTIONS: QueueJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: 100,  // Keep last 100 completed jobs
  removeOnFail: 50,       // Keep last 50 failed jobs
};

// ============================================================================
// Queue Setup
// ============================================================================

let paymentQueue: Bull.Queue<PaymentJobData> | null = null;

/**
 * Initialize the payment queue
 */
export function initializePaymentQueue(redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379'): Bull.Queue<PaymentJobData> {
  if (paymentQueue) {
    logger.warn('Payment queue already initialized');
    return paymentQueue;
  }

  logger.info('Initializing payment queue', { redisUrl });

  paymentQueue = new Bull<PaymentJobData>(QUEUE_NAME, redisUrl, {
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
    settings: {
      stalledInterval: 30000,     // Check for stalled jobs every 30 seconds
      maxStalledCount: 2,         // Max times a job can be stalled before failing
    },
  });

  setupEventHandlers(paymentQueue);

  return paymentQueue;
}

/**
 * Get the payment queue instance
 */
export function getPaymentQueue(): Bull.Queue<PaymentJobData> {
  if (!paymentQueue) {
    throw new Error('Payment queue not initialized. Call initializePaymentQueue first.');
  }
  return paymentQueue;
}

// ============================================================================
// Event Handlers
// ============================================================================

function setupEventHandlers(queue: Bull.Queue<PaymentJobData>): void {
  // Job completed successfully
  queue.on('completed', (job, result) => {
    logger.info(`Payment job completed`, {
      jobId: job.id,
      type: job.data.type,
      userId: job.data.userId,
      result,
    });
  });

  // Job failed
  queue.on('failed', (job, err) => {
    logger.error(`Payment job failed`, err, {
      jobId: job.id,
      type: job.data.type,
      userId: job.data.userId,
      attempts: job.attemptsMade,
    });
  });

  // Job stalled
  queue.on('stalled', (job) => {
    logger.warn(`Payment job stalled`, {
      jobId: job.id,
      type: job.data.type,
      userId: job.data.userId,
    });
  });

  // Job progress
  queue.on('progress', (job, progress) => {
    logger.debug(`Payment job progress`, {
      jobId: job.id,
      type: job.data.type,
      progress,
    });
  });

  // Queue error
  queue.on('error', (error) => {
    logger.error('Payment queue error', error);
  });
}

// ============================================================================
// Job Producers
// ============================================================================

/**
 * Add a deposit job to the queue
 */
export async function addDepositJob(
  userId: string,
  amount: number,
  currency: string,
  paymentMethod: string,
  metadata?: Record<string, unknown>,
  options?: QueueJobOptions
): Promise<Bull.Job<PaymentJobData>> {
  const queue = getPaymentQueue();
  
  const jobData: PaymentJobData = {
    type: 'deposit',
    userId,
    amount,
    currency,
    paymentMethod,
    metadata,
  };

  logger.info(`Adding deposit job`, { userId, amount, currency });
  
  return queue.add(jobData, { ...DEFAULT_JOB_OPTIONS, ...options });
}

/**
 * Add a withdrawal job to the queue
 */
export async function addWithdrawalJob(
  userId: string,
  amount: number,
  currency: string,
  paymentMethod: string,
  metadata?: Record<string, unknown>,
  options?: QueueJobOptions
): Promise<Bull.Job<PaymentJobData>> {
  const queue = getPaymentQueue();
  
  const jobData: PaymentJobData = {
    type: 'withdrawal',
    userId,
    amount,
    currency,
    paymentMethod,
    metadata,
  };

  logger.info(`Adding withdrawal job`, { userId, amount, currency });
  
  return queue.add(jobData, { ...DEFAULT_JOB_OPTIONS, ...options });
}

/**
 * Add a dividend payment job to the queue
 */
export async function addDividendPaymentJob(
  userId: string,
  amount: number,
  currency: string,
  dividendId: string,
  metadata?: Record<string, unknown>,
  options?: QueueJobOptions
): Promise<Bull.Job<PaymentJobData>> {
  const queue = getPaymentQueue();
  
  const jobData: PaymentJobData = {
    type: 'dividend',
    userId,
    amount,
    currency,
    paymentMethod: 'wallet',
    metadata: { ...metadata, dividendId },
  };

  logger.info(`Adding dividend payment job`, { userId, amount, dividendId });
  
  return queue.add(jobData, { ...DEFAULT_JOB_OPTIONS, ...options });
}

/**
 * Add a trade settlement job to the queue
 */
export async function addTradeSettlementJob(
  buyerId: string,
  sellerId: string,
  amount: number,
  currency: string,
  tradeId: string,
  metadata?: Record<string, unknown>,
  options?: QueueJobOptions
): Promise<Bull.Job<PaymentJobData>> {
  const queue = getPaymentQueue();
  
  const jobData: PaymentJobData = {
    type: 'trade',
    userId: buyerId,  // Primary user for the job
    amount,
    currency,
    paymentMethod: 'wallet',
    metadata: { ...metadata, tradeId, sellerId },
  };

  logger.info(`Adding trade settlement job`, { buyerId, sellerId, amount, tradeId });
  
  return queue.add(jobData, { ...DEFAULT_JOB_OPTIONS, ...options });
}

/**
 * Add a platform fee collection job to the queue
 */
export async function addFeeCollectionJob(
  userId: string,
  amount: number,
  currency: string,
  feeType: string,
  metadata?: Record<string, unknown>,
  options?: QueueJobOptions
): Promise<Bull.Job<PaymentJobData>> {
  const queue = getPaymentQueue();
  
  const jobData: PaymentJobData = {
    type: 'fee',
    userId,
    amount,
    currency,
    paymentMethod: 'wallet',
    metadata: { ...metadata, feeType },
  };

  logger.info(`Adding fee collection job`, { userId, amount, feeType });
  
  return queue.add(jobData, { ...DEFAULT_JOB_OPTIONS, ...options });
}

// ============================================================================
// Job Consumers (Processors)
// ============================================================================

export interface PaymentProcessor {
  processDeposit: (job: Bull.Job<PaymentJobData>) => Promise<unknown>;
  processWithdrawal: (job: Bull.Job<PaymentJobData>) => Promise<unknown>;
  processDividend: (job: Bull.Job<PaymentJobData>) => Promise<unknown>;
  processTrade: (job: Bull.Job<PaymentJobData>) => Promise<unknown>;
  processFee: (job: Bull.Job<PaymentJobData>) => Promise<unknown>;
}

/**
 * Setup job processors for the payment queue
 */
export function setupPaymentProcessors(processor: PaymentProcessor): void {
  const queue = getPaymentQueue();

  // Process deposits
  queue.process('deposit', 5, async (job) => {
    logger.info(`Processing deposit job`, { jobId: job.id, userId: job.data.userId });
    return processor.processDeposit(job);
  });

  // Process withdrawals
  queue.process('withdrawal', 3, async (job) => {
    logger.info(`Processing withdrawal job`, { jobId: job.id, userId: job.data.userId });
    return processor.processWithdrawal(job);
  });

  // Process dividends
  queue.process('dividend', 10, async (job) => {
    logger.info(`Processing dividend job`, { jobId: job.id, userId: job.data.userId });
    return processor.processDividend(job);
  });

  // Process trades
  queue.process('trade', 5, async (job) => {
    logger.info(`Processing trade job`, { jobId: job.id, tradeId: job.data.metadata?.tradeId });
    return processor.processTrade(job);
  });

  // Process fees
  queue.process('fee', 5, async (job) => {
    logger.info(`Processing fee job`, { jobId: job.id, userId: job.data.userId });
    return processor.processFee(job);
  });

  logger.info('Payment processors setup complete');
}

// ============================================================================
// Queue Management
// ============================================================================

/**
 * Get queue metrics
 */
export async function getPaymentQueueMetrics(): Promise<QueueMetrics> {
  const queue = getPaymentQueue();
  
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Clean up old jobs
 */
export async function cleanupPaymentQueue(
  options: {
    completed?: number;  // Keep last N completed jobs
    failed?: number;     // Keep last N failed jobs
  } = {}
): Promise<void> {
  const queue = getPaymentQueue();
  
  const { completed = 100, failed = 50 } = options;

  logger.info(`Cleaning up payment queue`, { completed, failed });

  await queue.clean(completed, 'completed');
  await queue.clean(failed, 'failed');
}

/**
 * Pause the queue
 */
export async function pausePaymentQueue(): Promise<void> {
  const queue = getPaymentQueue();
  await queue.pause();
  logger.info('Payment queue paused');
}

/**
 * Resume the queue
 */
export async function resumePaymentQueue(): Promise<void> {
  const queue = getPaymentQueue();
  await queue.resume();
  logger.info('Payment queue resumed');
}

/**
 * Close the queue connection
 */
export async function closePaymentQueue(): Promise<void> {
  if (paymentQueue) {
    await paymentQueue.close();
    paymentQueue = null;
    logger.info('Payment queue closed');
  }
}

// ============================================================================
// Export Configuration
// ============================================================================

export const paymentQueueConfig = {
  name: QUEUE_NAME,
  description: 'Processes payment-related jobs (deposits, withdrawals, dividends, trades, fees)',
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
};
