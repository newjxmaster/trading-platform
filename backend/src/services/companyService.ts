/**
 * Company Registration Service
 * Trading Platform for Small & Medium Businesses
 * 
 * Handles multi-step company registration, IPO configuration,
 * and company management operations
 */

import { PrismaClient } from '@prisma/client';
import {
  Company,
  BusinessType,
  BusinessCategory,
  VerificationStatus,
  ListingStatus,
  CompanyRegistrationStep1,
  CompanyRegistrationStep2,
  CompanyRegistrationStep3,
  CompanyRegistrationStep4,
  IPOConfiguration,
  IPOCalculationResult,
  CompanyMetrics,
  PricePoint,
  RevenueSummary,
  CompanyFilterOptions,
  PaginatedCompanyResponse,
  Shareholder,
  ShareholderListResponse,
  CompanyUpdateRequest,
} from '../types/company.types';
import { documentService } from './documentService';

// ============================================================================
// PRISMA CLIENT
// ============================================================================

const prisma = new PrismaClient();

// ============================================================================
// IPO VALIDATION CONSTANTS
// ============================================================================

const IPO_CONSTRAINTS = {
  MIN_VALUATION: 10000, // $10,000 minimum valuation
  MAX_VALUATION: 10000000, // $10M maximum valuation
  MIN_SHARES: 1000,
  MAX_SHARES: 1000000,
  MIN_PUBLIC_OFFERING_PERCENTAGE: 50, // 50%
  MAX_PUBLIC_OFFERING_PERCENTAGE: 90, // 90%
  MIN_SHARE_PRICE: 0.01,
  MAX_SHARE_PRICE: 10000,
  MIN_INVESTMENT: 10,
  MAX_INVESTMENT: 10000,
};

// ============================================================================
// COMPANY SERVICE CLASS
// ============================================================================

export class CompanyService {
  // ============================================================================
  // MULTI-STEP REGISTRATION
  // ============================================================================

  /**
   * Step 1: Save business information
   */
  public async saveStep1(
    ownerId: string,
    data: CompanyRegistrationStep1
  ): Promise<{ success: boolean; companyId?: string; errors?: string[] }> {
    try {
      // Validate business information
      const validationErrors = this.validateBusinessInfo(data);
      if (validationErrors.length > 0) {
        return { success: false, errors: validationErrors };
      }

      // Create company with draft status
      const company = await prisma.company.create({
        data: {
          owner_id: ownerId,
          business_name: data.business_name,
          business_type: data.business_type,
          category: data.category,
          description: data.description,
          physical_address: data.physical_address,
          years_in_operation: data.years_in_operation,
          registration_certificate_url: '', // Will be updated in step 2
          manager_id_card_url: '', // Will be updated in step 2
          business_photo_url: '', // Will be updated in step 2
          partner_bank_name: '', // Will be updated in step 3
          bank_account_number: '', // Will be updated in step 3
          initial_valuation: 0, // Will be updated in step 4
          total_shares: 0, // Will be updated in step 4
          available_shares: 0, // Will be updated in step 4
          current_price: 0, // Will be calculated in step 4
          public_offering_percentage: 70, // Default
          minimum_investment: 100, // Default
          verification_status: VerificationStatus.PENDING,
          listing_status: ListingStatus.DRAFT,
        },
      });

      return { success: true, companyId: company.id };
    } catch (error) {
      console.error('Error saving step 1:', error);
      return {
        success: false,
        errors: ['Failed to save business information'],
      };
    }
  }

