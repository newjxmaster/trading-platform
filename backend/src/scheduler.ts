/**
 * Trading Platform - Cron Scheduler
 * 
 * Centralized scheduler for all automated cron jobs.
 * Uses node-cron for scheduling with comprehensive error handling,
 * logging, and job status tracking.
 * 
 * Scheduled Jobs:
 * - MonthlyRevenueCalculation: 0 0 1 * * (Midnight on 1st of each month)
 * - DividendDistribution: 0 2 1 * * (2 AM on 1st of each month)
 * - StockPriceAdjustment: 0 3 1 * * (3 AM on 1st of each month)
 */

import cron from 'node-cron';
import { schedulerLogger as logger } from './utils/logger';
import { JobStatus, CronJobConfig, DatabaseClient } from './types';
import { sleep } from './utils/helpers';

// ============================================================================
// Job Registry
// ============================================================================

interface JobRegistryEntry {
  config: CronJobConfig;
  task?: cron.ScheduledTask;
  status: JobStatus;
}

const jobRegistry: Map<string, JobRegistryEntry> = new Map();

// ============================================================================
// Scheduler Configuration
// ============================================================================

const SCHEDULER_CONFIG = {
  // Timezone for all cron jobs
  timezone: process.env.TZ || 'UTC',
  
  // Delay between jobs to prevent resource contention (in ms)
  jobStaggerDelay: 5000,
  
  // Maximum execution time for a job before it's considered stalled (in ms)
  maxExecutionTime: 30 * 60 * 1000, // 30 minutes
  
  // Whether to run jobs immediately on scheduler start (for testing)
  runOnInit: process.env.RUN_JOBS_ON_INIT === 'true',
};

// ============================================================================
// Job Definitions
// ============================================================================

/**
 * Create job configurations for the trading platform
 */
export function createJobConfigurations(
  db: DatabaseClient,
  dependencies: JobDependencies
): CronJobConfig[] {
  return [
    {
      name: 'MonthlyRevenueCalculation',
      cronExpression: '0 0 1 * *', // Midnight on 1st of each month
      handler: async () => {
        const { executeRevenueCalculation } = await import('./automation/revenueCalculation');
        await executeRevenueCalculation(db, dependencies.bankApiClient);
      },
      enabled: true,
      runOnInit: SCHEDULER_CONFIG.runOnInit,
    },
    {
      name: 'DividendDistribution',
      cronExpression: '0 2 1 * *', // 2 AM on 1st of each month
      handler: async () => {
        const { executeDividendDistribution } = await import('./automation/dividendDistribution');
        await executeDividendDistribution(db, dependencies.notificationService);
      },
      enabled: true,
      runOnInit: SCHEDULER_CONFIG.runOnInit,
    },
    {
      name: 'StockPriceAdjustment',
      cronExpression: '0 3 1 * *', // 3 AM on 1st of each month
      handler: async () => {
        const { executeStockPriceAdjustment } = await import('./automation/stockPriceAdjustment');
        await executeStockPriceAdjustment(db, dependencies.websocketService);
      },
      enabled: true,
      runOnInit: SCHEDULER_CONFIG.runOnInit,
    },
  ];
}

// ============================================================================
// Job Dependencies Interface
// ============================================================================

export interface JobDependencies {
  bankApiClient: {
    fetchTransactions: (accountNumber: string, startDate: Date, endDate: Date) => Promise<unknown[]>;
  };
  notificationService?: {
    sendDividendNotification: (userId: string, companyName: string, amount: number, sharesOwned: number) => Promise<void>;
  };
  websocketService?: {
    broadcastPriceUpdate: (companyId: string, newPrice: number, oldPrice: number, changePercent: number) => Promise<void>;
  };
}

// ============================================================================
// Scheduler Initialization
// ============================================================================

/**
 * Initialize the cron scheduler with all jobs
 */
export function initializeScheduler(
  db: DatabaseClient,
  dependencies: JobDependencies
): void {
  logger.info('Initializing cron scheduler', { 
    timezone: SCHEDULER_CONFIG.timezone,
    runOnInit: SCHEDULER_CONFIG.runOnInit,
  });

  // Clear any existing jobs
  stopAllJobs();

  // Create job configurations
  const jobConfigs = createJobConfigurations(db, dependencies);

  // Register and schedule each job
  for (const config of jobConfigs) {
    registerJob(config);
  }

  logger.info(`Scheduler initialized with ${jobConfigs.length} jobs`);
}

/**
 * Register a job with the scheduler
 */
