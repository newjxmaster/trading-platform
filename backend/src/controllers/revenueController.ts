/**
 * Revenue Controller
 * Trading Platform - Bank Integration Module
 * 
 * API Endpoints:
 * - GET /api/revenue/reports/:companyId - Monthly revenue reports
 * - POST /api/revenue/sync - Trigger bank API sync
 * - GET /api/revenue/summary/:companyId - Revenue summary
 * - GET /api/revenue/company/:companyId/current - Current month revenue
 * - GET /api/revenue/report/:reportId - Specific report details
 * - POST /api/revenue/calculate - Calculate monthly revenue
 * - PATCH /api/revenue/verify/:reportId - Verify revenue report (admin)
 * - GET /api/revenue/anomalies/:companyId - Get anomalies
 * - GET /api/revenue/stats - Platform revenue stats (admin)
 */

import { Request, Response } from 'express';
import {
  RevenueReportStatus,
  SyncRequest,
  TransactionAnomaly
} from '../types/bank.types';

import * as RevenueSyncService from '../services/revenueSyncService';
import * as TransactionProcessor from '../services/transactionProcessor';

// ============================================================================
// REVENUE REPORTS
// ============================================================================

/**
 * GET /api/revenue/reports/:companyId
 * Get monthly revenue reports for a company
 * 
 * Query params:
 * - year: Filter by year (optional)
 * - status: Filter by status (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 12)
 */
export async function getRevenueReports(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { companyId } = req.params;
    const { year, status, page = '1', limit = '12' } = req.query;
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    
    const reports = RevenueSyncService.getRevenueReportsByCompany(companyId, {
      year: year ? parseInt(year as string, 10) : undefined,
      status: status as RevenueReportStatus | undefined,
      limit: limitNum,
      offset: (pageNum - 1) * limitNum
    });
    
    // Calculate totals
    const totalRevenue = reports.reduce((sum, r) => sum + r.netRevenue, 0);
    const totalProfit = reports.reduce((sum, r) => sum + r.netProfit, 0);
    const totalDividends = reports.reduce((sum, r) => sum + r.dividendPool, 0);
    
    res.json({
      success: true,
      data: {
        reports: reports.map(sanitizeRevenueReport),
        summary: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalProfit: Math.round(totalProfit * 100) / 100,
          totalDividends: Math.round(totalDividends * 100) / 100,
          reportCount: reports.length
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: reports.length
        }
      }
    });
    
  } catch (error) {
    console.error('[RevenueController] Get reports error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get revenue reports'
    });
  }
}

/**
 * GET /api/revenue/report/:reportId
 * Get specific revenue report details
 */
export async function getRevenueReport(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { reportId } = req.params;
    
    const report = RevenueSyncService.getRevenueReport(reportId);
    
    if (!report) {
      res.status(404).json({
        success: false,
        error: 'Revenue report not found'
      });
      return;
    }
    
    // Get detailed breakdown
    const breakdown = RevenueSyncService.generateRevenueReport(
      report.companyId,
      report.reportYear,
      report.reportMonth
    );
    
    res.json({
      success: true,
      data: {
        report: sanitizeRevenueReport(report),
        dailyBreakdown: breakdown.dailyBreakdown,
        categoryBreakdown: breakdown.categoryBreakdown,
        anomalies: breakdown.anomalies
      }
    });
    
  } catch (error) {
    console.error('[RevenueController] Get report error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get revenue report'
    });
  }
}

/**
 * GET /api/revenue/company/:companyId/month/:year/:month
 * Get revenue report for specific month
 */
export async function getMonthlyRevenue(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { companyId, year, month } = req.params;
    
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      res.status(400).json({
        success: false,
        error: 'Invalid year or month'
      });
      return;
    }
    
    const report = RevenueSyncService.getRevenueReportForMonth(
      companyId,
      yearNum,
      monthNum
    );
    
    if (!report) {
      res.status(404).json({
        success: false,
        error: 'Revenue report not found for specified month'
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        report: sanitizeRevenueReport(report)
      }
    });
    
  } catch (error) {
    console.error('[RevenueController] Get monthly revenue error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get monthly revenue'
    });
  }
}

// ============================================================================
// REVENUE SUMMARY
// ============================================================================

/**
 * GET /api/revenue/summary/:companyId
 * Get comprehensive revenue summary for a company
 */
