/**
 * Bank Routes
 * Trading Platform - Bank Integration Module
 * 
 * Routes for bank account management and transaction operations
 */

import { Router } from 'express';
import * as BankController from '../controllers/bankController';

const router = Router();

// ============================================================================
// OAUTH FLOW ROUTES
// ============================================================================

/**
 * @route   GET /api/bank/authorize
 * @desc    Initiate bank OAuth authorization flow
 * @query   {string} provider - Bank provider (ecobank, uba, gtbank, access_bank, mock)
 * @query   {string} companyId - Company ID to connect
 * @query   {string} [redirectUrl] - Optional custom redirect URL
 * @access  Private
 */
router.get('/authorize', BankController.initiateAuthorization);

/**
 * @route   GET /api/bank/callback
 * @desc    Handle OAuth callback from bank
 * @query   {string} code - Authorization code
 * @query   {string} state - State parameter for CSRF protection
 * @query   {string} [error] - Error code (if failed)
 * @query   {string} [error_description] - Error description (if failed)
 * @access  Public (callback from bank)
 */
router.get('/callback', BankController.handleOAuthCallback);

// ============================================================================
// ACCOUNT MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/bank/connect
 * @desc    Complete bank account connection after OAuth
 * @body    {string} companyId - Company ID
 * @body    {string} provider - Bank provider
 * @body    {string} accountNumber - Bank account number
 * @body    {string} accessToken - OAuth access token
 * @body    {string} [refreshToken] - OAuth refresh token
 * @body    {number} [expiresIn] - Token expiry in seconds
 * @access  Private
 */
router.post('/connect', BankController.connectBankAccount);

/**
 * @route   GET /api/bank/accounts
 * @desc    List connected bank accounts
 * @query   {string} [companyId] - Filter by company
 * @query   {boolean} [includeDisconnected] - Include disconnected accounts
 * @access  Private
 */
router.get('/accounts', BankController.listAccounts);

/**
 * @route   GET /api/bank/accounts/:accountId
 * @desc    Get specific bank account details
 * @param   {string} accountId - Bank account ID
 * @access  Private
 */
router.get('/accounts/:accountId', BankController.getAccount);

/**
 * @route   DELETE /api/bank/disconnect/:accountId
 * @desc    Disconnect a bank account
 * @param   {string} accountId - Bank account ID
 * @access  Private
 */
router.delete('/disconnect/:accountId', BankController.disconnectAccount);

// ============================================================================
// TRANSACTION ROUTES
// ============================================================================

/**
 * @route   GET /api/bank/transactions
 * @desc    Fetch transactions for a company or account
 * @query   {string} [companyId] - Company ID (required if no accountId)
 * @query   {string} [accountId] - Bank account ID
 * @query   {string} [fromDate] - Start date (YYYY-MM-DD)
 * @query   {string} [toDate] - End date (YYYY-MM-DD)
 * @query   {string} [type] - Filter by type (credit/debit)
 * @query   {string} [category] - Filter by category
 * @query   {number} [page=1] - Page number
 * @query   {number} [limit=50] - Items per page
 * @access  Private
 */
router.get('/transactions', BankController.fetchTransactions);

/**
 * @route   GET /api/bank/transactions/:transactionId
 * @desc    Get specific transaction details
 * @param   {string} transactionId - Transaction ID
 * @access  Private
 */
router.get('/transactions/:transactionId', BankController.getTransaction);

// ============================================================================
// SYNC ROUTES
// ============================================================================

/**
 * @route   POST /api/bank/sync
 * @desc    Trigger manual transaction sync
 * @body    {string} companyId - Company ID (required)
 * @body    {string} [accountId] - Specific account ID
 * @body    {string} [fromDate] - Start date
 * @body    {string} [toDate] - End date
 * @body    {boolean} [force] - Force re-sync
 * @access  Private
 */
router.post('/sync', BankController.triggerSync);

/**
 * @route   POST /api/bank/sync-all
 * @desc    Trigger sync for all companies (admin only)
 * @body    {string} [fromDate] - Start date
 * @body    {string} [toDate] - End date
 * @access  Private (Admin)
 */
router.post('/sync-all', BankController.triggerSyncAll);

/**
 * @route   GET /api/bank/sync-status/:companyId
 * @desc    Get sync status for a company
 * @param   {string} companyId - Company ID
 * @access  Private
 */
router.get('/sync-status/:companyId', BankController.getSyncStatus);

// ============================================================================
// WEBHOOK ROUTES
// ============================================================================

/**
 * @route   POST /api/bank/webhook
 * @desc    Handle incoming webhooks from bank
 * @body    {object} payload - Webhook payload from bank
 * @headers {string} x-bank-signature - Webhook signature
 * @access  Public (from bank)
 */
router.post('/webhook', BankController.handleWebhook);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * @route   GET /api/bank/admin/stats
 * @desc    Get bank integration statistics
 * @access  Private (Admin)
 */
router.get('/admin/stats', BankController.getBankStats);

/**
 * @route   GET /api/bank/admin/accounts
 * @desc    Get all bank accounts
 * @access  Private (Admin)
 */
router.get('/admin/accounts', BankController.getAllAccounts);

export default router;
