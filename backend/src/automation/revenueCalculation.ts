/**
 * Trading Platform - Monthly Revenue Calculation
 * 
 * This module handles automated monthly revenue calculation for all active companies.
 * 
 * Cron Schedule: 0 0 1 * * (Runs at midnight on the 1st of each month)
 * 
 * Process:
 * 1. Fetch bank transactions for each active company for the previous month
 * 2. Calculate: total_deposits, total_withdrawals, net_revenue
 * 3. Calculate: platform_fee (5%), net_profit, dividend_pool (60%), reinvestment (40%)
 * 4. Create revenue_report record
 * 5. Mark as auto_verified
 * 
 * Key Features:
 * - Idempotent: Won't create duplicate reports for the same month
 * - Transaction-safe: All operations within database transactions
 * - Comprehensive logging: Full audit trail
 * - Error recovery: Continues processing other companies on individual failures
 */

import { revenueLogger as logger } from '../utils/logger';
import {
  withTransaction,
  withRetry,
  revenueReportExists,
  getPreviousMonth,
  getFirstDayOfMonth,
  getLastDayOfMonth,
} from '../utils/database';
import {
  roundToDecimals,
  calculatePlatformFee,
  calculateDividendPool,
  calculateReinvestment,
  logJobStart,
  logJobComplete,
  logJobError,
} from '../utils/helpers';
import {
  DatabaseClient,
  Company,
  RevenueReport,
  BankTransaction,
  RevenueCalculationResult,
  BankTransactionSummary,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  PLATFORM_FEE_RATE: 0.05,      // 5% platform fee
  DIVIDEND_POOL_RATE: 0.60,     // 60% of net profit goes to dividends
  REINVESTMENT_RATE: 0.40,      // 40% of net profit goes to reinvestment
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
};

// ============================================================================
// Main Revenue Calculation Job
// ============================================================================

/**
 * Execute the monthly revenue calculation job
 * This is the main entry point called by the cron scheduler
 */
