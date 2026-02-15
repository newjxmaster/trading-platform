/**
 * Revenue Routes
 * Trading Platform - Bank Integration Module
 * 
 * Routes for revenue tracking, reporting, and dividend calculations
 */

import { Router } from 'express';
import * as RevenueController from '../controllers/revenueController';

const router = Router();

// ============================================================================
// REVENUE REPORT ROUTES
// ============================================================================

/**
 * @route   GET /api/revenue/reports/:companyId
 * @desc    Get monthly revenue reports for a company
 * @param   {string} companyId - Company ID
 * @query   {number} [year] - Filter by year
 * @query   {string} [status] - Filter by status
 * @query   {number} [page=1] - Page number
 * @query   {number} [limit=12] - Items per page
 * @access  Private
 */
router.get('/reports/:companyId', RevenueController.getRevenueReports);

/**
 * @route   GET /api/revenue/report/:reportId
 * @desc    Get specific revenue report details with breakdown
 * @param   {string} reportId - Revenue report ID
 * @access  Private
 */
router.get('/report/:reportId', RevenueController.getRevenueReport);

/**
 * @route   GET /api/revenue/company/:companyId/month/:year/:month
 * @desc    Get revenue report for specific month
 * @param   {string} companyId - Company ID
 * @param   {number} year - Year
 * @param   {number} month - Month (1-12)
 * @access  Private
 */
router.get('/company/:companyId/month/:year/:month', RevenueController.getMonthlyRevenue);

// ============================================================================
// REVENUE SUMMARY ROUTES
// ============================================================================

/**
 * @route   GET /api/revenue/summary/:companyId
 * @desc    Get comprehensive revenue summary for a company
 * @param   {string} companyId - Company ID
 * @query   {string} [companyName] - Company name for display
 * @access  Private
 */
router.get('/summary/:companyId', RevenueController.getRevenueSummary);

/**
 * @route   GET /api/revenue/company/:companyId/current
 * @desc    Get current month revenue
 * @param   {string} companyId - Company ID
 * @access  Private
 */
router.get('/company/:companyId/current', RevenueController.getCurrentMonthRevenue);

// ============================================================================
// SYNC ROUTES
// ============================================================================

/**
 * @route   POST /api/revenue/sync
 * @desc    Trigger bank API sync for transactions
 * @body    {string} companyId - Company ID (required)
 * @body    {string} [accountId] - Bank account ID
 * @body    {string} [fromDate] - Start date
 * @body    {string} [toDate] - End date
 * @body    {boolean} [force] - Force re-sync
 * @access  Private
 */
router.post('/sync', RevenueController.triggerSync);

/**
 * @route   POST /api/revenue/sync-all
 * @desc    Trigger sync for all companies (admin only)
 * @body    {string} [fromDate] - Start date
 * @body    {string} [toDate] - End date
 * @access  Private (Admin)
 */
router.post('/sync-all', RevenueController.triggerSyncAll);

// ============================================================================
// REVENUE CALCULATION ROUTES
// ============================================================================

/**
 * @route   POST /api/revenue/calculate
 * @desc    Calculate monthly revenue for a company
 * @body    {string} companyId - Company ID (required)
 * @body    {number} year - Year (required)
 * @body    {number} month - Month 1-12 (required)
 * @body    {number} totalShares - Total shares for dividend calculation (required)
 * @access  Private (Admin/System)
 */
router.post('/calculate', RevenueController.calculateRevenue);

/**
 * @route   POST /api/revenue/calculate-all
 * @desc    Calculate revenue for all companies for a specific month (admin)
 * @body    {number} year - Year (required)
 * @body    {number} month - Month 1-12 (required)
 * @access  Private (Admin)
 */
router.post('/calculate-all', RevenueController.calculateAllRevenue);

// ============================================================================
// REPORT VERIFICATION ROUTES
// ============================================================================

/**
 * @route   PATCH /api/revenue/verify/:reportId
 * @desc    Verify or reject a revenue report (admin only)
 * @param   {string} reportId - Revenue report ID
 * @body    {string} status - 'verified' or 'rejected'
 * @body    {string} [notes] - Verification notes
 * @access  Private (Admin)
 */
router.patch('/verify/:reportId', RevenueController.verifyRevenueReport);

/**
 * @route   GET /api/revenue/pending-reviews
 * @desc    Get revenue reports pending admin review (admin only)
 * @access  Private (Admin)
 */
router.get('/pending-reviews', RevenueController.getPendingReviews);

// ============================================================================
// ANOMALY ROUTES
// ============================================================================

/**
 * @route   GET /api/revenue/anomalies/:companyId
 * @desc    Get transaction anomalies for a company
 * @param   {string} companyId - Company ID
 * @query   {string} [severity] - Filter by severity (low, medium, high, critical)
 * @query   {number} [limit=50] - Maximum results
 * @access  Private
 */
router.get('/anomalies/:companyId', RevenueController.getAnomalies);

/**
 * @route   GET /api/revenue/anomalies/:companyId/transactions
 * @desc    Get anomalous transactions for a company
 * @param   {string} companyId - Company ID
 * @access  Private
 */
router.get('/anomalies/:companyId/transactions', RevenueController.getAnomalousTransactions);

// ============================================================================
// DAILY REVENUE ROUTES
// ============================================================================

/**
 * @route   GET /api/revenue/daily/:companyId
 * @desc    Get daily revenue breakdown
 * @param   {string} companyId - Company ID
 * @query   {string} [fromDate] - Start date (YYYY-MM-DD)
 * @query   {string} [toDate] - End date (YYYY-MM-DD)
 * @access  Private
 */
router.get('/daily/:companyId', RevenueController.getDailyRevenue);

// ============================================================================
// PROFIT DISTRIBUTION ROUTES
// ============================================================================

/**
 * @route   GET /api/revenue/distribution/:companyId
 * @desc    Get profit distribution for a specific period
 * @param   {string} companyId - Company ID
 * @query   {number} year - Year (required)
 * @query   {number} month - Month (required)
 * @access  Private
 */
router.get('/distribution/:companyId', RevenueController.getProfitDistribution);

// ============================================================================
// ADMIN STATISTICS ROUTES
// ============================================================================

/**
 * @route   GET /api/revenue/stats
 * @desc    Get platform-wide revenue statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/stats', RevenueController.getRevenueStats);

export default router;
