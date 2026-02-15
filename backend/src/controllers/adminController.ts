/**
 * Admin Controller
 * Trading Platform for Small & Medium Businesses
 * 
 * Handles all admin-related API endpoints:
 * - GET /api/admin/companies/pending - Companies awaiting approval
 * - PATCH /api/admin/companies/:id/verify - Approve/Reject company
 * - GET /api/admin/revenue/pending - Revenue reports to verify
 * - PATCH /api/admin/revenue/:id/verify - Verify revenue report
 * - GET /api/admin/users - List all users
 * - GET /api/admin/dashboard/stats - Platform statistics
 */

import { Request, Response } from 'express';
import { adminService } from '../services/adminService';
import { companyService } from '../services/companyService';
import {
  VerificationChecklist,
  VerificationDecision,
  RevenueVerificationDecision,
  AdminUserFilterOptions,
} from '../types/company.types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get admin ID from authenticated request
 */
const getAdminId = (req: Request): string => {
  return (req as any).user?.id || '';
};

/**
 * Check if user is admin
 */
const isAdmin = (req: Request): boolean => {
  return (req as any).user?.role === 'admin';
};

/**
 * Handle error responses
 */
const handleError = (res: Response, error: unknown, statusCode: number = 500) => {
  console.error('Admin controller error:', error);
  const message = error instanceof Error ? error.message : 'Internal server error';
  return res.status(statusCode).json({
    success: false,
    error: message,
  });
};

// ============================================================================
// ADMIN CONTROLLER
// ============================================================================

export class AdminController {
  // ============================================================================
  // COMPANY VERIFICATION ENDPOINTS
  // ============================================================================

  /**
   * GET /api/admin/companies/pending
   * Get all companies awaiting approval
   */
  public getPendingCompanies = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Verify admin access
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const { page, limit, sort_by, sort_order } = req.query;

