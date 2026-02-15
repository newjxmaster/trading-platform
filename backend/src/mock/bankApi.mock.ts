/**
 * Mock Bank API
 * Trading Platform - Testing & Development
 * 
 * Simulates bank API responses for:
 * - Ecobank, UBA, GTBank, Access Bank
 * - OAuth flow simulation
 * - Transaction generation
 * - Webhook simulation
 */

import {
  BankProvider,
  BankTransactionData,
  AccountInfoResponse,
  TransactionSummary,
  OAuthTokenResponse,
  FetchTransactionsResponse,
  BankErrorCode,
  BankError,
  WebhookEventType,
  BankWebhookPayload
} from '../types/bank.types';

// ============================================================================
// MOCK DATA STORE
// ============================================================================

interface MockAccount {
  accountNumber: string;
  accountName: string;
  balance: number;
  currency: string;
  status: 'active' | 'inactive' | 'frozen';
  transactions: MockTransaction[];
}

interface MockTransaction {
  id: string;
  date: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference: string;
  balance: number;
}

interface MockOAuthSession {
  code: string;
  state: string;
  accountNumber: string;
  provider: BankProvider;
  expiresAt: Date;
}

// In-memory store for mock data
const mockAccounts: Map<string, MockAccount> = new Map();
const mockOAuthSessions: Map<string, MockOAuthSession> = new Map();
const mockAccessTokens: Map<string, { accountNumber: string; expiresAt: Date }> = new Map();

// ============================================================================
// MOCK ACCOUNT GENERATOR
// ============================================================================

const BUSINESS_NAMES = [
  'SuperMart ABC',
  'Factory XYZ Ltd',
  'Quick Bites Restaurant',
  'Tech Solutions Inc',
  'Green Groceries',
  'Fashion Forward Boutique',
  'Auto Repair Pro',
  'Clean & Clear Services',
  'BuildRight Construction',
  'Fresh Farm Produce'
];

const CREDIT_DESCRIPTIONS = [
  'POS Sale - Terminal 001',
  'POS Sale - Terminal 002',
  'Transfer from Customer',
  'Cash Deposit',
  'Mobile Money Deposit',
  'Refund - Order #1234',
  'Invoice Payment - Client A',
  'Invoice Payment - Client B',
  'Interest Credit',
  'Dividend Receipt'
];

const DEBIT_DESCRIPTIONS = [
  'Supplier Payment - Vendor A',
  'Supplier Payment - Vendor B',
  'Salary Payment',
  'Rent Payment',
  'Utility Bill - Electricity',
  'Utility Bill - Water',
  'Equipment Purchase',
  'Inventory Purchase',
  'Marketing Expense',
  'Insurance Premium',
  'Tax Payment',
  'Bank Charges',
  'Transfer to Savings',
  'ATM Withdrawal'
];

/**
 * Generate a mock bank account with realistic transaction history
 */
export function generateMockAccount(
  accountNumber: string,
  businessName?: string,
  initialBalance: number = 50000
): MockAccount {
  const name = businessName || BUSINESS_NAMES[Math.floor(Math.random() * BUSINESS_NAMES.length)];
  
  const account: MockAccount = {
    accountNumber,
    accountName: name,
    balance: initialBalance,
    currency: 'USD',
    status: 'active',
    transactions: []
  };
  
  mockAccounts.set(accountNumber, account);
  return account;
}

/**
 * Generate realistic daily transactions for a business
 */