  /**
   * Step 2: Upload and save documents
   */
  public async saveStep2(
    companyId: string,
    data: CompanyRegistrationStep2
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const errors: string[] = [];

      // Upload registration certificate
      const certResult = await documentService.uploadDocument(
        data.registration_certificate,
        'REGISTRATION_CERTIFICATE' as any,
        companyId
      );

      if (!certResult.success) {
        errors.push(`Registration certificate: ${certResult.error}`);
      }

      // Upload manager ID card
      const idResult = await documentService.uploadDocument(
        data.manager_id_card,
        'MANAGER_ID_CARD' as any,
        companyId
      );

      if (!idResult.success) {
        errors.push(`Manager ID card: ${idResult.error}`);
      }

      // Upload business photo
      const photoResult = await documentService.uploadDocument(
        data.business_photo,
        'BUSINESS_PHOTO' as any,
        companyId
      );

      if (!photoResult.success) {
        errors.push(`Business photo: ${photoResult.error}`);
      }

      if (errors.length > 0) {
        return { success: false, errors };
      }

      // Update company with document URLs
      await prisma.company.update({
        where: { id: companyId },
        data: {
          registration_certificate_url: certResult.url!,
          manager_id_card_url: idResult.url!,
          business_photo_url: photoResult.url!,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error saving step 2:', error);
      return { success: false, errors: ['Failed to upload documents'] };
    }
  }

  /**
   * Step 3: Connect bank account
   */
  public async saveStep3(
    companyId: string,
    data: CompanyRegistrationStep3
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      // Validate bank account information
      const validationErrors = this.validateBankInfo(data);
      if (validationErrors.length > 0) {
        return { success: false, errors: validationErrors };
      }

      // TODO: Integrate with partner bank API to verify account
      // For now, we'll simulate the verification
      const bankVerified = await this.verifyBankAccount(
        data.partner_bank_name,
        data.bank_account_number
      );

      if (!bankVerified) {
        return {
          success: false,
          errors: ['Bank account verification failed. Please check your account details.'],
        };
      }

      // Update company with bank information
      await prisma.company.update({
        where: { id: companyId },
        data: {
          partner_bank_name: data.partner_bank_name,
          bank_account_number: data.bank_account_number,
          bank_api_connected: true,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error saving step 3:', error);
      return { success: false, errors: ['Failed to connect bank account'] };
    }
  }

  /**
   * Step 4: Configure IPO
   */
  public async saveStep4(
    companyId: string,
    data: CompanyRegistrationStep4
  ): Promise<{ success: boolean; calculation?: IPOCalculationResult; errors?: string[] }> {
    try {
      // Validate IPO details
      const calculation = this.validateIPODetails(data);

      if (!calculation.is_valid) {
        return { success: false, calculation, errors: calculation.errors };
      }

      // Update company with IPO configuration
      await prisma.company.update({
        where: { id: companyId },
        data: {
          initial_valuation: data.initial_valuation,
          total_shares: data.total_shares,
          available_shares: calculation.public_shares,
          current_price: calculation.share_price,
          public_offering_percentage: data.public_offering_percentage,
          minimum_investment: data.minimum_investment,
        },
      });

      return { success: true, calculation };
    } catch (error) {
      console.error('Error saving step 4:', error);
      return { success: false, errors: ['Failed to configure IPO'] };
    }
  }

  /**
   * Final Step: Submit company for verification
   */
  public async submitForVerification(
    companyId: string
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      // Get company and verify all required fields are present
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return { success: false, errors: ['Company not found'] };
      }

      const missingFields: string[] = [];

      if (!company.business_name) missingFields.push('Business name');
      if (!company.registration_certificate_url) missingFields.push('Registration certificate');
      if (!company.manager_id_card_url) missingFields.push('Manager ID card');
      if (!company.business_photo_url) missingFields.push('Business photo');
      if (!company.bank_account_number) missingFields.push('Bank account');
      if (company.initial_valuation === 0) missingFields.push('IPO configuration');

      if (missingFields.length > 0) {
        return {
          success: false,
          errors: [`Missing required information: ${missingFields.join(', ')}`],
        };
      }

      // Update company status to pending verification
      await prisma.company.update({
        where: { id: companyId },
        data: {
          verification_status: VerificationStatus.PENDING,
          listing_status: ListingStatus.IPO,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error submitting for verification:', error);
      return { success: false, errors: ['Failed to submit for verification'] };
    }
  }

  /**
   * Complete registration (all steps at once)
   */
  public async registerCompany(
    ownerId: string,
    step1: CompanyRegistrationStep1,
    step2: CompanyRegistrationStep2,
    step3: CompanyRegistrationStep3,
    step4: CompanyRegistrationStep4
  ): Promise<{ success: boolean; company?: Company; errors?: string[] }> {
    // Step 1
    const step1Result = await this.saveStep1(ownerId, step1);
    if (!step1Result.success) {
      return { success: false, errors: step1Result.errors };
    }

    const companyId = step1Result.companyId!;

    // Step 2
    const step2Result = await this.saveStep2(companyId, step2);
    if (!step2Result.success) {
      return { success: false, errors: step2Result.errors };
    }

    // Step 3
    const step3Result = await this.saveStep3(companyId, step3);
    if (!step3Result.success) {
      return { success: false, errors: step3Result.errors };
    }

    // Step 4
    const step4Result = await this.saveStep4(companyId, step4);
    if (!step4Result.success) {
      return { success: false, errors: step4Result.errors };
    }

    // Submit for verification
    const submitResult = await this.submitForVerification(companyId);
    if (!submitResult.success) {
      return { success: false, errors: submitResult.errors };
    }

    // Get the complete company
    const company = await this.getCompanyById(companyId);

    return { success: true, company: company || undefined };
  }

  // ============================================================================
  // IPO VALIDATION
  // ============================================================================

  /**
   * Validate IPO details and calculate derived values
   */
  public validateIPODetails(config: IPOConfiguration): IPOCalculationResult {
    const errors: string[] = [];

    // Validate valuation
    if (config.initial_valuation < IPO_CONSTRAINTS.MIN_VALUATION) {
      errors.push(
        `Initial valuation must be at least $${IPO_CONSTRAINTS.MIN_VALUATION.toLocaleString()}`
      );
    }
    if (config.initial_valuation > IPO_CONSTRAINTS.MAX_VALUATION) {
      errors.push(
        `Initial valuation cannot exceed $${IPO_CONSTRAINTS.MAX_VALUATION.toLocaleString()}`
      );
    }

    // Validate total shares
    if (config.total_shares < IPO_CONSTRAINTS.MIN_SHARES) {
      errors.push(`Total shares must be at least ${IPO_CONSTRAINTS.MIN_SHARES.toLocaleString()}`);
    }
    if (config.total_shares > IPO_CONSTRAINTS.MAX_SHARES) {
      errors.push(`Total shares cannot exceed ${IPO_CONSTRAINTS.MAX_SHARES.toLocaleString()}`);
    }

    // Validate public offering percentage
    if (config.public_offering_percentage < IPO_CONSTRAINTS.MIN_PUBLIC_OFFERING_PERCENTAGE) {
      errors.push(`Public offering must be at least ${IPO_CONSTRAINTS.MIN_PUBLIC_OFFERING_PERCENTAGE}%`);
    }
    if (config.public_offering_percentage > IPO_CONSTRAINTS.MAX_PUBLIC_OFFERING_PERCENTAGE) {
      errors.push(`Public offering cannot exceed ${IPO_CONSTRAINTS.MAX_PUBLIC_OFFERING_PERCENTAGE}%`);
    }

    // Validate minimum investment
    if (config.minimum_investment < IPO_CONSTRAINTS.MIN_INVESTMENT) {
      errors.push(`Minimum investment must be at least $${IPO_CONSTRAINTS.MIN_INVESTMENT}`);
    }
    if (config.minimum_investment > IPO_CONSTRAINTS.MAX_INVESTMENT) {
      errors.push(`Minimum investment cannot exceed $${IPO_CONSTRAINTS.MAX_INVESTMENT}`);
    }

    // Calculate derived values
    const sharePrice = config.initial_valuation / config.total_shares;
    const publicShares = Math.floor(
      (config.total_shares * config.public_offering_percentage) / 100
    );
    const retainedShares = config.total_shares - publicShares;
    const capitalToRaise = publicShares * sharePrice;

    // Validate calculated share price
    if (sharePrice < IPO_CONSTRAINTS.MIN_SHARE_PRICE) {
      errors.push(
        `Calculated share price ($${sharePrice.toFixed(4)}) is too low. Consider increasing valuation or reducing shares.`
      );
    }
    if (sharePrice > IPO_CONSTRAINTS.MAX_SHARE_PRICE) {
      errors.push(
        `Calculated share price ($${sharePrice.toFixed(2)}) is too high. Consider reducing valuation or increasing shares.`
      );
    }

    // Validate that minimum investment allows at least one share
    const minSharesFromInvestment = Math.floor(config.minimum_investment / sharePrice);
    if (minSharesFromInvestment < 1) {
      errors.push(
        `Minimum investment ($${config.minimum_investment}) must allow purchase of at least 1 share at $${sharePrice.toFixed(2)}`
      );
    }

    return {
      share_price: parseFloat(sharePrice.toFixed(2)),
      public_shares: publicShares,
      retained_shares: retainedShares,
      capital_to_raise: parseFloat(capitalToRaise.toFixed(2)),
      is_valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate IPO preview without saving
   */
  public calculateIPOPreview(config: IPOConfiguration): IPOCalculationResult {
    return this.validateIPODetails(config);
  }

  // ============================================================================
  // COMPANY RETRIEVAL
  // ============================================================================

  /**
   * Get company by ID
   */
  public async getCompanyById(id: string): Promise<Company | null> {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    return company as unknown as Company | null;
  }

  /**
   * Get all active companies with filters
   */
  public async getCompanies(
    filters: CompanyFilterOptions = {}
  ): Promise<PaginatedCompanyResponse> {
    const {
      business_type,
      category,
      verification_status,
      listing_status,
      min_valuation,
      max_valuation,
      search,
      sort_by = 'created_at',
      sort_order = 'desc',
      page = 1,
      limit = 20,
    } = filters;

    // Build where clause
    const where: any = {};

    if (business_type) where.business_type = business_type;
    if (category) where.category = category;
    if (verification_status) where.verification_status = verification_status;
    if (listing_status) where.listing_status = listing_status;

    if (min_valuation !== undefined || max_valuation !== undefined) {
      where.initial_valuation = {};
      if (min_valuation !== undefined) where.initial_valuation.gte = min_valuation;
      if (max_valuation !== undefined) where.initial_valuation.lte = max_valuation;
    }

    if (search) {
      where.OR = [
        { business_name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.company.count({ where });

    // Get companies with pagination
    const companies = await prisma.company.findMany({
      where,
      orderBy: { [sort_by]: sort_order },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        owner: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });

    return {
      companies: companies as unknown as Company[],
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get companies owned by a user
   */
  public async getUserCompanies(ownerId: string): Promise<Company[]> {
    const companies = await prisma.company.findMany({
      where: { owner_id: ownerId },
      orderBy: { created_at: 'desc' },
    });

    return companies as unknown as Company[];
  }

  // ============================================================================
  // COMPANY UPDATES
  // ============================================================================

  /**
   * Update company information
   */
  public async updateCompany(
    companyId: string,
    data: CompanyUpdateRequest
  ): Promise<{ success: boolean; company?: Company; errors?: string[] }> {
    try {
      // Check if company exists
      const existing = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!existing) {
        return { success: false, errors: ['Company not found'] };
      }

      // Only allow updates for certain fields based on status
      if (existing.listing_status === ListingStatus.ACTIVE) {
        // For active companies, only allow description updates
        const allowedUpdates: any = {};
        if (data.description) allowedUpdates.description = data.description;
        if (data.physical_address) allowedUpdates.physical_address = data.physical_address;

        const updated = await prisma.company.update({
          where: { id: companyId },
          data: allowedUpdates,
        });

        return { success: true, company: updated as unknown as Company };
      }

      // For non-active companies, allow more updates
      const updated = await prisma.company.update({
        where: { id: companyId },
        data: {
          ...(data.business_name && { business_name: data.business_name }),
          ...(data.description && { description: data.description }),
          ...(data.physical_address && { physical_address: data.physical_address }),
          ...(data.category && { category: data.category }),
          updated_at: new Date(),
        },
      });

      return { success: true, company: updated as unknown as Company };
    } catch (error) {
      console.error('Error updating company:', error);
      return { success: false, errors: ['Failed to update company'] };
    }
  }

  /**
   * Update company status
   */
  public async updateCompanyStatus(
    companyId: string,
    listingStatus: ListingStatus
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      await prisma.company.update({
        where: { id: companyId },
        data: {
          listing_status: listingStatus,
          updated_at: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating company status:', error);
      return { success: false, errors: ['Failed to update company status'] };
    }
  }

  // ============================================================================
  // SHAREHOLDER MANAGEMENT
  // ============================================================================

  /**
   * Get shareholder list for a company
   */
  public async getShareholders(companyId: string): Promise<ShareholderListResponse> {
    const holdings = await prisma.stock_holdings.findMany({
      where: {
        company_id: companyId,
        shares_owned: { gt: 0 },
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
      orderBy: { shares_owned: 'desc' },
    });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { total_shares: true },
    });

    const totalShares = company?.total_shares || 0;
    const totalHeld = holdings.reduce((sum, h) => sum + (h.shares_owned || 0), 0);

    const shareholders: Shareholder[] = holdings.map((holding: any) => ({
      user_id: holding.user_id,
      full_name: holding.user?.full_name || 'Unknown',
      shares_owned: holding.shares_owned,
      ownership_percentage: totalShares > 0 ? (holding.shares_owned / totalShares) * 100 : 0,
      average_buy_price: holding.average_buy_price || 0,
      total_invested: holding.total_invested || 0,
      total_dividends_earned: holding.total_dividends_earned || 0,
      first_purchase_date: holding.created_at,
      last_purchase_date: holding.updated_at,
    }));

    return {
      company_id: companyId,
      total_shareholders: shareholders.length,
      total_shares_issued: totalShares,
      total_shares_held: totalHeld,
      shareholders,
    };
  }

  // ============================================================================
  // COMPANY METRICS
  // ============================================================================

  /**
   * Get company performance metrics
   */
  public async getCompanyMetrics(companyId: string): Promise<CompanyMetrics | null> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) return null;

    // Get price history (last 30 days)
    const priceHistory = await prisma.price_history.findMany({
      where: {
        company_id: companyId,
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Get revenue history (last 6 months)
    const revenueHistory = await prisma.revenue_reports.findMany({
      where: {
        company_id: companyId,
        verification_status: 'verified',
      },
      orderBy: [{ report_year: 'desc' }, { report_month: 'desc' }],
      take: 6,
    });

    // Calculate metrics
    const currentPrice = company.current_price;
    const firstPrice = priceHistory[0]?.price || currentPrice;
    const priceChange24h = currentPrice - firstPrice;
    const priceChangePercentage24h = firstPrice > 0 ? (priceChange24h / firstPrice) * 100 : 0;

    const volume24h = priceHistory.reduce((sum, p) => sum + (p.volume || 0), 0);
    const totalTrades = await prisma.trades.count({
      where: { company_id: companyId },
    });

    const marketCap = company.total_shares * currentPrice;

    // Calculate dividend yield
    const lastDividend = await prisma.dividends.findFirst({
      where: {
        company_id: companyId,
        payment_status: 'completed',
      },
      orderBy: { distribution_date: 'desc' },
    });

    const dividendYield = lastDividend
      ? ((lastDividend.amount_per_share * 12) / currentPrice) * 100
      : 0;

    // Get last month's revenue
    const lastRevenue = revenueHistory[0];
    const prevRevenue = revenueHistory[1];

    return {
      company_id: companyId,
      current_price: currentPrice,
      price_change_24h: priceChange24h,
      price_change_percentage_24h: priceChangePercentage24h,
      volume_24h: volume24h,
      total_trades: totalTrades,
      market_cap: marketCap,
      dividend_yield: dividendYield,
      last_month_revenue: lastRevenue?.net_revenue || undefined,
      last_month_profit: lastRevenue?.net_profit || undefined,
      revenue_growth:
        lastRevenue && prevRevenue && prevRevenue.net_revenue > 0
          ? (lastRevenue.net_revenue - prevRevenue.net_revenue) / prevRevenue.net_revenue
          : undefined,
      profit_margin:
        lastRevenue && lastRevenue.net_revenue > 0
          ? lastRevenue.net_profit / lastRevenue.net_revenue
          : undefined,
      price_history: priceHistory.map((p: any) => ({
        price: p.price,
        volume: p.volume,
        timestamp: p.timestamp,
      })),
      revenue_history: revenueHistory.map((r: any) => ({
        month: r.report_month,
        year: r.report_year,
        net_revenue: r.net_revenue,
        net_profit: r.net_profit,
        dividend_per_share: r.dividend_pool / company.total_shares,
      })),
    };
  }

  // ============================================================================
  // REVENUE REPORTS
  // ============================================================================

  /**
   * Get revenue reports for a company
   */
  public async getRevenueReports(companyId: string) {
    const reports = await prisma.revenue_reports.findMany({
      where: { company_id: companyId },
      orderBy: [{ report_year: 'desc' }, { report_month: 'desc' }],
    });

    return reports;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate business information
   */
  private validateBusinessInfo(data: CompanyRegistrationStep1): string[] {
    const errors: string[] = [];

    if (!data.business_name || data.business_name.trim().length < 2) {
      errors.push('Business name must be at least 2 characters');
    }

    if (!data.description || data.description.trim().length < 50) {
      errors.push('Business description must be at least 50 characters');
    }

    if (!data.physical_address || data.physical_address.trim().length < 10) {
      errors.push('Physical address must be at least 10 characters');
    }

    if (!data.years_in_operation || data.years_in_operation < 0) {
      errors.push('Years in operation must be 0 or more');
    }

    if (!Object.values(BusinessType).includes(data.business_type)) {
      errors.push('Invalid business type');
    }

    if (!Object.values(BusinessCategory).includes(data.category)) {
      errors.push('Invalid business category');
    }

    return errors;
  }

  /**
   * Validate bank account information
   */
  private validateBankInfo(data: CompanyRegistrationStep3): string[] {
    const errors: string[] = [];

    if (!data.partner_bank_name || data.partner_bank_name.trim().length < 2) {
      errors.push('Bank name is required');
    }

    if (!data.bank_account_number || data.bank_account_number.trim().length < 5) {
      errors.push('Valid bank account number is required');
    }

    return errors;
  }

  /**
   * Verify bank account with partner bank API
   */
  private async verifyBankAccount(
    bankName: string,
    accountNumber: string
  ): Promise<boolean> {
    // TODO: Integrate with actual partner bank API
    // For now, simulate verification
    console.log(`Verifying bank account: ${bankName} - ${accountNumber}`);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return true for valid-looking account numbers (for demo)
    return accountNumber.length >= 8 && /^[0-9]+$/.test(accountNumber);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const companyService = new CompanyService();

export default companyService;
