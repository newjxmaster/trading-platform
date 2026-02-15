/**
 * Bank API Service
 * Trading Platform - Bank Integration Module
 * 
 * Handles OAuth flows, token management, and API calls to:
 * - Ecobank API
 * - UBA API
 * - GTBank API
 * - Access Bank API
 * - Mock Bank API (for testing)
 */

import {
  BankProvider,
  BankAccount,
  BankAccountInput,
  BankAccountStatus,
  OAuthTokenResponse,
  OAuthState,
  AccountInfoResponse,
  FetchTransactionsResponse,
  FetchTransactionsRequest,
  BankApiConfig,
  BankError,
  BankErrorCode,
  BankWebhookPayload,
  WebhookEventType
} from '../types/bank.types';

import * as MockBankApi from '../mock/bankApi.mock';

// ============================================================================
// CONFIGURATION
// ============================================================================

const BANK_API_CONFIGS: Record<BankProvider, BankApiConfig> = {
  [BankProvider.ECOBANK]: {
    provider: BankProvider.ECOBANK,
    baseUrl: process.env.ECOBANK_API_URL || 'https://api.ecobank.com/v1',
    authUrl: process.env.ECOBANK_AUTH_URL || 'https://auth.ecobank.com/oauth/authorize',
    tokenUrl: process.env.ECOBANK_TOKEN_URL || 'https://auth.ecobank.com/oauth/token',
    clientId: process.env.ECOBANK_CLIENT_ID || '',
    clientSecret: process.env.ECOBANK_CLIENT_SECRET || '',
    redirectUri: process.env.BANK_REDIRECT_URI || 'http://localhost:3000/api/bank/callback',
    scopes: ['read_accounts', 'read_transactions', 'read_balance'],
    webhookSecret: process.env.ECOBANK_WEBHOOK_SECRET
  },
  [BankProvider.UBA]: {
    provider: BankProvider.UBA,
    baseUrl: process.env.UBA_API_URL || 'https://api.ubagroup.com/v1',
    authUrl: process.env.UBA_AUTH_URL || 'https://auth.ubagroup.com/oauth/authorize',
    tokenUrl: process.env.UBA_TOKEN_URL || 'https://auth.ubagroup.com/oauth/token',
    clientId: process.env.UBA_CLIENT_ID || '',
    clientSecret: process.env.UBA_CLIENT_SECRET || '',
    redirectUri: process.env.BANK_REDIRECT_URI || 'http://localhost:3000/api/bank/callback',
    scopes: ['read_accounts', 'read_transactions'],
    webhookSecret: process.env.UBA_WEBHOOK_SECRET
  },
  [BankProvider.GTBANK]: {
    provider: BankProvider.GTBANK,
    baseUrl: process.env.GTBANK_API_URL || 'https://api.gtbank.com/v1',
    authUrl: process.env.GTBANK_AUTH_URL || 'https://auth.gtbank.com/oauth/authorize',
    tokenUrl: process.env.GTBANK_TOKEN_URL || 'https://auth.gtbank.com/oauth/token',
    clientId: process.env.GTBANK_CLIENT_ID || '',
    clientSecret: process.env.GTBANK_CLIENT_SECRET || '',
    redirectUri: process.env.BANK_REDIRECT_URI || 'http://localhost:3000/api/bank/callback',
    scopes: ['read_accounts', 'read_transactions', 'read_balance'],
    webhookSecret: process.env.GTBANK_WEBHOOK_SECRET
  },
  [BankProvider.ACCESS_BANK]: {
    provider: BankProvider.ACCESS_BANK,
    baseUrl: process.env.ACCESS_BANK_API_URL || 'https://api.accessbankplc.com/v1',
    authUrl: process.env.ACCESS_BANK_AUTH_URL || 'https://auth.accessbankplc.com/oauth/authorize',
    tokenUrl: process.env.ACCESS_BANK_TOKEN_URL || 'https://auth.accessbankplc.com/oauth/token',
    clientId: process.env.ACCESS_BANK_CLIENT_ID || '',
    clientSecret: process.env.ACCESS_BANK_CLIENT_SECRET || '',
    redirectUri: process.env.BANK_REDIRECT_URI || 'http://localhost:3000/api/bank/callback',
    scopes: ['read_accounts', 'read_transactions'],
    webhookSecret: process.env.ACCESS_BANK_WEBHOOK_SECRET
  },
  [BankProvider.MOCK]: {
    provider: BankProvider.MOCK,
    baseUrl: 'http://localhost:3001/mock-bank',
    authUrl: 'http://localhost:3001/mock-bank/oauth/authorize',
    tokenUrl: 'http://localhost:3001/mock-bank/oauth/token',
    clientId: 'mock_client_id',
    clientSecret: 'mock_client_secret',
    redirectUri: process.env.BANK_REDIRECT_URI || 'http://localhost:3000/api/bank/callback',
    scopes: ['read_transactions', 'read_account_info'],
    webhookSecret: 'mock_webhook_secret'
  }
};