export function generateDailyTransactions(
  accountNumber: string,
  date: Date,
  avgDailyRevenue: number = 3000
): MockTransaction[] {
  const account = mockAccounts.get(accountNumber);
  if (!account) {
    throw new Error(`Account ${accountNumber} not found`);
  }
  
  const transactions: MockTransaction[] = [];
  const dateStr = date.toISOString().split('T')[0];
  
  // Generate 5-15 credit transactions (sales/deposits)
  const creditCount = Math.floor(Math.random() * 11) + 5;
  let dailyCredits = 0;
  
  for (let i = 0; i < creditCount; i++) {
    // Random amount between $50 and $800, clustered around average
    const baseAmount = avgDailyRevenue / creditCount;
    const variance = baseAmount * 0.5;
    const amount = Math.round((baseAmount + (Math.random() * variance * 2 - variance)) * 100) / 100;
    
    const hour = 8 + Math.floor(Math.random() * 12); // Business hours 8am-8pm
    const minute = Math.floor(Math.random() * 60);
    const timestamp = `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`;
    
    const transaction: MockTransaction = {
      id: `TXN${Date.now()}${i}`,
      date: timestamp,
      type: 'credit',
      amount: Math.max(10, amount),
      description: CREDIT_DESCRIPTIONS[Math.floor(Math.random() * CREDIT_DESCRIPTIONS.length)],
      reference: `REF${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      balance: 0 // Will be calculated
    };
    
    transactions.push(transaction);
    dailyCredits += transaction.amount;
  }
  
  // Generate 3-8 debit transactions (expenses/withdrawals)
  const debitCount = Math.floor(Math.random() * 6) + 3;
  const expenseRatio = 0.7; // 70% of revenue goes to expenses
  const dailyDebits = dailyCredits * expenseRatio;
  
  for (let i = 0; i < debitCount; i++) {
    const amount = Math.round((dailyDebits / debitCount) * (0.8 + Math.random() * 0.4) * 100) / 100;
    
    const hour = 9 + Math.floor(Math.random() * 10);
    const minute = Math.floor(Math.random() * 60);
    const timestamp = `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`;
    
    const transaction: MockTransaction = {
      id: `TXN${Date.now()}${100 + i}`,
      date: timestamp,
      type: 'debit',
      amount: Math.max(10, amount),
      description: DEBIT_DESCRIPTIONS[Math.floor(Math.random() * DEBIT_DESCRIPTIONS.length)],
      reference: `REF${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      balance: 0
    };
    
    transactions.push(transaction);
  }
  
  // Sort by timestamp
  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Calculate running balance
  let runningBalance = account.balance - dailyCredits + (dailyCredits * expenseRatio);
  transactions.forEach(txn => {
    if (txn.type === 'credit') {
      runningBalance += txn.amount;
    } else {
      runningBalance -= txn.amount;
    }
    txn.balance = Math.round(runningBalance * 100) / 100;
  });
  
  // Update account balance
  account.balance = runningBalance;
  account.transactions.push(...transactions);
  
  return transactions;
}

/**
 * Generate a month's worth of transactions
 */
export function generateMonthlyTransactions(
  accountNumber: string,
  year: number,
  month: number,
  avgDailyRevenue: number = 3000
): MockTransaction[] {
  const allTransactions: MockTransaction[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    // Skip Sundays (closed) and reduce Saturday revenue
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) continue; // Sunday
    
    const dailyRevenue = dayOfWeek === 6 ? avgDailyRevenue * 0.6 : avgDailyRevenue;
    const dailyTxns = generateDailyTransactions(accountNumber, date, dailyRevenue);
    allTransactions.push(...dailyTxns);
  }
  
  return allTransactions;
}

// ============================================================================
// MOCK OAUTH FLOW
// ============================================================================

/**
 * Initiate OAuth authorization (Step 1)
 */
export function initiateOAuth(
  provider: BankProvider,
  accountNumber: string,
  redirectUri: string,
  state: string
): string {
  // Generate authorization code
  const code = `mock_auth_${Math.random().toString(36).substr(2, 16)}`;
  
  // Store OAuth session
  const session: MockOAuthSession = {
    code,
    state,
    accountNumber,
    provider,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  };
  
  mockOAuthSessions.set(code, session);
  
  // Return mock authorization URL
  return `https://mock-bank-${provider}.com/oauth/authorize?client_id=mock_client&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&code=${code}`;
}

/**
 * Exchange authorization code for access token (Step 2)
 */
export function exchangeCodeForToken(
  code: string,
  expectedState: string
): OAuthTokenResponse {
  const session = mockOAuthSessions.get(code);
  
  if (!session) {
    throw createBankError(BankErrorCode.INVALID_CREDENTIALS, 'Invalid authorization code');
  }
  
  if (session.expiresAt < new Date()) {
    mockOAuthSessions.delete(code);
    throw createBankError(BankErrorCode.TOKEN_EXPIRED, 'Authorization code has expired');
  }
  
  if (session.state !== expectedState) {
    throw createBankError(BankErrorCode.INVALID_CREDENTIALS, 'Invalid state parameter');
  }
  
  // Generate access token
  const accessToken = `mock_token_${Math.random().toString(36).substr(2, 32)}`;
  const refreshToken = `mock_refresh_${Math.random().toString(36).substr(2, 32)}`;
  const expiresIn = 3600; // 1 hour
  
  // Store token mapping
  mockAccessTokens.set(accessToken, {
    accountNumber: session.accountNumber,
    expiresAt: new Date(Date.now() + expiresIn * 1000)
  });
  
  // Clean up session
  mockOAuthSessions.delete(code);
  
  return {
    accessToken,
    refreshToken,
    expiresIn,
    tokenType: 'Bearer',
    scope: 'read_transactions read_account_info'
  };
}

/**
 * Refresh access token
 */
export function refreshAccessToken(refreshToken: string): OAuthTokenResponse {
  // In mock, just generate new tokens
  const accessToken = `mock_token_${Math.random().toString(36).substr(2, 32)}`;
  const newRefreshToken = `mock_refresh_${Math.random().toString(36).substr(2, 32)}`;
  const expiresIn = 3600;
  
  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn,
    tokenType: 'Bearer',
    scope: 'read_transactions read_account_info'
  };
}

