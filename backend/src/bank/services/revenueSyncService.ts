/**
 * Revenue Sync Service
 * Trading Platform - Bank Integration Module
 * 
 * Handles:
 * - Daily transaction synchronization from bank APIs
 * - Monthly revenue calculation and reporting
 * - Transaction categorization
 * - Anomaly detection
 * - Revenue report generation
 * 
 * Automatic profit calculation:
 * - Platform Fee: 5% of net revenue
 * - Dividend Pool: 60% of net profit
 * - Reinvestment: 40% of net profit
 */

import {
  BankAccount,
  BankTransaction,
  BankTransactionData,
  BankTransactionInput,
  TransactionType,
  TransactionCategory,
  TransactionStatus,
  RevenueReport,
  RevenueReportInput,
  RevenueReportStatus,
  RevenueSummary,
  SyncResult,
  SyncStatus,
  SyncRequest,
  DailyRevenue,
  ProfitDistribution,
  TransactionAnomaly,
  AnomalyType
} from '../types/bank.types';

import * as BankApiService from './bankApiService';
import * as TransactionProcessor from './transactionProcessor';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SYNC_CONFIG = {
  DEFAULT_SYNC_DAYS: 30,           // Sync last 30 days by default
  MAX_SYNC_DAYS: 90,               // Maximum 90 days
  DAILY_SYNC_HOUR: 2,              // Run daily sync at 2 AM
  MONTHLY_SYNC_DAY: 1,             // Run monthly sync on 1st
  BATCH_SIZE: 100,                 // Process 100 transactions at a time
  RETRY_ATTEMPTS: 3,               // Retry failed syncs 3 times
  RETRY_DELAY_MS: 5000             // 5 second delay between retries
};

const PROFIT_DISTRIBUTION = {
  PLATFORM_FEE_PERCENT: 0.05,      // 5%
  DIVIDEND_POOL_PERCENT: 0.60,     // 60% of net profit
  REINVESTMENT_PERCENT: 0.40       // 40% of net profit
};

// In-memory stores (use database in production)
const revenueReports: Map<string, RevenueReport> = new Map();
const syncHistory: Map<string, SyncResult[]> = new Map();

// ============================================================================
// TRANSACTION SYNC
// ============================================================================

/**
 * Sync transactions from bank for a company
 * Fetches transactions and stores them in the database
 */
export async function syncTransactions(request: SyncRequest): Promise<SyncResult> {
  const { companyId, bankAccountId, fromDate, toDate, force } = request;
  
  console.log(`[RevenueSyncService] Starting sync for company: ${companyId}`);
  
  const result: SyncResult = {
    success: false,
    status: SyncStatus.IN_PROGRESS,
    companyId,
    bankAccountId: bankAccountId || '',
    startDate: fromDate || getDefaultStartDate(),
    endDate: toDate || new Date(),
    syncedAt: new Date(),
    transactionsFetched: 0,
    transactionsInserted: 0,
    transactionsUpdated: 0,
    transactionsSkipped: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    errors: [],
    warnings: []
  };
  
  try {
    // Get bank account
    let account: BankAccount | null;
    
    if (bankAccountId) {
      account = BankApiService.getBankAccount(bankAccountId);
    } else {
      const accounts = BankApiService.getBankAccountsByCompany(companyId);
      account = accounts[0] || null;
    }
    
    if (!account) {
      throw new Error('No bank account found for company');
    }
    
    result.bankAccountId = account.id;
    
    // Determine date range
    const syncFromDate = fromDate || getDefaultStartDate();
    const syncToDate = toDate || new Date();
    
    result.startDate = syncFromDate;
    result.endDate = syncToDate;
    
    // Fetch transactions from bank API
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await BankApiService.fetchTransactions(account.id, {
        accountNumber: account.accountNumber,
        fromDate: syncFromDate,
        toDate: syncToDate,
        page,
        limit: SYNC_CONFIG.BATCH_SIZE
      });
      
      result.transactionsFetched += response.transactions.length;
      
      // Process each transaction
      for (const bankTxn of response.transactions) {
        const processResult = await processBankTransaction(
          companyId,
          account.id,
          bankTxn,
          force
        );
        
        if (processResult.inserted) result.transactionsInserted++;
        if (processResult.updated) result.transactionsUpdated++;
        if (processResult.skipped) result.transactionsSkipped++;
      }
      
      // Update totals
      result.totalDeposits += response.summary.totalCredits;
      result.totalWithdrawals += response.summary.totalDebits;
      
      // Check for more pages
      hasMore = response.pagination.hasMore;
      page++;
      
      // Safety limit
      if (page > 100) {
        result.warnings?.push('Reached maximum page limit');
        break;
      }
    }
    
    // Update account last sync time
    BankApiService.updateBankAccount(account.id, {
      lastSyncAt: new Date()
    });
    
    result.success = true;
    result.status = SyncStatus.COMPLETED;
    
    console.log(`[RevenueSyncService] Sync completed for company: ${companyId}`);
    console.log(`  - Fetched: ${result.transactionsFetched}`);
    console.log(`  - Inserted: ${result.transactionsInserted}`);
    console.log(`  - Updated: ${result.transactionsUpdated}`);
    
  } catch (error) {
    result.success = false;
    result.status = SyncStatus.FAILED;
    result.errors?.push(error instanceof Error ? error.message : 'Unknown error');
    
    console.error(`[RevenueSyncService] Sync failed for company: ${companyId}`, error);
  }
  
  // Store sync result
  storeSyncResult(companyId, result);
  
  return result;
}