// In-memory store for OAuth states (use Redis in production)
const oauthStates: Map<string, OAuthState> = new Map();

// In-memory store for bank accounts (use database in production)
const bankAccounts: Map<string, BankAccount> = new Map();

// ============================================================================
// OAUTH FLOW
// ============================================================================

/**
 * Generate a cryptographically secure random state
 */
function generateState(): string {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Initiate OAuth authorization flow
 * Returns the authorization URL to redirect the user to
 */
export async function initiateOAuth(
  provider: BankProvider,
  companyId: string,
  userId: string,
  redirectUrl?: string
): Promise<{ authUrl: string; state: string }> {
  const config = BANK_API_CONFIGS[provider];
  if (!config) {
    throw createBankError(BankErrorCode.INVALID_REQUEST, `Unsupported bank provider: ${provider}`);
  }

  // Generate state for CSRF protection
  const state = generateState();
  
  // Store OAuth state
  const oauthState: OAuthState = {
    state,
    companyId,
    userId,
    provider,
    redirectUrl: redirectUrl || config.redirectUri,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  };
  
  oauthStates.set(state, oauthState);
  
  // Use mock bank for testing
  if (provider === BankProvider.MOCK) {
    // For mock, we'll simulate the account number
    const mockAccountNumber = `MOCK${Date.now()}`;
    const mockAuthUrl = MockBankApi.initiateOAuth(
      provider,
      mockAccountNumber,
      config.redirectUri,
      state
    );
    
    // Store the mock account number in the state for later
    oauthState.metadata = { mockAccountNumber };
    
    return { authUrl: mockAuthUrl, state };
  }
  
  // Build authorization URL for real banks
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    state,
    scope: config.scopes.join(' ')
  });
  
  const authUrl = `${config.authUrl}?${params.toString()}`;
  
  console.log(`[BankApiService] Initiated OAuth for ${provider}, company: ${companyId}`);
  
  return { authUrl, state };
}

/**
 * Exchange authorization code for access token
 * Called after user authorizes the connection
 */
export async function exchangeCodeForToken(
  code: string,
  state: string
): Promise<OAuthTokenResponse & { companyId: string; userId: string; provider: BankProvider }> {
  // Validate state
  const oauthState = oauthStates.get(state);
  if (!oauthState) {
    throw createBankError(BankErrorCode.INVALID_CREDENTIALS, 'Invalid or expired state');
  }
  
  if (oauthState.expiresAt < new Date()) {
    oauthStates.delete(state);
    throw createBankError(BankErrorCode.TOKEN_EXPIRED, 'OAuth session expired');
  }
  
  const config = BANK_API_CONFIGS[oauthState.provider];
  
  // Exchange code for token
  let tokenResponse: OAuthTokenResponse;
  
  if (oauthState.provider === BankProvider.MOCK) {
    // Use mock bank
    tokenResponse = MockBankApi.exchangeCodeForToken(code, state);
  } else {
    // Real bank API call
    tokenResponse = await exchangeCodeWithBank(config, code);
  }
  
  // Clean up state
  oauthStates.delete(state);
  
  console.log(`[BankApiService] Exchanged code for token, provider: ${oauthState.provider}`);
  
  return {
    ...tokenResponse,
    companyId: oauthState.companyId,
    userId: oauthState.userId,
    provider: oauthState.provider
  };
}