export async function getRevenueSummary(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { companyId } = req.params;
    const { companyName } = req.query;
    
    const summary = RevenueSyncService.getRevenueSummary(
      companyId,
      (companyName as string) || 'Company'
    );
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('[RevenueController] Get summary error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get revenue summary'
    });
  }
}

/**
 * GET /api/revenue/company/:companyId/current
 * Get current month revenue
 */
export async function getCurrentMonthRevenue(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { companyId } = req.params;
    
    const report = RevenueSyncService.getCurrentMonthRevenue(companyId);
    
    if (!report) {
      // Return empty report structure
      const now = new Date();
      res.json({
        success: true,
        data: {
          report: null,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          message: 'No revenue data available for current month'
        }
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        report: sanitizeRevenueReport(report),
        month: report.reportMonth,
        year: report.reportYear
      }
    });
    
  } catch (error) {
    console.error('[RevenueController] Get current month error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get current month revenue'
    });
  }
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * POST /api/revenue/sync
 * Trigger bank API sync for transactions
 * 
 * Body:
 * - companyId: Company ID (required)
 * - accountId: Bank account ID (optional)
 * - fromDate: Start date (optional)
 * - toDate: End date (optional)
 * - force: Force re-sync (optional)
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
    
    const syncRequest: SyncRequest = {
      companyId,
      bankAccountId: accountId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      force: force === true
    };
    
    const result = await RevenueSyncService.syncTransactions(syncRequest);
    
    res.json({
      success: result.success,
      data: {
        syncResult: result,
        message: result.success 
          ? `Synced ${result.transactionsInserted} new transactions` 
          : 'Sync completed with errors'
      }
    });
    
  } catch (error) {
    console.error('[RevenueController] Trigger sync error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed'
    });
  }
}

/**
 * POST /api/revenue/sync-all
 * Trigger sync for all companies (admin only)
 */
export async function triggerSyncAll(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { fromDate, toDate } = req.body;
    
    const results = await RevenueSyncService.syncAllCompanies(
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined
    );
    
    const successCount = results.filter(r => r.success).length;
    const totalInserted = results.reduce((sum, r) => sum + r.transactionsInserted, 0);
    
    res.json({
      success: true,
      data: {
        results,
        summary: {
          totalCompanies: results.length,
          successful: successCount,
          failed: results.length - successCount,
          totalTransactionsInserted: totalInserted
        }
      }
    });
    
  } catch (error) {
    console.error('[RevenueController] Sync all error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync all failed'
    });
  }
}

// ============================================================================
// REVENUE CALCULATION
// ============================================================================

/**
 * POST /api/revenue/calculate
 * Calculate monthly revenue for a company
 * 
 * Body:
 * - companyId: Company ID (required)
 * - year: Year (required)
 * - month: Month 1-12 (required)
 * - totalShares: Total shares for dividend calculation (required)
 */
export async function calculateRevenue(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { companyId, year, month, totalShares } = req.body;
    
    if (!companyId || !year || !month || !totalShares) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: companyId, year, month, totalShares'
      });
      return;
    }
    
    if (month < 1 || month > 12) {
      res.status(400).json({
        success: false,
        error: 'Invalid month. Must be between 1 and 12'
      });
      return;
    }
    
    const report = await RevenueSyncService.calculateMonthlyRevenue(
      companyId,
      parseInt(year, 10),
      parseInt(month, 10),
      parseInt(totalShares, 10)
    );
    
    res.json({
      success: true,
      data: {
        report: sanitizeRevenueReport(report),
        message: 'Revenue calculated successfully'
      }
    });
    
  } catch (error) {
    console.error('[RevenueController] Calculate revenue error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Revenue calculation failed'
    });
  }
}

/**
 * POST /api/revenue/calculate-all
 * Calculate revenue for all companies for a specific month (admin)
 * 
 * Body:
 * - year: Year (required)
 * - month: Month 1-12 (required)
 * - getCompanyShares: Function to get shares for each company
 */