/**
 * Process a single bank transaction
 */
async function processBankTransaction(
  companyId: string,
  bankAccountId: string,
  bankTxn: BankTransactionData,
  force: boolean = false
): Promise<{ inserted: boolean; updated: boolean; skipped: boolean }> {
  const result = { inserted: false, updated: false, skipped: false };
  
  // Check if transaction already exists
  const existingTxns = TransactionProcessor.getTransactionsByCompany(companyId, {
    limit: 1000
  });
  
  const existing = existingTxns.find(t => 
    t.bankReference === bankTxn.transactionId ||
    (t.amount === bankTxn.amount && 
     t.transactionDate.getTime() === new Date(bankTxn.date).getTime() &&
     t.description === bankTxn.description)
  );
  
  if (existing && !force) {
    result.skipped = true;
    return result;
  }
  
  // Create transaction input
  const txnInput: BankTransactionInput = {
    companyId,
    bankAccountId,
    transactionDate: new Date(bankTxn.date),
    transactionType: bankTxn.type === 'credit' ? TransactionType.CREDIT : TransactionType.DEBIT,
    amount: bankTxn.amount,
    currency: bankTxn.currency,
    balanceAfter: bankTxn.balance,
    description: bankTxn.description,
    reference: bankTxn.reference,
    bankReference: bankTxn.transactionId,
    rawData: bankTxn as Record<string, any>
  };
  
  if (existing && force) {
    // Update existing
    // In production, update the existing record
    result.updated = true;
  } else {
    // Insert new
    TransactionProcessor.storeTransaction(txnInput);
    result.inserted = true;
  }
  
  return result;
}

/**
 * Sync transactions for all companies
 */
export async function syncAllCompanies(
  fromDate?: Date,
  toDate?: Date
): Promise<SyncResult[]> {
  const allAccounts = BankApiService.getAllBankAccounts();
  const results: SyncResult[] = [];
  
  console.log(`[RevenueSyncService] Starting sync for ${allAccounts.length} accounts`);
  
  for (const account of allAccounts) {
    try {
      const result = await syncTransactions({
        companyId: account.companyId,
        bankAccountId: account.id,
        fromDate,
        toDate
      });
      results.push(result);
    } catch (error) {
      console.error(`[RevenueSyncService] Failed to sync account ${account.id}:`, error);
    }
  }
  
  return results;
}

/**
 * Get sync history for a company
 */
export function getSyncHistory(companyId: string): SyncResult[] {
  return syncHistory.get(companyId) || [];
}

/**
 * Store sync result
 */