export async function executeRevenueCalculation(
  db: DatabaseClient,
  bankApiClient: BankApiClient
): Promise<void> {
  const jobName = 'MonthlyRevenueCalculation';
  const startTime = Date.now();
  
  logJobStart(jobName, { timestamp: new Date().toISOString() });
  
  try {
    // Get the previous month (the month we're calculating revenue for)
    const { month, year } = getPreviousMonth();
    const periodStart = getFirstDayOfMonth(year, month);
    const periodEnd = getLastDayOfMonth(year, month);
    
    logger.info(`Calculating revenue for ${month}/${year}`, {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    });

    // Fetch all active companies
    const companies = await fetchActiveCompanies(db);
    logger.info(`Found ${companies.length} active companies to process`);

    // Process each company
    const results: RevenueCalculationResult[] = [];
    
    for (const company of companies) {
      try {
        const result = await processCompanyRevenue(
          db,
          bankApiClient,
          company,
          month,
          year,
          periodStart,
          periodEnd
        );
        results.push(result);
        
        if (result.success) {
          logger.info(`Revenue calculated for ${company.business_name}`, {
            companyId: company.id,
            netRevenue: result.netRevenue,
            dividendPool: result.dividendPool,
          });
        } else {
          logger.error(`Failed to calculate revenue for ${company.business_name}`, 
            new Error(result.error || 'Unknown error'), {
            companyId: company.id,
          });
        }
      } catch (error) {
        logger.error(`Unexpected error processing company ${company.business_name}`, 
          error as Error, { companyId: company.id });
        
        results.push({
          companyId: company.id,
          totalDeposits: 0,
          totalWithdrawals: 0,
          netRevenue: 0,
          platformFee: 0,
          netProfit: 0,
          dividendPool: 0,
          reinvestmentAmount: 0,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    // Log summary
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    const duration = Date.now() - startTime;
    
    logJobComplete(jobName, duration, {
      totalCompanies: companies.length,
      successCount,
      failureCount,
      month,
      year,
    });

    if (failureCount > 0) {
      logger.warn(`${failureCount} companies failed revenue calculation`, {
        failures: results.filter(r => !r.success).map(r => ({ companyId: r.companyId, error: r.error })),
      });
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    logJobError(jobName, error as Error, duration);
    throw error;
  }
}

// ============================================================================
// Company Processing
// ============================================================================

/**
 * Process revenue calculation for a single company
 */
async function processCompanyRevenue(
  db: DatabaseClient,
  bankApiClient: BankApiClient,
  company: Company,
  month: number,
  year: number,
  periodStart: Date,
  periodEnd: Date
): Promise<RevenueCalculationResult> {
  const companyLogger = logger.child(`company:${company.id}`);
  
  // Check if report already exists (idempotency check)
  const exists = await revenueReportExists(db, company.id, month, year);
  if (exists) {
    companyLogger.info('Revenue report already exists, skipping', { month, year });
    return {
      companyId: company.id,
      totalDeposits: 0,
      totalWithdrawals: 0,
      netRevenue: 0,
      platformFee: 0,
      netProfit: 0,
      dividendPool: 0,
      reinvestmentAmount: 0,
      success: true,
      error: 'Report already exists',
    };
  }

  // Verify bank API is connected
  if (!company.bank_api_connected) {
    companyLogger.warn('Bank API not connected, cannot calculate revenue');
    return {
      companyId: company.id,
      totalDeposits: 0,
      totalWithdrawals: 0,
      netRevenue: 0,
      platformFee: 0,
      netProfit: 0,
      dividendPool: 0,
      reinvestmentAmount: 0,
      success: false,
      error: 'Bank API not connected',
    };
  }

  // Fetch transactions from bank API with retry
  const transactions = await withRetry(
    () => fetchBankTransactions(bankApiClient, company, periodStart, periodEnd),
    {
      maxAttempts: CONFIG.MAX_RETRY_ATTEMPTS,
      initialDelayMs: CONFIG.RETRY_DELAY_MS,
    }
  );

  companyLogger.info(`Fetched ${transactions.length} transactions from bank API`);

  // Store raw transactions in database
  await storeBankTransactions(db, company.id, transactions);

  // Calculate financials
  const summary = calculateTransactionSummary(transactions);
  
  // Calculate derived values
  const netRevenue = summary.netAmount;
  const platformFee = calculatePlatformFee(netRevenue, CONFIG.PLATFORM_FEE_RATE);
  const netProfit = netRevenue - platformFee;
  const dividendPool = calculateDividendPool(netProfit, CONFIG.DIVIDEND_POOL_RATE);
  const reinvestmentAmount = calculateReinvestment(netProfit, CONFIG.REINVESTMENT_RATE);

  companyLogger.info('Financial calculations complete', {
    totalDeposits: summary.totalCredits,
    totalWithdrawals: summary.totalDebits,
    netRevenue,
    platformFee,
    netProfit,
    dividendPool,
    reinvestmentAmount,
  });

  // Create revenue report within transaction
  const reportId = await withTransaction(
    db,
    async (trx) => {
      const report = await createRevenueReport(trx, {
        companyId: company.id,
        month,
        year,
        periodStart,
        periodEnd,
        totalDeposits: summary.totalCredits,
        totalWithdrawals: summary.totalDebits,
        netRevenue,
        platformFee,
        netProfit,
        dividendPool,
        reinvestmentAmount,
      });
      return report.id;
    },
    `create_revenue_report_${company.id}_${month}_${year}`
  );

  return {
    companyId: company.id,
    reportId,
    totalDeposits: summary.totalCredits,
    totalWithdrawals: summary.totalDebits,
    netRevenue,
    platformFee,
    netProfit,
    dividendPool,
    reinvestmentAmount,
    success: true,
  };
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
 * Store bank transactions in the database
 */
async function storeBankTransactions(
  db: DatabaseClient,
  companyId: string,
  transactions: BankTransaction[]
): Promise<void> {
  if (transactions.length === 0) return;

  // Use batch insert for efficiency
  const values = transactions.map((t, index) => 
    `($1, $${index * 6 + 2}, $${index * 6 + 3}, $${index * 6 + 4}, $${index * 6 + 5}, $${index * 6 + 6}, $${index * 6 + 7})`
  ).join(', ');

  const params: unknown[] = [companyId];
  transactions.forEach(t => {
    params.push(
      t.transaction_date,
      t.transaction_type,
      t.amount,
      t.balance_after,
      t.description,
      t.bank_reference
    );
  });

  await db.query(
    `INSERT INTO bank_transactions 
     (company_id, transaction_date, transaction_type, amount, balance_after, description, bank_reference)
     VALUES ${values}
     ON CONFLICT (bank_reference) DO NOTHING`,
    params
  );
}

/**
 * Create a revenue report record
 */
async function createRevenueReport(
  trx: { query: (sql: string, params?: unknown[]) => Promise<unknown[]> },
  data: {
    companyId: string;
    month: number;
    year: number;
    periodStart: Date;
    periodEnd: Date;
    totalDeposits: number;
    totalWithdrawals: number;
    netRevenue: number;
    platformFee: number;
    netProfit: number;
    dividendPool: number;
    reinvestmentAmount: number;
  }
): Promise<RevenueReport> {
  const result = await trx.query(
    `INSERT INTO revenue_reports 
     (company_id, report_month, report_year, period_start, period_end,
      total_deposits, total_withdrawals, net_revenue,
      platform_fee, net_profit, dividend_pool, reinvestment_amount,
      verification_status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'auto_verified', NOW())
     RETURNING *`,
    [
      data.companyId,
      data.month,
      data.year,
      data.periodStart,
      data.periodEnd,
      data.totalDeposits,
      data.totalWithdrawals,
      data.netRevenue,
      data.platformFee,
      data.netProfit,
      data.dividendPool,
      data.reinvestmentAmount,
    ]
  );

  return (result as RevenueReport[])[0];
}

// ============================================================================
// Bank API Interface
// ============================================================================

export interface BankApiClient {
  fetchTransactions: (
    accountNumber: string,
    startDate: Date,
    endDate: Date
  ) => Promise<BankTransaction[]>;
}

/**
 * Fetch transactions from the bank API
 */
async function fetchBankTransactions(
  bankApiClient: BankApiClient,
  company: Company,
  startDate: Date,
  endDate: Date
): Promise<BankTransaction[]> {
  logger.info(`Fetching bank transactions for ${company.business_name}`, {
    accountNumber: company.bank_account_number,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  return await bankApiClient.fetchTransactions(
    company.bank_account_number,
    startDate,
    endDate
  );
}

// ============================================================================
// Calculation Helpers
// ============================================================================

/**
 * Calculate summary statistics from bank transactions
 */
function calculateTransactionSummary(transactions: BankTransaction[]): BankTransactionSummary {
  const totalCredits = transactions
    .filter(t => t.transaction_type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = transactions
    .filter(t => t.transaction_type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    totalCredits: roundToDecimals(totalCredits),
    totalDebits: roundToDecimals(totalDebits),
    netAmount: roundToDecimals(totalCredits - totalDebits),
    transactionCount: transactions.length,
  };
}

// ============================================================================
// Manual Trigger (for testing/admin)
// ============================================================================

/**
 * Manually trigger revenue calculation for a specific company and month
 * Useful for testing or correcting data
 */
export async function manuallyCalculateRevenue(
  db: DatabaseClient,
  bankApiClient: BankApiClient,
  companyId: string,
  month: number,
  year: number
): Promise<RevenueCalculationResult> {
  logger.info(`Manual revenue calculation triggered`, { companyId, month, year });

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

  return await processCompanyRevenue(
    db,
    bankApiClient,
    company,
    month,
    year,
    periodStart,
    periodEnd
  );
}

// ============================================================================
// Export Configuration
// ============================================================================

export const revenueCalculationConfig = {
  name: 'MonthlyRevenueCalculation',
  cronExpression: '0 0 1 * *', // Midnight on 1st of each month
  description: 'Calculates monthly revenue for all active companies',
  config: CONFIG,
};