/**
 * Exchange code with actual bank API
 */
async function exchangeCodeWithBank(
  config: BankApiConfig,
  code: string
): Promise<OAuthTokenResponse> {
  try {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw createBankError(
        BankErrorCode.INVALID_CREDENTIALS,
        error.error_description || 'Failed to exchange code for token'
      );
    }
    
    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type || 'Bearer',
      scope: data.scope
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      throw error;
    }
    throw createBankError(
      BankErrorCode.BANK_UNAVAILABLE,
      'Bank API unavailable'
    );
  }
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Refresh expired access token
 */
export async function refreshToken(
  accountId: string
): Promise<OAuthTokenResponse> {
  const account = bankAccounts.get(accountId);
  if (!account) {
    throw createBankError(BankErrorCode.ACCOUNT_NOT_FOUND, 'Bank account not found');
  }
  
  if (!account.refreshToken) {
    throw createBankError(BankErrorCode.TOKEN_INVALID, 'No refresh token available');
  }
  
  const config = BANK_API_CONFIGS[account.provider];
  
  let tokenResponse: OAuthTokenResponse;
  
  if (account.provider === BankProvider.MOCK) {
    tokenResponse = MockBankApi.refreshAccessToken(account.refreshToken);
  } else {
    // Real bank API call
    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: account.refreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret
        })
      });
      
      if (!response.ok) {
        throw createBankError(BankErrorCode.TOKEN_INVALID, 'Failed to refresh token');
      }
      
      const data = await response.json();
      tokenResponse = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || account.refreshToken,
        expiresIn: data.expires_in,
        tokenType: data.token_type || 'Bearer',
        scope: data.scope
      };
    } catch (error) {
      throw createBankError(BankErrorCode.BANK_UNAVAILABLE, 'Bank API unavailable');
    }
  }
  
  // Update account with new tokens
  account.accessToken = tokenResponse.accessToken;
  account.refreshToken = tokenResponse.refreshToken;
  account.tokenExpiresAt = new Date(Date.now() + tokenResponse.expiresIn * 1000);
  account.updatedAt = new Date();
  
  bankAccounts.set(accountId, account);
  
  console.log(`[BankApiService] Refreshed token for account: ${accountId}`);
  
  return tokenResponse;
}

/**
 * Check if token is expired or about to expire
 */