      const options = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        sortBy: sort_by as 'created_at' | 'business_name',
        sortOrder: sort_order as 'asc' | 'desc',
      };

      const result = await adminService.getPendingCompanies(options);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * GET /api/admin/companies/pending/:id
   * Get detailed information about a pending company
   */
  public getPendingCompanyDetails = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Verify admin access
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const { id } = req.params;

      const result = await adminService.getPendingCompanyDetails(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Company not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * PATCH /api/admin/companies/:id/verify
   * Approve or reject a company
   */
  public verifyCompany = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Verify admin access
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const { id } = req.params;
      const adminId = getAdminId(req);
      const {
        action,
        reason,
        notes,
        registration_certificate_verified,
        registration_certificate_notes,
        manager_id_verified,
        manager_id_notes,
        business_photo_verified,
        business_photo_notes,
        bank_account_verified,
        bank_account_notes,
        ipo_details_reviewed,
        ipo_assessment,
        ipo_notes,
      } = req.body;

      // Validate action
      if (!action || !['approve', 'reject', 'request_info'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Valid action required: approve, reject, or request_info',
        });
      }

      // Build verification checklist
      const checklist: Partial<VerificationChecklist> = {
        registration_certificate_verified,
        registration_certificate_notes,
        manager_id_verified,
        manager_id_notes,
        business_photo_verified,
        business_photo_notes,
        bank_account_verified,
        bank_account_notes,
        ipo_details_reviewed,
        ipo_assessment,
        ipo_notes,
      };

      let result;

      if (action === 'approve') {
        // Validate required checklist items for approval
        if (
          !registration_certificate_verified ||
          !manager_id_verified ||
          !business_photo_verified ||
          !bank_account_verified ||
          !ipo_details_reviewed
        ) {
          return res.status(400).json({
            success: false,
            error:
              'All verification checks must be passed before approving: registration_certificate_verified, manager_id_verified, business_photo_verified, bank_account_verified, ipo_details_reviewed',
          });
        }

        result = await adminService.verifyCompany(adminId, id, checklist, notes);
      } else if (action === 'reject') {
        if (!reason) {
          return res.status(400).json({
            success: false,
            error: 'Rejection reason is required',
          });
        }

        result = await adminService.rejectCompany(adminId, id, reason, notes, checklist);
      } else {
        // request_info
        if (!reason) {
          return res.status(400).json({
            success: false,
            error: 'Request details are required',
          });
        }

        result = await adminService.requestMoreInfo(adminId, id, reason);
      }

      if (!result.success) {
        return res.status(400).json({
          success: false,
          errors: result.errors,
        });
      }

      const actionMessages: Record<string, string> = {
        approve: 'Company approved successfully',
        reject: 'Company rejected',
        request_info: 'Information request sent to business owner',
      };

      return res.status(200).json({
        success: true,
        message: actionMessages[action],
        data: result.company ? { company: result.company } : undefined,
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * GET /api/admin/companies/:id/document-url
   * Get signed URL for reviewing a company document
   */
  public getDocumentUrl = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Verify admin access
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const { id } = req.params;
      const { document_type } = req.query;

      // Get company
      const company = await companyService.getCompanyById(id);
      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Company not found',
        });
      }

      // Get document URL based on type
      let documentUrl: string;
      switch (document_type) {
        case 'registration_certificate':
          documentUrl = company.registration_certificate_url;
          break;
        case 'manager_id_card':
          documentUrl = company.manager_id_card_url;
          break;
        case 'business_photo':
          documentUrl = company.business_photo_url;
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid document type. Valid types: registration_certificate, manager_id_card, business_photo',
          });
      }

      if (!documentUrl) {
        return res.status(404).json({
          success: false,
          error: 'Document not found',
        });
      }

      const result = await adminService.getDocumentForReview(documentUrl);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          url: result.url,
          document_type,
        },
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * POST /api/admin/companies/:id/suspend
   * Suspend an active company
   */
  public suspendCompany = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Verify admin access
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const { id } = req.params;
      const adminId = getAdminId(req);
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Suspension reason is required',
        });
      }

      const result = await adminService.suspendCompany(id, adminId, reason);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          errors: result.errors,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Company suspended successfully',
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * POST /api/admin/companies/:id/reactivate
   * Reactivate a suspended company
   */
  public reactivateCompany = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Verify admin access
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const { id } = req.params;
      const adminId = getAdminId(req);

      const result = await adminService.reactivateCompany(id, adminId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          errors: result.errors,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Company reactivated successfully',
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  // ============================================================================
  // REVENUE VERIFICATION ENDPOINTS
  // ============================================================================

  /**
   * GET /api/admin/revenue/pending
   * Get revenue reports awaiting verification
   */
  public getPendingRevenue = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Verify admin access
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const { page, limit, company_id } = req.query;

      const options = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        companyId: company_id as string,
      };

      const result = await adminService.getPendingRevenueReports(options);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * PATCH /api/admin/revenue/:id/verify
   * Verify or reject a revenue report
   */
  public verifyRevenue = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Verify admin access
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const { id } = req.params;
      const adminId = getAdminId(req);
      const { action, reason, adjustments } = req.body;

      // Validate action
      if (!action || !['verify', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Valid action required: verify or reject',
        });
      }

      if (action === 'reject' && !reason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required',
        });
      }

      const decision: RevenueVerificationDecision = {
        action,
        reason,
        adjustments: adjustments || undefined,
      };

      const result = await adminService.verifyRevenue(id, adminId, decision);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          errors: result.errors,
        });
      }

      const message = action === 'verify' ? 'Revenue report verified' : 'Revenue report rejected';

      return res.status(200).json({
        success: true,
        message,
        data: { report: result.report },
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * GET /api/admin/revenue/:id
   * Get detailed revenue report information
   */
  public getRevenueReportDetails = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Verify admin access
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const { id } = req.params;

      // Get revenue report with related data
      const report = await (adminService as any).prisma.revenue_reports.findUnique({
        where: { id },
        include: {
          company: {
            select: {
              id: true,
              business_name: true,
              business_type: true,
              partner_bank_name: true,
              bank_account_number: true,
              total_shares: true,
            },
          },
          verifier: {
            select: {
              id: true,
              full_name: true,
            },
          },
        },
      });

      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Revenue report not found',
        });
      }

      // Get bank transactions for this period
      const transactions = await (adminService as any).prisma.bank_transactions.findMany({
        where: {
          company_id: report.company_id,
          transaction_date: {
            gte: report.period_start,
            lte: report.period_end,
          },
        },
        orderBy: { transaction_date: 'desc' },
      });

      return res.status(200).json({
        success: true,
        data: {
          report,
          transactions,
        },
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  // ============================================================================
  // USER MANAGEMENT ENDPOINTS
  // ============================================================================

  /**
   * GET /api/admin/users
   * List all users with filters
   */
  public getUsers = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Verify admin access
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const { role, kyc_status, search, page, limit } = req.query;

      const options: AdminUserFilterOptions = {
        role: role as string,
        kyc_status: kyc_status as string,
        search: search as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      };

      const result = await adminService.getUsers(options);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * GET /api/admin/users/:id
   * Get detailed user information
   */
  public getUserDetails = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Verify admin access
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const { id } = req.params;

      const user = await adminService.getUserDetails(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * PATCH /api/admin/users/:id/kyc
   * Update user KYC status
   */
  public updateUserKyc = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Verify admin access
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const { id } = req.params;
      const adminId = getAdminId(req);
      const { status, reason } = req.body;

      if (!status || !['verified', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Valid status required: verified or rejected',
        });
      }

      if (status === 'rejected' && !reason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required',
        });
      }

      // Update user KYC status
      const updatedUser = await (adminService as any).prisma.users.update({
        where: { id },
        data: {
          kyc_status: status,
          updated_at: new Date(),
        },
      });

      // Log admin action
      await (adminService as any).logAdminAction(
        adminId,
        status === 'verified' ? 'verify_kyc' : 'reject_kyc',
        'user',
        id,
        {
          user_name: updatedUser.full_name,
          reason,
        }
      );

      return res.status(200).json({
        success: true,
        message: `User KYC ${status}`,
        data: { user: updatedUser },
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  // ============================================================================
  // DASHBOARD & STATISTICS ENDPOINTS
  // ============================================================================

  /**
   * GET /api/admin/dashboard/stats
   * Get platform statistics for admin dashboard
   */
  public getDashboardStats = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Verify admin access
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const stats = await adminService.getPlatformStats();

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * GET /api/admin/logs
   * Get admin action logs
   */
  public getAdminLogs = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Verify admin access
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const { admin_id, action_type, page, limit } = req.query;

      const options = {
        adminId: admin_id as string,
        actionType: action_type as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      };

      const result = await adminService.getAdminLogs(options);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * GET /api/admin/companies/all
   * Get all companies (for admin management)
   */
  public getAllCompanies = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Verify admin access
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const {
        verification_status,
        listing_status,
        business_type,
        search,
        page,
        limit,
      } = req.query;

      const filters = {
        verification_status: verification_status as any,
        listing_status: listing_status as any,
        business_type: business_type as any,
        search: search as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      };

      const result = await companyService.getCompanies(filters);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * GET /api/admin/companies/:id
   * Get full company details (admin view)
   */
  public getCompanyDetails = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Verify admin access
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const { id } = req.params;

      // Get company with full details
      const company = await (adminService as any).prisma.company.findUnique({
        where: { id },
        include: {
          owner: {
            select: {
              id: true,
              full_name: true,
              email: true,
              phone: true,
              kyc_status: true,
            },
          },
          verification_checklist: true,
          _count: {
            select: {
              stock_holdings: true,
              revenue_reports: true,
            },
          },
        },
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Company not found',
        });
      }

      // Get recent revenue reports
      const recentRevenue = await (adminService as any).prisma.revenue_reports.findMany({
        where: { company_id: id },
        orderBy: [{ report_year: 'desc' }, { report_month: 'desc' }],
        take: 6,
      });

      // Get trading activity
      const tradingActivity = await (adminService as any).prisma.trades.findMany({
        where: { company_id: id },
        orderBy: { executed_at: 'desc' },
        take: 10,
        include: {
          buyer: {
            select: {
              id: true,
              full_name: true,
            },
          },
          seller: {
            select: {
              id: true,
              full_name: true,
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          company,
          recent_revenue: recentRevenue,
          trading_activity: tradingActivity,
        },
      });
    } catch (error) {
      return handleError(res, error);
    }
  };
}

// ============================================================================
// EXPORT INSTANCE
// ============================================================================

export const adminController = new AdminController();

export default adminController;
