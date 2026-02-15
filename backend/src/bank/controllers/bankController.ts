/**
 * Bank Controller
 * Trading Platform - Bank Integration Module
 * 
 * API Endpoints:
 * - GET /api/bank/authorize - Initiate bank connection (OAuth)
 * - GET /api/bank/callback - OAuth callback handler
 * - POST /api/bank/connect - Connect bank account
 * - GET /api/bank/accounts - List connected accounts
 * - GET /api/bank/transactions - Fetch transactions
 * - POST /api/bank/sync - Trigger manual sync
 * - DELETE /api/bank/disconnect - Remove connection
 * - POST /api/bank/webhook - Handle bank webhooks
 */

import { Request, Response } from 'express';
import {
  BankProvider,
  BankAccount,
  BankAccountStatus,
  BankErrorCode,
  WebhookEventType
} from '../types/bank.types';

import * as BankApiService from '../services/bankApiService';
import * as RevenueSyncService from '../services/revenueSyncService';
import * as TransactionProcessor from '../services/transactionProcessor';

// ============================================================================
// OAUTH FLOW
// ============================================================================

/**
 * GET /api/bank/authorize
 * Initiate bank OAuth authorization flow
 * 
 * Query params:
 * - provider: Bank provider (ecobank, uba, gtbank, access_bank, mock)
 * - companyId: Company ID to connect
 * - redirectUrl: Optional custom redirect URL
 */
export async function initiateAuthorization(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { provider, companyId, redirectUrl } = req.query;
    const userId = req.user?.id; // Assuming auth middleware sets req.user
    
    // Validate required parameters
    if (!provider || !companyId) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: provider, companyId'
      });
      return;
    }
    
    // Validate provider
    if (!Object.values(BankProvider).includes(provider as BankProvider)) {
      res.status(400).json({
        success: false,
        error: `Invalid provider. Valid options: ${Object.values(BankProvider).join(', ')}`
      });
      return;
    }
    
    // Initiate OAuth flow
    const { authUrl, state } = await BankApiService.initiateOAuth(
      provider as BankProvider,
      companyId as string,
      userId || 'anonymous',
      redirectUrl as string | undefined
    );
    
    res.json({
      success: true,
      data: {
        authUrl,
        state,
        provider
      }
    });
    
  } catch (error) {
    console.error('[BankController] Initiate authorization error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate authorization'
    });
  }
}

/**
 * GET /api/bank/callback
 * Handle OAuth callback from bank
 * 
 * Query params:
 * - code: Authorization code
 * - state: State parameter for CSRF protection
 * - error: Error code (if failed)
 * - error_description: Error description (if failed)
 */
export async function handleOAuthCallback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { code, state, error, error_description } = req.query;
    
    // Handle OAuth error
    if (error) {
      console.error('[BankController] OAuth error:', error, error_description);
      res.status(400).json({
        success: false,
        error: error_description || error
      });
      return;
    }
    
    // Validate required parameters
    if (!code || !state) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: code, state'
      });
      return;
    }
    
    // Exchange code for token
    const tokenData = await BankApiService.exchangeCodeForToken(
      code as string,
      state as string
    );
    
    // Return token data (in production, you might redirect to frontend)
    res.json({
      success: true,
      data: {
        message: 'Authorization successful',
        provider: tokenData.provider,
        companyId: tokenData.companyId,
        expiresIn: tokenData.expiresIn,
        scope: tokenData.scope
      }
    });
    
  } catch (error) {
    console.error('[BankController] OAuth callback error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'OAuth callback failed'
    });
  }
}

// ============================================================================
// ACCOUNT MANAGEMENT
// ============================================================================

/**
 * POST /api/bank/connect
 * Complete bank account connection after OAuth
 * 
 * Body:
 * - companyId: Company ID
 * - provider: Bank provider
 * - accountNumber: Bank account number
 * - accessToken: OAuth access token
 * - refreshToken: OAuth refresh token
 * - expiresIn: Token expiry in seconds
 */