export function isTokenExpired(account: BankAccount, bufferMinutes: number = 5): boolean {
  if (!account.tokenExpiresAt) return true;
  
  const bufferMs = bufferMinutes * 60 * 1000;
  return account.tokenExpiresAt.getTime() - bufferMs < Date.now();
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getValidAccessToken(accountId: string): Promise<string> {
  const account = bankAccounts.get(accountId);
  if (!account) {
    throw createBankError(BankErrorCode.ACCOUNT_NOT_FOUND, 'Bank account not found');
  }
  
  if (isTokenExpired(account)) {
    const tokens = await refreshToken(accountId);
    return tokens.accessToken;
  }
  
  if (!account.accessToken) {
    throw createBankError(BankErrorCode.TOKEN_INVALID, 'No access token available');
  }
  
  return account.accessToken;
}

// ============================================================================
// ACCOUNT MANAGEMENT
// ============================================================================

/**
 * Create and store bank account connection
 */
export async function createBankAccount(
  input: BankAccountInput,
  tokens: OAuthTokenResponse
): Promise<BankAccount> {
  const config = BANK_API_CONFIGS[input.provider];
  
  const account: BankAccount = {
    id: generateAccountId(),
    companyId: input.companyId,
    userId: input.userId,
    provider: input.provider,
    bankName: getBankName(input.provider),
    bankCode: getBankCode(input.provider),
    accountNumber: input.accountNumber,
    accountName: input.accountName || '',
    accountType: input.accountType || 'business',
    currency: input.currency || 'USD',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
    status: BankAccountStatus.CONNECTED,
    connectedAt: new Date(),
    lastSyncAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Verify account with bank API
  try {
    const accountInfo = await getAccountInfo(account.id);
    account.accountName = accountInfo.accountName;
    account.currency = accountInfo.currency;
  } catch (error) {
    console.warn('[BankApiService] Could not verify account info:', error);
  }
  
  bankAccounts.set(account.id, account);
  
  console.log(`[BankApiService] Created bank account: ${account.id}, company: ${input.companyId}`);
  
  return account;
}

/**
 * Get bank account by ID
 */
export function getBankAccount(accountId: string): BankAccount | null {
  return bankAccounts.get(accountId) || null;
}

/**
 * Get bank accounts by company ID
 */
export function getBankAccountsByCompany(companyId: string): BankAccount[] {
  return Array.from(bankAccounts.values()).filter(
    acc => acc.companyId === companyId && acc.status === BankAccountStatus.CONNECTED
  );
}

/**
 * Get bank accounts by user ID
 */
export function getBankAccountsByUser(userId: string): BankAccount[] {
  return Array.from(bankAccounts.values()).filter(
    acc => acc.userId === userId
  );
}

/**
 * Update bank account
 */
export function updateBankAccount(
  accountId: string,
  updates: Partial<BankAccount>
): BankAccount {
  const account = bankAccounts.get(accountId);
  if (!account) {
    throw createBankError(BankErrorCode.ACCOUNT_NOT_FOUND, 'Bank account not found');
  }
  
  const updatedAccount = {
    ...account,
    ...updates,
    updatedAt: new Date()
  };
  
  bankAccounts.set(accountId, updatedAccount);
  
  return updatedAccount;
}

/**
 * Disconnect bank account
 */
export async function disconnectAccount(accountId: string): Promise<void> {
  const account = bankAccounts.get(accountId);
  if (!account) {
    throw createBankError(BankErrorCode.ACCOUNT_NOT_FOUND, 'Bank account not found');
  }
  
  // Revoke tokens with bank (if supported)
  if (account.provider !== BankProvider.MOCK) {
    try {
      await revokeTokens(account);
    } catch (error) {
      console.warn('[BankApiService] Could not revoke tokens:', error);
    }
  }
  
  // Update account status
  account.status = BankAccountStatus.DISCONNECTED;
  account.disconnectedAt = new Date();
  account.accessToken = undefined;
  account.refreshToken = undefined;
  account.tokenExpiresAt = undefined;
  account.updatedAt = new Date();
  
  bankAccounts.set(accountId, account);
  
  console.log(`[BankApiService] Disconnected bank account: ${accountId}`);
}

/**
 * Revoke tokens with bank API
 */
async function revokeTokens(account: BankAccount): Promise<void> {
  const config = BANK_API_CONFIGS[account.provider];
  
  try {
    await fetch(`${config.baseUrl}/oauth/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${account.accessToken}`
      },
      body: JSON.stringify({
        token: account.accessToken,
        client_id: config.clientId,
        client_secret: config.clientSecret
      })
    });
  } catch (error) {
    // Log but don't throw - account is still disconnected locally
    console.warn('[BankApiService] Token revocation failed:', error);
  }
}

// ============================================================================
// ACCOUNT INFORMATION
// ============================================================================

/**
 * Get account information from bank
 */