/**
 * Validate and get account from access token
 */
function getAccountFromToken(accessToken: string): MockAccount {
  const tokenData = mockAccessTokens.get(accessToken);
  
  if (!tokenData) {
    throw createBankError(BankErrorCode.TOKEN_INVALID, 'Invalid access token');
  }
  
  if (tokenData.expiresAt < new Date()) {
    throw createBankError(BankErrorCode.TOKEN_EXPIRED, 'Access token has expired');
  }
  
  const account = mockAccounts.get(tokenData.accountNumber);
  if (!account) {
    throw createBankError(BankErrorCode.ACCOUNT_NOT_FOUND, 'Account not found');
  }
  
  return account;
}

// ============================================================================
// MOCK API ENDPOINTS
// ============================================================================

/**
 * Get account information
 */
export function getAccountInfo(accessToken: string): AccountInfoResponse {
  const account = getAccountFromToken(accessToken);
  
  return {
    accountNumber: maskAccountNumber(account.accountNumber),
    accountName: account.accountName,
    accountType: 'business',
    currency: account.currency,
    balance: account.balance,
    availableBalance: account.balance,
    bankName: 'Mock Partner Bank',
    bankCode: 'MOCK001',
    status: account.status
  };
}

/**
 * Fetch transactions with filtering and pagination
 */
export function fetchTransactions(
  accessToken: string,
  fromDate: string,
  toDate: string,
  page: number = 1,
  limit: number = 100
): FetchTransactionsResponse {
  const account = getAccountFromToken(accessToken);
  
  const from = new Date(fromDate);
  const to = new Date(toDate);
  
  // Filter transactions by date
  let filteredTransactions = account.transactions.filter(txn => {
    const txnDate = new Date(txn.date);
    return txnDate >= from && txnDate <= to;
  });
  
  // Sort by date descending
  filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Calculate summary
  const summary = calculateTransactionSummary(filteredTransactions);
  
  // Paginate
  const total = filteredTransactions.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);
  
  return {
    transactions: paginatedTransactions.map(convertToBankTransactionData),
    summary,
    pagination: {
      page,
      limit,
      total,
      hasMore: endIndex < total
    }
  };
}

/**
 * Get transaction summary for a date range
 */
export function getTransactionSummary(
  accessToken: string,
  fromDate: string,
  toDate: string
): TransactionSummary {
  const account = getAccountFromToken(accessToken);
  
  const from = new Date(fromDate);
  const to = new Date(toDate);
  
  const filteredTransactions = account.transactions.filter(txn => {
    const txnDate = new Date(txn.date);
    return txnDate >= from && txnDate <= to;
  });
  
  return calculateTransactionSummary(filteredTransactions);
}

// ============================================================================
// MOCK WEBHOOK SIMULATION
// ============================================================================

interface WebhookHandler {
  (payload: BankWebhookPayload): void;
}

let webhookHandler: WebhookHandler | null = null;
let webhookUrl: string | null = null;

/**
 * Register webhook handler
 */
export function registerWebhook(url: string, handler: WebhookHandler): void {
  webhookUrl = url;
  webhookHandler = handler;
}

/**
 * Simulate a webhook event
 */
export function simulateWebhookEvent(
  eventType: WebhookEventType,
  accountNumber: string,
  data: Record<string, any>
): void {
  if (!webhookHandler) {
    console.log('[MockBank] No webhook handler registered');
    return;
  }
  
  const payload: BankWebhookPayload = {
    eventType,
    timestamp: new Date(),
    data: {
      accountNumber,
      ...data
    },
    signature: generateWebhookSignature(data)
  };
  
  // Simulate async webhook delivery
  setTimeout(() => {
    webhookHandler!(payload);
  }, 100);
}

/**
 * Simulate a new transaction webhook
 */