export async function calculateAllRevenue(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { year, month } = req.body;
    
    if (!year || !month) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: year, month'
      });
      return;
    }
    
    // Mock function to get company shares - in production, fetch from database
    const getCompanyShares = (companyId: string): number => {
      // Default to 10000 shares if not found
      return 10000;
    };
    
    const reports = await RevenueSyncService.runMonthlyRevenueCalculation(getCompanyShares);
    
    res.json({
      success: true,
      data: {
        reports: reports.map(sanitizeRevenueReport),
        summary: {
          totalReports: reports.length,
          totalRevenue: reports.reduce((sum, r) => sum + r.netRevenue, 0),
          totalDividends: reports.reduce((sum, r) => sum + r.dividendPool, 0)
        }
      }
    });
    
  } catch (error) {
    console.error('[RevenueController] Calculate all error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Calculate all failed'
    });
  }
}

// ============================================================================
// REPORT VERIFICATION
// ============================================================================

/**
 * PATCH /api/revenue/verify/:reportId
 * Verify or reject a revenue report (admin only)
 * 
 * Body:
 * - status: 'verified' or 'rejected'
 * - notes: Optional verification notes
 */
export async function verifyRevenueReport(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { reportId } = req.params;
    const { status, notes } = req.body;
    const adminId = req.user?.id || 'admin';
    
    if (!status || !['verified', 'rejected'].includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status. Must be "verified" or "rejected"'
      });
      return;
    }
    
    const report = RevenueSyncService.verifyRevenueReport(
      reportId,
      adminId,
      status === 'verified' ? RevenueReportStatus.VERIFIED : RevenueReportStatus.REJECTED,
      notes
    );
    
    res.json({
      success: true,
      data: {
        report: sanitizeRevenueReport(report),
        message: `Report ${status} successfully`
      }
    });
    
  } catch (error) {
    console.error('[RevenueController] Verify report error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed'
    });
  }
}

// ============================================================================
// ANOMALIES
// ============================================================================

/**
 * GET /api/revenue/anomalies/:companyId
 * Get transaction anomalies for a company
 * 
 * Query params:
 * - severity: Filter by severity (low, medium, high, critical)
 * - limit: Maximum results (default: 50)
 */
export async function getAnomalies(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { companyId } = req.params;
    const { severity, limit = '50' } = req.query;
    
    let anomalies: TransactionAnomaly[];
    
    if (severity === 'high') {
      anomalies = RevenueSyncService.getHighPriorityAnomalies(companyId);
    } else {
      const result = RevenueSyncService.detectAnomalies(companyId);
      anomalies = result.anomalies;
    }
    
    // Apply limit
    const limitNum = parseInt(limit as string, 10);
    anomalies = anomalies.slice(0, limitNum);
    
    // Group by severity
    const bySeverity: Record<string, number> = {};
    anomalies.forEach(a => {
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
    });
    
    res.json({
      success: true,
      data: {
        anomalies,
        summary: {
          total: anomalies.length,
          bySeverity
        }
      }
    });
    
  } catch (error) {
    console.error('[RevenueController] Get anomalies error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get anomalies'
    });
  }
}

/**
 * GET /api/revenue/anomalies/:companyId/transactions
 * Get anomalous transactions for a company
 */
export async function getAnomalousTransactions(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { companyId } = req.params;
    
    const transactions = TransactionProcessor.getTransactionsByCompany(companyId, {
      limit: 1000
    });
    
    const anomalousTransactions = transactions.filter(t => t.isAnomalous);
    
    // Get details for each
    const withAnomalies = anomalousTransactions.map(t => ({
      transaction: {
        id: t.id,
        date: t.transactionDate,
        type: t.transactionType,
        amount: t.amount,
        description: t.description,
        category: t.category
      },
      anomalies: TransactionProcessor.getTransactionAnomalies(t.id)
    }));
    
    res.json({
      success: true,
      data: {
        transactions: withAnomalies,
        count: withAnomalies.length
      }
    });
    
  } catch (error) {
    console.error('[RevenueController] Get anomalous transactions error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get anomalous transactions'
    });
  }
}

// ============================================================================
// DAILY REVENUE
// ============================================================================

/**
 * GET /api/revenue/daily/:companyId
 * Get daily revenue breakdown
 * 
 * Query params:
 * - fromDate: Start date (YYYY-MM-DD)
 * - toDate: End date (YYYY-MM-DD)
 */
