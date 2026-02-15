/**
 * Trading Platform - Dividend Queue
 * 
 * Bull queue for processing dividend distribution jobs asynchronously.
 * Uses Redis as the backing store for job persistence and reliability.
 * 
 * Job Types:
 * - dividend_distribution: Process dividend distribution for a company
 * - dividend_payout: Process individual shareholder payout
 * - dividend_notification: Send dividend notification to shareholder
 */

import Bull from 'bull';
import { queueLogger as logger } from '../utils/logger';
import { 
  DividendJobData, 
  DividendPayoutJobData, 
  EmailJobData,
  QueueJobOptions, 
  QueueMetrics 
} from '../types';

// ============================================================================
// Queue Configuration
// ============================================================================

const QUEUE_NAME = 'dividend-processing';

const DEFAULT_JOB_OPTIONS: QueueJobOptions = {
  attempts: 5,              // More retries for dividend jobs (important!)
  backoff: {
    type: 'exponential',
    delay: 2000,            // Start with 2 second delay
  },
  removeOnComplete: 200,    // Keep last 200 completed jobs (for audit)
  removeOnFail: 100,        // Keep last 100 failed jobs
};

// ============================================================================
// Queue Setup
// ============================================================================

let dividendQueue: Bull.Queue<DividendJobData | DividendPayoutJobData | EmailJobData> | null = null;

/**
 * Initialize the dividend queue
 */
export function initializeDividendQueue(
  redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379'
): Bull.Queue<DividendJobData | DividendPayoutJobData | EmailJobData> {
  if (dividendQueue) {
    logger.warn('Dividend queue already initialized');
    return dividendQueue;
  }

  logger.info('Initializing dividend queue', { redisUrl });

  dividendQueue = new Bull<DividendJobData | DividendPayoutJobData | EmailJobData>(
    QUEUE_NAME, 
    redisUrl, 
    {
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
      settings: {
        stalledInterval: 30000,
        maxStalledCount: 3,   // More retries for important dividend jobs
      },
    }
  );

  setupEventHandlers(dividendQueue);

  return dividendQueue;
}

/**
 * Get the dividend queue instance
 */
export function getDividendQueue(): Bull.Queue<DividendJobData | DividendPayoutJobData | EmailJobData> {
  if (!dividendQueue) {
    throw new Error('Dividend queue not initialized. Call initializeDividendQueue first.');
  }
  return dividendQueue;
}

// ============================================================================
// Event Handlers
// ============================================================================

function setupEventHandlers(
  queue: Bull.Queue<DividendJobData | DividendPayoutJobData | EmailJobData>
): void {
  // Job completed successfully
  queue.on('completed', (job, result) => {
    logger.info(`Dividend job completed`, {
      jobId: job.id,
      jobName: job.name,
      result,
    });
  });

  // Job failed
  queue.on('failed', (job, err) => {
    logger.error(`Dividend job failed`, err, {
      jobId: job.id,
      jobName: job.name,
      attempts: job.attemptsMade,
      data: job.data,
    });
  });

  // Job stalled
  queue.on('stalled', (job) => {
    logger.warn(`Dividend job stalled`, {
      jobId: job.id,
      jobName: job.name,
    });
  });

  // Job progress
  queue.on('progress', (job, progress) => {
    logger.debug(`Dividend job progress`, {
      jobId: job.id,
      jobName: job.name,
      progress,
    });
  });

  // Queue error
  queue.on('error', (error) => {
    logger.error('Dividend queue error', error);
  });
}

// ============================================================================
// Job Producers
// ============================================================================

/**
 * Add a dividend distribution job to the queue
 * This is the main job that processes all payouts for a dividend
 */
export async function addDividendDistributionJob(
  dividendId: string,
  companyId: string,
  revenueReportId: string,
  totalDividendPool: number,
  totalShares: number,
  amountPerShare: number,
  options?: QueueJobOptions
): Promise<Bull.Job<DividendJobData>> {
  const queue = getDividendQueue();
  
  const jobData: DividendJobData = {
    dividendId,
    companyId,
    revenueReportId,
    totalDividendPool,
    totalShares,
    amountPerShare,
  };

  logger.info(`Adding dividend distribution job`, { 
    dividendId, 
    companyId, 
    totalDividendPool 
  });
  
  return queue.add('dividend_distribution', jobData, { 
    ...DEFAULT_JOB_OPTIONS, 
    ...options,
    priority: 1,  // High priority
  }) as Promise<Bull.Job<DividendJobData>>;
}

