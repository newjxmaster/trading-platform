/**
 * Trading Platform - Utilities Index
 * 
 * Centralized exports for all utility modules.
 */

// ============================================================================
// Logger
// ============================================================================

export {
  default as Logger,
  automationLogger,
  revenueLogger,
  dividendLogger,
  priceLogger,
  queueLogger,
  schedulerLogger,
  dbLogger,
} from './logger';

// ============================================================================
// Database Helpers
// ============================================================================

export {
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
  type DatabaseClient,
  type TransactionClient,
  type LockManager,
} from './database';

// ============================================================================
// Helper Functions
// ============================================================================

export {
  // Number formatting
  roundToDecimals,
  formatCurrency,
  formatPercentage,
  clamp,
  
  // Calculations
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
  
  // Validation
  isPositiveNumber,
  isValidPercentage,
  isValidUUID,
  
  // Date helpers
  startOfDay,
  endOfDay,
  isSameDay,
  formatDateForLog,
  
  // Async helpers
  sleep,
  withConcurrencyLimit,
  
  // Error helpers
  createError,
  safeJsonParse,
  
  // Result helpers
  success,
  failure,
  type Result,
  
  // Logging helpers
  logJobStart,
  logJobComplete,
  logJobError,
} from './helpers';
