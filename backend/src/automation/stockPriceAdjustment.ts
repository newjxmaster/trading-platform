/**
 * Trading Platform - Stock Price Adjustment
 * 
 * This module handles automated monthly stock price adjustments based on company performance.
 * 
 * Cron Schedule: 0 3 1 * * (Runs at 3 AM on the 1st of each month)
 * 
 * Process:
 * 1. For each active company:
 *    - Get last 2 months revenue reports
 *    - Calculate revenue growth: (thisMonth - lastMonth) / lastMonth
 *    - Calculate profit margin: net_profit / net_revenue
 *    - Get trading volume for the month
 *    - Check dividend consistency (last 3 months)
 *    - Calculate performance score:
 *      * revenueGrowth * 0.4
 *      * profitMargin * 0.3
 *      * volumeScore * 0.2
 *      * dividendScore * 0.1
 *    - newPrice = currentPrice * (1 + performanceScore)
 *    - Cap at ±20% change per month
 *    - Update company.current_price
 *    - Record in price_history
 * 
 * Key Features:
 * - Idempotent: Won't create duplicate price history entries
 * - Transaction-safe: All updates within database transactions
 * - Comprehensive logging: Full audit trail
 * - Error recovery: Continues processing other companies on individual failures
 */

import { priceLogger as logger } from '../utils/logger';
import {
  withTransaction,
  withRetry,
  priceHistoryExists,
  getPreviousMonth,
  getLastNMonths,
  getFirstDayOfMonth,
  getLastDayOfMonth,
} from '../utils/database';
import {
  roundToDecimals,
  calculatePerformanceScore,
  calculateNewStockPrice,
  calculateVolumeScore,
  calculateDividendScore,
  clamp,
  logJobStart,
  logJobComplete,
  logJobError,
} from '../utils/helpers';
import {
  DatabaseClient,
  Company,
  RevenueReport,
  PriceHistory,
  Dividend,
  Trade,
  PriceAdjustmentResult,
  PerformanceMetrics,
  PriceAdjustmentFactors,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  MAX_PRICE_CHANGE_PERCENT: 0.20,  // ±20% max change per month
  VOLUME_SCORE_CAP: 0.20,          // Volume score capped at 20%
  DIVIDEND_SCORE_CAP: 0.10,        // Dividend score capped at 10%
  WEIGHTS: {
    revenueGrowth: 0.4,
    profitMargin: 0.3,
    volumeScore: 0.2,
    dividendScore: 0.1,
  },
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
};

// ============================================================================
// Main Stock Price Adjustment Job
// ============================================================================

/**
 * Execute the stock price adjustment job
 * This is the main entry point called by the cron scheduler
 */