export function registerJob(config: CronJobConfig): void {
  // Validate cron expression
  if (!cron.validate(config.cronExpression)) {
    throw new Error(`Invalid cron expression: ${config.cronExpression} for job ${config.name}`);
  }

  // Initialize job status
  const status: JobStatus = {
    name: config.name,
    errorCount: 0,
    successCount: 0,
    isRunning: false,
  };

  // Store in registry
  jobRegistry.set(config.name, { config, status });

  // Schedule the job if enabled
  if (config.enabled) {
    scheduleJob(config.name);
  }

  logger.info(`Job registered: ${config.name}`, {
    cronExpression: config.cronExpression,
    enabled: config.enabled,
  });
}

/**
 * Schedule a job using node-cron
 */
function scheduleJob(jobName: string): void {
  const entry = jobRegistry.get(jobName);
  if (!entry) {
    throw new Error(`Job not found: ${jobName}`);
  }

  const { config } = entry;

  // Create the scheduled task
  const task = cron.schedule(
    config.cronExpression,
    async () => {
      await executeJob(jobName);
    },
    {
      scheduled: true,
      timezone: SCHEDULER_CONFIG.timezone,
    }
  );

  // Update registry with task
  entry.task = task;

  // Run immediately if configured
  if (config.runOnInit) {
    logger.info(`Running job immediately on init: ${jobName}`);
    setTimeout(() => executeJob(jobName), 1000);
  }
}

// ============================================================================
// Job Execution
// ============================================================================

/**
 * Execute a job with error handling and status tracking
 */