export async function connectBankAccount(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      companyId,
      provider,
      accountNumber,
      accountName,
      accessToken,
      refreshToken,
      expiresIn
    } = req.body;
    
    const userId = req.user?.id;
    
    // Validate required fields
    if (!companyId || !provider || !accountNumber || !accessToken) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: companyId, provider, accountNumber, accessToken'
      });
      return;
    }
    
    // Create bank account
    const account = await BankApiService.createBankAccount(
      {
        companyId,
        userId: userId || 'system',
        provider: provider as BankProvider,
        accountNumber,
        accountName
      },
      {
        accessToken,
        refreshToken: refreshToken || '',
        expiresIn: expiresIn || 3600,
        tokenType: 'Bearer'
      }
    );
    
    // Trigger initial sync
    RevenueSyncService.syncTransactions({
      companyId,
      bankAccountId: account.id
    }).catch(err => {
      console.error('[BankController] Initial sync failed:', err);
    });
    
    res.status(201).json({
      success: true,
      data: {
        account: sanitizeBankAccount(account),
        message: 'Bank account connected successfully'
      }
    });
    
  } catch (error) {
    console.error('[BankController] Connect account error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect bank account'
    });
  }
}

/**
 * GET /api/bank/accounts
 * List connected bank accounts for a company
 * 
 * Query params:
 * - companyId: Filter by company
 * - includeDisconnected: Include disconnected accounts
 */
export async function listAccounts(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { companyId, includeDisconnected } = req.query;
    const userId = req.user?.id;
    
    let accounts: BankAccount[];
    
    if (companyId) {
      accounts = BankApiService.getBankAccountsByCompany(companyId as string);
    } else if (userId) {
      accounts = BankApiService.getBankAccountsByUser(userId);
    } else {
      res.status(400).json({
        success: false,
        error: 'Missing companyId or user authentication'
      });
      return;
    }
    
    // Filter disconnected accounts unless requested
    if (includeDisconnected !== 'true') {
      accounts = accounts.filter(a => a.status === BankAccountStatus.CONNECTED);
    }
    
    res.json({
      success: true,
      data: {
        accounts: accounts.map(sanitizeBankAccount),
        count: accounts.length
      }
    });
    
  } catch (error) {
    console.error('[BankController] List accounts error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list accounts'
    });
  }
}

/**
 * GET /api/bank/accounts/:accountId
 * Get specific bank account details
 */
export async function getAccount(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { accountId } = req.params;
    
    const account = BankApiService.getBankAccount(accountId);
    
    if (!account) {
      res.status(404).json({
        success: false,
        error: 'Bank account not found'
      });
      return;
    }
    
    // Get account info from bank (includes current balance)
    let accountInfo = null;
    try {
      accountInfo = await BankApiService.getAccountInfo(accountId);
    } catch (err) {
      console.warn('[BankController] Could not fetch account info:', err);
    }
    
    res.json({
      success: true,
      data: {
        account: sanitizeBankAccount(account),
        balance: accountInfo ? {
          current: accountInfo.balance,
          available: accountInfo.availableBalance,
          currency: accountInfo.currency
        } : null
      }
    });
    
  } catch (error) {
    console.error('[BankController] Get account error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get account'
    });
  }
}

/**
 * DELETE /api/bank/disconnect/:accountId
 * Disconnect a bank account
 */
export async function disconnectAccount(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { accountId } = req.params;
    
    const account = BankApiService.getBankAccount(accountId);
    
    if (!account) {
      res.status(404).json({
        success: false,
        error: 'Bank account not found'
      });
      return;
    }
    
    await BankApiService.disconnectAccount(accountId);
    
    res.json({
      success: true,
      data: {
        message: 'Bank account disconnected successfully',
        accountId
      }
    });
    
  } catch (error) {
    console.error('[BankController] Disconnect account error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect account'
    });
  }
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