/**
 * Add an individual dividend payout job to the queue
 * Used for processing individual shareholder payouts
 */
export async function addDividendPayoutJob(
  payoutId: string,
  dividendId: string,
  userId: string,
  sharesHeld: number,
  payoutAmount: number,
  options?: QueueJobOptions
): Promise<Bull.Job<DividendPayoutJobData>> {
  const queue = getDividendQueue();
  
  const jobData: DividendPayoutJobData = {
    payoutId,
    dividendId,
    userId,
    sharesHeld,
    payoutAmount,
  };

  logger.info(`Adding dividend payout job`, { 
    payoutId, 
    dividendId, 
    userId, 
    payoutAmount 
  });
  
  return queue.add('dividend_payout', jobData, { 
    ...DEFAULT_JOB_OPTIONS, 
    ...options 
  }) as Promise<Bull.Job<DividendPayoutJobData>>;
}

/**
 * Add dividend payout jobs in bulk
 */
export async function addBulkDividendPayoutJobs(
  payouts: Array<{
    payoutId: string;
    dividendId: string;
    userId: string;
    sharesHeld: number;
    payoutAmount: number;
  }>,
  options?: QueueJobOptions
): Promise<Bull.Job<DividendPayoutJobData>[]> {
  const queue = getDividendQueue();
  
  const jobs = payouts.map(payout => ({
    name: 'dividend_payout',
    data: {
      payoutId: payout.payoutId,
      dividendId: payout.dividendId,
      userId: payout.userId,
      sharesHeld: payout.sharesHeld,
      payoutAmount: payout.payoutAmount,
    },
    opts: { ...DEFAULT_JOB_OPTIONS, ...options },
  }));

  logger.info(`Adding ${jobs.length} dividend payout jobs in bulk`);
  
  return queue.addBulk(jobs) as Promise<Bull.Job<DividendPayoutJobData>[]>;
}

/**
 * Add a dividend notification job to the queue
 */
export async function addDividendNotificationJob(
  userId: string,
  email: string,
  companyName: string,
  dividendAmount: number,
  sharesOwned: number,
  options?: QueueJobOptions
): Promise<Bull.Job<EmailJobData>> {
  const queue = getDividendQueue();
  
  const jobData: EmailJobData = {
    to: email,
    subject: `Dividend Payment Received from ${companyName}`,
    template: 'dividend_notification',
    data: {
      userId,
      companyName,
      dividendAmount,
      sharesOwned,
      paymentDate: new Date().toISOString(),
    },
  };

  logger.info(`Adding dividend notification job`, { userId, companyName, dividendAmount });
  
  return queue.add('dividend_notification', jobData, { 
    ...DEFAULT_JOB_OPTIONS, 
    ...options,
    priority: 2,  // Lower priority than payouts
  }) as Promise<Bull.Job<EmailJobData>>;
}

// ============================================================================
// Job Consumers (Processors)
// ============================================================================

export interface DividendProcessor {
  processDividendDistribution: (job: Bull.Job<DividendJobData>) => Promise<unknown>;
  processDividendPayout: (job: Bull.Job<DividendPayoutJobData>) => Promise<unknown>;
  processDividendNotification: (job: Bull.Job<EmailJobData>) => Promise<unknown>;
}

/**
 * Setup job processors for the dividend queue
 */
export function setupDividendProcessors(processor: DividendProcessor): void {
  const queue = getDividendQueue();

  // Process dividend distributions
  queue.process('dividend_distribution', 2, async (job) => {
    const data = job.data as DividendJobData;
    logger.info(`Processing dividend distribution`, { 
      jobId: job.id, 
      dividendId: data.dividendId 
    });
    return processor.processDividendDistribution(job as Bull.Job<DividendJobData>);
  });

  // Process individual payouts (higher concurrency)
  queue.process('dividend_payout', 20, async (job) => {
    const data = job.data as DividendPayoutJobData;
    logger.info(`Processing dividend payout`, { 
      jobId: job.id, 
      payoutId: data.payoutId 
    });
    return processor.processDividendPayout(job as Bull.Job<DividendPayoutJobData>);
  });

  // Process notifications
  queue.process('dividend_notification', 5, async (job) => {
    const data = job.data as EmailJobData;
    logger.info(`Processing dividend notification`, { 
      jobId: job.id, 
      to: data.to 
    });
    return processor.processDividendNotification(job as Bull.Job<EmailJobData>);
  });

  logger.info('Dividend processors setup complete');
}

