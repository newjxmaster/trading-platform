/**
 * Admin Verification Service
 * Trading Platform for Small & Medium Businesses
 * 
 * Handles admin verification workflows for companies and revenue reports
 */

import { PrismaClient } from '@prisma/client';
import {
  Company,
  VerificationStatus,
  ListingStatus,
  RevenueVerificationStatus,
  VerificationChecklist,
  VerificationDecision,
  RevenueVerificationDecision,
  PlatformStats,
  AdminActionLog,
  CompanySummary,
  TradeSummary,
} from '../types/company.types';
import { documentService } from './documentService';

// ============================================================================
// PRISMA CLIENT
// ============================================================================

const prisma = new PrismaClient();

// ============================================================================
// ADMIN SERVICE CLASS
// ============================================================================

export class AdminService {
  // ============================================================================
  // PENDING COMPANIES QUEUE
  // ============================================================================

  /**
   * Get all companies pending verification
   */
  public async getPendingCompanies(
    options: {
      page?: number;
      limit?: number;
      sortBy?: 'created_at' | 'business_name';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    companies: Company[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'asc' } = options;

    const where = {
      verification_status: VerificationStatus.PENDING,
    };

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
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
        },
      }),
      prisma.company.count({ where }),
    ]);

    return {
      companies: companies as unknown as Company[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single pending company with full details
   */
  public async getPendingCompanyDetails(companyId: string): Promise<{
    company: Company | null;
    documents: {
      registration_certificate: { url: string; verified: boolean };
      manager_id_card: { url: string; verified: boolean };
      business_photo: { url: string; verified: boolean };
    };
    bankInfo: {
      bank_name: string;
      account_number: string;
      connected: boolean;
    };
    ipoDetails: {
      initial_valuation: number;
      total_shares: number;
      available_shares: number;
      share_price: number;
      public_offering_percentage: number;
      minimum_investment: number;
      capital_to_raise: number;
    };
  } | null> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
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
      },
    });

    if (!company) return null;

    // Get verification checklist if exists
    const checklist = await prisma.verification_checklist.findUnique({
      where: { company_id: companyId },
    });

    return {
      company: company as unknown as Company,
      documents: {
        registration_certificate: {
          url: company.registration_certificate_url,
          verified: checklist?.registration_certificate_verified || false,
        },
        manager_id_card: {
          url: company.manager_id_card_url,
          verified: checklist?.manager_id_verified || false,
        },
        business_photo: {
          url: company.business_photo_url,
          verified: checklist?.business_photo_verified || false,
        },
      },
      bankInfo: {
        bank_name: company.partner_bank_name,
        account_number: company.bank_account_number,
        connected: company.bank_api_connected,
      },
      ipoDetails: {
        initial_valuation: company.initial_valuation,
        total_shares: company.total_shares,
        available_shares: company.available_shares,
        share_price: company.current_price,
        public_offering_percentage: company.public_offering_percentage,
        minimum_investment: company.minimum_investment,
        capital_to_raise: company.available_shares * company.current_price,
      },
    };
  }

  // ============================================================================
  // COMPANY VERIFICATION
  // ============================================================================

  /**
   * Approve a company
   */
  public async verifyCompany(
    companyId: string,
    adminId: string,
    checklist: Partial<VerificationChecklist>,
    notes?: string
  ): Promise<{ success: boolean; company?: Company; errors?: string[] }> {
    try {
      // Get company
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return { success: false, errors: ['Company not found'] };
      }

      if (company.verification_status !== VerificationStatus.PENDING) {
        return {
          success: false,
          errors: [`Company is already ${company.verification_status}`],
        };
      }

      // Save verification checklist
      await prisma.verification_checklist.upsert({
        where: { company_id: companyId },
        create: {
          company_id: companyId,
          registration_certificate_verified: checklist.registration_certificate_verified || false,
          registration_certificate_notes: checklist.registration_certificate_notes,
          manager_id_verified: checklist.manager_id_verified || false,
          manager_id_notes: checklist.manager_id_notes,
          business_photo_verified: checklist.business_photo_verified || false,
          business_photo_notes: checklist.business_photo_notes,
          bank_account_verified: checklist.bank_account_verified || false,
          bank_account_notes: checklist.bank_account_notes,
          ipo_details_reviewed: checklist.ipo_details_reviewed || false,
          ipo_assessment: checklist.ipo_assessment || 'reasonable',
          ipo_notes: checklist.ipo_notes,
          all_checks_passed: true,
          verified_by: adminId,
          verified_at: new Date(),
        },
        update: {
          registration_certificate_verified: checklist.registration_certificate_verified,
          registration_certificate_notes: checklist.registration_certificate_notes,
          manager_id_verified: checklist.manager_id_verified,
          manager_id_notes: checklist.manager_id_notes,
          business_photo_verified: checklist.business_photo_verified,
          business_photo_notes: checklist.business_photo_notes,
          bank_account_verified: checklist.bank_account_verified,
          bank_account_notes: checklist.bank_account_notes,
          ipo_details_reviewed: checklist.ipo_details_reviewed,
          ipo_assessment: checklist.ipo_assessment,
          ipo_notes: checklist.ipo_notes,
          all_checks_passed: true,
          verified_by: adminId,
          verified_at: new Date(),
        },
      });

      // Update company status
      const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: {
          verification_status: VerificationStatus.APPROVED,
          listing_status: ListingStatus.ACTIVE,
          verified_by: adminId,
          verified_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Log admin action
      await this.logAdminAction(adminId, 'approve_company', 'company', companyId, {
        business_name: company.business_name,
        checklist,
        notes,
      });

      return { success: true, company: updatedCompany as unknown as Company };
    } catch (error) {
      console.error('Error verifying company:', error);
      return { success: false, errors: ['Failed to verify company'] };
    }
  }

  /**
   * Reject a company
   */
  public async rejectCompany(
    companyId: string,
    adminId: string,
    reason: string,
    notes?: string,
    checklist?: Partial<VerificationChecklist>
  ): Promise<{ success: boolean; company?: Company; errors?: string[] }> {
    try {
      // Get company
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return { success: false, errors: ['Company not found'] };
      }

      if (company.verification_status !== VerificationStatus.PENDING) {
        return {
          success: false,
          errors: [`Company is already ${company.verification_status}`],
        };
      }

      // Save verification checklist if provided
      if (checklist) {
        await prisma.verification_checklist.upsert({
          where: { company_id: companyId },
          create: {
            company_id: companyId,
            registration_certificate_verified: checklist.registration_certificate_verified || false,
            registration_certificate_notes: checklist.registration_certificate_notes,
            manager_id_verified: checklist.manager_id_verified || false,
            manager_id_notes: checklist.manager_id_notes,
            business_photo_verified: checklist.business_photo_verified || false,
            business_photo_notes: checklist.business_photo_notes,
            bank_account_verified: checklist.bank_account_verified || false,
            bank_account_notes: checklist.bank_account_notes,
            ipo_details_reviewed: checklist.ipo_details_reviewed || false,
            ipo_assessment: checklist.ipo_assessment,
            ipo_notes: checklist.ipo_notes,
            all_checks_passed: false,
            verified_by: adminId,
            verified_at: new Date(),
          },
          update: {
            ...checklist,
            all_checks_passed: false,
            verified_by: adminId,
            verified_at: new Date(),
          },
        });
      }

      // Update company status
      const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: {
          verification_status: VerificationStatus.REJECTED,
          listing_status: ListingStatus.DRAFT,
          rejection_reason: reason,
          verified_by: adminId,
          verified_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Log admin action
      await this.logAdminAction(adminId, 'reject_company', 'company', companyId, {
        business_name: company.business_name,
        reason,
        notes,
      });

      return { success: true, company: updatedCompany as unknown as Company };
    } catch (error) {
      console.error('Error rejecting company:', error);
      return { success: false, errors: ['Failed to reject company'] };
    }
  }

  /**
   * Request more information for a company
   */
  public async requestMoreInfo(
    companyId: string,
    adminId: string,
    requestDetails: string
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return { success: false, errors: ['Company not found'] };
      }

      // Log admin action
      await this.logAdminAction(adminId, 'request_more_info', 'company', companyId, {
        business_name: company.business_name,
        request_details: requestDetails,
      });

      // TODO: Send notification to business owner

      return { success: true };
    } catch (error) {
      console.error('Error requesting more info:', error);
      return { success: false, errors: ['Failed to request more information'] };
    }
  }

  // ============================================================================
  // REVENUE VERIFICATION
  // ============================================================================

  /**
   * Get pending revenue reports
   */
  public async getPendingRevenueReports(
    options: {
      page?: number;
      limit?: number;
      companyId?: string;
    } = {}
  ): Promise<{
    reports: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, companyId } = options;

    const where: any = {
      verification_status: {
        in: [RevenueVerificationStatus.PENDING_REVIEW, RevenueVerificationStatus.AUTO_VERIFIED],
      },
    };

    if (companyId) {
      where.company_id = companyId;
    }

    const [reports, total] = await Promise.all([
      prisma.revenue_reports.findMany({
        where,
        orderBy: [{ report_year: 'desc' }, { report_month: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          company: {
            select: {
              id: true,
              business_name: true,
              business_type: true,
              partner_bank_name: true,
            },
          },
        },
      }),
      prisma.revenue_reports.count({ where }),
    ]);

    return {
      reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Verify a revenue report
   */
  public async verifyRevenue(
    reportId: string,
    adminId: string,
    decision: RevenueVerificationDecision
  ): Promise<{ success: boolean; report?: any; errors?: string[] }> {
    try {
      const report = await prisma.revenue_reports.findUnique({
        where: { id: reportId },
        include: {
          company: true,
        },
      });

      if (!report) {
        return { success: false, errors: ['Revenue report not found'] };
      }

      if (report.verification_status === RevenueVerificationStatus.VERIFIED) {
        return { success: false, errors: ['Revenue report is already verified'] };
      }

      if (decision.action === 'verify') {
        // Apply any adjustments
        const updates: any = {
          verification_status: RevenueVerificationStatus.VERIFIED,
          verified_by: adminId,
          verified_at: new Date(),
        };

        if (decision.adjustments) {
          if (decision.adjustments.total_deposits !== undefined) {
            updates.total_deposits = decision.adjustments.total_deposits;
          }
          if (decision.adjustments.total_withdrawals !== undefined) {
            updates.total_withdrawals = decision.adjustments.total_withdrawals;
          }
          if (decision.adjustments.operating_costs !== undefined) {
            updates.operating_costs = decision.adjustments.operating_costs;
          }

          // Recalculate derived values
          const netRevenue =
            (updates.total_deposits || report.total_deposits) -
            (updates.total_withdrawals || report.total_withdrawals);
          const platformFee = netRevenue * 0.05;
          const netProfit = netRevenue - platformFee;
          const dividendPool = netProfit * 0.6;
          const reinvestmentAmount = netProfit * 0.4;

          updates.net_revenue = netRevenue;
          updates.platform_fee = platformFee;
          updates.net_profit = netProfit;
          updates.dividend_pool = dividendPool;
          updates.reinvestment_amount = reinvestmentAmount;
        }

        const updatedReport = await prisma.revenue_reports.update({
          where: { id: reportId },
          data: updates,
        });

        // Log admin action
        await this.logAdminAction(adminId, 'verify_revenue', 'revenue_report', reportId, {
          company_name: report.company.business_name,
          month: report.report_month,
          year: report.report_year,
          adjustments: decision.adjustments,
        });

        return { success: true, report: updatedReport };
      } else {
        // Reject the report
        const updatedReport = await prisma.revenue_reports.update({
          where: { id: reportId },
          data: {
            verification_status: RevenueVerificationStatus.REJECTED,
            verified_by: adminId,
            verified_at: new Date(),
          },
        });

        // Log admin action
        await this.logAdminAction(adminId, 'reject_revenue', 'revenue_report', reportId, {
          company_name: report.company.business_name,
          month: report.report_month,
          year: report.report_year,
          reason: decision.reason,
        });

        return { success: true, report: updatedReport };
      }
    } catch (error) {
      console.error('Error verifying revenue:', error);
      return { success: false, errors: ['Failed to verify revenue report'] };
    }
  }

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  /**
   * Get all users with filters
   */
  public async getUsers(
    options: {
      role?: string;
      kyc_status?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    users: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { role, kyc_status, search, page = 1, limit = 20 } = options;

    const where: any = {};

    if (role) where.role = role;
    if (kyc_status) where.kyc_status = kyc_status;

    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          full_name: true,
          phone: true,
          role: true,
          kyc_status: true,
          wallet_fiat: true,
          wallet_crypto_usdt: true,
          wallet_crypto_btc: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: {
              companies: true,
              stock_holdings: true,
            },
          },
        },
      }),
      prisma.users.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get user details
   */
  public async getUserDetails(userId: string): Promise<any | null> {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        companies: true,
        stock_holdings: {
          include: {
            company: {
              select: {
                business_name: true,
                current_price: true,
              },
            },
          },
        },
        _count: {
          select: {
            orders: true,
            trades_buyer: true,
            trades_seller: true,
          },
        },
      },
    });

    return user;
  }

  // ============================================================================
  // PLATFORM STATISTICS
  // ============================================================================

  /**
   * Get platform dashboard statistics
   */
  public async getPlatformStats(): Promise<PlatformStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // User statistics
    const [
      totalUsers,
      totalInvestors,
      totalBusinessOwners,
      newUsersThisMonth,
    ] = await Promise.all([
      prisma.users.count(),
      prisma.users.count({ where: { role: 'investor' } }),
      prisma.users.count({ where: { role: 'business_owner' } }),
      prisma.users.count({ where: { created_at: { gte: startOfMonth } } }),
    ]);

    // Company statistics
    const [
      totalCompanies,
      activeCompanies,
      pendingVerification,
      ipoCompanies,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { listing_status: 'active' } }),
      prisma.company.count({ where: { verification_status: 'pending' } }),
      prisma.company.count({ where: { listing_status: 'ipo' } }),
    ]);

    // Trading statistics
    const [totalTrades, tradesThisMonth] = await Promise.all([
      prisma.trades.count(),
      prisma.trades.count({
        where: { executed_at: { gte: startOfMonth } },
      }),
    ]);

    const totalTradingVolume = await prisma.trades.aggregate({
      _sum: { total_amount: true },
    });

    // Financial statistics
    const totalCapitalRaised = await prisma.company.aggregate({
      where: { listing_status: 'active' },
      _sum: { initial_valuation: true },
    });

    const totalDividends = await prisma.dividends.aggregate({
      where: { payment_status: 'completed' },
      _sum: { total_dividend_pool: true },
    });

    const platformRevenue = await prisma.transactions.aggregate({
      where: { transaction_type: 'fee' },
      _sum: { amount: true },
    });

    // Recent activity
    const recentRegistrations = await prisma.company.findMany({
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true,
        business_name: true,
        business_type: true,
        verification_status: true,
        created_at: true,
      },
    });

    const recentTrades = await prisma.trades.findMany({
      orderBy: { executed_at: 'desc' },
      take: 5,
      include: {
        company: {
          select: {
            business_name: true,
          },
        },
      },
    });

    return {
      total_users: totalUsers,
      total_investors: totalInvestors,
      total_business_owners: totalBusinessOwners,
      new_users_this_month: newUsersThisMonth,

      total_companies: totalCompanies,
      active_companies: activeCompanies,
      pending_verification: pendingVerification,
      ipo_companies: ipoCompanies,

      total_trading_volume: totalTradingVolume._sum?.total_amount || 0,
      total_trades: totalTrades,
      trades_this_month: tradesThisMonth,

      total_capital_raised: totalCapitalRaised._sum?.initial_valuation || 0,
      total_dividends_distributed: totalDividends._sum?.total_dividend_pool || 0,
      platform_revenue: platformRevenue._sum?.amount || 0,

      recent_registrations: recentRegistrations as CompanySummary[],
      recent_trades: recentTrades.map((t: any) => ({
        id: t.id,
        company_name: t.company?.business_name || 'Unknown',
        quantity: t.quantity,
        price: t.price,
        total_amount: t.total_amount,
        executed_at: t.executed_at,
      })) as TradeSummary[],
    };
  }

  /**
   * Get admin action logs
   */
  public async getAdminLogs(
    options: {
      adminId?: string;
      actionType?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    logs: AdminActionLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { adminId, actionType, page = 1, limit = 20 } = options;

    const where: any = {};
    if (adminId) where.admin_id = adminId;
    if (actionType) where.action_type = actionType;

    const [logs, total] = await Promise.all([
      prisma.admin_logs.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          admin: {
            select: {
              full_name: true,
            },
          },
        },
      }),
      prisma.admin_logs.count({ where }),
    ]);

    const formattedLogs: AdminActionLog[] = logs.map((log: any) => ({
      id: log.id,
      admin_id: log.admin_id,
      admin_name: log.admin?.full_name || 'Unknown',
      action_type: log.action_type,
      target_type: log.target_type,
      target_id: log.target_id,
      target_name: log.details?.target_name,
      details: log.details,
      created_at: log.created_at,
    }));

    return {
      logs: formattedLogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Log admin action
   */
  private async logAdminAction(
    adminId: string,
    actionType: string,
    targetType: 'company' | 'user' | 'revenue_report',
    targetId: string,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.admin_logs.create({
        data: {
          admin_id: adminId,
          action_type: actionType,
          target_type: targetType,
          target_id: targetId,
          details,
          created_at: new Date(),
        },
      });
    } catch (error) {
      console.error('Error logging admin action:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Get document signed URL for admin review
   */
  public async getDocumentForReview(
    documentUrl: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // If it's an S3 URL, generate a signed URL
      if (documentUrl.includes('amazonaws.com')) {
        const key = documentUrl.split('.amazonaws.com/')[1];
        const result = await documentService.getDocumentUrl(key, 3600); // 1 hour expiry
        return { success: true, url: result.url };
      }

      // For Cloudinary or other public URLs, return as-is
      return { success: true, url: documentUrl };
    } catch (error) {
      console.error('Error getting document for review:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get document',
      };
    }
  }

  /**
   * Suspend a company
   */
  public async suspendCompany(
    companyId: string,
    adminId: string,
    reason: string
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return { success: false, errors: ['Company not found'] };
      }

      await prisma.company.update({
        where: { id: companyId },
        data: {
          listing_status: ListingStatus.SUSPENDED,
          updated_at: new Date(),
        },
      });

      await this.logAdminAction(adminId, 'suspend_company', 'company', companyId, {
        business_name: company.business_name,
        reason,
      });

      return { success: true };
    } catch (error) {
      console.error('Error suspending company:', error);
      return { success: false, errors: ['Failed to suspend company'] };
    }
  }

  /**
   * Reactivate a suspended company
   */
  public async reactivateCompany(
    companyId: string,
    adminId: string
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return { success: false, errors: ['Company not found'] };
      }

      if (company.listing_status !== ListingStatus.SUSPENDED) {
        return { success: false, errors: ['Company is not suspended'] };
      }

      await prisma.company.update({
        where: { id: companyId },
        data: {
          listing_status: ListingStatus.ACTIVE,
          updated_at: new Date(),
        },
      });

      await this.logAdminAction(adminId, 'reactivate_company', 'company', companyId, {
        business_name: company.business_name,
      });

      return { success: true };
    } catch (error) {
      console.error('Error reactivating company:', error);
      return { success: false, errors: ['Failed to reactivate company'] };
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const adminService = new AdminService();

export default adminService;
