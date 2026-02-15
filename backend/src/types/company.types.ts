/**
 * Company Management Module - Type Definitions
 * Trading Platform for Small & Medium Businesses
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum BusinessType {
  SMALL_BUSINESS = 'small_business',
  MEDIUM_BUSINESS = 'medium_business',
}

export enum BusinessCategory {
  SUPERMARKET = 'supermarket',
  RETAIL_STORE = 'retail_store',
  RESTAURANT = 'restaurant',
  CAFE = 'cafe',
  BARBERSHOP = 'barbershop',
  PHARMACY = 'pharmacy',
  MINI_MART = 'mini_mart',
  FACTORY = 'factory',
  MANUFACTURING = 'manufacturing',
  WHOLESALE = 'wholesale',
  PROCESSING_PLANT = 'processing_plant',
  BAKERY = 'bakery',
  TEXTILE = 'textile',
  OTHER = 'other',
}

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum ListingStatus {
  DRAFT = 'draft',
  IPO = 'ipo',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

export enum RevenueVerificationStatus {
  AUTO_VERIFIED = 'auto_verified',
  PENDING_REVIEW = 'pending_review',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum DocumentType {
  REGISTRATION_CERTIFICATE = 'registration_certificate',
  MANAGER_ID_CARD = 'manager_id_card',
  BUSINESS_PHOTO = 'business_photo',
  TAX_CERTIFICATE = 'tax_certificate',
  BANK_STATEMENT = 'bank_statement',
  OTHER = 'other',
}

export enum UserRole {
  INVESTOR = 'investor',
  BUSINESS_OWNER = 'business_owner',
  ADMIN = 'admin',
}

export enum KycStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

// ============================================================================
// USER INTERFACES
// ============================================================================

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  phone?: string;
  kyc_status: KycStatus;
  id_document_url?: string;
  selfie_url?: string;
  wallet_fiat: number;
  wallet_crypto_usdt: number;
  wallet_crypto_btc: number;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// COMPANY INTERFACES
// ============================================================================

export interface Company {
  id: string;
  owner_id: string;
  business_name: string;
  business_type: BusinessType;
  category: BusinessCategory;
  description?: string;
  physical_address?: string;
  years_in_operation?: number;
  
  // Registration Documents
  registration_certificate_url: string;
  manager_id_card_url: string;
  business_photo_url: string;
  
  // Bank Integration
  partner_bank_name: string;
  bank_account_number: string;
  bank_api_connected: boolean;
  
  // IPO Details
  initial_valuation: number;
  total_shares: number;
  available_shares: number;
  current_price: number;
  public_offering_percentage: number;
  minimum_investment: number;
  ipo_date?: Date;
  
  // Status
  verification_status: VerificationStatus;
  listing_status: ListingStatus;
  rejection_reason?: string;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  verified_by?: string;
  verified_at?: Date;
}

// ============================================================================
// COMPANY REGISTRATION INTERFACES (Multi-step)
// ============================================================================

export interface CompanyRegistrationStep1 {
  business_name: string;
  business_type: BusinessType;
  category: BusinessCategory;
  description: string;
  physical_address: string;
  years_in_operation: number;
}

export interface CompanyRegistrationStep2 {
  registration_certificate: FileUpload;
  manager_id_card: FileUpload;
  business_photo: FileUpload;
}

export interface CompanyRegistrationStep3 {
  partner_bank_name: string;
  bank_account_number: string;
  bank_account_name?: string;
}

export interface CompanyRegistrationStep4 {
  initial_valuation: number;
  total_shares: number;
  public_offering_percentage: number;
  minimum_investment: number;
}

export interface CompanyRegistrationComplete {
  step1: CompanyRegistrationStep1;
  step2: CompanyRegistrationStep2;
  step3: CompanyRegistrationStep3;
  step4: CompanyRegistrationStep4;
}

export interface FileUpload {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  path?: string;
}

export interface UploadedDocument {
  url: string;
  key: string;
  document_type: DocumentType;
  original_name: string;
  size: number;
  uploaded_at: Date;
}

// ============================================================================
// IPO CONFIGURATION INTERFACES
// ============================================================================

export interface IPOConfiguration {
  initial_valuation: number;
  total_shares: number;
  public_offering_percentage: number;
  minimum_investment: number;
}

export interface IPOCalculationResult {
  share_price: number;
  public_shares: number;
  retained_shares: number;
  capital_to_raise: number;
  is_valid: boolean;
  errors: string[];
}

// ============================================================================
// VERIFICATION CHECKLIST INTERFACES
// ============================================================================

export interface VerificationChecklist {
  company_id: string;
  
  // Document Checks
  registration_certificate_verified: boolean;
  registration_certificate_notes?: string;
  
  manager_id_verified: boolean;
  manager_id_notes?: string;
  
  business_photo_verified: boolean;
  business_photo_notes?: string;
  
  // Bank Verification
  bank_account_verified: boolean;
  bank_account_notes?: string;
  
  // IPO Review
  ipo_details_reviewed: boolean;
  ipo_assessment: 'reasonable' | 'overvalued' | 'undervalued';
  ipo_notes?: string;
  
  // Overall
  all_checks_passed: boolean;
  verified_by?: string;
  verified_at?: Date;
}

export interface VerificationDecision {
  action: 'approve' | 'reject' | 'request_info';
  reason?: string;
  notes?: string;
  checklist: Partial<VerificationChecklist>;
}

// ============================================================================
// REVENUE REPORT INTERFACES
// ============================================================================

export interface RevenueReport {
  id: string;
  company_id: string;
  
  // Time Period
  report_month: number;
  report_year: number;
  period_start: Date;
  period_end: Date;
  
  // Financial Data
  total_deposits: number;
  total_withdrawals: number;
  net_revenue: number;
  
  // Manual Inputs
  operating_costs?: number;
  other_expenses?: number;
  
  // Calculated
  gross_profit: number;
  platform_fee: number;
  net_profit: number;
  dividend_pool: number;
  reinvestment_amount: number;
  
  // Status
  verification_status: RevenueVerificationStatus;
  verified_by?: string;
  verified_at?: Date;
  rejection_reason?: string;
  
  created_at: Date;
}

export interface RevenueVerificationDecision {
  action: 'verify' | 'reject';
  reason?: string;
  adjustments?: {
    total_deposits?: number;
    total_withdrawals?: number;
    operating_costs?: number;
  };
}

// ============================================================================
// SHAREHOLDER INTERFACES
// ============================================================================

export interface Shareholder {
  user_id: string;
  full_name: string;
  shares_owned: number;
  ownership_percentage: number;
  average_buy_price: number;
  total_invested: number;
  total_dividends_earned: number;
  first_purchase_date: Date;
  last_purchase_date?: Date;
}

export interface ShareholderListResponse {
  company_id: string;
  total_shareholders: number;
  total_shares_issued: number;
  total_shares_held: number;
  shareholders: Shareholder[];
}

// ============================================================================
// COMPANY METRICS INTERFACES
// ============================================================================

export interface CompanyMetrics {
  company_id: string;
  
  // Trading Metrics
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  volume_24h: number;
  
  // Performance Metrics
  total_trades: number;
  market_cap: number;
  dividend_yield: number;
  
  // Revenue Metrics
  last_month_revenue?: number;
  last_month_profit?: number;
  revenue_growth?: number;
  profit_margin?: number;
  
  // Historical
  price_history: PricePoint[];
  revenue_history: RevenueSummary[];
}

export interface PricePoint {
  price: number;
  volume: number;
  timestamp: Date;
}

export interface RevenueSummary {
  month: number;
  year: number;
  net_revenue: number;
  net_profit: number;
  dividend_per_share: number;
}

// ============================================================================
// PLATFORM STATISTICS INTERFACES
// ============================================================================

export interface PlatformStats {
  // User Statistics
  total_users: number;
  total_investors: number;
  total_business_owners: number;
  new_users_this_month: number;
  
  // Company Statistics
  total_companies: number;
  active_companies: number;
  pending_verification: number;
  ipo_companies: number;
  
  // Trading Statistics
  total_trading_volume: number;
  total_trades: number;
  trades_this_month: number;
  
  // Financial Statistics
  total_capital_raised: number;
  total_dividends_distributed: number;
  platform_revenue: number;
  
  // Recent Activity
  recent_registrations: CompanySummary[];
  recent_trades: TradeSummary[];
}

export interface CompanySummary {
  id: string;
  business_name: string;
  business_type: BusinessType;
  verification_status: VerificationStatus;
  created_at: Date;
}

export interface TradeSummary {
  id: string;
  company_name: string;
  quantity: number;
  price: number;
  total_amount: number;
  executed_at: Date;
}

// ============================================================================
// API REQUEST/RESPONSE INTERFACES
// ============================================================================

export interface CompanyFilterOptions {
  business_type?: BusinessType;
  category?: BusinessCategory;
  verification_status?: VerificationStatus;
  listing_status?: ListingStatus;
  min_valuation?: number;
  max_valuation?: number;
  search?: string;
  sort_by?: 'created_at' | 'valuation' | 'current_price' | 'business_name';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedCompanyResponse {
  companies: Company[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CompanyUpdateRequest {
  business_name?: string;
  description?: string;
  physical_address?: string;
  category?: BusinessCategory;
}

export interface AdminUserFilterOptions {
  role?: UserRole;
  kyc_status?: KycStatus;
  search?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// ADMIN LOG INTERFACES
// ============================================================================

export interface AdminActionLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action_type: string;
  target_type: 'company' | 'user' | 'revenue_report';
  target_id: string;
  target_name?: string;
  details: Record<string, unknown>;
  created_at: Date;
}

// ============================================================================
// DOCUMENT SERVICE INTERFACES
// ============================================================================

export interface DocumentValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface DocumentUploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export interface DocumentDeleteResult {
  success: boolean;
  error?: string;
}

export interface SignedUrlResult {
  url: string;
  expires_at: Date;
}

// ============================================================================
// BANK TRANSACTION INTERFACES
// ============================================================================

export interface BankTransaction {
  id: string;
  company_id: string;
  transaction_date: Date;
  transaction_type: 'credit' | 'debit';
  amount: number;
  balance_after: number;
  description?: string;
  bank_reference?: string;
  created_at: Date;
}

// ============================================================================
// ERROR INTERFACES
// ============================================================================

export interface CompanyError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}
