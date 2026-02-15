/**
 * Trading Platform - Backend Automation Module
 * 
 * Complete automation and cron job system for the trading platform.
 * 
 * Features:
 * - Monthly Revenue Calculation (1st of month at midnight)
 * - Dividend Distribution (1st of month at 2 AM)
 * - Stock Price Adjustment (1st of month at 3 AM)
 * - Bull Queue System (Payment, Dividend, Email queues)
 * - Comprehensive logging and error handling
 * - Idempotent operations
 * - Transaction safety
 */

// ============================================================================
// Automation Jobs
// ============================================================================

export {
  // Revenue Calculation
  executeRevenueCalculation,
  manuallyCalculateRevenue,
  revenueCalculationConfig,
  type BankApiClient,
  
  // Dividend Distribution
  executeDividendDistribution,
  manuallyDistributeDividend,
  dividendDistributionConfig,
  type NotificationService,
  
  // Stock Price Adjustment
  executeStockPriceAdjustment,
  manuallyAdjustStockPrice,
  stockPriceAdjustmentConfig,
  type WebSocketService,
  
  // Configuration & Health
  defaultAutomationConfig,
  type AutomationConfig,
  type AutomationHealth,
  getAutomationHealth,
  executeManualJob,
  type ManualExecutionOptions,
} from './automation';

// ============================================================================
// Queue System
// ============================================================================

export {
  // Payment Queue
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
  
  // Dividend Queue
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
  
  // Email Queue
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
  
  // Queue Management
  initializeAllQueues,
  closeAllQueues,
  getQueueHealthStatus,
  type QueueInitializationOptions,
  type QueueHealthStatus,
} from './queues';

// ============================================================================
// Scheduler
// ============================================================================

export {
  initializeScheduler,
  registerJob,
  triggerJob,
  startJob,
  stopJob,
  stopAllJobs,
  destroyAllJobs,
  getJobStatus,
  getAllJobStatuses,
  getJobConfig,
  getAllJobConfigs,
  getSchedulerHealth,
  isValidCronExpression,
  getNextExecutionTime,
  waitForRunningJobs,
  shutdownScheduler,
  createJobConfigurations,
  schedulerConfig,
  type JobDependencies,
  type SchedulerHealth,
} from './scheduler';

// ============================================================================
// Utilities
// ============================================================================

export {
  // Logger
  Logger,
  automationLogger,
  revenueLogger,
  dividendLogger,
  priceLogger,
  queueLogger,
  schedulerLogger,
  dbLogger,
  
  // Database Helpers
  withTransaction,
  withRetry,
  withLock,
  revenueReportExists,
  dividendExists,
  priceHistoryExists,
  processInBatches,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getPreviousMonth,
  getLastNMonths,
  
  // Helper Functions
  roundToDecimals,
  formatCurrency,
  formatPercentage,
  clamp,
  calculatePercentageChange,
  calculateWeightedAverage,
  calculatePlatformFee,
  calculateDividendPool,
  calculateReinvestment,
  calculateDividendPerShare,
  calculateShareholderPayout,
  calculatePerformanceScore,
  calculateNewStockPrice,
  calculateVolumeScore,
  calculateDividendScore,
  isPositiveNumber,
  isValidPercentage,
  isValidUUID,
  startOfDay,
  endOfDay,
  isSameDay,
  formatDateForLog,
  sleep,
  withConcurrencyLimit,
  createError,
  safeJsonParse,
  success,
  failure,
  logJobStart,
  logJobComplete,
  logJobError,
  type Result,
} from './utils';

// ============================================================================
// Types
// ============================================================================

export type {
  // Database Entity Types
  User,
  Company,
  RevenueReport,
  Dividend,
  DividendPayout,
  StockHolding,
  BankTransaction,
  PriceHistory,
  Trade,
  
  // Job Queue Types
  PaymentJobData,
  DividendJobData,
  DividendPayoutJobData,
  EmailJobData,
  StockPriceJobData,
  QueueJobOptions,
  QueueMetrics,
  
  // Cron Job Types
  CronJobConfig,
  JobExecutionResult,
  JobStatus,
  
  // Revenue Calculation Types
  RevenueCalculationInput,
  RevenueCalculationResult,
  BankTransactionSummary,
  
  // Dividend Distribution Types
  DividendCalculationResult,
  ShareholderPayout,
  
  // Stock Price Adjustment Types
  PriceAdjustmentInput,
  PriceAdjustmentResult,
  PriceAdjustmentFactors,
  PerformanceMetrics,
  
  // Logger Types
  LogLevel,
  LogEntry,
} from './types';

// ============================================================================
// Module Version
// ============================================================================

export const VERSION = '1.0.0';
export const MODULE_NAME = 'TradingPlatformAutomation';

// ============================================================================
// Quick Start Guide
// ============================================================================

/**
 * Quick Start:
 * 
 * 1. Initialize Queues:
 *    ```typescript
 *    import { initializeAllQueues } from './queues';
 *    const queues = initializeAllQueues({ redisUrl: 'redis://localhost:6379' });
 *    ```
 * 
 * 2. Initialize Scheduler:
 *    ```typescript
 *    import { initializeScheduler } from './scheduler';
 *    initializeScheduler(db, {
 *      bankApiClient: yourBankApiClient,
 *      notificationService: yourNotificationService,
 *      websocketService: yourWebSocketService,
 *    });
 *    ```
 * 
 * 3. Manual Job Execution:
 *    ```typescript
 *    import { executeManualJob } from './automation';
 *    await executeManualJob('revenue', db, dependencies, { companyId: '...', month: 1, year: 2025 });
 *    ```
 * 
 * 4. Graceful Shutdown:
 *    ```typescript
 *    import { shutdownScheduler, closeAllQueues } from './';
 *    await shutdownScheduler();
 *    await closeAllQueues();
 *    ```
 */
