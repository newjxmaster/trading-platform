/**
 * Trading Platform - Dividend Distribution
 * 
 * This module handles automated dividend distribution to shareholders.
 * 
 * Cron Schedule: 0 2 1 * * (Runs at 2 AM on the 1st of each month)
 * 
 * Process:
 * 1. Get verified revenue reports from the previous month
 * 2. Calculate dividend per share: dividend_pool / total_shares
 * 3. Create dividend record
 * 4. For each shareholder:
 *    - Calculate payout: shares_owned * dividend_per_share
 *    - Create dividend_payout record
 *    - Credit user wallet
 *    - Update total_dividends_earned in holdings
 * 5. Mark dividend as completed
 * 
 * Key Features:
 * - Idempotent: Won't create duplicate dividends for the same revenue report
 * - Transaction-safe: All wallet updates within database transactions
 * - Batch processing: Handles large shareholder lists efficiently
 * - Comprehensive logging: Full audit trail
 * - Error recovery: Continues processing on individual failures
 */

import { dividendLogger as logger } from '../utils/logger';
import {
  withTransaction,
  withRetry,
  dividendExists,
  processInBatches,
  getPreviousMonth,
} from '../utils/database';
import {
  roundToDecimals,
  calculateDividendPerShare,
  calculateShareholderPayout,
  clamp,
  logJobStart,
  logJobComplete,
  logJobError,
} from '../utils/helpers';
import {
  DatabaseClient,
  Company,
  RevenueReport,
  Dividend,
  DividendPayout,
  StockHolding,
  DividendCalculationResult,
  ShareholderPayout,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  BATCH_SIZE: 100,              // Process shareholders in batches of 100
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  MINIMUM_PAYOUT_AMOUNT: 0.01,  // Minimum payout to process (in USD)
};

// ============================================================================
// Main Dividend Distribution Job
// ============================================================================

/**
 * Execute the dividend distribution job
 * This is the main entry point called by the cron scheduler
 */