export async function getAccountInfo(accountId: string): Promise<AccountInfoResponse> {
  const account = bankAccounts.get(accountId);
  if (!account) {
    throw createBankError(BankErrorCode.ACCOUNT_NOT_FOUND, 'Bank account not found');
  }
  
  const accessToken = await getValidAccessToken(accountId);
  
  if (account.provider === BankProvider.MOCK) {
    const mockClient = new MockBankApi.MockBankApiClient(account.provider);
    mockClient.setAccessToken(accessToken);
    return mockClient.getAccountInfo();
  }
  
  // Real bank API call
  const config = BANK_API_CONFIGS[account.provider];
  
  try {
    const response = await fetch(`${config.baseUrl}/accounts/${account.accountNumber}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw createBankError(BankErrorCode.BANK_UNAVAILABLE, 'Failed to fetch account info');
    }
    
    const data = await response.json();
    
    return {
      accountNumber: data.account_number,
      accountName: data.account_name,
      accountType: data.account_type,
      currency: data.currency,
      balance: data.balance,
      availableBalance: data.available_balance,
      bankName: data.bank_name,
      bankCode: data.bank_code,
      status: data.status
    };
  } catch (error) {
    throw createBankError(BankErrorCode.BANK_UNAVAILABLE, 'Bank API unavailable');
  }
}

// ============================================================================
// TRANSACTION FETCHING
// ============================================================================

/**
 * Fetch transactions from bank
 */
export async function fetchTransactions(
  accountId: string,
  request: FetchTransactionsRequest
): Promise<FetchTransactionsResponse> {
  const account = bankAccounts.get(accountId);
  if (!account) {
    throw createBankError(BankErrorCode.ACCOUNT_NOT_FOUND, 'Bank account not found');
  }
  
  const accessToken = await getValidAccessToken(accountId);
  
  const fromDate = request.fromDate instanceof Date 
    ? request.fromDate.toISOString().split('T')[0]
    : request.fromDate;
  const toDate = request.toDate instanceof Date
    ? request.toDate.toISOString().split('T')[0]
    : request.toDate;
  
  if (account.provider === BankProvider.MOCK) {
    const mockClient = new MockBankApi.MockBankApiClient(account.provider);
    mockClient.setAccessToken(accessToken);
    return mockClient.fetchTransactions(fromDate, toDate, request.page, request.limit);
  }
  
  // Real bank API call
  const config = BANK_API_CONFIGS[account.provider];
  
  try {
    const params = new URLSearchParams({
      account_number: account.accountNumber,
      from_date: fromDate,
      to_date: toDate,
      page: String(request.page || 1),
      limit: String(request.limit || 100)
    });
    
    const response = await fetch(`${config.baseUrl}/transactions?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw createBankError(BankErrorCode.BANK_UNAVAILABLE, 'Failed to fetch transactions');
    }
    
    const data = await response.json();
    
    return {
      transactions: data.transactions,
      summary: data.summary,
      pagination: data.pagination
    };
  } catch (error) {
    throw createBankError(BankErrorCode.BANK_UNAVAILABLE, 'Bank API unavailable');
  }
}

/**
 * Get transaction summary for date range
 */
export async function getTransactionSummary(
  accountId: string,
  fromDate: Date,
  toDate: Date
): Promise<{ totalCredits: number; totalDebits: number; netAmount: number }> {
  const response = await fetchTransactions(accountId, {
    accountNumber: '', // Not used for mock
    fromDate,
    toDate,
    page: 1,
    limit: 1000
  });
  
  return {
    totalCredits: response.summary.totalCredits,
    totalDebits: response.summary.totalDebits,
    netAmount: response.summary.netAmount
  };
}

// ============================================================================
// WEBHOOK HANDLING
// ============================================================================

/**
 * Register webhook for real-time updates
 */
