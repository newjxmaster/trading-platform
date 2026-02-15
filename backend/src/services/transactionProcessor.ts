/**
 * Transaction Processor Service
 * Trading Platform - Bank Integration Module
 * 
 * Processes daily transactions for revenue calculation:
 * - Daily deposit aggregation
 * - Withdrawal tracking
 * - Net revenue calculation
 * - Fraud detection and validation
 * - Anomaly detection
 */

import {
  BankTransaction,
  BankTransactionInput,
  TransactionType,
  TransactionCategory,
  TransactionStatus,
  TransactionAnomaly,
  AnomalyType,
  DailyTransactionSummary,
  DailyRevenue,
  ProfitDistribution
} from '../types/bank.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Anomaly detection thresholds
const ANOMALY_THRESHOLDS = {
  UNUSUAL_AMOUNT_MULTIPLIER: 3,      // 3x average is unusual
  UNUSUAL_FREQUENCY_COUNT: 10,       // More than 10 similar transactions
  UNUSUAL_HOUR_START: 22,            // 10 PM
  UNUSUAL_HOUR_END: 5,               // 5 AM
  MAX_SINGLE_TRANSACTION: 100000,    // $100k max normal transaction
  DUPLICATE_TIME_WINDOW_MS: 60000,   // 1 minute
  NEGATIVE_BALANCE_THRESHOLD: -1000  // -$1000 is concerning
};

// Profit distribution ratios
const PROFIT_DISTRIBUTION = {
  PLATFORM_FEE_PERCENT: 0.05,        // 5%
  DIVIDEND_POOL_PERCENT: 0.60,       // 60% of net profit
  REINVESTMENT_PERCENT: 0.40         // 40% of net profit
};

// In-memory store (use database in production)
const transactions: Map<string, BankTransaction> = new Map();
const dailyRevenue: Map<string, DailyRevenue> = new Map();
const anomalies: Map<string, TransactionAnomaly[]> = new Map();

// ============================================================================
// TRANSACTION STORAGE
// ============================================================================

/**
 * Store a new transaction
 */