function storeSyncResult(companyId: string, result: SyncResult): void {
  const history = syncHistory.get(companyId) || [];
  history.push(result);
  
  // Keep only last 100 syncs
  if (history.length > 100) {
    history.shift();
  }
  
  syncHistory.set(companyId, history);
}

// ============================================================================
// MONTHLY REVENUE CALCULATION
// ============================================================================

/**
 * Calculate monthly revenue for a company
 * Creates a revenue report for the specified month
 */
export async function calculateMonthlyRevenue(
  companyId: string,
  year: number,
  month: number,
  totalShares: number
): Promise<RevenueReport> {
  console.log(`[RevenueSyncService] Calculating revenue for ${month}/${year}, company: ${companyId}`);
  
  // Get date range for the month
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);
  
  // Sync transactions first
  await syncTransactions({
    companyId,
    fromDate: periodStart,
    toDate: periodEnd
  });
  
  // Calculate net revenue
  const revenue = TransactionProcessor.calculateNetRevenueForRange(
    companyId,
    periodStart,
    periodEnd
  );
  
  // Calculate profit distribution
  const profitDist = TransactionProcessor.calculateProfitDistribution(revenue.netRevenue);
  
  // Calculate dividend per share
  const dividendPerShare = TransactionProcessor.calculateDividendPerShare(
    profitDist.dividendPool,
    totalShares
  );
  
  // Count anomalous transactions
  const allTransactions = TransactionProcessor.getTransactionsByCompany(companyId, {
    fromDate: periodStart,
    toDate: periodEnd
  });
  const anomalousCount = allTransactions.filter(t => t.isAnomalous).length;
  
  // Create revenue report
  const reportInput: RevenueReportInput = {
    companyId,
    reportMonth: month,
    reportYear: year,
    periodStart,
    periodEnd,
    totalDeposits: revenue.totalDeposits,
    totalWithdrawals: revenue.totalWithdrawals,
    totalShares,
    status: anomalousCount > 0 ? RevenueReportStatus.PENDING_REVIEW : RevenueReportStatus.AUTO_VERIFIED
  };
  
  const report = createRevenueReport(reportInput, profitDist, dividendPerShare, anomalousCount);
  
  console.log(`[RevenueSyncService] Revenue calculated: $${revenue.netRevenue} net, $${profitDist.dividendPool} dividends`);
  
  return report;
}

/**
 * Create revenue report
 */
