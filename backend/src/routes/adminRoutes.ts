/**
 * Admin Routes
 * Trading Platform for Small & Medium Businesses
 * 
 * API Routes for Admin Management:
 * - GET /api/admin/companies/pending - Companies awaiting approval
 * - PATCH /api/admin/companies/:id/verify - Approve/Reject company
 * - GET /api/admin/revenue/pending - Revenue reports to verify
 * - PATCH /api/admin/revenue/:id/verify - Verify revenue report
 * - GET /api/admin/users - List all users
 * - GET /api/admin/dashboard/stats - Platform statistics
 */

import { Router } from 'express';
import { adminController } from '../controllers/adminController';

// ============================================================================
// ROUTER
// ============================================================================

const router = Router();

// ============================================================================
// DASHBOARD & STATISTICS ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get platform statistics for admin dashboard
 * @access  Private (Admin only)
 */
router.get('/dashboard/stats', adminController.getDashboardStats);

/**
 * @route   GET /api/admin/logs
 * @desc    Get admin action logs
 * @access  Private (Admin only)
 * @query   admin_id, action_type, page, limit
 */
router.get('/logs', adminController.getAdminLogs);

// ============================================================================
// COMPANY VERIFICATION ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/companies/pending
 * @desc    Get all companies awaiting approval
 * @access  Private (Admin only)
 * @query   page, limit, sort_by, sort_order
 */
router.get('/companies/pending', adminController.getPendingCompanies);

/**
 * @route   GET /api/admin/companies/pending/:id
 * @desc    Get detailed information about a pending company
 * @access  Private (Admin only)
 */
router.get('/companies/pending/:id', adminController.getPendingCompanyDetails);

/**
 * @route   GET /api/admin/companies/all
 * @desc    Get all companies (for admin management)
 * @access  Private (Admin only)
 * @query   verification_status, listing_status, business_type, search, page, limit
 */
router.get('/companies/all', adminController.getAllCompanies);

/**
 * @route   GET /api/admin/companies/:id
 * @desc    Get full company details (admin view)
 * @access  Private (Admin only)
 */
router.get('/companies/:id', adminController.getCompanyDetails);

/**
 * @route   PATCH /api/admin/companies/:id/verify
 * @desc    Approve, reject, or request more info for a company
 * @access  Private (Admin only)
 * @body    action (approve/reject/request_info), reason, notes, checklist items
 *          registration_certificate_verified, manager_id_verified, 
 *          business_photo_verified, bank_account_verified, ipo_details_reviewed,
 *          ipo_assessment (reasonable/overvalued/undervalued)
 */
router.patch('/companies/:id/verify', adminController.verifyCompany);

/**
 * @route   GET /api/admin/companies/:id/document-url
 * @desc    Get signed URL for reviewing a company document
 * @access  Private (Admin only)
 * @query   document_type (registration_certificate/manager_id_card/business_photo)
 */
router.get('/companies/:id/document-url', adminController.getDocumentUrl);

/**
 * @route   POST /api/admin/companies/:id/suspend
 * @desc    Suspend an active company
 * @access  Private (Admin only)
 * @body    reason
 */
router.post('/companies/:id/suspend', adminController.suspendCompany);

/**
 * @route   POST /api/admin/companies/:id/reactivate
 * @desc    Reactivate a suspended company
 * @access  Private (Admin only)
 */
router.post('/companies/:id/reactivate', adminController.reactivateCompany);

// ============================================================================
// REVENUE VERIFICATION ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/revenue/pending
 * @desc    Get revenue reports awaiting verification
 * @access  Private (Admin only)
 * @query   page, limit, company_id
 */
router.get('/revenue/pending', adminController.getPendingRevenue);

/**
 * @route   GET /api/admin/revenue/:id
 * @desc    Get detailed revenue report information
 * @access  Private (Admin only)
 */
router.get('/revenue/:id', adminController.getRevenueReportDetails);

/**
 * @route   PATCH /api/admin/revenue/:id/verify
 * @desc    Verify or reject a revenue report
 * @access  Private (Admin only)
 * @body    action (verify/reject), reason, adjustments (optional)
 *          adjustments: { total_deposits, total_withdrawals, operating_costs }
 */
router.patch('/revenue/:id/verify', adminController.verifyRevenue);

// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/users
 * @desc    List all users with filters
 * @access  Private (Admin only)
 * @query   role, kyc_status, search, page, limit
 */
router.get('/users', adminController.getUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get detailed user information
 * @access  Private (Admin only)
 */
router.get('/users/:id', adminController.getUserDetails);

/**
 * @route   PATCH /api/admin/users/:id/kyc
 * @desc    Update user KYC status
 * @access  Private (Admin only)
 * @body    status (verified/rejected), reason
 */
router.patch('/users/:id/kyc', adminController.updateUserKyc);

// ============================================================================
// EXPORT
// ============================================================================

export default router;