export function storeTransaction(input: BankTransactionInput): BankTransaction {
  const transaction: BankTransaction = {
    id: generateTransactionId(),
    ...input,
    category: input.category || TransactionCategory.UNCATEGORIZED,
    status: input.status || TransactionStatus.COMPLETED,
    isAnomalous: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Categorize transaction
  transaction.category = categorizeTransaction(transaction);
  
  // Validate and detect anomalies
  const detectedAnomalies = validateTransaction(transaction);
  if (detectedAnomalies.length > 0) {
    transaction.isAnomalous = true;
    transaction.status = TransactionStatus.FLAGGED;
    storeAnomalies(transaction.id, detectedAnomalies);
  }
  
  transactions.set(transaction.id, transaction);
  
  console.log(`[TransactionProcessor] Stored transaction: ${transaction.id}, amount: ${transaction.amount}`);
  
  return transaction;
}

/**
 * Store multiple transactions
 */
export function storeTransactions(inputs: BankTransactionInput[]): BankTransaction[] {
  return inputs.map(input => storeTransaction(input));
}

/**
 * Get transaction by ID
 */
export function getTransaction(transactionId: string): BankTransaction | null {
  return transactions.get(transactionId) || null;
}

/**
 * Get transactions by company ID
 */
export function getTransactionsByCompany(
  companyId: string,
  options?: {
    fromDate?: Date;
    toDate?: Date;
    type?: TransactionType;
    category?: TransactionCategory;
    status?: TransactionStatus;
    limit?: number;
    offset?: number;
  }
): BankTransaction[] {
  let result = Array.from(transactions.values()).filter(t => t.companyId === companyId);
  
  if (options?.fromDate) {
    result = result.filter(t => t.transactionDate >= options.fromDate!);
  }
  
  if (options?.toDate) {
    result = result.filter(t => t.transactionDate <= options.toDate!);
  }
  
  if (options?.type) {
    result = result.filter(t => t.transactionType === options.type);
  }
  
  if (options?.category) {
    result = result.filter(t => t.category === options.category);
  }
  
  if (options?.status) {
    result = result.filter(t => t.status === options.status);
  }
  
  // Sort by date descending
  result.sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
  
  // Apply pagination
  if (options?.offset) {
    result = result.slice(options.offset);
  }
  
  if (options?.limit) {
    result = result.slice(0, options.limit);
  }
  
  return result;
}

/**
 * Get transaction count by company
 */
export function getTransactionCount(companyId: string): number {
  return Array.from(transactions.values()).filter(t => t.companyId === companyId).length;
}

// ============================================================================
// TRANSACTION CATEGORIZATION
// ============================================================================

/**
 * Auto-categorize transaction based on description and patterns
 */
export function categorizeTransaction(transaction: BankTransactionInput): TransactionCategory {
  const desc = transaction.description.toLowerCase();
  const type = transaction.transactionType;
  
  // Credit categories (income)
  if (type === TransactionType.CREDIT) {
    if (desc.includes('pos') || desc.includes('sale') || desc.includes('purchase')) {
      return TransactionCategory.POS_SALE;
    }
    if (desc.includes('transfer') || desc.includes('deposit')) {
      return TransactionCategory.SALES;
    }
    if (desc.includes('interest')) {
      return TransactionCategory.INTEREST;
    }
    if (desc.includes('refund')) {
      return TransactionCategory.SALES;
    }
    if (desc.includes('invoice') || desc.includes('payment from')) {
      return TransactionCategory.SALES;
    }
    if (desc.includes('dividend')) {
      return TransactionCategory.INTEREST;
    }
    return TransactionCategory.SALES;
  }
  
  // Debit categories (expenses)
  if (desc.includes('salary') || desc.includes('payroll') || desc.includes('wage')) {
    return TransactionCategory.SALARY;
  }
  
  if (desc.includes('rent')) {
    return TransactionCategory.RENT;
  }
  
  if (desc.includes('electric') || desc.includes('water') || desc.includes('utility') || desc.includes('bill')) {
    return TransactionCategory.UTILITIES;
  }
  
  if (desc.includes('supplier') || desc.includes('vendor') || desc.includes('inventory')) {
    return TransactionCategory.SUPPLIER_PAYMENT;
  }
  
  if (desc.includes('tax') || desc.includes('vat') || desc.includes('duty')) {
    return TransactionCategory.TAX;
  }
  
  if (desc.includes('equipment') || desc.includes('machine')) {
    return TransactionCategory.EQUIPMENT;
  }
  
  if (desc.includes('marketing') || desc.includes('advertising') || desc.includes('promo')) {
    return TransactionCategory.MARKETING;
  }
  
  if (desc.includes('insurance')) {
    return TransactionCategory.INSURANCE;
  }
  
  if (desc.includes('fee') || desc.includes('charge')) {
    return TransactionCategory.FEE;
  }
  
  if (desc.includes('withdrawal') || desc.includes('atm')) {
    return TransactionCategory.WITHDRAWAL;
  }
  
  if (desc.includes('transfer')) {
    return TransactionCategory.TRANSFER;
  }
  
  return TransactionCategory.OTHER;
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: TransactionCategory): string {
  const names: Record<TransactionCategory, string> = {
    [TransactionCategory.SALES]: 'Sales Revenue',
    [TransactionCategory.POS_SALE]: 'POS Sale',
    [TransactionCategory.TRANSFER]: 'Transfer',
    [TransactionCategory.WITHDRAWAL]: 'Withdrawal',
    [TransactionCategory.SUPPLIER_PAYMENT]: 'Supplier Payment',
    [TransactionCategory.SALARY]: 'Salary/Wages',
    [TransactionCategory.RENT]: 'Rent',
    [TransactionCategory.UTILITIES]: 'Utilities',
    [TransactionCategory.TAX]: 'Tax Payment',
    [TransactionCategory.INVENTORY]: 'Inventory Purchase',
    [TransactionCategory.EQUIPMENT]: 'Equipment',
    [TransactionCategory.MARKETING]: 'Marketing',
    [TransactionCategory.INSURANCE]: 'Insurance',
    [TransactionCategory.INTEREST]: 'Interest',
    [TransactionCategory.FEE]: 'Bank Fees',
    [TransactionCategory.OTHER]: 'Other',
    [TransactionCategory.UNCATEGORIZED]: 'Uncategorized'
  };
  return names[category] || category;
}

// ============================================================================
// DAILY DEPOSIT PROCESSING
// ============================================================================

/**
 * Process daily deposits for a company
 * Returns summary of all credit transactions for the day
 */
export function processDailyDeposits(
  companyId: string,
  date: Date
): { totalDeposits: number; depositCount: number; transactions: BankTransaction[] } {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const dailyTransactions = getTransactionsByCompany(companyId, {
    fromDate: startOfDay,
    toDate: endOfDay,
    type: TransactionType.CREDIT
  });
  
  const totalDeposits = dailyTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  return {
    totalDeposits: Math.round(totalDeposits * 100) / 100,
    depositCount: dailyTransactions.length,
    transactions: dailyTransactions
  };
}

/**
 * Process deposits for a date range
 */
export function processDepositsForRange(
  companyId: string,
  fromDate: Date,
  toDate: Date
): { totalDeposits: number; depositCount: number; byDay: Map<string, number> } {
  const transactions = getTransactionsByCompany(companyId, {
    fromDate,
    toDate,
    type: TransactionType.CREDIT
  });
  
  const byDay = new Map<string, number>();
  let totalDeposits = 0;
  
  transactions.forEach(t => {
    const dayKey = t.transactionDate.toISOString().split('T')[0];
    const current = byDay.get(dayKey) || 0;
    byDay.set(dayKey, current + t.amount);
    totalDeposits += t.amount;
  });
  
  return {
    totalDeposits: Math.round(totalDeposits * 100) / 100,
    depositCount: transactions.length,
    byDay
  };
}

// ============================================================================
// WITHDRAWAL PROCESSING
// ============================================================================

/**
 * Process daily withdrawals for a company
 * Returns summary of all debit transactions for the day
 */
export function processWithdrawals(
  companyId: string,
  date: Date
): { totalWithdrawals: number; withdrawalCount: number; transactions: BankTransaction[] } {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const dailyTransactions = getTransactionsByCompany(companyId, {
    fromDate: startOfDay,
    toDate: endOfDay,
    type: TransactionType.DEBIT
  });
  
  const totalWithdrawals = dailyTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  return {
    totalWithdrawals: Math.round(totalWithdrawals * 100) / 100,
    withdrawalCount: dailyTransactions.length,
    transactions: dailyTransactions
  };
}

/**
 * Process withdrawals for a date range
 */
export function processWithdrawalsForRange(
  companyId: string,
  fromDate: Date,
  toDate: Date
): { totalWithdrawals: number; withdrawalCount: number; byCategory: Map<TransactionCategory, number> } {
  const transactions = getTransactionsByCompany(companyId, {
    fromDate,
    toDate,
    type: TransactionType.DEBIT
  });
  
  const byCategory = new Map<TransactionCategory, number>();
  let totalWithdrawals = 0;
  
  transactions.forEach(t => {
    const current = byCategory.get(t.category) || 0;
    byCategory.set(t.category, current + t.amount);
    totalWithdrawals += t.amount;
  });
  
  return {
    totalWithdrawals: Math.round(totalWithdrawals * 100) / 100,
    withdrawalCount: transactions.length,
    byCategory
  };
}

// ============================================================================
// NET REVENUE CALCULATION
// ============================================================================

/**
 * Calculate net revenue for a specific day
 * Net Revenue = Total Deposits - Total Withdrawals
 */
export function calculateDailyNetRevenue(
  companyId: string,
  date: Date
): DailyRevenue {
  const deposits = processDailyDeposits(companyId, date);
  const withdrawals = processWithdrawals(companyId, date);
  
  const netRevenue = deposits.totalDeposits - withdrawals.totalWithdrawals;
  
  const dailyRev: DailyRevenue = {
    date: new Date(date),
    companyId,
    totalDeposits: deposits.totalDeposits,
    depositCount: deposits.depositCount,
    totalWithdrawals: withdrawals.totalWithdrawals,
    withdrawalCount: withdrawals.withdrawalCount,
    netRevenue: Math.round(netRevenue * 100) / 100,
    openingBalance: 0, // Would need previous day's closing balance
    closingBalance: 0, // Would be calculated from actual balance
    isComplete: true,
    syncedAt: new Date()
  };
  
  // Store daily revenue
  const key = `${companyId}_${date.toISOString().split('T')[0]}`;
  dailyRevenue.set(key, dailyRev);
  
  return dailyRev;
}

/**
 * Calculate net revenue for a date range
 */
export function calculateNetRevenueForRange(
  companyId: string,
  fromDate: Date,
  toDate: Date
): {
  totalDeposits: number;
  totalWithdrawals: number;
  netRevenue: number;
  dailyBreakdown: DailyRevenue[];
} {
  const dailyBreakdown: DailyRevenue[] = [];
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  
  const currentDate = new Date(fromDate);
  const endDate = new Date(toDate);
  
  while (currentDate <= endDate) {
    const daily = calculateDailyNetRevenue(companyId, currentDate);
    dailyBreakdown.push(daily);
    totalDeposits += daily.totalDeposits;
    totalWithdrawals += daily.totalWithdrawals;
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return {
    totalDeposits: Math.round(totalDeposits * 100) / 100,
    totalWithdrawals: Math.round(totalWithdrawals * 100) / 100,
    netRevenue: Math.round((totalDeposits - totalWithdrawals) * 100) / 100,
    dailyBreakdown
  };
}

/**
 * Get daily revenue for a specific date
 */
export function getDailyRevenue(companyId: string, date: Date): DailyRevenue | null {
  const key = `${companyId}_${date.toISOString().split('T')[0]}`;
  return dailyRevenue.get(key) || null;
}

// ============================================================================
// PROFIT DISTRIBUTION
// ============================================================================

/**
 * Calculate profit distribution according to platform rules:
 * - Platform Fee: 5% of net revenue
 * - Net Profit: Net Revenue - Platform Fee
 * - Dividend Pool: 60% of net profit
 * - Reinvestment: 40% of net profit
 */
export function calculateProfitDistribution(netRevenue: number): ProfitDistribution {
  const platformFee = netRevenue * PROFIT_DISTRIBUTION.PLATFORM_FEE_PERCENT;
  const netProfit = netRevenue - platformFee;
  const dividendPool = netProfit * PROFIT_DISTRIBUTION.DIVIDEND_POOL_PERCENT;
  const reinvestmentAmount = netProfit * PROFIT_DISTRIBUTION.REINVESTMENT_PERCENT;
  
  return {
    netRevenue: Math.round(netRevenue * 100) / 100,
    platformFee: Math.round(platformFee * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    dividendPool: Math.round(dividendPool * 100) / 100,
    reinvestmentAmount: Math.round(reinvestmentAmount * 100) / 100
  };
}

/**
 * Calculate dividend per share
 */
export function calculateDividendPerShare(
  dividendPool: number,
  totalShares: number
): number {
  if (totalShares === 0) return 0;
  return Math.round((dividendPool / totalShares) * 10000) / 10000;
}

// ============================================================================
// FRAUD DETECTION & VALIDATION
// ============================================================================

/**
 * Validate a transaction for potential fraud
 * Returns list of detected anomalies
 */
export function validateTransaction(transaction: BankTransactionInput): TransactionAnomaly[] {
  const detectedAnomalies: TransactionAnomaly[] = [];
  
  // Check for unusually large amount
  const amountAnomaly = checkUnusualAmount(transaction);
  if (amountAnomaly) detectedAnomalies.push(amountAnomaly);
  
  // Check for unusual time
  const timeAnomaly = checkUnusualTime(transaction);
  if (timeAnomaly) detectedAnomalies.push(timeAnomaly);
  
  // Check for negative balance
  const balanceAnomaly = checkNegativeBalance(transaction);
  if (balanceAnomaly) detectedAnomalies.push(balanceAnomaly);
  
  // Check for suspicious patterns
  const patternAnomaly = checkSuspiciousPattern(transaction);
  if (patternAnomaly) detectedAnomalies.push(patternAnomaly);
  
  return detectedAnomalies;
}

/**
 * Check for unusually large transaction amount
 */
function checkUnusualAmount(transaction: BankTransactionInput): TransactionAnomaly | null {
  // Get historical average for similar transactions
  const historicalAvg = getHistoricalAverageAmount(
    transaction.companyId,
    transaction.transactionType
  );
  
  if (historicalAvg === 0) return null;
  
  const threshold = historicalAvg * ANOMALY_THRESHOLDS.UNUSUAL_AMOUNT_MULTIPLIER;
  
  if (transaction.amount > threshold) {
    return {
      transactionId: '', // Will be set after transaction is stored
      anomalyType: AnomalyType.UNUSUAL_AMOUNT,
      severity: transaction.amount > threshold * 2 ? 'high' : 'medium',
      description: `Transaction amount ($${transaction.amount}) is ${(transaction.amount / historicalAvg).toFixed(1)}x the average ($${historicalAvg})`,
      expectedAmount: historicalAvg,
      actualAmount: transaction.amount,
      confidence: Math.min(transaction.amount / threshold, 1),
      detectedAt: new Date()
    };
  }
  
  if (transaction.amount > ANOMALY_THRESHOLDS.MAX_SINGLE_TRANSACTION) {
    return {
      transactionId: '',
      anomalyType: AnomalyType.UNUSUAL_AMOUNT,
      severity: 'critical',
      description: `Transaction amount ($${transaction.amount}) exceeds maximum threshold ($${ANOMALY_THRESHOLDS.MAX_SINGLE_TRANSACTION})`,
      expectedAmount: ANOMALY_THRESHOLDS.MAX_SINGLE_TRANSACTION,
      actualAmount: transaction.amount,
      confidence: 1,
      detectedAt: new Date()
    };
  }
  
  return null;
}

/**
 * Check for unusual transaction time
 */
function checkUnusualTime(transaction: BankTransactionInput): TransactionAnomaly | null {
  const hour = new Date(transaction.transactionDate).getHours();
  
  if (hour >= ANOMALY_THRESHOLDS.UNUSUAL_HOUR_START || hour < ANOMALY_THRESHOLDS.UNUSUAL_HOUR_END) {
    return {
      transactionId: '',
      anomalyType: AnomalyType.UNUSUAL_TIME,
      severity: 'low',
      description: `Transaction occurred at unusual hour: ${hour}:00`,
      actualAmount: transaction.amount,
      confidence: 0.5,
      detectedAt: new Date()
    };
  }
  
  return null;
}

/**
 * Check for negative balance
 */
function checkNegativeBalance(transaction: BankTransactionInput): TransactionAnomaly | null {
  if (transaction.balanceAfter !== undefined && transaction.balanceAfter < 0) {
    const severity = transaction.balanceAfter < ANOMALY_THRESHOLDS.NEGATIVE_BALANCE_THRESHOLD 
      ? 'critical' 
      : 'medium';
    
    return {
      transactionId: '',
      anomalyType: AnomalyType.NEGATIVE_BALANCE,
      severity,
      description: `Account balance went negative: $${transaction.balanceAfter}`,
      actualAmount: transaction.amount,
      confidence: 1,
      detectedAt: new Date()
    };
  }
  
  return null;
}

/**
 * Check for suspicious patterns
 */
function checkSuspiciousPattern(transaction: BankTransactionInput): TransactionAnomaly | null {
  // Check for duplicate transactions
  const recentTransactions = getTransactionsByCompany(transaction.companyId, {
    fromDate: new Date(Date.now() - ANOMALY_THRESHOLDS.DUPLICATE_TIME_WINDOW_MS),
    limit: 10
  });
  
  const duplicates = recentTransactions.filter(t =>
    Math.abs(t.amount - transaction.amount) < 0.01 &&
    t.transactionType === transaction.transactionType &&
    t.description === transaction.description
  );
  
  if (duplicates.length > 0) {
    return {
      transactionId: '',
      anomalyType: AnomalyType.DUPLICATE,
      severity: 'medium',
      description: `Possible duplicate transaction detected (${duplicates.length} similar transactions in last minute)`,
      actualAmount: transaction.amount,
      confidence: Math.min(duplicates.length / 3, 1),
      detectedAt: new Date()
    };
  }
  
  return null;
}

/**
 * Get historical average transaction amount
 */
function getHistoricalAverageAmount(
  companyId: string,
  type: TransactionType
): number {
  const companyTransactions = getTransactionsByCompany(companyId, { type });
  
  if (companyTransactions.length === 0) return 0;
  
  const sum = companyTransactions.reduce((acc, t) => acc + t.amount, 0);
  return sum / companyTransactions.length;
}

// ============================================================================
// ANOMALY MANAGEMENT
// ============================================================================

/**
 * Store anomalies for a transaction
 */
function storeAnomalies(transactionId: string, detectedAnomalies: TransactionAnomaly[]): void {
  const anomaliesWithId = detectedAnomalies.map(a => ({
    ...a,
    transactionId
  }));
  
  const existing = anomalies.get(transactionId) || [];
  anomalies.set(transactionId, [...existing, ...anomaliesWithId]);
}

/**
 * Get anomalies for a transaction
 */
export function getTransactionAnomalies(transactionId: string): TransactionAnomaly[] {
  return anomalies.get(transactionId) || [];
}

/**
 * Get all anomalies for a company
 */
export function getCompanyAnomalies(companyId: string): TransactionAnomaly[] {
  const companyTransactions = getTransactionsByCompany(companyId);
  const allAnomalies: TransactionAnomaly[] = [];
  
  companyTransactions.forEach(t => {
    const txnAnomalies = getTransactionAnomalies(t.id);
    allAnomalies.push(...txnAnomalies);
  });
  
  return allAnomalies;
}

/**
 * Get high severity anomalies
 */
export function getHighSeverityAnomalies(companyId: string): TransactionAnomaly[] {
  return getCompanyAnomalies(companyId).filter(
    a => a.severity === 'high' || a.severity === 'critical'
  );
}

// ============================================================================
// DAILY SUMMARY
// ============================================================================

/**
 * Get daily transaction summary
 */
export function getDailySummary(
  companyId: string,
  date: Date
): DailyTransactionSummary {
  const deposits = processDailyDeposits(companyId, date);
  const withdrawals = processWithdrawals(companyId, date);
  
  return {
    date: new Date(date),
    totalDeposits: deposits.totalDeposits,
    totalWithdrawals: withdrawals.totalWithdrawals,
    netRevenue: deposits.totalDeposits - withdrawals.totalWithdrawals,
    depositCount: deposits.depositCount,
    withdrawalCount: withdrawals.withdrawalCount,
    openingBalance: 0,
    closingBalance: 0
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateTransactionId(): string {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Clear all transaction data (for testing)
 */
export function clearAllTransactions(): void {
  transactions.clear();
  dailyRevenue.clear();
  anomalies.clear();
  console.log('[TransactionProcessor] All transaction data cleared');
}

/**
 * Get transaction statistics
 */
export function getTransactionStats(): {
  totalTransactions: number;
  totalAnomalies: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
} {
  const allTransactions = Array.from(transactions.values());
  
  const byType: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  
  allTransactions.forEach(t => {
    byType[t.transactionType] = (byType[t.transactionType] || 0) + 1;
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  });
  
  let totalAnomalies = 0;
  anomalies.forEach(a => {
    totalAnomalies += a.length;
  });
  
  return {
    totalTransactions: allTransactions.length,
    totalAnomalies,
    byType,
    byCategory
  };
}