/**
 * GET /api/bank/transactions
 * Fetch transactions for a company or account
 * 
 * Query params:
 * - companyId: Company ID (required if no accountId)
 * - accountId: Bank account ID (optional)
 * - fromDate: Start date (YYYY-MM-DD)
 * - toDate: End date (YYYY-MM-DD)
 * - type: Filter by type (credit/debit)
 * - category: Filter by category
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 */
export async function fetchTransactions(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      companyId,
      accountId,
      fromDate,
      toDate,
      type,
      category,
      page = '1',
      limit = '50'
    } = req.query;
    
    if (!companyId && !accountId) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: companyId or accountId'
      });
      return;
    }
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);
    
    // Parse dates
    const fromDateObj = fromDate 
      ? new Date(fromDate as string) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDateObj = toDate 
      ? new Date(toDate as string) 
      : new Date();
    
    // Get transactions from processor
    const transactions = TransactionProcessor.getTransactionsByCompany(
      (companyId || accountId) as string,
      {
        fromDate: fromDateObj,
        toDate: toDateObj,
        type: type as any,
        category: category as any,
        limit: limitNum,
        offset: (pageNum - 1) * limitNum
      }
    );
    
    // Get summary
    const summary = TransactionProcessor.calculateNetRevenueForRange(
      (companyId || accountId) as string,
      fromDateObj,
      toDateObj
    );
    
    const totalCount = TransactionProcessor.getTransactionCount(
      (companyId || accountId) as string
    );
    
    res.json({
      success: true,
      data: {
        transactions: transactions.map(sanitizeTransaction),
        summary: {
          totalDeposits: summary.totalDeposits,
          totalWithdrawals: summary.totalWithdrawals,
          netRevenue: summary.netRevenue
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          hasMore: pageNum * limitNum < totalCount
        }
      }
    });
    
  } catch (error) {
    console.error('[BankController] Fetch transactions error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transactions'
    });
  }
}

/**
 * GET /api/bank/transactions/:transactionId
 * Get specific transaction details
 */
export async function getTransaction(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { transactionId } = req.params;
    
    const transaction = TransactionProcessor.getTransaction(transactionId);
    
    if (!transaction) {
      res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
      return;
    }
    
    // Get anomalies if any
    const anomalies = transaction.isAnomalous 
      ? TransactionProcessor.getTransactionAnomalies(transactionId)
      : [];
    
    res.json({
      success: true,
      data: {
        transaction: sanitizeTransaction(transaction),
        anomalies
      }
    });
    
  } catch (error) {
    console.error('[BankController] Get transaction error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get transaction'
    });
  }
}

// ============================================================================
// SYNC
// ============================================================================

/**
 * POST /api/bank/sync
 * Trigger manual transaction sync
 * 
 * Body:
 * - companyId: Company ID (required)
 * - accountId: Specific account ID (optional)
 * - fromDate: Start date (optional, defaults to 30 days ago)
 * - toDate: End date (optional, defaults to today)
 * - force: Force re-sync existing transactions (optional)
 */
export async function triggerSync(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { companyId, accountId, fromDate, toDate, force } = req.body;
    
    if (!companyId) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: companyId'
      });
      return;
    }
    
    // Parse dates
    const fromDateObj = fromDate ? new Date(fromDate) : undefined;
    const toDateObj = toDate ? new Date(toDate) : undefined;
    
    // Trigger sync
    const result = await RevenueSyncService.syncTransactions({
      companyId,
      bankAccountId: accountId,
      fromDate: fromDateObj,
      toDate: toDateObj,
      force: force === true
    });
    
    res.json({
      success: result.success,
      data: {
        syncResult: result,
        message: result.success 
          ? 'Sync completed successfully' 
          : 'Sync completed with errors'
      }
    });
    
  } catch (error) {
    console.error('[BankController] Trigger sync error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed'
    });
  }
}

/**
 * POST /api/bank/sync-all
 * Trigger sync for all companies (admin only)
 */
export async function triggerSyncAll(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { fromDate, toDate } = req.body;
    
    const fromDateObj = fromDate ? new Date(fromDate) : undefined;
    const toDateObj = toDate ? new Date(toDate) : undefined;
    
    const results = await RevenueSyncService.syncAllCompanies(fromDateObj, toDateObj);
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failCount
        }
      }
    });
    
  } catch (error) {
    console.error('[BankController] Sync all error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync all failed'
    });
  }
}

