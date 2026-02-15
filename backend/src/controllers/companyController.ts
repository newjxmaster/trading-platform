/**
 * Company Controller
 * Trading Platform for Small & Medium Businesses
 * 
 * Handles all company-related API endpoints:
 * - POST /api/companies/register - Register new company
 * - GET /api/companies - List all active companies (with filters)
 * - GET /api/companies/:id - Get company details
 * - GET /api/companies/:id/financials - View revenue reports
 * - PATCH /api/companies/:id - Update company info
 * - GET /api/companies/:id/shareholders - View shareholder list
 * - GET /api/companies/my - Get current user's companies
 */

import { Request, Response } from 'express';
import { companyService } from '../services/companyService';
import { documentService } from '../services/documentService';
import {
  BusinessType,
  BusinessCategory,
  ListingStatus,
  VerificationStatus,
  CompanyFilterOptions,
  CompanyRegistrationStep1,
  CompanyRegistrationStep2,
  CompanyRegistrationStep3,
  CompanyRegistrationStep4,
  FileUpload,
  DocumentType,
} from '../types/company.types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user ID from authenticated request
 */
const getUserId = (req: Request): string => {
  // Assuming auth middleware adds user to request
  return (req as any).user?.id || '';
};

/**
 * Handle error responses
 */
const handleError = (res: Response, error: unknown, statusCode: number = 500) => {
  console.error('Controller error:', error);
  const message = error instanceof Error ? error.message : 'Internal server error';
  return res.status(statusCode).json({
    success: false,
    error: message,
  });
};

/**
 * Convert Express file to FileUpload type
 */
const convertFile = (file: Express.Multer.File): FileUpload => ({
  originalname: file.originalname,
  mimetype: file.mimetype,
  size: file.size,
  buffer: file.buffer,
  path: file.path,
});

// ============================================================================
// COMPANY CONTROLLER
// ============================================================================

export class CompanyController {
  // ============================================================================
  // REGISTRATION ENDPOINTS
  // ============================================================================

  /**
   * POST /api/companies/register
   * Register a new company (complete multi-step registration)
   */
  public registerCompany = async (req: Request, res: Response): Promise<Response> => {
    try {
      const ownerId = getUserId(req);
      if (!ownerId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const {
        business_name,
        business_type,
        category,
        description,
        physical_address,
        years_in_operation,
        partner_bank_name,
        bank_account_number,
        initial_valuation,
        total_shares,
        public_offering_percentage,
        minimum_investment,
      } = req.body;

      // Validate required fields
      const missingFields: string[] = [];
      if (!business_name) missingFields.push('business_name');
      if (!business_type) missingFields.push('business_type');
      if (!category) missingFields.push('category');
      if (!description) missingFields.push('description');
      if (!physical_address) missingFields.push('physical_address');
      if (!partner_bank_name) missingFields.push('partner_bank_name');
      if (!bank_account_number) missingFields.push('bank_account_number');
      if (!initial_valuation) missingFields.push('initial_valuation');
      if (!total_shares) missingFields.push('total_shares');

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
        });
      }

