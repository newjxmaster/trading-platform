/**
 * Trading Platform - Email Queue
 * 
 * Bull queue for processing email notifications asynchronously.
 * Uses Redis as the backing store for job persistence and reliability.
 * 
 * Email Types:
 * - welcome: Welcome email for new users
 * - kyc_verified: KYC verification completed
 * - kyc_rejected: KYC verification rejected
 * - order_filled: Order has been filled
 * - dividend_received: Dividend payment received
 * - withdrawal_completed: Withdrawal processed
 * - deposit_completed: Deposit confirmed
 * - price_alert: Stock price alert
 * - company_update: Company news/update
 * - security_alert: Security-related notifications
 */

import Bull from 'bull';
import { queueLogger as logger } from '../utils/logger';
import { EmailJobData, QueueJobOptions, QueueMetrics } from '../types';

// ============================================================================
// Queue Configuration
// ============================================================================

const QUEUE_NAME = 'email-notifications';

const DEFAULT_JOB_OPTIONS: QueueJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: 50,   // Keep last 50 completed jobs
  removeOnFail: 25,       // Keep last 25 failed jobs
};

// ============================================================================
// Queue Setup
// ============================================================================

let emailQueue: Bull.Queue<EmailJobData> | null = null;

/**
 * Initialize the email queue
 */
export function initializeEmailQueue(
  redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379'
): Bull.Queue<EmailJobData> {
  if (emailQueue) {
    logger.warn('Email queue already initialized');
    return emailQueue;
  }

  logger.info('Initializing email queue', { redisUrl });

  emailQueue = new Bull<EmailJobData>(QUEUE_NAME, redisUrl, {
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
    settings: {
      stalledInterval: 30000,
      maxStalledCount: 2,
    },
  });

  setupEventHandlers(emailQueue);

  return emailQueue;
}

/**
 * Get the email queue instance
 */
export function getEmailQueue(): Bull.Queue<EmailJobData> {
  if (!emailQueue) {
    throw new Error('Email queue not initialized. Call initializeEmailQueue first.');
  }
  return emailQueue;
}

// ============================================================================
// Event Handlers
// ============================================================================

function setupEventHandlers(queue: Bull.Queue<EmailJobData>): void {
  // Job completed successfully
  queue.on('completed', (job, result) => {
    logger.info(`Email job completed`, {
      jobId: job.id,
      template: job.data.template,
      to: job.data.to,
      result,
    });
  });

  // Job failed
  queue.on('failed', (job, err) => {
    logger.error(`Email job failed`, err, {
      jobId: job.id,
      template: job.data.template,
      to: job.data.to,
      attempts: job.attemptsMade,
    });
  });

  // Job stalled
  queue.on('stalled', (job) => {
    logger.warn(`Email job stalled`, {
      jobId: job.id,
      template: job.data.template,
      to: job.data.to,
    });
  });

  // Job progress
  queue.on('progress', (job, progress) => {
    logger.debug(`Email job progress`, {
      jobId: job.id,
      template: job.data.template,
      progress,
    });
  });

  // Queue error
  queue.on('error', (error) => {
    logger.error('Email queue error', error);
  });
}

// ============================================================================
// Job Producers
// ============================================================================

/**
 * Add a generic email job to the queue
 */
export async function addEmailJob(
  to: string,
  subject: string,
  template: string,
  data: Record<string, unknown>,
  options?: QueueJobOptions
): Promise<Bull.Job<EmailJobData>> {
  const queue = getEmailQueue();
  
  const jobData: EmailJobData = {
    to,
    subject,
    template,
    data,
  };

  logger.info(`Adding email job`, { to, template });
  
  return queue.add(jobData, { ...DEFAULT_JOB_OPTIONS, ...options });
}

/**
 * Add a welcome email job
 */
export async function addWelcomeEmailJob(
  to: string,
  userName: string,
  options?: QueueJobOptions
): Promise<Bull.Job<EmailJobData>> {
  return addEmailJob(
    to,
    'Welcome to Trading Platform!',
    'welcome',
    { userName, loginUrl: `${process.env.FRONTEND_URL}/login` },
    options
  );
}

/**
 * Add a KYC verified email job
 */