// ============================================================================
// Queue Management
// ============================================================================

/**
 * Get queue metrics
 */
export async function getDividendQueueMetrics(): Promise<QueueMetrics> {
  const queue = getDividendQueue();
  
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
 * Get failed jobs that need retry
 */
export async function getFailedDividendJobs(): Promise<
  Bull.Job<DividendJobData | DividendPayoutJobData | EmailJobData>[]
> {
  const queue = getDividendQueue();
  return queue.getFailed();
}

/**
 * Retry a failed job
 */
export async function retryDividendJob(
  jobId: Bull.JobId
): Promise<void> {
  const queue = getDividendQueue();
  const job = await queue.getJob(jobId);
  
  if (job) {
    await job.retry();
    logger.info(`Retried dividend job`, { jobId });
  } else {
    throw new Error(`Job not found: ${jobId}`);
  }
}

/**
 * Retry all failed jobs
 */
export async function retryAllFailedDividendJobs(): Promise<void> {
  const queue = getDividendQueue();
  await queue.retryJobs({ count: 100 });
  logger.info('Retried all failed dividend jobs');
}

/**
 * Clean up old jobs
 */
export async function cleanupDividendQueue(
  options: {
    completed?: number;
    failed?: number;
  } = {}
): Promise<void> {
  const queue = getDividendQueue();
  
  const { completed = 200, failed = 100 } = options;

  logger.info(`Cleaning up dividend queue`, { completed, failed });

  await queue.clean(completed, 'completed');
  await queue.clean(failed, 'failed');
}

/**
 * Pause the queue
 */
export async function pauseDividendQueue(): Promise<void> {
  const queue = getDividendQueue();
  await queue.pause();
  logger.info('Dividend queue paused');
}

/**
 * Resume the queue
 */
export async function resumeDividendQueue(): Promise<void> {
  const queue = getDividendQueue();
  await queue.resume();
  logger.info('Dividend queue resumed');
}

/**
 * Close the queue connection
 */
export async function closeDividendQueue(): Promise<void> {
  if (dividendQueue) {
    await dividendQueue.close();
    dividendQueue = null;
    logger.info('Dividend queue closed');
  }
}

// ============================================================================
// Job Status Helpers
// ============================================================================

/**
 * Check if a dividend distribution is complete
 */
export async function isDividendDistributionComplete(dividendId: string): Promise<boolean> {
  const queue = getDividendQueue();
  
  // Get all jobs for this dividend
  const jobs = await queue.getJobs(['waiting', 'active', 'delayed']);
  const dividendJobs = jobs.filter(job => 
    'dividendId' in job.data && job.data.dividendId === dividendId
  );
  
  return dividendJobs.length === 0;
}

/**
 * Get the progress of a dividend distribution
 */
export async function getDividendDistributionProgress(
  dividendId: string,
  totalPayouts: number
): Promise<{ completed: number; failed: number; pending: number; progress: number }> {
  const queue = getDividendQueue();
  
  const [completed, failed, waiting, active, delayed] = await Promise.all([
    queue.getCompleted(),
    queue.getFailed(),
    queue.getWaiting(),
    queue.getActive(),
    queue.getDelayed(),
  ]);
  
  const isDividendJob = (job: Bull.Job) => 
    'dividendId' in job.data && job.data.dividendId === dividendId;
  
  const completedCount = completed.filter(isDividendJob).length;
  const failedCount = failed.filter(isDividendJob).length;
  const pendingCount = 
    waiting.filter(isDividendJob).length +
    active.filter(isDividendJob).length +
    delayed.filter(isDividendJob).length;
  
  const progress = totalPayouts > 0 
    ? Math.round((completedCount / totalPayouts) * 100) 
    : 0;
  
  return {
    completed: completedCount,
    failed: failedCount,
    pending: pendingCount,
    progress,
  };
}

// ============================================================================
// Export Configuration
// ============================================================================

export const dividendQueueConfig = {
  name: QUEUE_NAME,
  description: 'Processes dividend distribution jobs (distributions, payouts, notifications)',
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
};