      // Check for uploaded files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (!files?.registration_certificate?.[0]) {
        return res.status(400).json({
          success: false,
          error: 'Registration certificate is required',
        });
      }
      if (!files?.manager_id_card?.[0]) {
        return res.status(400).json({
          success: false,
          error: 'Manager ID card is required',
        });
      }
      if (!files?.business_photo?.[0]) {
        return res.status(400).json({
          success: false,
          error: 'Business photo is required',
        });
      }

      // Prepare registration data
      const step1: CompanyRegistrationStep1 = {
        business_name,
        business_type: business_type as BusinessType,
        category: category as BusinessCategory,
        description,
        physical_address,
        years_in_operation: parseInt(years_in_operation) || 0,
      };

      const step2: CompanyRegistrationStep2 = {
        registration_certificate: convertFile(files.registration_certificate[0]),
        manager_id_card: convertFile(files.manager_id_card[0]),
        business_photo: convertFile(files.business_photo[0]),
      };

      const step3: CompanyRegistrationStep3 = {
        partner_bank_name,
        bank_account_number,
      };

      const step4: CompanyRegistrationStep4 = {
        initial_valuation: parseFloat(initial_valuation),
        total_shares: parseInt(total_shares),
        public_offering_percentage: parseFloat(public_offering_percentage) || 70,
        minimum_investment: parseFloat(minimum_investment) || 100,
      };

      // Register company
      const result = await companyService.registerCompany(
        ownerId,
        step1,
        step2,
        step3,
        step4
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          errors: result.errors,
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Company registered successfully and pending verification',
        data: {
          company: result.company,
        },
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * POST /api/companies/register/step1
   * Save step 1 of registration (business information)
   */
  public saveRegistrationStep1 = async (req: Request, res: Response): Promise<Response> => {
    try {
      const ownerId = getUserId(req);
      if (!ownerId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const {
        business_name,
        business_type,
        category,
        description,
        physical_address,
        years_in_operation,
      } = req.body;

      const step1Data: CompanyRegistrationStep1 = {
        business_name,
        business_type: business_type as BusinessType,
        category: category as BusinessCategory,
        description,
        physical_address,
        years_in_operation: parseInt(years_in_operation) || 0,
      };

      const result = await companyService.saveStep1(ownerId, step1Data);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          errors: result.errors,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Step 1 saved successfully',
        data: {
          company_id: result.companyId,
        },
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * POST /api/companies/register/step2/:companyId
   * Save step 2 of registration (documents)
   */
  public saveRegistrationStep2 = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { companyId } = req.params;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files?.registration_certificate?.[0]) {
        return res.status(400).json({
          success: false,
          error: 'Registration certificate is required',
        });
      }
      if (!files?.manager_id_card?.[0]) {
        return res.status(400).json({
          success: false,
          error: 'Manager ID card is required',
        });
      }
      if (!files?.business_photo?.[0]) {
        return res.status(400).json({
          success: false,
          error: 'Business photo is required',
        });
      }

      const step2Data: CompanyRegistrationStep2 = {
        registration_certificate: convertFile(files.registration_certificate[0]),
        manager_id_card: convertFile(files.manager_id_card[0]),
        business_photo: convertFile(files.business_photo[0]),
      };

      const result = await companyService.saveStep2(companyId, step2Data);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          errors: result.errors,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Step 2 saved successfully - Documents uploaded',
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * POST /api/companies/register/step3/:companyId
   * Save step 3 of registration (bank connection)
   */
  public saveRegistrationStep3 = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { companyId } = req.params;
      const { partner_bank_name, bank_account_number } = req.body;

      const step3Data: CompanyRegistrationStep3 = {
        partner_bank_name,
        bank_account_number,
      };

      const result = await companyService.saveStep3(companyId, step3Data);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          errors: result.errors,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Step 3 saved successfully - Bank account connected',
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * POST /api/companies/register/step4/:companyId
   * Save step 4 of registration (IPO configuration)
   */
  public saveRegistrationStep4 = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { companyId } = req.params;
      const { initial_valuation, total_shares, public_offering_percentage, minimum_investment } =
        req.body;

      const step4Data: CompanyRegistrationStep4 = {
        initial_valuation: parseFloat(initial_valuation),
        total_shares: parseInt(total_shares),
        public_offering_percentage: parseFloat(public_offering_percentage) || 70,
        minimum_investment: parseFloat(minimum_investment) || 100,
      };

      const result = await companyService.saveStep4(companyId, step4Data);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          calculation: result.calculation,
          errors: result.errors,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Step 4 saved successfully - IPO configured',
        data: {
          calculation: result.calculation,
        },
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * POST /api/companies/register/submit/:companyId
   * Submit company for verification
   */
  public submitForVerification = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { companyId } = req.params;

      const result = await companyService.submitForVerification(companyId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          errors: result.errors,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Company submitted for verification. Expected review time: 2-3 business days.',
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * POST /api/companies/ipo/calculate
   * Calculate IPO preview without saving
   */
  public calculateIPO = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { initial_valuation, total_shares, public_offering_percentage, minimum_investment } =
        req.body;

      if (!initial_valuation || !total_shares) {
        return res.status(400).json({
          success: false,
          error: 'Initial valuation and total shares are required',
        });
      }

      const config: CompanyRegistrationStep4 = {
        initial_valuation: parseFloat(initial_valuation),
        total_shares: parseInt(total_shares),
        public_offering_percentage: parseFloat(public_offering_percentage) || 70,
        minimum_investment: parseFloat(minimum_investment) || 100,
      };

      const calculation = companyService.calculateIPOPreview(config);

      return res.status(200).json({
        success: true,
        data: calculation,
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  // ============================================================================
  // COMPANY LISTING ENDPOINTS
  // ============================================================================

  /**
   * GET /api/companies
   * List all active companies with filters
   */
  public getCompanies = async (req: Request, res: Response): Promise<Response> => {
    try {
      const {
        business_type,
        category,
        verification_status,
        listing_status,
        min_valuation,
        max_valuation,
        search,
        sort_by,
        sort_order,
        page,
        limit,
      } = req.query;

      const filters: CompanyFilterOptions = {
        business_type: business_type as BusinessType,
        category: category as BusinessCategory,
        verification_status: verification_status as VerificationStatus,
        listing_status: (listing_status as ListingStatus) || ListingStatus.ACTIVE,
        min_valuation: min_valuation ? parseFloat(min_valuation as string) : undefined,
        max_valuation: max_valuation ? parseFloat(max_valuation as string) : undefined,
        search: search as string,
        sort_by: sort_by as any,
        sort_order: sort_order as 'asc' | 'desc',
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
   * GET /api/companies/:id
   * Get company details
   */
  public getCompanyById = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;

      const company = await companyService.getCompanyById(id);

      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Company not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: { company },
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * GET /api/companies/my
   * Get current user's companies
   */
  public getMyCompanies = async (req: Request, res: Response): Promise<Response> => {
    try {
      const ownerId = getUserId(req);
      if (!ownerId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const companies = await companyService.getUserCompanies(ownerId);

      return res.status(200).json({
        success: true,
        data: { companies },
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * GET /api/companies/:id/financials
   * View revenue reports for a company
   */
  public getCompanyFinancials = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const { year, month } = req.query;

      // Check if company exists
      const company = await companyService.getCompanyById(id);
      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Company not found',
        });
      }

      // Get revenue reports
      const reports = await companyService.getRevenueReports(id);

      // Filter by year/month if provided
      let filteredReports = reports;
      if (year) {
        filteredReports = filteredReports.filter(
          (r: any) => r.report_year === parseInt(year as string)
        );
      }
      if (month) {
        filteredReports = filteredReports.filter(
          (r: any) => r.report_month === parseInt(month as string)
        );
      }

      return res.status(200).json({
        success: true,
        data: {
          company_id: id,
          business_name: company.business_name,
          reports: filteredReports,
        },
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * GET /api/companies/:id/shareholders
   * View shareholder list for a company
   */
  public getShareholders = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;

      // Check if company exists
      const company = await companyService.getCompanyById(id);
      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Company not found',
        });
      }

      const shareholders = await companyService.getShareholders(id);

      return res.status(200).json({
        success: true,
        data: shareholders,
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * GET /api/companies/:id/metrics
   * Get company performance metrics
   */
  public getCompanyMetrics = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;

      const metrics = await companyService.getCompanyMetrics(id);

      if (!metrics) {
        return res.status(404).json({
          success: false,
          error: 'Company not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  // ============================================================================
  // COMPANY UPDATE ENDPOINTS
  // ============================================================================

  /**
   * PATCH /api/companies/:id
   * Update company information
   */
  public updateCompany = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);

      // Get company to check ownership
      const company = await companyService.getCompanyById(id);
      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Company not found',
        });
      }

      // Check if user is owner or admin
      if (company.owner_id !== userId && (req as any).user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this company',
        });
      }

      const { business_name, description, physical_address, category } = req.body;

      const updateData = {
        ...(business_name && { business_name }),
        ...(description && { description }),
        ...(physical_address && { physical_address }),
        ...(category && { category }),
      };

      const result = await companyService.updateCompany(id, updateData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          errors: result.errors,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Company updated successfully',
        data: { company: result.company },
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  // ============================================================================
  // DOCUMENT ENDPOINTS
  // ============================================================================

  /**
   * POST /api/companies/:id/documents
   * Upload additional documents for a company
   */
  public uploadDocument = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const { document_type } = req.body;
      const userId = getUserId(req);

      // Check if company exists and user is owner
      const company = await companyService.getCompanyById(id);
      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Company not found',
        });
      }

      if (company.owner_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to upload documents for this company',
        });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      const fileUpload = convertFile(file);
      const docType = (document_type as DocumentType) || DocumentType.OTHER;

      const result = await documentService.uploadDocument(fileUpload, docType, id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Document uploaded successfully',
        data: {
          url: result.url,
          key: result.key,
        },
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * GET /api/companies/:id/documents/:documentKey/url
   * Get signed URL for a document
   */
  public getDocumentUrl = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { documentKey } = req.params;

      const result = await documentService.getDocumentUrl(documentKey, 3600);

      return res.status(200).json({
        success: true,
        data: {
          url: result.url,
          expires_at: result.expires_at,
        },
      });
    } catch (error) {
      return handleError(res, error);
    }
  };

  /**
   * GET /api/companies/document-requirements
   * Get document requirements for each type
   */
  public getDocumentRequirements = async (req: Request, res: Response): Promise<Response> => {
    try {
      const requirements = {
        registration_certificate: documentService.getDocumentRequirements(
          DocumentType.REGISTRATION_CERTIFICATE
        ),
        manager_id_card: documentService.getDocumentRequirements(DocumentType.MANAGER_ID_CARD),
        business_photo: documentService.getDocumentRequirements(DocumentType.BUSINESS_PHOTO),
        tax_certificate: documentService.getDocumentRequirements(DocumentType.TAX_CERTIFICATE),
        bank_statement: documentService.getDocumentRequirements(DocumentType.BANK_STATEMENT),
        other: documentService.getDocumentRequirements(DocumentType.OTHER),
      };

      return res.status(200).json({
        success: true,
        data: requirements,
      });
    } catch (error) {
      return handleError(res, error);
    }
  };
}

// ============================================================================
// EXPORT INSTANCE
// ============================================================================

export const companyController = new CompanyController();

export default companyController;