export async function addKycVerifiedEmailJob(
  to: string,
  userName: string,
  options?: QueueJobOptions
): Promise<Bull.Job<EmailJobData>> {
  return addEmailJob(
    to,
    'Your KYC Verification is Complete',
    'kyc_verified',
    { userName },
    options
  );
}

/**
 * Add a KYC rejected email job
 */
export async function addKycRejectedEmailJob(
  to: string,
  userName: string,
  reason: string,
  options?: QueueJobOptions
): Promise<Bull.Job<EmailJobData>> {
  return addEmailJob(
    to,
    'KYC Verification Update Required',
    'kyc_rejected',
    { userName, reason },
    options
  );
}

/**
 * Add an order filled email job
 */
export async function addOrderFilledEmailJob(
  to: string,
  userName: string,
  orderType: 'buy' | 'sell',
  companyName: string,
  quantity: number,
  price: number,
  totalAmount: number,
  options?: QueueJobOptions
): Promise<Bull.Job<EmailJobData>> {
  return addEmailJob(
    to,
    `Your ${orderType.toUpperCase()} Order Has Been Filled`,
    'order_filled',
    {
      userName,
      orderType,
      companyName,
      quantity,
      price,
      totalAmount,
      orderDate: new Date().toISOString(),
    },
    options
  );
}

/**
 * Add a dividend received email job
 */
export async function addDividendReceivedEmailJob(
  to: string,
  userName: string,
  companyName: string,
  dividendAmount: number,
  sharesOwned: number,
  options?: QueueJobOptions
): Promise<Bull.Job<EmailJobData>> {
  return addEmailJob(
    to,
    `Dividend Payment Received from ${companyName}`,
    'dividend_received',
    {
      userName,
      companyName,
      dividendAmount,
      sharesOwned,
      paymentDate: new Date().toISOString(),
    },
    options
  );
}

/**
 * Add a withdrawal completed email job
 */
export async function addWithdrawalCompletedEmailJob(
  to: string,
  userName: string,
  amount: number,
  currency: string,
  paymentMethod: string,
  options?: QueueJobOptions
): Promise<Bull.Job<EmailJobData>> {
  return addEmailJob(
    to,
    'Your Withdrawal Has Been Processed',
    'withdrawal_completed',
    {
      userName,
      amount,
      currency,
      paymentMethod,
      processedDate: new Date().toISOString(),
    },
    options
  );
}

/**
 * Add a deposit completed email job
 */
export async function addDepositCompletedEmailJob(
  to: string,
  userName: string,
  amount: number,
  currency: string,
  paymentMethod: string,
  options?: QueueJobOptions
): Promise<Bull.Job<EmailJobData>> {
  return addEmailJob(
    to,
    'Your Deposit Has Been Confirmed',
    'deposit_completed',
    {
      userName,
      amount,
      currency,
      paymentMethod,
      confirmedDate: new Date().toISOString(),
    },
    options
  );
}

/**
 * Add a price alert email job
 */
export async function addPriceAlertEmailJob(
  to: string,
  userName: string,
  companyName: string,
  currentPrice: number,
  targetPrice: number,
  alertType: 'above' | 'below',
  options?: QueueJobOptions
): Promise<Bull.Job<EmailJobData>> {
  return addEmailJob(
    to,
    `Price Alert: ${companyName}`,
    'price_alert',
    {
      userName,
      companyName,
      currentPrice,
      targetPrice,
      alertType,
      alertDate: new Date().toISOString(),
    },
    options
  );
}

/**
 * Add a company update email job
 */
export async function addCompanyUpdateEmailJob(
  to: string,
  userName: string,
  companyName: string,
  updateTitle: string,
  updateContent: string,
  options?: QueueJobOptions
): Promise<Bull.Job<EmailJobData>> {
  return addEmailJob(
    to,
    `Update from ${companyName}`,
    'company_update',
    {
      userName,
      companyName,
      updateTitle,
      updateContent,
      updateDate: new Date().toISOString(),
    },
    options
  );
}

/**
 * Add a security alert email job
 */