export function simulateNewTransaction(
  accountNumber: string,
  transaction: Partial<BankTransactionData>
): void {
  const fullTransaction: BankTransactionData = {
    transactionId: `TXN${Date.now()}`,
    date: new Date().toISOString(),
    type: 'credit',
    amount: 100,
    currency: 'USD',
    balance: 1000,
    description: 'Test transaction',
    ...transaction
  };
  
  simulateWebhookEvent(WebhookEventType.TRANSACTION_NEW, accountNumber, {
    transaction: fullTransaction
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  return '****' + accountNumber.slice(-4);
}

function convertToBankTransactionData(txn: MockTransaction): BankTransactionData {
  return {
    transactionId: txn.id,
    date: txn.date,
    type: txn.type,
    amount: txn.amount,
    currency: 'USD',
    balance: txn.balance,
    description: txn.description,
    reference: txn.reference
  };
}

function calculateTransactionSummary(transactions: MockTransaction[]): TransactionSummary {
  const credits = transactions.filter(t => t.type === 'credit');
  const debits = transactions.filter(t => t.type === 'debit');
  
  const totalCredits = credits.reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = debits.reduce((sum, t) => sum + t.amount, 0);
  
  const creditAmounts = credits.map(t => t.amount);
  const debitAmounts = debits.map(t => t.amount);
  
  return {
    totalCredits: Math.round(totalCredits * 100) / 100,
    totalDebits: Math.round(totalDebits * 100) / 100,
    netAmount: Math.round((totalCredits - totalDebits) * 100) / 100,
    transactionCount: transactions.length,
    creditCount: credits.length,
    debitCount: debits.length,
    averageCreditAmount: credits.length > 0 ? Math.round((totalCredits / credits.length) * 100) / 100 : 0,
    averageDebitAmount: debits.length > 0 ? Math.round((totalDebits / debits.length) * 100) / 100 : 0,
    largestCredit: creditAmounts.length > 0 ? Math.max(...creditAmounts) : 0,
    largestDebit: debitAmounts.length > 0 ? Math.max(...debitAmounts) : 0,
    startDate: transactions.length > 0 ? new Date(transactions[transactions.length - 1].date) : new Date(),
    endDate: transactions.length > 0 ? new Date(transactions[0].date) : new Date()
  };
}

function generateWebhookSignature(data: Record<string, any>): string {
  // Simple mock signature
  const dataStr = JSON.stringify(data);
  return `mock_sig_${Buffer.from(dataStr).toString('base64').substr(0, 32)}`;
}

function createBankError(code: BankErrorCode, message: string): BankError {
  return {
    code,
    message,
    retryable: code === BankErrorCode.RATE_LIMIT_EXCEEDED || code === BankErrorCode.BANK_UNAVAILABLE
  };
}

// ============================================================================
// MOCK BANK API CLIENT CLASS
// ============================================================================

export class MockBankApiClient {
  private provider: BankProvider;
  private accessToken: string | null = null;

  constructor(provider: BankProvider = BankProvider.MOCK) {
    this.provider = provider;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  async getAccountInfo(): Promise<AccountInfoResponse> {
    if (!this.accessToken) {
      throw createBankError(BankErrorCode.TOKEN_INVALID, 'No access token set');
    }
    return getAccountInfo(this.accessToken);
  }

  async fetchTransactions(
    fromDate: string,
    toDate: string,
    page?: number,
    limit?: number
  ): Promise<FetchTransactionsResponse> {
    if (!this.accessToken) {
      throw createBankError(BankErrorCode.TOKEN_INVALID, 'No access token set');
    }
    return fetchTransactions(this.accessToken, fromDate, toDate, page, limit);
  }

  async getTransactionSummary(fromDate: string, toDate: string): Promise<TransactionSummary> {
    if (!this.accessToken) {
      throw createBankError(BankErrorCode.TOKEN_INVALID, 'No access token set');
    }
    return getTransactionSummary(this.accessToken, fromDate, toDate);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize mock bank with sample accounts
 */
export function initializeMockBank(): void {
  // Create sample accounts
  const sampleAccounts = [
    { number: '1234567890', name: 'SuperMart ABC', balance: 75000 },
    { number: '2345678901', name: 'Factory XYZ Ltd', balance: 150000 },
    { number: '3456789012', name: 'Quick Bites Restaurant', balance: 25000 },
    { number: '4567890123', name: 'Tech Solutions Inc', balance: 100000 },
    { number: '5678901234', name: 'Green Groceries', balance: 45000 }
  ];
  
  sampleAccounts.forEach(acc => {
    generateMockAccount(acc.number, acc.name, acc.balance);
    // Generate some initial transaction history
    const now = new Date();
    generateMonthlyTransactions(acc.number, now.getFullYear(), now.getMonth() + 1, 3000);
  });
  
  console.log('[MockBank] Initialized with', sampleAccounts.length, 'sample accounts');
}

/**
 * Reset all mock data
 */
export function resetMockBank(): void {
  mockAccounts.clear();
  mockOAuthSessions.clear();
  mockAccessTokens.clear();
  webhookHandler = null;
  webhookUrl = null;
  console.log('[MockBank] All data reset');
}

/**
 * Get mock statistics
 */
export function getMockStats(): {
  accounts: number;
  oauthSessions: number;
  accessTokens: number;
  totalTransactions: number;
} {
  let totalTransactions = 0;
  mockAccounts.forEach(acc => {
    totalTransactions += acc.transactions.length;
  });
  
  return {
    accounts: mockAccounts.size,
    oauthSessions: mockOAuthSessions.size,
    accessTokens: mockAccessTokens.size,
    totalTransactions
  };
}

// Initialize on module load
initializeMockBank();