/**
 * GET /api/bank/sync-status/:companyId
 * Get sync status for a company
 */
export async function getSyncStatus(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { companyId } = req.params;
    
    const history = RevenueSyncService.getSyncHistory(companyId);
    const latestSync = history[history.length - 1];
    
    res.json({
      success: true,
      data: {
        companyId,
        latestSync: latestSync || null,
        syncCount: history.length,
        history: history.slice(-10) // Last 10 syncs
      }
    });
    
  } catch (error) {
    console.error('[BankController] Get sync status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sync status'
    });
  }
}

// ============================================================================
// WEBHOOKS
// ============================================================================

/**
 * POST /api/bank/webhook
 * Handle incoming webhooks from bank
 */
export async function handleWebhook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const payload = req.body;
    const signature = req.headers['x-bank-signature'] as string;
    
    // Verify signature (in production)
    // const isValid = BankApiService.verifyWebhookSignature(payload, signature);
    
    console.log('[BankController] Received webhook:', payload.eventType);
    
    // Process webhook based on event type
    switch (payload.eventType) {
      case WebhookEventType.TRANSACTION_NEW:
        // Trigger sync for the affected account
        if (payload.data?.accountNumber) {
          // Find company by account and sync
          console.log('[BankController] New transaction webhook, triggering sync');
        }
        break;
        
      case WebhookEventType.ACCOUNT_DISCONNECTED:
        // Update account status
        if (payload.data?.accountId) {
          BankApiService.updateBankAccount(payload.data.accountId, {
            status: BankAccountStatus.DISCONNECTED
          });
        }
        break;
        
      default:
        console.log('[BankController] Unhandled webhook event:', payload.eventType);
    }
    
    // Always return 200 to acknowledge receipt
    res.json({ success: true });
    
  } catch (error) {
    console.error('[BankController] Webhook error:', error);
    // Still return 200 to prevent retries
    res.json({ success: false });
  }
}

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * GET /api/bank/admin/stats
 * Get bank integration statistics (admin only)
 */
export async function getBankStats(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const stats = BankApiService.getBankAccountStats();
    const txnStats = TransactionProcessor.getTransactionStats();
    
    res.json({
      success: true,
      data: {
        accounts: stats,
        transactions: txnStats
      }
    });
    
  } catch (error) {
    console.error('[BankController] Get stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats'
    });
  }
}

/**
 * GET /api/bank/admin/accounts
 * Get all bank accounts (admin only)
 */
export async function getAllAccounts(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const accounts = BankApiService.getAllBankAccounts();
    
    res.json({
      success: true,
      data: {
        accounts: accounts.map(sanitizeBankAccount),
        count: accounts.length
      }
    });
    
  } catch (error) {
    console.error('[BankController] Get all accounts error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get accounts'
    });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sanitize bank account for API response (remove sensitive data)
 */
function sanitizeBankAccount(account: BankAccount): Partial<BankAccount> {
  return {
    id: account.id,
    companyId: account.companyId,
    provider: account.provider,
    bankName: account.bankName,
    bankCode: account.bankCode,
    accountNumber: maskAccountNumber(account.accountNumber),
    accountName: account.accountName,
    accountType: account.accountType,
    currency: account.currency,
    status: account.status,
    connectedAt: account.connectedAt,
    lastSyncAt: account.lastSyncAt,
    disconnectedAt: account.disconnectedAt,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt
  };
}

/**
 * Sanitize transaction for API response
 */
function sanitizeTransaction(transaction: any): any {
  return {
    id: transaction.id,
    companyId: transaction.companyId,
    transactionDate: transaction.transactionDate,
    transactionType: transaction.transactionType,
    amount: transaction.amount,
    currency: transaction.currency,
    balanceAfter: transaction.balanceAfter,
    description: transaction.description,
    reference: transaction.reference,
    category: transaction.category,
    status: transaction.status,
    isAnomalous: transaction.isAnomalous,
    anomalyReason: transaction.anomalyReason,
    createdAt: transaction.createdAt
  };
}

/**
 * Mask account number for display
 */
function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
}