export async function executeStockPriceAdjustment(
  db: DatabaseClient,
  websocketService?: WebSocketService
): Promise<void> {
  const jobName = 'StockPriceAdjustment';
  const startTime = Date.now();
  
  logJobStart(jobName, { timestamp: new Date().toISOString() });
  
  try {
    // Get the previous month (the month we're adjusting prices for)
    const { month, year } = getPreviousMonth();
    const periodStart = getFirstDayOfMonth(year, month);
    const periodEnd = getLastDayOfMonth(year, month);
    
    logger.info(`Adjusting stock prices for ${month}/${year}`, {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    });

    // Fetch all active companies
    const companies = await fetchActiveCompanies(db);
    logger.info(`Found ${companies.length} active companies to process`);

    // Process each company
    const results: PriceAdjustmentResult[] = [];
    
    for (const company of companies) {
      try {
        const result = await processCompanyPriceAdjustment(
          db,
          company,
          month,
          year,
          periodStart,
          periodEnd
        );
        results.push(result);
        
        if (result.success) {
          logger.info(`Price adjusted for ${company.business_name}`, {
            companyId: company.id,
            oldPrice: result.oldPrice,
            newPrice: result.newPrice,
            changePercent: result.priceChangePercent,
            performanceScore: result.performanceScore,
          });

          // Broadcast price update via WebSocket
          if (websocketService) {
            try {
              await websocketService.broadcastPriceUpdate(
                company.id,
                result.newPrice,
                result.oldPrice,
                result.priceChangePercent
              );
            } catch (error) {
              logger.error(`Failed to broadcast price update for ${company.id}`, error as Error);
            }
          }
        } else {
          logger.error(`Failed to adjust price for ${company.business_name}`, 
            new Error(result.error || 'Unknown error'));
        }
      } catch (error) {
        logger.error(`Unexpected error processing company ${company.business_name}`, 
          error as Error);
        
        results.push({
          companyId: company.id,
          oldPrice: company.current_price,
          newPrice: company.current_price,
          priceChange: 0,
          priceChangePercent: 0,
          performanceScore: 0,
          factors: {
            revenueGrowth: 0,
            profitMargin: 0,
            volumeScore: 0,
            dividendScore: 0,
          },
          success: false,
          error: (error as Error).message,
        });
      }
    }

    // Log summary
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    const priceIncreases = results.filter(r => r.success && r.priceChange > 0).length;
    const priceDecreases = results.filter(r => r.success && r.priceChange < 0).length;
    const unchanged = results.filter(r => r.success && r.priceChange === 0).length;
    const duration = Date.now() - startTime;
    
    logJobComplete(jobName, duration, {
      totalCompanies: companies.length,
      successCount,
      failureCount,
      priceIncreases,
      priceDecreases,
      unchanged,
      month,
      year,
    });

    if (failureCount > 0) {
      logger.warn(`${failureCount} companies failed price adjustment`, {
        failures: results.filter(r => !r.success).map(r => ({ 
          companyId: r.companyId, 
          error: r.error 
        })),
      });
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    logJobError(jobName, error as Error, duration);
    throw error;
  }
}

// ============================================================================
// Company Price Adjustment Processing
// ============================================================================

/**
 * Process price adjustment for a single company
 */
async function processCompanyPriceAdjustment(
  db: DatabaseClient,
  company: Company,
  month: number,
  year: number,
  periodStart: Date,
  periodEnd: Date
): Promise<PriceAdjustmentResult> {
  const companyLogger = logger.child(`company:${company.id}`);
  
  // Check if price history already exists for this month (idempotency check)
  const timestamp = new Date(year, month - 1, 1, 3, 0, 0); // 3 AM on 1st of month
  const exists = await priceHistoryExists(db, company.id, timestamp);
  if (exists) {
    companyLogger.info('Price history already exists for this month, skipping');
    return {
      companyId: company.id,
      oldPrice: company.current_price,
      newPrice: company.current_price,
      priceChange: 0,
      priceChangePercent: 0,
      performanceScore: 0,
      factors: {
        revenueGrowth: 0,
        profitMargin: 0,
        volumeScore: 0,
        dividendScore: 0,
      },
      success: true,
      error: 'Price history already exists',
    };
  }

  // Get last 2 months revenue reports
  const revenueReports = await fetchRevenueReports(db, company.id, 2);
  
  if (revenueReports.length < 2) {
    companyLogger.info('Insufficient revenue history for price adjustment', {
      reportsFound: revenueReports.length,
    });
    return {
      companyId: company.id,
      oldPrice: company.current_price,
      newPrice: company.current_price,
      priceChange: 0,
      priceChangePercent: 0,
      performanceScore: 0,
      factors: {
        revenueGrowth: 0,
        profitMargin: 0,
        volumeScore: 0,
        dividendScore: 0,
      },
      success: true,
      error: 'Insufficient revenue history (need at least 2 months)',
    };
  }

  const [thisMonth, lastMonth] = revenueReports;

  // Calculate performance metrics
  const metrics = await calculatePerformanceMetrics(
    db,
    company,
    thisMonth,
    lastMonth,
    periodStart,
    periodEnd
  );

  companyLogger.info('Performance metrics calculated', metrics);

  // Calculate performance score
  const factors: PriceAdjustmentFactors = {
    revenueGrowth: metrics.revenueGrowth,
    profitMargin: metrics.profitMargin,
    volumeScore: metrics.volumeScore,
    dividendScore: metrics.dividendScore,
  };

  const performanceScore = calculatePerformanceScore(factors);

  // Calculate new price
  const { newPrice, capped } = calculateNewStockPrice(
    company.current_price,
    performanceScore,
    CONFIG.MAX_PRICE_CHANGE_PERCENT
  );

  const priceChange = roundToDecimals(newPrice - company.current_price);
  const priceChangePercent = roundToDecimals((priceChange / company.current_price) * 100);

  companyLogger.info('Price calculation complete', {
    currentPrice: company.current_price,
    performanceScore,
    newPrice,
    priceChange,
    priceChangePercent,
    capped,
  });

  // Update company price and record in history within transaction
  await withTransaction(
    db,
    async (trx) => {
      // Update company current price
      await updateCompanyPrice(trx, company.id, newPrice);

      // Record in price history
      await createPriceHistoryRecord(trx, {
        companyId: company.id,
        price: newPrice,
        volume: metrics.tradingVolume,
        timestamp,
      });
    },
    `price_adjustment_${company.id}_${month}_${year}`
  );

  return {
    companyId: company.id,
    oldPrice: company.current_price,
    newPrice,
    priceChange,
    priceChangePercent,
    performanceScore,
    factors,
    success: true,
  };
}

// ============================================================================
// Performance Metrics Calculation
// ============================================================================

/**
 * Calculate all performance metrics for a company
 */
async function calculatePerformanceMetrics(
  db: DatabaseClient,
  company: Company,
  thisMonth: RevenueReport,
  lastMonth: RevenueReport,
  periodStart: Date,
  periodEnd: Date
): Promise<PerformanceMetrics> {
  // Calculate revenue growth
  const revenueGrowth = calculateRevenueGrowth(
    thisMonth.net_revenue,
    lastMonth.net_revenue
  );

  // Calculate profit margin
  const profitMargin = calculateProfitMargin(
    thisMonth.net_profit,
    thisMonth.net_revenue
  );

  // Get trading volume for the month
  const tradingVolume = await fetchTradingVolume(db, company.id, periodStart, periodEnd);

  // Calculate volume score
  const volumeScore = calculateVolumeScore(tradingVolume, company.total_shares);

  // Check dividend consistency
  const dividendCount = await fetchDividendCount(db, company.id, 3);
  const dividendScore = calculateDividendScore(dividendCount, 3);

  return {
    revenueGrowth,
    profitMargin,
    tradingVolume,
    volumeScore,
    dividendConsistency: dividendCount,
    dividendScore,
  };
}

/**
 * Calculate revenue growth rate
 */
function calculateRevenueGrowth(thisMonthRevenue: number, lastMonthRevenue: number): number {
  if (lastMonthRevenue === 0) return 0;
  return roundToDecimals((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue, 4);
}

/**
 * Calculate profit margin
 */
function calculateProfitMargin(netProfit: number, netRevenue: number): number {
  if (netRevenue === 0) return 0;
  return roundToDecimals(netProfit / netRevenue, 4);
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Fetch all active companies from the database
 */
async function fetchActiveCompanies(db: DatabaseClient): Promise<Company[]> {
  const result = await db.query(
    `SELECT * FROM companies 
     WHERE listing_status = 'active' 
     AND verification_status = 'approved'
     ORDER BY created_at ASC`
  );
  return result as Company[];
}

/**
 * Fetch revenue reports for a company
 */
async function fetchRevenueReports(
  db: DatabaseClient,
  companyId: string,
  limit: number
): Promise<RevenueReport[]> {
  const result = await db.query(
    `SELECT * FROM revenue_reports 
     WHERE company_id = $1 
     AND verification_status IN ('auto_verified', 'verified')
     ORDER BY report_year DESC, report_month DESC
     LIMIT $2`,
    [companyId, limit]
  );
  return result as RevenueReport[];
}

/**
 * Fetch trading volume for a company within a date range
 */
async function fetchTradingVolume(
  db: DatabaseClient,
  companyId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const result = await db.query(
    `SELECT COALESCE(SUM(quantity), 0) as total_volume 
     FROM trades 
     WHERE company_id = $1 
     AND executed_at >= $2 
     AND executed_at <= $3`,
    [companyId, startDate, endDate]
  );
  return parseInt((result as { total_volume: string }[])[0]?.total_volume || '0', 10);
}

/**
 * Fetch dividend count for the last N months
 */
async function fetchDividendCount(
  db: DatabaseClient,
  companyId: string,
  months: number
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);

  const result = await db.query(
    `SELECT COUNT(*) as dividend_count 
     FROM dividends 
     WHERE company_id = $1 
     AND payment_status = 'completed'
     AND distribution_date >= $2`,
    [companyId, cutoffDate]
  );
  return parseInt((result as { dividend_count: string }[])[0]?.dividend_count || '0', 10);
}

/**
 * Update company current price
 */
async function updateCompanyPrice(
  trx: { query: (sql: string, params?: unknown[]) => Promise<unknown[]> },
  companyId: string,
  newPrice: number
): Promise<void> {
  await trx.query(
    `UPDATE companies 
     SET current_price = $1, updated_at = NOW()
     WHERE id = $2`,
    [newPrice, companyId]
  );
}

/**
 * Create a price history record
 */
async function createPriceHistoryRecord(
  trx: { query: (sql: string, params?: unknown[]) => Promise<unknown[]> },
  data: {
    companyId: string;
    price: number;
    volume: number;
    timestamp: Date;
  }
): Promise<void> {
  await trx.query(
    `INSERT INTO price_history 
     (company_id, price, volume, timestamp)
     VALUES ($1, $2, $3, $4)`,
    [data.companyId, data.price, data.volume, data.timestamp]
  );
}

// ============================================================================
// WebSocket Service Interface
// ============================================================================

export interface WebSocketService {
  broadcastPriceUpdate: (
    companyId: string,
    newPrice: number,
    oldPrice: number,
    changePercent: number
  ) => Promise<void>;
}

// ============================================================================
// Manual Trigger (for testing/admin)
// ============================================================================

/**
 * Manually trigger price adjustment for a specific company
 * Useful for testing or correcting data
 */
export async function manuallyAdjustStockPrice(
  db: DatabaseClient,
  companyId: string,
  month: number,
  year: number,
  websocketService?: WebSocketService
): Promise<PriceAdjustmentResult> {
  logger.info(`Manual price adjustment triggered`, { companyId, month, year });

  // Fetch company
  const companyResult = await db.query(
    'SELECT * FROM companies WHERE id = $1 LIMIT 1',
    [companyId]
  );
  
  const company = (companyResult as Company[])[0];
  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  const periodStart = getFirstDayOfMonth(year, month);
  const periodEnd = getLastDayOfMonth(year, month);

  const result = await processCompanyPriceAdjustment(
    db,
    company,
    month,
    year,
    periodStart,
    periodEnd
  );

  // Broadcast price update if successful
  if (result.success && websocketService) {
    try {
      await websocketService.broadcastPriceUpdate(
        companyId,
        result.newPrice,
        result.oldPrice,
        result.priceChangePercent
      );
    } catch (error) {
      logger.error(`Failed to broadcast price update for ${companyId}`, error as Error);
    }
  }

  return result;
}

// ============================================================================
// Export Configuration
// ============================================================================

export const stockPriceAdjustmentConfig = {
  name: 'StockPriceAdjustment',
  cronExpression: '0 3 1 * *', // 3 AM on 1st of each month
  description: 'Adjusts stock prices based on company performance metrics',
  config: CONFIG,
};