export async function getDailyRevenue(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { companyId } = req.params;
    const { fromDate, toDate } = req.query;
    
    const fromDateObj = fromDate 
      ? new Date(fromDate as string) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDateObj = toDate 
      ? new Date(toDate as string) 
      : new Date();
    
    const revenue = TransactionProcessor.calculateNetRevenueForRange(
      companyId,
      fromDateObj,
      toDateObj
    );
    
    res.json({
      success: true,
      data: {
        summary: {
          totalDeposits: revenue.totalDeposits,
          totalWithdrawals: revenue.totalWithdrawals,
          netRevenue: revenue.netRevenue,
          dayCount: revenue.dailyBreakdown.length
        },
        dailyBreakdown: revenue.dailyBreakdown
      }
    });
    
  } catch (error) {
    console.error('[RevenueController] Get daily revenue error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get daily revenue'
    });
  }
}

// ============================================================================
// PROFIT DISTRIBUTION
// ============================================================================

/**
 * GET /api/revenue/distribution/:companyId
 * Get profit distribution for a specific period
 * 
 * Query params:
 * - year: Year (required)
 * - month: Month (required)
 */
export async function getProfitDistribution(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { companyId } = req.params;
    const { year, month } = req.query;
    
    if (!year || !month) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: year, month'
      });
      return;
    }
    
    const report = RevenueSyncService.getRevenueReportForMonth(
      companyId,
      parseInt(year as string, 10),
      parseInt(month as string, 10)
    );
    
    if (!report) {
      res.status(404).json({
        success: false,
        error: 'Revenue report not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        netRevenue: report.netRevenue,
        platformFee: report.platformFee,
        platformFeePercent: 5,
        netProfit: report.netProfit,
        dividendPool: report.dividendPool,
        dividendPoolPercent: 60,
        reinvestmentAmount: report.reinvestmentAmount,
        reinvestmentPercent: 40,
        dividendPerShare: report.dividendPerShare,
        totalShares: report.totalShares
      }
    });
    
  } catch (error) {
    console.error('[RevenueController] Get profit distribution error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get profit distribution'
    });
  }
}

// ============================================================================
// ADMIN STATISTICS
// ============================================================================

/**
 * GET /api/revenue/stats
 * Get platform-wide revenue statistics (admin only)
 */
export async function getRevenueStats(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const stats = RevenueSyncService.getRevenueStats();
    const txnStats = TransactionProcessor.getTransactionStats();
    
    res.json({
      success: true,
      data: {
        revenue: stats,
        transactions: txnStats
      }
    });
    
  } catch (error) {
    console.error('[RevenueController] Get stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats'
    });
  }
}

/**
 * GET /api/revenue/pending-reviews
 * Get revenue reports pending admin review (admin only)
 */
export async function getPendingReviews(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // In production, query database for pending reports
    // For now, filter from in-memory store
    const allReports = Array.from(
      // Access internal map - in production use proper repository
      (RevenueSyncService as any).revenueReports?.values?.() || []
    );
    
    const pendingReports = allReports.filter(
      (r: any) => r.status === RevenueReportStatus.PENDING_REVIEW
    );
    
    res.json({
      success: true,
      data: {
        reports: pendingReports.map(sanitizeRevenueReport),
        count: pendingReports.length
      }
    });
    
  } catch (error) {
    console.error('[RevenueController] Get pending reviews error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get pending reviews'
    });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sanitize revenue report for API response
 */
function sanitizeRevenueReport(report: any): any {
  return {
    id: report.id,
    companyId: report.companyId,
    reportMonth: report.reportMonth,
    reportYear: report.reportYear,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    totalDeposits: report.totalDeposits,
    totalWithdrawals: report.totalWithdrawals,
    netRevenue: report.netRevenue,
    operatingCosts: report.operatingCosts,
    otherExpenses: report.otherExpenses,
    manualAdjustments: report.manualAdjustments,
    grossProfit: report.grossProfit,
    platformFee: report.platformFee,
    netProfit: report.netProfit,
    dividendPool: report.dividendPool,
    reinvestmentAmount: report.reinvestmentAmount,
    dividendPerShare: report.dividendPerShare,
    totalShares: report.totalShares,
    status: report.status,
    verifiedBy: report.verifiedBy,
    verifiedAt: report.verifiedAt,
    verificationNotes: report.verificationNotes,
    totalTransactions: report.totalTransactions,
    anomalousTransactions: report.anomalousTransactions,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt
  };
}
