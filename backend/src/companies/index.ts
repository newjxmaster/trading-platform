/**
 * Company Management Module
 * Trading Platform for Small & Medium Businesses
 * 
 * This module provides complete company registration, verification,
 * and management functionality for the trading platform.
 */

// ============================================================================
// TYPES
// ============================================================================

export * from '../types/company.types';

// ============================================================================
// SERVICES
// ============================================================================

export { companyService, CompanyService } from '../services/companyService';
export { adminService, AdminService } from '../services/adminService';
export { documentService, DocumentService } from '../services/documentService';

// ============================================================================
// CONTROLLERS
// ============================================================================

export { companyController, CompanyController } from '../controllers/companyController';
export { adminController, AdminController } from '../controllers/adminController';

// ============================================================================
// ROUTES
// ============================================================================

export { default as companyRoutes } from '../routes/companyRoutes';
export { default as adminRoutes } from '../routes/adminRoutes';

// ============================================================================
// MIDDLEWARE
// ============================================================================

export {
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireBusinessOwner,
  requireInvestor,
  requireCompanyOwnerOrAdmin,
  createRateLimiter,
  handleMulterError,
  validateBody,
  AuthenticatedRequest,
} from '../middleware/auth';
