/**
 * Bank Integration Types
 * Trading Platform - Bank API Integration Module
 * 
 * Supports: Ecobank, UBA, GTBank, Access Bank APIs
 * Read-only access for revenue tracking and verification
 */

// ============================================================================
// BANK ACCOUNT TYPES
// ============================================================================

export enum BankProvider {
  ECOBANK = 'ecobank',
  UBA = 'uba',
  GTBANK = 'gtbank',
  ACCESS_BANK = 'access_bank',
  MOCK = 'mock' // For testing
}

export enum BankAccountStatus {
  PENDING = 'pending',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  EXPIRED = 'expired'
}

export enum BankAccountType {
  BUSINESS = 'business',
  PERSONAL = 'personal',
  SAVINGS = 'savings',
  CURRENT = 'current'
}

export interface BankAccount {
  id: string;
  companyId: string;
  userId: string;
  
  // Bank Information
  provider: BankProvider;
  bankName: string;
  bankCode: string;
  
  // Account Details
  accountNumber: string;
  accountName: string;
  accountType: BankAccountType;
  currency: string;
  
  // OAuth Tokens (encrypted in production)
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  
  // Connection Status
  status: BankAccountStatus;
  connectedAt?: Date;
  lastSyncAt?: Date;
  disconnectedAt?: Date;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface BankAccountInput {
  companyId: string;
  userId: string;
  provider: BankProvider;
  accountNumber: string;
  accountName?: string;
  accountType?: BankAccountType;
  currency?: string;
}

// ============================================================================
// BANK TRANSACTION TYPES
// ============================================================================

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit'
}

export enum TransactionCategory {
  SALES = 'sales',
  POS_SALE = 'pos_sale',
  TRANSFER = 'transfer',
  WITHDRAWAL = 'withdrawal',
  SUPPLIER_PAYMENT = 'supplier_payment',
  SALARY = 'salary',
  RENT = 'rent',
  UTILITIES = 'utilities',
  TAX = 'tax',
  INVENTORY = 'inventory',
  EQUIPMENT = 'equipment',
  MARKETING = 'marketing',
  INSURANCE = 'insurance',
  INTEREST = 'interest',
  FEE = 'fee',
  OTHER = 'other',
  UNCATEGORIZED = 'uncategorized'
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
  FLAGGED = 'flagged'
}

export interface BankTransaction {
  id: string;
  companyId: string;
  bankAccountId: string;
  
  // Transaction Details
  transactionDate: Date;
  transactionType: TransactionType;
  amount: number;
  currency: string;
  
  // Balance Tracking
  balanceBefore?: number;
  balanceAfter?: number;
  
  // Description & Reference
  description: string;
  reference?: string;
  bankReference: string;
  
  // Categorization
  category: TransactionCategory;
  subCategory?: string;
  
  // Counterparty Information
  counterpartyName?: string;
  counterpartyAccount?: string;
  counterpartyBank?: string;
  
  // Status & Verification
  status: TransactionStatus;
  isAnomalous: boolean;
  anomalyReason?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  rawData?: Record<string, any>; // Original bank data
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface BankTransactionInput {
  companyId: string;
  bankAccountId: string;
  transactionDate: Date;
  transactionType: TransactionType;
  amount: number;
  currency?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  description: string;
  reference?: string;
  bankReference: string;
  category?: TransactionCategory;
  counterpartyName?: string;
  counterpartyAccount?: string;
  status?: TransactionStatus;
  rawData?: Record<string, any>;
}

// ============================================================================
// TRANSACTION SUMMARY TYPES
// ============================================================================

export interface TransactionSummary {
  totalCredits: number;
  totalDebits: number;
  netAmount: number;
  transactionCount: number;
  creditCount: number;
  debitCount: number;
  averageCreditAmount: number;
  averageDebitAmount: number;
  largestCredit: number;
  largestDebit: number;
  startDate: Date;
  endDate: Date;
}

export interface DailyTransactionSummary {
  date: Date;
  totalDeposits: number;
  totalWithdrawals: number;
  netRevenue: number;
  depositCount: number;
  withdrawalCount: number;
  openingBalance: number;
  closingBalance: number;
}

// ============================================================================
// REVENUE REPORT TYPES
// ============================================================================

export enum RevenueReportStatus {
  AUTO_VERIFIED = 'auto_verified',
  PENDING_REVIEW = 'pending_review',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  DRAFT = 'draft'
}

export interface RevenueReport {
  id: string;
  companyId: string;
  
  // Time Period
  reportMonth: number; // 1-12
  reportYear: number;
  periodStart: Date;
  periodEnd: Date;
  
  // Financial Data (from Bank API)
  totalDeposits: number;      // Sum of all credits
  totalWithdrawals: number;   // Sum of all debits
  netRevenue: number;         // Deposits - Withdrawals
  
  // Manual Inputs (if needed)
  operatingCosts?: number;
  otherExpenses?: number;
  manualAdjustments?: number;
  
  // Calculated Fields
  grossProfit: number;
  platformFee: number;        // 5% of net_revenue
  netProfit: number;
  dividendPool: number;       // 60% of net_profit
  reinvestmentAmount: number; // 40% of net_profit
  
  // Dividend Calculation
  dividendPerShare: number;
  totalShares: number;
  
  // Status & Verification
  status: RevenueReportStatus;
  verifiedBy?: string;
  verifiedAt?: Date;
  verificationNotes?: string;
  