export async function executeDividendDistribution(
  db: DatabaseClient,
  notificationService?: NotificationService
): Promise<void> {
  const jobName = 'DividendDistribution';
  const startTime = Date.now();
  
  logJobStart(jobName, { timestamp: new Date().toISOString() });
  
  try {
    // Get the previous month (the month we're distributing dividends for)
    const { month, year } = getPreviousMonth();
    
    logger.info(`Distributing dividends for ${month}/${year}`);

    // Fetch verified revenue reports for the previous month
    const reports = await fetchVerifiedRevenueReports(db, month, year);
    logger.info(`Found ${reports.length} verified revenue reports to process`);

    if (reports.length === 0) {
      logger.info('No verified revenue reports found, skipping dividend distribution');
      logJobComplete(jobName, Date.now() - startTime, { reportsProcessed: 0 });
      return;
    }

    // Process each revenue report
    const results: DividendCalculationResult[] = [];
    
    for (const report of reports) {
      try {
        const result = await processDividendForReport(
          db,
          report,
          notificationService
        );
        results.push(result);
        
        if (result.success) {
          logger.info(`Dividends distributed for company ${result.companyId}`, {
            dividendId: result.dividendId,
            totalPayoutAmount: result.totalPayoutAmount,
            shareholderCount: result.shareholderCount,
          });
        } else {
          logger.error(`Failed to distribute dividends for company ${result.companyId}`, 
            new Error(result.error || 'Unknown error'));
        }
      } catch (error) {
        logger.error(`Unexpected error processing dividend for report ${report.id}`, 
          error as Error);
        
        results.push({
          companyId: report.company_id,
          revenueReportId: report.id,
          totalDividendPool: report.dividend_pool,
          totalShares: 0,
          amountPerShare: 0,
          shareholderCount: 0,
          totalPayoutAmount: 0,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    // Log summary
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    const totalPayoutAmount = results.reduce((sum, r) => sum + r.totalPayoutAmount, 0);
    const totalShareholders = results.reduce((sum, r) => sum + r.shareholderCount, 0);
    const duration = Date.now() - startTime;
    
    logJobComplete(jobName, duration, {
      totalReports: reports.length,
      successCount,
      failureCount,
      totalPayoutAmount,
      totalShareholders,
      month,
      year,
    });

    if (failureCount > 0) {
      logger.warn(`${failureCount} companies failed dividend distribution`, {
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
// Revenue Report Processing
// ============================================================================

/**
 * Process dividend distribution for a single revenue report
 */
async function processDividendForReport(
  db: DatabaseClient,
  report: RevenueReport,
  notificationService?: NotificationService
): Promise<DividendCalculationResult> {
  const reportLogger = logger.child(`report:${report.id}`);
  
  // Check if dividend already exists (idempotency check)
  const exists = await dividendExists(db, report.id);
  if (exists) {
    reportLogger.info('Dividend already exists for this revenue report, skipping');
    return {
      companyId: report.company_id,
      revenueReportId: report.id,
      totalDividendPool: report.dividend_pool,
      totalShares: 0,
      amountPerShare: 0,
      shareholderCount: 0,
      totalPayoutAmount: 0,
      success: true,
      error: 'Dividend already exists',
    };
  }

  // Fetch company details
  const company = await fetchCompany(db, report.company_id);
  if (!company) {
    throw new Error(`Company not found: ${report.company_id}`);
  }

  // Calculate dividend per share
  const amountPerShare = calculateDividendPerShare(
    report.dividend_pool,
    company.total_shares
  );

  reportLogger.info('Dividend calculation', {
    dividendPool: report.dividend_pool,
    totalShares: company.total_shares,
    amountPerShare,
  });

  // Skip if dividend per share is too small
  if (amountPerShare < CONFIG.MINIMUM_PAYOUT_AMOUNT) {
    reportLogger.info('Dividend per share too small, skipping distribution', {
      amountPerShare,
      minimumAmount: CONFIG.MINIMUM_PAYOUT_AMOUNT,
    });
    return {
      companyId: report.company_id,
      revenueReportId: report.id,
      totalDividendPool: report.dividend_pool,
      totalShares: company.total_shares,
      amountPerShare,
      shareholderCount: 0,
      totalPayoutAmount: 0,
      success: true,
      error: 'Dividend per share below minimum threshold',
    };
  }

  // Fetch all shareholders
  const shareholders = await fetchShareholders(db, report.company_id);
  reportLogger.info(`Found ${shareholders.length} shareholders`);

  if (shareholders.length === 0) {
    reportLogger.info('No shareholders found, creating dividend record only');
    
    // Create dividend record without payouts
    const dividendId = await createDividendRecord(db, {
      companyId: report.company_id,
      revenueReportId: report.id,
      totalDividendPool: report.dividend_pool,
      totalSharesEligible: company.total_shares,
      amountPerShare,
    });

    return {
      companyId: report.company_id,
      revenueReportId: report.id,
      dividendId,
      totalDividendPool: report.dividend_pool,
      totalShares: company.total_shares,
      amountPerShare,
      shareholderCount: 0,
      totalPayoutAmount: 0,
      success: true,
    };
  }

  // Create dividend record and process payouts within transaction
  const result = await withTransaction(
    db,
    async (trx) => {
      // Create dividend record
      const dividend = await createDividendRecord(trx, {
        companyId: report.company_id,
        revenueReportId: report.id,
        totalDividendPool: report.dividend_pool,
        totalSharesEligible: company.total_shares,
        amountPerShare,
      });

      // Process payouts for all shareholders
      const payouts = await processShareholderPayouts(
        trx,
        dividend.id,
        shareholders,
        amountPerShare
      );

      // Update dividend status to completed
      await updateDividendStatus(trx, dividend.id, 'completed');

      return {
        dividendId: dividend.id,
        payouts,
      };
    },
    `dividend_distribution_${report.company_id}_${report.id}`
  );

  // Send notifications (outside transaction)
  if (notificationService) {
    for (const payout of result.payouts) {
      try {
        await notificationService.sendDividendNotification(
          payout.userId,
          company.business_name,
          payout.payoutAmount,
          payout.sharesOwned
        );
      } catch (error) {
        reportLogger.error(`Failed to send notification to user ${payout.userId}`, error as Error);
      }
    }
  }

  const totalPayoutAmount = result.payouts.reduce((sum, p) => sum + p.payoutAmount, 0);

  return {
    companyId: report.company_id,
    revenueReportId: report.id,
    dividendId: result.dividendId,
    totalDividendPool: report.dividend_pool,
    totalShares: company.total_shares,
    amountPerShare,
    shareholderCount: result.payouts.length,
    totalPayoutAmount,
    success: true,
  };
}

// ============================================================================
// Shareholder Payout Processing
// ============================================================================

/**
 * Process payouts for all shareholders
 */
async function processShareholderPayouts(
  trx: { query: (sql: string, params?: unknown[]) => Promise<unknown[]> },
  dividendId: string,
  shareholders: StockHolding[],
  amountPerShare: number
): Promise<ShareholderPayout[]> {
  const payouts: ShareholderPayout[] = [];

  // Process in batches for efficiency
  await processInBatches(shareholders, CONFIG.BATCH_SIZE, async (batch) => {
    const batchPayouts: ShareholderPayout[] = [];

    for (const holding of batch) {
      const payoutAmount = calculateShareholderPayout(
        holding.shares_owned,
        amountPerShare
      );

      // Skip if payout amount is too small
      if (payoutAmount < CONFIG.MINIMUM_PAYOUT_AMOUNT) {
        logger.debug(`Payout amount too small for user ${holding.user_id}`, {
          payoutAmount,
          minimumAmount: CONFIG.MINIMUM_PAYOUT_AMOUNT,
        });
        continue;
      }

      // Create payout record
      await createDividendPayout(trx, {
        dividendId,
        userId: holding.user_id,
        sharesHeld: holding.shares_owned,
        payoutAmount,
      });

      // Credit user wallet
      await creditUserWallet(trx, holding.user_id, payoutAmount);

      // Update total_dividends_earned in holdings
      await updateHoldingDividends(trx, holding.id, payoutAmount);

      batchPayouts.push({
        userId: holding.user_id,
        holdingId: holding.id,
        sharesOwned: holding.shares_owned,
        payoutAmount,
        status: 'completed',
      });
    }

    payouts.push(...batchPayouts);
    return batchPayouts;
  });

  return payouts;
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Fetch verified revenue reports for a specific month
 */
async function fetchVerifiedRevenueReports(
  db: DatabaseClient,
  month: number,
  year: number
): Promise<RevenueReport[]> {
  const result = await db.query(
    `SELECT * FROM revenue_reports 
     WHERE report_month = $1 
     AND report_year = $2 
     AND verification_status IN ('auto_verified', 'verified')
     AND dividend_pool > 0
     ORDER BY created_at ASC`,
    [month, year]
  );
  return result as RevenueReport[];
}

/**
 * Fetch company by ID
 */
async function fetchCompany(db: DatabaseClient, companyId: string): Promise<Company | null> {
  const result = await db.query(
    'SELECT * FROM companies WHERE id = $1 LIMIT 1',
    [companyId]
  );
  return (result as Company[])[0] || null;
}

/**
 * Fetch all shareholders for a company
 */
async function fetchShareholders(
  db: DatabaseClient,
  companyId: string
): Promise<StockHolding[]> {
  const result = await db.query(
    `SELECT * FROM stock_holdings 
     WHERE company_id = $1 
     AND shares_owned > 0
     ORDER BY created_at ASC`,
    [companyId]
  );
  return result as StockHolding[];
}

/**
 * Create a dividend record
 */
async function createDividendRecord(
  trx: { query: (sql: string, params?: unknown[]) => Promise<unknown[]> },
  data: {
    companyId: string;
    revenueReportId: string;
    totalDividendPool: number;
    totalSharesEligible: number;
    amountPerShare: number;
  }
): Promise<Dividend> {
  const result = await trx.query(
    `INSERT INTO dividends 
     (company_id, revenue_report_id, total_dividend_pool, total_shares_eligible, 
      amount_per_share, payment_status, created_at)
     VALUES ($1, $2, $3, $4, $5, 'processing', NOW())
     RETURNING *`,
    [
      data.companyId,
      data.revenueReportId,
      data.totalDividendPool,
      data.totalSharesEligible,
      data.amountPerShare,
    ]
  );

  return (result as Dividend[])[0];
}

/**
 * Create a dividend payout record
 */
async function createDividendPayout(
  trx: { query: (sql: string, params?: unknown[]) => Promise<unknown[]> },
  data: {
    dividendId: string;
    userId: string;
    sharesHeld: number;
    payoutAmount: number;
  }
): Promise<void> {
  await trx.query(
    `INSERT INTO dividend_payouts 
     (dividend_id, user_id, shares_held, payout_amount, payment_method, status, created_at)
     VALUES ($1, $2, $3, $4, 'wallet', 'completed', NOW())`,
    [data.dividendId, data.userId, data.sharesHeld, data.payoutAmount]
  );
}

/**
 * Credit user wallet
 */
async function creditUserWallet(
  trx: { query: (sql: string, params?: unknown[]) => Promise<unknown[]> },
  userId: string,
  amount: number
): Promise<void> {
  await trx.query(
    `UPDATE users 
     SET wallet_fiat = wallet_fiat + $1, updated_at = NOW()
     WHERE id = $2`,
    [amount, userId]
  );
}

/**
 * Update total_dividends_earned in stock holdings
 */
async function updateHoldingDividends(
  trx: { query: (sql: string, params?: unknown[]) => Promise<unknown[]> },
  holdingId: string,
  amount: number
): Promise<void> {
  await trx.query(
    `UPDATE stock_holdings 
     SET total_dividends_earned = total_dividends_earned + $1, updated_at = NOW()
     WHERE id = $2`,
    [amount, holdingId]
  );
}

/**
 * Update dividend status
 */
async function updateDividendStatus(
  trx: { query: (sql: string, params?: unknown[]) => Promise<unknown[]> },
  dividendId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<void> {
  await trx.query(
    `UPDATE dividends 
     SET payment_status = $1, distribution_date = NOW()
     WHERE id = $2`,
    [status, dividendId]
  );
}

// ============================================================================
// Notification Service Interface
// ============================================================================

export interface NotificationService {
  sendDividendNotification: (
    userId: string,
    companyName: string,
    amount: number,
    sharesOwned: number
  ) => Promise<void>;
}

// ============================================================================
// Manual Trigger (for testing/admin)
// ============================================================================

/**
 * Manually trigger dividend distribution for a specific revenue report
 * Useful for testing or correcting data
 */
export async function manuallyDistributeDividend(
  db: DatabaseClient,
  revenueReportId: string,
  notificationService?: NotificationService
): Promise<DividendCalculationResult> {
  logger.info(`Manual dividend distribution triggered`, { revenueReportId });

  // Fetch revenue report
  const reportResult = await db.query(
    'SELECT * FROM revenue_reports WHERE id = $1 LIMIT 1',
    [revenueReportId]
  );
  
  const report = (reportResult as RevenueReport[])[0];
  if (!report) {
    throw new Error(`Revenue report not found: ${revenueReportId}`);
  }

  if (report.verification_status !== 'auto_verified' && 
      report.verification_status !== 'verified') {
    throw new Error(`Revenue report not verified: ${report.verification_status}`);
  }

  return await processDividendForReport(db, report, notificationService);
}

// ============================================================================
// Export Configuration
// ============================================================================

export const dividendDistributionConfig = {
  name: 'DividendDistribution',
  cronExpression: '0 2 1 * *', // 2 AM on 1st of each month
  description: 'Distributes dividends to shareholders based on verified revenue reports',
  config: CONFIG,
};