async function executeJob(jobName: string): Promise<void> {
  const entry = jobRegistry.get(jobName);
  if (!entry) {
    logger.error(`Cannot execute unknown job: ${jobName}`);
    return;
  }

  const { config, status } = entry;

  // Check if job is already running
  if (status.isRunning) {
    logger.warn(`Job ${jobName} is already running, skipping execution`);
    return;
  }

  // Update status
  status.isRunning = true;
  status.lastRun = new Date();

  const startTime = Date.now();
  logger.info(`[JOB START] ${jobName}`, { timestamp: new Date().toISOString() });

  try {
    // Execute the job handler
    await Promise.race([
      config.handler(),
      new Promise((_, reject) => 
        setTimeout(
          () => reject(new Error(`Job ${jobName} exceeded max execution time`)),
          SCHEDULER_CONFIG.maxExecutionTime
        )
      ),
    ]);

    // Update success status
    const duration = Date.now() - startTime;
    status.successCount++;
    status.lastSuccess = new Date();

    logger.info(`[JOB COMPLETE] ${jobName}`, {
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    // Update failure status
    const duration = Date.now() - startTime;
    status.errorCount++;
    status.lastError = new Date();

    logger.error(`[JOB FAILED] ${jobName}`, error as Error, {
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });

    // TODO: Send alert notification for repeated failures
    if (status.errorCount >= 3) {
      logger.error(`Job ${jobName} has failed ${status.errorCount} times, consider investigating`);
    }

  } finally {
    status.isRunning = false;
  }
}

/**
 * Manually trigger a job execution
 */
export async function triggerJob(jobName: string): Promise<void> {
  const entry = jobRegistry.get(jobName);
  if (!entry) {
    throw new Error(`Job not found: ${jobName}`);
  }

  logger.info(`Manually triggering job: ${jobName}`);
  await executeJob(jobName);
}

// ============================================================================
// Job Management
// ============================================================================

/**
 * Start a job (enable scheduling)
 */
export function startJob(jobName: string): void {
  const entry = jobRegistry.get(jobName);
  if (!entry) {
    throw new Error(`Job not found: ${jobName}`);
  }

  if (entry.task) {
    entry.task.start();
    entry.config.enabled = true;
    logger.info(`Job started: ${jobName}`);
  } else {
    scheduleJob(jobName);
    entry.config.enabled = true;
  }
}

/**
 * Stop a job (disable scheduling)
 */
export function stopJob(jobName: string): void {
  const entry = jobRegistry.get(jobName);
  if (!entry) {
    throw new Error(`Job not found: ${jobName}`);
  }

  if (entry.task) {
    entry.task.stop();
    entry.config.enabled = false;
    logger.info(`Job stopped: ${jobName}`);
  }
}

/**
 * Stop all jobs
 */
export function stopAllJobs(): void {
  for (const [name, entry] of jobRegistry.entries()) {
    if (entry.task) {
      entry.task.stop();
      entry.config.enabled = false;
      logger.info(`Job stopped: ${name}`);
    }
  }
}

/**
 * Destroy all jobs (stop and remove from registry)
 */
export function destroyAllJobs(): void {
  for (const [name, entry] of jobRegistry.entries()) {
    if (entry.task) {
      entry.task.destroy();
      logger.info(`Job destroyed: ${name}`);
    }
  }
  jobRegistry.clear();
  logger.info('All jobs destroyed');
}

// ============================================================================
// Job Status
// ============================================================================

/**
 * Get status of a specific job
 */
export function getJobStatus(jobName: string): JobStatus | null {
  const entry = jobRegistry.get(jobName);
  return entry ? { ...entry.status } : null;
}

/**
 * Get status of all jobs
 */
export function getAllJobStatuses(): JobStatus[] {
  return Array.from(jobRegistry.values()).map(entry => ({ ...entry.status }));
}

/**
 * Get job configuration
 */
export function getJobConfig(jobName: string): CronJobConfig | null {
  const entry = jobRegistry.get(jobName);
  return entry ? { ...entry.config } : null;
}

/**
 * Get all job configurations
 */
export function getAllJobConfigs(): CronJobConfig[] {
  return Array.from(jobRegistry.values()).map(entry => ({ ...entry.config }));
}

// ============================================================================
// Scheduler Health
// ============================================================================

export interface SchedulerHealth {
  healthy: boolean;
  totalJobs: number;
  runningJobs: number;
  failedJobs: number;
  lastExecution?: Date;
  jobs: Array<{
    name: string;
    enabled: boolean;
    isRunning: boolean;
    lastRun?: Date;
    lastSuccess?: Date;
    lastError?: Date;
    errorCount: number;
  }>;
}

/**
 * Get scheduler health status
 */
export function getSchedulerHealth(): SchedulerHealth {
  const jobs = getAllJobStatuses();
  
  const runningJobs = jobs.filter(j => j.isRunning).length;
  const failedJobs = jobs.filter(j => j.errorCount > 0).length;
  const lastExecution = jobs
    .filter(j => j.lastRun)
    .sort((a, b) => (b.lastRun!.getTime() - a.lastRun!.getTime()))[0]?.lastRun;

  return {
    healthy: failedJobs === 0,
    totalJobs: jobs.length,
    runningJobs,
    failedJobs,
    lastExecution,
    jobs: jobs.map(j => ({
      name: j.name,
      enabled: jobRegistry.get(j.name)?.config.enabled ?? false,
      isRunning: j.isRunning,
      lastRun: j.lastRun,
      lastSuccess: j.lastSuccess,
      lastError: j.lastError,
      errorCount: j.errorCount,
    })),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a cron expression is valid
 */
export function isValidCronExpression(expression: string): boolean {
  return cron.validate(expression);
}

/**
 * Get next execution time for a job
 */
export function getNextExecutionTime(jobName: string): Date | null {
  const entry = jobRegistry.get(jobName);
  if (!entry || !entry.config.enabled) {
    return null;
  }

  // Parse cron expression to get next execution
  // This is a simplified version - in production, use a proper cron parser
  const now = new Date();
  const [minute, hour, day, month, dayOfWeek] = entry.config.cronExpression.split(' ');

  // For monthly jobs (0 0 1 * *), next execution is 1st of next month
  if (minute === '0' && hour === '0' && day === '1' && month === '*' && dayOfWeek === '*') {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
    return next;
  }

  return null;
}

/**
 * Wait for all running jobs to complete
 */
export async function waitForRunningJobs(timeoutMs: number = 60000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const runningJobs = getAllJobStatuses().filter(j => j.isRunning);
    
    if (runningJobs.length === 0) {
      return true;
    }

    logger.info(`Waiting for ${runningJobs.length} jobs to complete...`);
    await sleep(1000);
  }

  logger.warn(`Timeout waiting for jobs to complete`);
  return false;
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

/**
 * Gracefully shutdown the scheduler
 */
export async function shutdownScheduler(): Promise<void> {
  logger.info('Shutting down scheduler...');

  // Stop all scheduled jobs
  stopAllJobs();

  // Wait for running jobs to complete
  await waitForRunningJobs();

  // Destroy all jobs
  destroyAllJobs();

  logger.info('Scheduler shutdown complete');
}

// ============================================================================
// Export Configuration
// ============================================================================

export const schedulerConfig = {
  name: 'TradingPlatformScheduler',
  description: 'Centralized scheduler for all automated cron jobs',
  config: SCHEDULER_CONFIG,
};