  // Transaction Counts
  totalTransactions: number;
  anomalousTransactions: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface RevenueReportInput {
  companyId: string;
  reportMonth: number;
  reportYear: number;
  periodStart: Date;
  periodEnd: Date;
  totalDeposits: number;
  totalWithdrawals: number;
  operatingCosts?: number;
  otherExpenses?: number;
  manualAdjustments?: number;
  totalShares: number;
  status?: RevenueReportStatus;
}

export interface RevenueSummary {
  companyId: string;
  companyName: string;
  
  // Current Period
  currentMonthRevenue: number;
  currentMonthProfit: number;
  currentMonthDividend: number;
  
  // Year to Date
  ytdRevenue: number;
  ytdProfit: number;
  ytdDividends: number;
  
  // Historical
  lastMonthRevenue: number;
  lastMonthProfit: number;
  revenueGrowth: number; // Percentage
  profitGrowth: number;  // Percentage
  
  // Averages
  averageMonthlyRevenue: number;
  averageMonthlyProfit: number;
  averageDividendYield: number;
  
  // Performance
  totalReports: number;
  consecutiveProfitableMonths: number;
}

// ============================================================================
// OAUTH TYPES
// ============================================================================

export interface OAuthState {
  state: string;
  companyId: string;
  userId: string;
  provider: BankProvider;
  redirectUrl: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
}

export interface OAuthCallbackData {
  code: string;
  state: string;
  error?: string;
  errorDescription?: string;
}

// ============================================================================
// BANK API REQUEST/RESPONSE TYPES
// ============================================================================

export interface FetchTransactionsRequest {
  accountNumber: string;
  fromDate: Date;
  toDate: Date;
  page?: number;
  limit?: number;
}

export interface FetchTransactionsResponse {
  transactions: BankTransactionData[];
  summary: TransactionSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface BankTransactionData {
  transactionId: string;
  date: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  balance: number;
  description: string;
  reference?: string;
  counterpartyName?: string;
  counterpartyAccount?: string;
}

export interface AccountInfoResponse {
  accountNumber: string;
  accountName: string;
  accountType: string;
  currency: string;
  balance: number;
  availableBalance: number;
  bankName: string;
  bankCode: string;
  status: 'active' | 'inactive' | 'frozen' | 'closed';
  openedDate?: string;
}

// ============================================================================
// SYNC TYPES
// ============================================================================

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial'
}

export interface SyncResult {
  success: boolean;
  status: SyncStatus;
  companyId: string;
  bankAccountId: string;
  
  // Sync Details
  startDate: Date;
  endDate: Date;
  syncedAt: Date;
  
  // Transaction Counts
  transactionsFetched: number;
  transactionsInserted: number;
  transactionsUpdated: number;
  transactionsSkipped: number;
  
  // Errors
  errors?: string[];
  warnings?: string[];
  
  // Summary
  totalDeposits: number;
  totalWithdrawals: number;
}

export interface SyncRequest {
  companyId: string;
  bankAccountId?: string;
  fromDate?: Date;
  toDate?: Date;
  force?: boolean;
}

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

export enum WebhookEventType {
  TRANSACTION_NEW = 'transaction.new',
  TRANSACTION_UPDATED = 'transaction.updated',
  ACCOUNT_CONNECTED = 'account.connected',
  ACCOUNT_DISCONNECTED = 'account.disconnected',
  BALANCE_UPDATED = 'balance.updated',
  SYNC_COMPLETED = 'sync.completed'
}

export interface BankWebhookPayload {
  eventType: WebhookEventType;
  timestamp: Date;
  data: Record<string, any>;
  signature: string;
}

// ============================================================================
// ANOMALY DETECTION TYPES
// ============================================================================

export enum AnomalyType {
  UNUSUAL_AMOUNT = 'unusual_amount',
  UNUSUAL_FREQUENCY = 'unusual_frequency',
  UNUSUAL_TIME = 'unusual_time',
  UNUSUAL_COUNTERPARTY = 'unusual_counterparty',
  DUPLICATE = 'duplicate',
  SUSPICIOUS_PATTERN = 'suspicious_pattern',
  NEGATIVE_BALANCE = 'negative_balance'
}

export interface TransactionAnomaly {
  transactionId: string;
  anomalyType: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedAmount?: number;
  actualAmount: number;
  confidence: number; // 0-1
  detectedAt: Date;
}

// ============================================================================
// API CONFIGURATION TYPES
// ============================================================================

export interface BankApiConfig {
  provider: BankProvider;
  baseUrl: string;
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  webhookSecret?: string;
}

// ============================================================================
// DAILY REVENUE TYPES
// ============================================================================

export interface DailyRevenue {
  date: Date;
  companyId: string;
  
  // Revenue
  totalDeposits: number;
  depositCount: number;
  
  // Expenses
  totalWithdrawals: number;
  withdrawalCount: number;
  
  // Net
  netRevenue: number;
  
  // Balance
  openingBalance: number;
  closingBalance: number;
  
  // Status
  isComplete: boolean;
  syncedAt: Date;
}

// ============================================================================
// PROFIT DISTRIBUTION TYPES
// ============================================================================

export interface ProfitDistribution {
  netRevenue: number;
  platformFee: number;        // 5%
  netProfit: number;
  dividendPool: number;       // 60% of net profit
  reinvestmentAmount: number; // 40% of net profit
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export enum BankErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  SYNC_FAILED = 'SYNC_FAILED',
  WEBHOOK_INVALID = 'WEBHOOK_INVALID',
  BANK_UNAVAILABLE = 'BANK_UNAVAILABLE',
  INVALID_REQUEST = 'INVALID_REQUEST'
}

export interface BankError {
  code: BankErrorCode;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
}