function createRevenueReport(
  input: RevenueReportInput,
  profitDist: ProfitDistribution,
  dividendPerShare: number,
  anomalousTransactions: number
): RevenueReport {
  const report: RevenueReport = {
    id: generateReportId(),
    companyId: input.companyId,
    reportMonth: input.reportMonth,
    reportYear: input.reportYear,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    totalDeposits: input.totalDeposits,
    totalWithdrawals: input.totalWithdrawals,
    netRevenue: profitDist.netRevenue,
    operatingCosts: input.operatingCosts,
    otherExpenses: input.otherExpenses,
    manualAdjustments: input.manualAdjustments,
    grossProfit: profitDist.netRevenue,
    platformFee: profitDist.platformFee,
    netProfit: profitDist.netProfit,
    dividendPool: profitDist.dividendPool,
    reinvestmentAmount: profitDist.reinvestmentAmount,
    dividendPerShare,
    totalShares: input.totalShares,
    status: input.status || RevenueReportStatus.AUTO_VERIFIED,
    totalTransactions: 0, // Will be calculated
    anomalousTransactions,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Store report
  revenueReports.set(report.id, report);
  
  return report;
}

/**
 * Get revenue report by ID
 */
export function getRevenueReport(reportId: string): RevenueReport | null {
  return revenueReports.get(reportId) || null;
}

/**
 * Get revenue reports for a company
 */
export function getRevenueReportsByCompany(
  companyId: string,
  options?: {
    year?: number;
    status?: RevenueReportStatus;
    limit?: number;
    offset?: number;
  }
): RevenueReport[] {
  let reports = Array.from(revenueReports.values()).filter(
    r => r.companyId === companyId
  );
  
  if (options?.year) {
    reports = reports.filter(r => r.reportYear === options.year);
  }
  
  if (options?.status) {
    reports = reports.filter(r => r.status === options.status);
  }
  
  // Sort by year and month descending
  reports.sort((a, b) => {
    if (b.reportYear !== a.reportYear) {
      return b.reportYear - a.reportYear;
    }
    return b.reportMonth - a.reportMonth;
  });
  
  // Apply pagination
  if (options?.offset) {
    reports = reports.slice(options.offset);
  }
  
  if (options?.limit) {
    reports = reports.slice(0, options.limit);
  }
  
  return reports;
}

/**
 * Get revenue report for specific month
 */
export function getRevenueReportForMonth(
  companyId: string,
  year: number,
  month: number
): RevenueReport | null {
  return Array.from(revenueReports.values()).find(
    r => r.companyId === companyId && 
         r.reportYear === year && 
         r.reportMonth === month
  ) || null;
}

// ============================================================================
// REVENUE SUMMARY
// ============================================================================

/**
 * Get comprehensive revenue summary for a company
 */
export function getRevenueSummary(
  companyId: string,
  companyName: string
): RevenueSummary {
  const reports = getRevenueReportsByCompany(companyId);
  
  if (reports.length === 0) {
    return createEmptyRevenueSummary(companyId, companyName);
  }
  
  const currentReport = reports[0];
  const lastReport = reports[1];
  
  // Calculate YTD
  const currentYear = new Date().getFullYear();
  const ytdReports = reports.filter(r => r.reportYear === currentYear);
  
  const ytdRevenue = ytdReports.reduce((sum, r) => sum + r.netRevenue, 0);
  const ytdProfit = ytdReports.reduce((sum, r) => sum + r.netProfit, 0);
  const ytdDividends = ytdReports.reduce((sum, r) => sum + r.dividendPool, 0);
  
  // Calculate averages
  const averageMonthlyRevenue = reports.reduce((sum, r) => sum + r.netRevenue, 0) / reports.length;
  const averageMonthlyProfit = reports.reduce((sum, r) => sum + r.netProfit, 0) / reports.length;
  
  // Calculate growth
  const revenueGrowth = lastReport 
    ? ((currentReport.netRevenue - lastReport.netRevenue) / lastReport.netRevenue) * 100
    : 0;
  
  const profitGrowth = lastReport
    ? ((currentReport.netProfit - lastReport.netProfit) / lastReport.netProfit) * 100
    : 0;
  
  // Calculate average dividend yield
  const averageDividendYield = reports.length > 0
    ? (reports.reduce((sum, r) => sum + (r.dividendPool / r.netRevenue) * 100, 0) / reports.length)
    : 0;
  
  // Count consecutive profitable months
  let consecutiveProfitableMonths = 0;
  for (const report of reports) {
    if (report.netProfit > 0) {
      consecutiveProfitableMonths++;
    } else {
      break;
    }
  }
  
  return {
    companyId,
    companyName,
    currentMonthRevenue: currentReport.netRevenue,
    currentMonthProfit: currentReport.netProfit,
    currentMonthDividend: currentReport.dividendPool,
    ytdRevenue: Math.round(ytdRevenue * 100) / 100,
    ytdProfit: Math.round(ytdProfit * 100) / 100,
    ytdDividends: Math.round(ytdDividends * 100) / 100,
    lastMonthRevenue: lastReport?.netRevenue || 0,
    lastMonthProfit: lastReport?.netProfit || 0,
    revenueGrowth: Math.round(revenueGrowth * 100) / 100,
    profitGrowth: Math.round(profitGrowth * 100) / 100,
    averageMonthlyRevenue: Math.round(averageMonthlyRevenue * 100) / 100,
    averageMonthlyProfit: Math.round(averageMonthlyProfit * 100) / 100,
    averageDividendYield: Math.round(averageDividendYield * 100) / 100,
    totalReports: reports.length,
    consecutiveProfitableMonths
  };
}

/**
 * Create empty revenue summary
 */
function createEmptyRevenueSummary(companyId: string, companyName: string): RevenueSummary {
  return {
    companyId,
    companyName,
    currentMonthRevenue: 0,
    currentMonthProfit: 0,
    currentMonthDividend: 0,
    ytdRevenue: 0,
    ytdProfit: 0,
    ytdDividends: 0,
    lastMonthRevenue: 0,
    lastMonthProfit: 0,
    revenueGrowth: 0,
    profitGrowth: 0,
    averageMonthlyRevenue: 0,
    averageMonthlyProfit: 0,
    averageDividendYield: 0,
    totalReports: 0,
    consecutiveProfitableMonths: 0
  };
}

/**
 * Get current month revenue
 */
export function getCurrentMonthRevenue(companyId: string): RevenueReport | null {
  const now = new Date();
  return getRevenueReportForMonth(companyId, now.getFullYear(), now.getMonth() + 1);
}

// ============================================================================
// TRANSACTION CATEGORIZATION
// ============================================================================

/**
 * Categorize all uncategorized transactions for a company
 */
export function categorizeTransactions(companyId: string): {
  categorized: number;
  byCategory: Record<string, number>;
} {
  const transactions = TransactionProcessor.getTransactionsByCompany(companyId, {
    limit: 10000
  });
  
  let categorized = 0;
  const byCategory: Record<string, number> = {};
  
  transactions.forEach(txn => {
    if (txn.category === TransactionCategory.UNCATEGORIZED) {
      // Re-categorize
      const newCategory = TransactionProcessor.categorizeTransaction(txn);
      if (newCategory !== TransactionCategory.UNCATEGORIZED) {
        // In production, update the database
        categorized++;
        byCategory[newCategory] = (byCategory[newCategory] || 0) + 1;
      }
    }
  });
  
  return { categorized, byCategory };
}

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

/**
 * Detect anomalies in transactions for a company
 */
export function detectAnomalies(companyId: string): {
  anomalies: TransactionAnomaly[];
  flaggedTransactions: number;
} {
  const transactions = TransactionProcessor.getTransactionsByCompany(companyId, {
    limit: 10000
  });
  
  const allAnomalies: TransactionAnomaly[] = [];
  let flaggedTransactions = 0;
  
  transactions.forEach(txn => {
    if (!txn.isAnomalous) {
      // Re-validate
      const detected = TransactionProcessor.validateTransaction(txn);
      if (detected.length > 0) {
        allAnomalies.push(...detected);
        flaggedTransactions++;
      }
    } else {
      const txnAnomalies = TransactionProcessor.getTransactionAnomalies(txn.id);
      allAnomalies.push(...txnAnomalies);
    }
  });
  
  return {
    anomalies: allAnomalies,
    flaggedTransactions
  };
}

/**
 * Get high priority anomalies requiring review
 */
export function getHighPriorityAnomalies(companyId: string): TransactionAnomaly[] {
  const { anomalies } = detectAnomalies(companyId);
  return anomalies.filter(a => a.severity === 'high' || a.severity === 'critical');
}

// ============================================================================
// REVENUE REPORT GENERATION
// ============================================================================

/**
 * Generate comprehensive revenue report
 */
export function generateRevenueReport(
  companyId: string,
  year: number,
  month: number
): {
  report: RevenueReport | null;
  dailyBreakdown: DailyRevenue[];
  categoryBreakdown: Record<string, number>;
  anomalies: TransactionAnomaly[];
} {
  const report = getRevenueReportForMonth(companyId, year, month);
  
  if (!report) {
    return {
      report: null,
      dailyBreakdown: [],
      categoryBreakdown: {},
      anomalies: []
    };
  }
  
  // Get daily breakdown
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);
  
  const dailyBreakdown: DailyRevenue[] = [];
  const currentDate = new Date(periodStart);
  
  while (currentDate <= periodEnd) {
    const daily = TransactionProcessor.getDailyRevenue(companyId, currentDate);
    if (daily) {
      dailyBreakdown.push(daily);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Get category breakdown
  const transactions = TransactionProcessor.getTransactionsByCompany(companyId, {
    fromDate: periodStart,
    toDate: periodEnd,
    limit: 10000
  });
  
  const categoryBreakdown: Record<string, number> = {};
  transactions.forEach(t => {
    const categoryName = TransactionProcessor.getCategoryDisplayName(t.category);
    if (t.transactionType === TransactionType.DEBIT) {
      categoryBreakdown[categoryName] = (categoryBreakdown[categoryName] || 0) + t.amount;
    }
  });
  
  // Get anomalies
  const { anomalies } = detectAnomalies(companyId);
  
  return {
    report,
    dailyBreakdown,
    categoryBreakdown,
    anomalies
  };
}

// ============================================================================
// REPORT VERIFICATION
// ============================================================================

/**
 * Verify a revenue report (admin action)
 */
export function verifyRevenueReport(
  reportId: string,
  adminId: string,
  status: RevenueReportStatus.VERIFIED | RevenueReportStatus.REJECTED,
  notes?: string
): RevenueReport {
  const report = revenueReports.get(reportId);
  if (!report) {
    throw new Error('Revenue report not found');
  }
  
  report.status = status;
  report.verifiedBy = adminId;
  report.verifiedAt = new Date();
  report.verificationNotes = notes;
  report.updatedAt = new Date();
  
  revenueReports.set(reportId, report);
  
  console.log(`[RevenueSyncService] Report ${reportId} ${status} by ${adminId}`);
  
  return report;
}

// ============================================================================
// AUTOMATED PROCESSES
// ============================================================================

/**
 * Run daily sync for all companies
 * Should be called by cron job at configured time
 */
export async function runDailySync(): Promise<SyncResult[]> {
  console.log('[RevenueSyncService] Running daily sync...');
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const results = await syncAllCompanies(yesterday, yesterday);
  
  console.log(`[RevenueSyncService] Daily sync completed: ${results.length} companies`);
  
  return results;
}

/**
 * Run monthly revenue calculation
 * Should be called by cron job on 1st of each month
 */
export async function runMonthlyRevenueCalculation(
  getCompanyShares: (companyId: string) => number
): Promise<RevenueReport[]> {
  console.log('[RevenueSyncService] Running monthly revenue calculation...');
  
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  const year = lastMonth.getFullYear();
  const month = lastMonth.getMonth() + 1;
  
  const accounts = BankApiService.getAllBankAccounts();
  const reports: RevenueReport[] = [];
  
  for (const account of accounts) {
    try {
      const totalShares = getCompanyShares(account.companyId);
      const report = await calculateMonthlyRevenue(
        account.companyId,
        year,
        month,
        totalShares
      );
      reports.push(report);
    } catch (error) {
      console.error(`[RevenueSyncService] Failed to calculate revenue for ${account.companyId}:`, error);
    }
  }
  
  console.log(`[RevenueSyncService] Monthly calculation completed: ${reports.length} reports`);
  
  return reports;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateReportId(): string {
  return `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultStartDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() - SYNC_CONFIG.DEFAULT_SYNC_DAYS);
  return date;
}

/**
 * Get revenue statistics (admin)
 */
export function getRevenueStats(): {
  totalReports: number;
  byStatus: Record<string, number>;
  totalRevenue: number;
  totalDividends: number;
  totalPlatformFees: number;
} {
  const allReports = Array.from(revenueReports.values());
  
  const byStatus: Record<string, number> = {};
  let totalRevenue = 0;
  let totalDividends = 0;
  let totalPlatformFees = 0;
  
  allReports.forEach(r => {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    totalRevenue += r.netRevenue;
    totalDividends += r.dividendPool;
    totalPlatformFees += r.platformFee;
  });
  
  return {
    totalReports: allReports.length,
    byStatus,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalDividends: Math.round(totalDividends * 100) / 100,
    totalPlatformFees: Math.round(totalPlatformFees * 100) / 100
  };
}

/**
 * Clear all revenue data (for testing)
 */
export function clearAllRevenueData(): void {
  revenueReports.clear();
  syncHistory.clear();
  console.log('[RevenueSyncService] All revenue data cleared');
}
