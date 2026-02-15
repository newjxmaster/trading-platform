/**
 * Trading Platform - Automation Module Types
 * Type definitions for cron jobs, queues, and automated processes
 */

// ============================================================================
// Database Entity Types (based on specification schema)
// ============================================================================

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  phone?: string;
  kyc_status: 'pending' | 'verified' | 'rejected';
  id_document_url?: string;
  selfie_url?: string;
  wallet_fiat: number;
  wallet_crypto_usdt: number;
  wallet_crypto_btc: number;
  role: 'investor' | 'business_owner' | 'admin';
  created_at: Date;
  updated_at: Date;
}

export interface Company {
  id: string;
  owner_id: string;
  business_name: string;
  business_type: 'small_business' | 'medium_business';
  category?: string;
  description?: string;
  registration_certificate_url: string;
  manager_id_card_url: string;
  business_photo_url: string;
  partner_bank_name: string;
  bank_account_number: string;
  bank_api_connected: boolean;
  initial_valuation: number;
  total_shares: number;
  available_shares: number;
  current_price: number;
  ipo_date?: Date;
  verification_status: 'pending' | 'approved' | 'rejected';
  listing_status: 'draft' | 'ipo' | 'active' | 'suspended';
  created_at: Date;
  updated_at: Date;
}

export interface RevenueReport {
  id: string;
  company_id: string;
  report_month: number;
  report_year: number;
  period_start?: Date;
  period_end?: Date;
  total_deposits: number;
  total_withdrawals: number;
  net_revenue: number;
  operating_costs?: number;
  other_expenses?: number;
  gross_profit?: number;
  platform_fee: number;
  net_profit: number;
  dividend_pool: number;
  reinvestment_amount: number;
  verification_status: 'auto_verified' | 'pending_review' | 'verified' | 'rejected';
  verified_by?: string;
  verified_at?: Date;
  created_at: Date;
}

export interface Dividend {
  id: string;
  company_id: string;
  revenue_report_id: string;
  total_dividend_pool: number;
  total_shares_eligible: number;
  amount_per_share: number;
  payment_status: 'pending' | 'processing' | 'completed' | 'failed';
  distribution_date?: Date;
  created_at: Date;
}

export interface DividendPayout {
  id: string;
  dividend_id: string;
  user_id: string;
  shares_held: number;
  payout_amount: number;
  payment_method: 'wave' | 'orange_money' | 'bank_transfer' | 'wallet';
  payment_reference?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paid_at?: Date;
  created_at: Date;
}

export interface StockHolding {
  id: string;
  user_id: string;
  company_id: string;
  shares_owned: number;
  average_buy_price?: number;
  total_invested?: number;
  total_dividends_earned: number;
  created_at: Date;
  updated_at: Date;
}

export interface BankTransaction {
  id: string;
  company_id: string;
  transaction_date: Date;
  transaction_type: 'credit' | 'debit';
  amount: number;
  balance_after?: number;
  description?: string;
  bank_reference?: string;
  created_at: Date;
}

export interface PriceHistory {
  id: string;
  company_id: string;
  price: number;
  volume: number;
  timestamp: Date;
}

export interface Trade {
  id: string;
  buy_order_id: string;
  sell_order_id: string;
  buyer_id: string;
  seller_id: string;
  company_id: string;
  quantity: number;
  price: number;
  total_amount: number;
  platform_fee: number;
  executed_at: Date;
}

// ============================================================================
// Job Queue Types
// ============================================================================

export interface PaymentJobData {
  type: 'deposit' | 'withdrawal' | 'dividend' | 'trade' | 'fee';
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  metadata?: Record<string, unknown>;
}

export interface DividendJobData {
  dividendId: string;
  companyId: string;
  revenueReportId: string;
  totalDividendPool: number;
  totalShares: number;
  amountPerShare: number;
}

export interface DividendPayoutJobData {
  payoutId: string;
  dividendId: string;
  userId: string;
  sharesHeld: number;
  payoutAmount: number;
}

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export interface StockPriceJobData {
  companyId: string;
  currentPrice: number;
  month: number;
  year: number;
}

// ============================================================================
// Cron Job Types
// ============================================================================

export interface CronJobConfig {
  name: string;
  cronExpression: string;
  handler: () => Promise<void>;
  enabled: boolean;
  runOnInit?: boolean;
}

export interface JobExecutionResult {
  success: boolean;
  jobName: string;
  startedAt: Date;
  completedAt?: Date;
  error?: Error;
  metadata?: Record<string, unknown>;
}

export interface JobStatus {
  name: string;
  lastRun?: Date;
  lastSuccess?: Date;
  lastError?: Date;
  errorCount: number;
  successCount: number;
  isRunning: boolean;
}

// ============================================================================
// Revenue Calculation Types
// ============================================================================

export interface RevenueCalculationInput {
  companyId: string;
  month: number;
  year: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface RevenueCalculationResult {
  companyId: string;
  reportId?: string;
  totalDeposits: number;
  totalWithdrawals: number;
  netRevenue: number;
  platformFee: number;
  netProfit: number;
  dividendPool: number;
  reinvestmentAmount: number;
  success: boolean;
  error?: string;
}

export interface BankTransactionSummary {
  totalCredits: number;
  totalDebits: number;
  netAmount: number;
  transactionCount: number;
}

// ============================================================================
// Dividend Distribution Types
// ============================================================================

export interface DividendCalculationResult {
  dividendId?: string;
  companyId: string;
  revenueReportId: string;
  totalDividendPool: number;
  totalShares: number;
  amountPerShare: number;
  shareholderCount: number;
  totalPayoutAmount: number;
  success: boolean;
  error?: string;
}

export interface ShareholderPayout {
  userId: string;
  holdingId: string;
  sharesOwned: number;
  payoutAmount: number;
  status: 'pending' | 'completed' | 'failed';
}

// ============================================================================
// Stock Price Adjustment Types
// ============================================================================

export interface PriceAdjustmentInput {
  companyId: string;
  currentPrice: number;
  month: number;
  year: number;
}

export interface PriceAdjustmentResult {
  companyId: string;
  oldPrice: number;
  newPrice: number;
  priceChange: number;
  priceChangePercent: number;
  performanceScore: number;
  factors: PriceAdjustmentFactors;
  success: boolean;
  error?: string;
}

export interface PriceAdjustmentFactors {
  revenueGrowth: number;
  profitMargin: number;
  volumeScore: number;
  dividendScore: number;
}

export interface PerformanceMetrics {
  revenueGrowth: number;
  profitMargin: number;
  tradingVolume: number;
  volumeScore: number;
  dividendConsistency: number;
  dividendScore: number;
}

// ============================================================================
// Logger Types
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  metadata?: Record<string, unknown>;
  error?: Error;
}

// ============================================================================
// Queue Types
// ============================================================================

export interface QueueJobOptions {
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  delay?: number;
  priority?: number;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

// ============================================================================
// Re-exports from other type modules
// ============================================================================

export { DatabaseClient } from '../utils/database';
export { BankApiClient } from '../automation/revenueCalculation';
export { VerificationDecision, RevenueVerificationDecision } from './company.types';