export async function addSecurityAlertEmailJob(
  to: string,
  userName: string,
  alertType: 'login' | 'password_change' | 'suspicious_activity',
  details: Record<string, unknown>,
  options?: QueueJobOptions
): Promise<Bull.Job<EmailJobData>> {
  const subjectMap = {
    login: 'New Login Detected',
    password_change: 'Password Changed',
    suspicious_activity: 'Suspicious Activity Detected',
  };

  return addEmailJob(
    to,
    subjectMap[alertType],
    'security_alert',
    {
      userName,
      alertType,
      details,
      alertDate: new Date().toISOString(),
    },
    { ...options, priority: 1 }  // High priority for security alerts
  );
}

/**
 * Add email jobs in bulk
 */
export async function addBulkEmailJobs(
  emails: Array<{
    to: string;
    subject: string;
    template: string;
    data: Record<string, unknown>;
  }>,
  options?: QueueJobOptions
): Promise<Bull.Job<EmailJobData>[]> {
  const queue = getEmailQueue();
  
  const jobs = emails.map(email => ({
    data: {
      to: email.to,
      subject: email.subject,
      template: email.template,
      data: email.data,
    },
    opts: { ...DEFAULT_JOB_OPTIONS, ...options },
  }));

  logger.info(`Adding ${jobs.length} email jobs in bulk`);
  
  return queue.addBulk(jobs);
}

// ============================================================================
// Job Consumers (Processors)
// ============================================================================

export interface EmailProcessor {
  sendEmail: (job: Bull.Job<EmailJobData>) => Promise<unknown>;
}

/**
 * Setup job processors for the email queue
 */
export function setupEmailProcessors(processor: EmailProcessor): void {
  const queue = getEmailQueue();

  // Process all emails with a single processor
  queue.process(10, async (job) => {
    logger.info(`Processing email`, { 
      jobId: job.id, 
      template: job.data.template,
      to: job.data.to 
    });
    return processor.sendEmail(job);
  });

  logger.info('Email processors setup complete');
}

// ============================================================================
// Queue Management
// ============================================================================

/**
 * Get queue metrics
 */
export async function getEmailQueueMetrics(): Promise<QueueMetrics> {
  const queue = getEmailQueue();
  
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
export async function cleanupEmailQueue(
  options: {
    completed?: number;
    failed?: number;
  } = {}
): Promise<void> {
  const queue = getEmailQueue();
  
  const { completed = 50, failed = 25 } = options;

  logger.info(`Cleaning up email queue`, { completed, failed });

  await queue.clean(completed, 'completed');
  await queue.clean(failed, 'failed');
}

/**
 * Pause the queue
 */
export async function pauseEmailQueue(): Promise<void> {
  const queue = getEmailQueue();
  await queue.pause();
  logger.info('Email queue paused');
}

/**
 * Resume the queue
 */
export async function resumeEmailQueue(): Promise<void> {
  const queue = getEmailQueue();
  await queue.resume();
  logger.info('Email queue resumed');
}

/**
 * Close the queue connection
 */
export async function closeEmailQueue(): Promise<void> {
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
    logger.info('Email queue closed');
  }
}

// ============================================================================
// Scheduled/Delayed Emails
// ============================================================================

/**
 * Schedule an email to be sent at a specific time
 */
export async function scheduleEmail(
  to: string,
  subject: string,
  template: string,
  data: Record<string, unknown>,
  sendAt: Date,
  options?: QueueJobOptions
): Promise<Bull.Job<EmailJobData>> {
  const queue = getEmailQueue();
  
  const jobData: EmailJobData = {
    to,
    subject,
    template,
    data,
  };

  const delay = sendAt.getTime() - Date.now();
  
  if (delay < 0) {
    throw new Error('Cannot schedule email in the past');
  }

  logger.info(`Scheduling email`, { to, template, sendAt: sendAt.toISOString() });
  
  return queue.add(jobData, { 
    ...DEFAULT_JOB_OPTIONS, 
    ...options,
    delay,
  });
}

/**
 * Cancel a scheduled email
 */
export async function cancelScheduledEmail(jobId: Bull.JobId): Promise<boolean> {
  const queue = getEmailQueue();
  const job = await queue.getJob(jobId);
  
  if (job) {
    await job.remove();
    logger.info(`Cancelled scheduled email`, { jobId });
    return true;
  }
  
  return false;
}

// ============================================================================
// Export Configuration
// ============================================================================

export const emailQueueConfig = {
  name: QUEUE_NAME,
  description: 'Processes email notifications (welcome, KYC, orders, dividends, alerts)',
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
};
