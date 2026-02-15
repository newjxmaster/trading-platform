/**
 * Trading Platform - Database Utilities
 * Helper functions for database operations with transaction safety
 */

import { dbLogger } from './logger';

// ============================================================================
// Database Connection Interface (to be implemented with actual ORM)
// ============================================================================

export interface DatabaseClient {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  transaction: <T>(callback: (trx: TransactionClient) => Promise<T>) => Promise<T>;
}

export interface TransactionClient {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  rollback: () => Promise<void>;
  commit: () => Promise<void>;
}

// ============================================================================
// Transaction Helper
// ============================================================================

/**
 * Execute a function within a database transaction
 * Automatically rolls back on error, commits on success
 */
export async function withTransaction<T>(
  db: DatabaseClient,
  operation: (trx: TransactionClient) => Promise<T>,
  operationName: string = 'unnamed_operation'
): Promise<T> {
  const startTime = Date.now();
  dbLogger.info(`Starting transaction: ${operationName}`);

  try {
    const result = await db.transaction(async (trx) => {
      try {
        const opResult = await operation(trx);
        dbLogger.info(`Transaction operation completed: ${operationName}`);
        return opResult;
      } catch (error) {
        dbLogger.error(`Transaction operation failed: ${operationName}`, error as Error);
        await trx.rollback();
        throw error;
      }
    });

    const duration = Date.now() - startTime;
    dbLogger.info(`Transaction committed successfully: ${operationName}`, { durationMs: duration });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    dbLogger.error(`Transaction failed and rolled back: ${operationName}`, error as Error, { durationMs: duration });
    throw error;
  }
}

// ============================================================================
// Idempotency Helpers
// ============================================================================

/**
 * Check if a revenue report already exists for a company/month/year
 * Used to ensure idempotent revenue calculations
 */
export async function revenueReportExists(
  db: DatabaseClient,
  companyId: string,
  month: number,
  year: number
): Promise<boolean> {
  const result = await db.query(
    `SELECT id FROM revenue_reports 
     WHERE company_id = $1 AND report_month = $2 AND report_year = $3 
     LIMIT 1`,
    [companyId, month, year]
  );
  return (result as { id: string }[]).length > 0;
}

/**
 * Check if a dividend has already been distributed for a revenue report
 * Used to ensure idempotent dividend distributions
 */
export async function dividendExists(
  db: DatabaseClient,
  revenueReportId: string
): Promise<boolean> {
  const result = await db.query(
    `SELECT id FROM dividends WHERE revenue_report_id = $1 LIMIT 1`,
    [revenueReportId]
  );
  return (result as { id: string }[]).length > 0;
}

/**
 * Check if a price history entry already exists for a company at a specific time
 * Used to ensure idempotent price adjustments
 */
export async function priceHistoryExists(
  db: DatabaseClient,
  companyId: string,
  timestamp: Date
): Promise<boolean> {
  // Check within a 1-minute window to account for timing variations
  const result = await db.query(
    `SELECT id FROM price_history 
     WHERE company_id = $1 
     AND timestamp BETWEEN $2 AND $3 
     LIMIT 1`,
    [companyId, new Date(timestamp.getTime() - 60000), new Date(timestamp.getTime() + 60000)]
  );
  return (result as { id: string }[]).length > 0;
}

// ============================================================================
// Lock Helpers (for preventing concurrent operations)
// ============================================================================

interface LockManager {
  acquire: (lockKey: string, ttlSeconds: number) => Promise<boolean>;
  release: (lockKey: string) => Promise<void>;
}

/**
 * Execute an operation with a distributed lock
 * Prevents concurrent execution of the same job
 */
export async function withLock<T>(
  lockManager: LockManager,
  lockKey: string,
  operation: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T | null> {
  const acquired = await lockManager.acquire(lockKey, ttlSeconds);
  
  if (!acquired) {
    dbLogger.warn(`Could not acquire lock: ${lockKey}`);
    return null;
  }

  try {
    dbLogger.info(`Lock acquired: ${lockKey}`);
    const result = await operation();
    return result;
  } finally {
    await lockManager.release(lockKey);
    dbLogger.info(`Lock released: ${lockKey}`);
  }
}

// ============================================================================
// Batch Processing Helpers
// ============================================================================

/**
 * Process items in batches to avoid memory issues
 */
export async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    dbLogger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`, {
      batchSize: batch.length,
      totalItems: items.length,
    });
    
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }
  
  return results;
}

// ============================================================================
// Date Helpers
// ============================================================================

/**
 * Get the first day of a month
 */
export function getFirstDayOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1);
}

/**
 * Get the last day of a month
 */
export function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

/**
 * Get the previous month
 */
export function getPreviousMonth(date: Date = new Date()): { month: number; year: number } {
  const d = new Date(date);
  d.setMonth(d.getMonth() - 1);
  return {
    month: d.getMonth() + 1,
    year: d.getFullYear(),
  };
}

/**
 * Get the last N months
 */
export function getLastNMonths(n: number, date: Date = new Date()): Array<{ month: number; year: number }> {
  const months: Array<{ month: number; year: number }> = [];
  const d = new Date(date);
  
  for (let i = 0; i < n; i++) {
    d.setMonth(d.getMonth() - 1);
    months.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    });
  }
  
  return months;
}

// ============================================================================
// Error Recovery Helpers
// ============================================================================

/**
 * Retry an operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    retryableErrors?: string[];
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'],
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      const isRetryable = retryableErrors.some(errCode => 
        lastError!.message.includes(errCode)
      );

      if (!isRetryable || attempt === maxAttempts) {
        throw lastError;
      }

      dbLogger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`, {
        error: lastError.message,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}
