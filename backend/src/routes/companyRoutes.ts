/**
 * Company Routes
 * Trading Platform for Small & Medium Businesses
 * 
 * API Routes for Company Management:
 * - POST /api/companies/register - Register new company
 * - GET /api/companies - List all active companies (with filters)
 * - GET /api/companies/:id - Get company details
 * - GET /api/companies/:id/financials - View revenue reports
 * - PATCH /api/companies/:id - Update company info
 * - GET /api/companies/:id/shareholders - View shareholder list
 * - GET /api/companies/my - Get current user's companies
 */

import { Router } from 'express';
import multer from 'multer';
import { companyController } from '../controllers/companyController';

// ============================================================================
// MULTER CONFIGURATION
// ============================================================================

const storage = multer.memoryStorage();

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// Multiple file upload for registration
const registrationUpload = upload.fields([
  { name: 'registration_certificate', maxCount: 1 },
  { name: 'manager_id_card', maxCount: 1 },
  { name: 'business_photo', maxCount: 1 },
]);

// Single file upload for additional documents
const documentUpload = upload.single('document');

// ============================================================================
// ROUTER
// ============================================================================

const router = Router();

// ============================================================================
// REGISTRATION ROUTES (Multi-step)
// ============================================================================

/**
 * @route   POST /api/companies/register
 * @desc    Complete company registration (all steps at once)
 * @access  Private (Business Owner)
 * @body    business_name, business_type, category, description, physical_address, years_in_operation
 *          partner_bank_name, bank_account_number, initial_valuation, total_shares, 
 *          public_offering_percentage, minimum_investment
 * @files   registration_certificate, manager_id_card, business_photo
 */
router.post('/register', registrationUpload, companyController.registerCompany);

/**
 * @route   POST /api/companies/register/step1
 * @desc    Save step 1 - Business information
 * @access  Private (Business Owner)
 * @body    business_name, business_type, category, description, physical_address, years_in_operation
 */
router.post('/register/step1', companyController.saveRegistrationStep1);

/**
 * @route   POST /api/companies/register/step2/:companyId
 * @desc    Save step 2 - Document upload
 * @access  Private (Business Owner)
 * @files   registration_certificate, manager_id_card, business_photo
 */
router.post('/register/step2/:companyId', registrationUpload, companyController.saveRegistrationStep2);

/**
 * @route   POST /api/companies/register/step3/:companyId
 * @desc    Save step 3 - Bank account connection
 * @access  Private (Business Owner)
 * @body    partner_bank_name, bank_account_number
 */
router.post('/register/step3/:companyId', companyController.saveRegistrationStep3);

/**
 * @route   POST /api/companies/register/step4/:companyId
 * @desc    Save step 4 - IPO configuration
 * @access  Private (Business Owner)
 * @body    initial_valuation, total_shares, public_offering_percentage, minimum_investment
 */
router.post('/register/step4/:companyId', companyController.saveRegistrationStep4);

/**
 * @route   POST /api/companies/register/submit/:companyId
 * @desc    Submit company for verification (final step)
 * @access  Private (Business Owner)
 */
router.post('/register/submit/:companyId', companyController.submitForVerification);

/**
 * @route   POST /api/companies/ipo/calculate
 * @desc    Calculate IPO preview without saving
 * @access  Private (Business Owner)
 * @body    initial_valuation, total_shares, public_offering_percentage, minimum_investment
 */
router.post('/ipo/calculate', companyController.calculateIPO);

// ============================================================================
// COMPANY LISTING ROUTES
// ============================================================================

/**
 * @route   GET /api/companies
 * @desc    List all active companies with filters
 * @access  Public
 * @query   business_type, category, verification_status, listing_status
 *          min_valuation, max_valuation, search, sort_by, sort_order, page, limit
 */
router.get('/', companyController.getCompanies);

/**
 * @route   GET /api/companies/my
 * @desc    Get current user's companies
 * @access  Private (Business Owner)
 */
router.get('/my', companyController.getMyCompanies);

/**
 * @route   GET /api/companies/document-requirements
 * @desc    Get document requirements for each type
 * @access  Public
 */
router.get('/document-requirements', companyController.getDocumentRequirements);

/**
 * @route   GET /api/companies/:id
 * @desc    Get company details
 * @access  Public
 */
router.get('/:id', companyController.getCompanyById);

/**
 * @route   GET /api/companies/:id/financials
 * @desc    View revenue reports for a company
 * @access  Public
 * @query   year, month
 */
router.get('/:id/financials', companyController.getCompanyFinancials);

/**
 * @route   GET /api/companies/:id/shareholders
 * @desc    View shareholder list for a company
 * @access  Public
 */
router.get('/:id/shareholders', companyController.getShareholders);

/**
 * @route   GET /api/companies/:id/metrics
 * @desc    Get company performance metrics
 * @access  Public
 */
router.get('/:id/metrics', companyController.getCompanyMetrics);

// ============================================================================
// COMPANY UPDATE ROUTES
// ============================================================================

/**
 * @route   PATCH /api/companies/:id
 * @desc    Update company information
 * @access  Private (Business Owner or Admin)
 * @body    business_name, description, physical_address, category
 */
router.patch('/:id', companyController.updateCompany);

// ============================================================================
// DOCUMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/companies/:id/documents
 * @desc    Upload additional documents for a company
 * @access  Private (Business Owner)
 * @body    document_type
 * @file    document
 */
router.post('/:id/documents', documentUpload, companyController.uploadDocument);

/**
 * @route   GET /api/companies/:id/documents/:documentKey/url
 * @desc    Get signed URL for a document
 * @access  Private (Business Owner or Admin)
 */
router.get('/:id/documents/:documentKey/url', companyController.getDocumentUrl);

// ============================================================================
// EXPORT
// ============================================================================

export default router;