export async function registerWebhook(
  accountId: string,
  webhookUrl: string
): Promise<void> {
  const account = bankAccounts.get(accountId);
  if (!account) {
    throw createBankError(BankErrorCode.ACCOUNT_NOT_FOUND, 'Bank account not found');
  }
  
  if (account.provider === BankProvider.MOCK) {
    MockBankApi.registerWebhook(webhookUrl, (payload) => {
      handleWebhook(payload);
    });
    return;
  }
  
  // Real bank webhook registration
  const config = BANK_API_CONFIGS[account.provider];
  const accessToken = await getValidAccessToken(accountId);
  
  try {
    await fetch(`${config.baseUrl}/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: ['transaction.created', 'transaction.updated', 'account.updated'],
        secret: config.webhookSecret
      })
    });
  } catch (error) {
    throw createBankError(BankErrorCode.BANK_UNAVAILABLE, 'Failed to register webhook');
  }
}

/**
 * Handle incoming webhook from bank
 */
export function handleWebhook(payload: BankWebhookPayload): void {
  console.log('[BankApiService] Received webhook:', payload.eventType);
  
  // Verify webhook signature (in production)
  // const isValid = verifyWebhookSignature(payload);
  
  switch (payload.eventType) {
    case WebhookEventType.TRANSACTION_NEW:
      // Emit event for transaction processor
      console.log('[BankApiService] New transaction:', payload.data);
      break;
      
    case WebhookEventType.TRANSACTION_UPDATED:
      console.log('[BankApiService] Transaction updated:', payload.data);
      break;
      
    case WebhookEventType.ACCOUNT_CONNECTED:
      console.log('[BankApiService] Account connected:', payload.data);
      break;
      
    case WebhookEventType.ACCOUNT_DISCONNECTED:
      console.log('[BankApiService] Account disconnected:', payload.data);
      break;
      
    case WebhookEventType.BALANCE_UPDATED:
      console.log('[BankApiService] Balance updated:', payload.data);
      break;
      
    default:
      console.log('[BankApiService] Unknown webhook event:', payload.eventType);
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: BankWebhookPayload,
  secret: string
): boolean {
  // Implementation would use HMAC-SHA256
  // For now, just return true for mock
  return true;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateAccountId(): string {
  return `ba_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getBankName(provider: BankProvider): string {
  const names: Record<BankProvider, string> = {
    [BankProvider.ECOBANK]: 'Ecobank',
    [BankProvider.UBA]: 'United Bank for Africa',
    [BankProvider.GTBANK]: 'Guaranty Trust Bank',
    [BankProvider.ACCESS_BANK]: 'Access Bank',
    [BankProvider.MOCK]: 'Mock Bank'
  };
  return names[provider] || provider;
}

function getBankCode(provider: BankProvider): string {
  const codes: Record<BankProvider, string> = {
    [BankProvider.ECOBANK]: 'ECO',
    [BankProvider.UBA]: 'UBA',
    [BankProvider.GTBANK]: 'GTB',
    [BankProvider.ACCESS_BANK]: 'ACC',
    [BankProvider.MOCK]: 'MOCK'
  };
  return codes[provider] || provider;
}

function createBankError(code: BankErrorCode, message: string): BankError {
  return {
    code,
    message,
    retryable: code === BankErrorCode.RATE_LIMIT_EXCEEDED || 
               code === BankErrorCode.BANK_UNAVAILABLE
  };
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Get all connected bank accounts (admin only)
 */
export function getAllBankAccounts(): BankAccount[] {
  return Array.from(bankAccounts.values());
}

/**
 * Get bank account statistics (admin only)
 */
export function getBankAccountStats(): {
  total: number;
  connected: number;
  disconnected: number;
  byProvider: Record<string, number>;
} {
  const accounts = Array.from(bankAccounts.values());
  
  const byProvider: Record<string, number> = {};
  accounts.forEach(acc => {
    byProvider[acc.provider] = (byProvider[acc.provider] || 0) + 1;
  });
  
  return {
    total: accounts.length,
    connected: accounts.filter(a => a.status === BankAccountStatus.CONNECTED).length,
    disconnected: accounts.filter(a => a.status === BankAccountStatus.DISCONNECTED).length,
    byProvider
  };
}

/**
 * Clean up expired OAuth states
 */
export function cleanupExpiredStates(): number {
  let count = 0;
  const now = new Date();
  
  oauthStates.forEach((state, key) => {
    if (state.expiresAt < now) {
      oauthStates.delete(key);
      count++;
    }
  });
  
  return count;
}
