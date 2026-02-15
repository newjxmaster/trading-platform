// ============================================
// Trading Platform Types
// ============================================

// User Types
export type UserRole = 'investor' | 'business_owner' | 'admin';
export type KycStatus = 'pending' | 'verified' | 'rejected';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  kycStatus: KycStatus;
  walletFiat: number;
  walletCryptoUsdt: number;
  walletCryptoBtc: number;
  idDocumentUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Company Types
export type BusinessType = 'small_business' | 'medium_business';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type ListingStatus = 'draft' | 'pending' | 'active' | 'suspended' | 'delisted';

export interface Company {
  id: string;
  ownerId: string;
  businessName: string;
  businessType: BusinessType;
  category?: string;
  description?: string;
  registrationNumber: string;
  taxId?: string;
  address?: string;
  yearsInOperation?: number;
  
  // Documents
  registrationCertificateUrl?: string;
  managerIdCardUrl?: string;
  businessPhotoUrl?: string;
  
  // Bank Info
  partnerBankName: string;
  bankAccountNumber: string;
  bankApiConnected: boolean;
  
  // IPO Details
  initialValuation: number;
  totalShares: number;
  availableShares: number;
  currentPrice: number;
  ipoDate: string;
  
  // Market Data
  priceChange?: number;
  priceChangePercent?: number;
  dividendYield?: number;
  
  // Status
  verificationStatus: VerificationStatus;
  listingStatus: ListingStatus;
  
  createdAt: string;
  updatedAt: string;
}

// Portfolio Types
export interface StockHolding {
  id: string;
  userId: string;
  companyId: string;
  company?: Company;
  sharesOwned: number;
  averageBuyPrice: number;
  currentValue?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  totalDividendsEarned?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalInvestment: number;
  totalProfitLoss: number;
  profitLossPercent: number;
  totalDividendsEarned: number;
}

// Trading Types
export type OrderType = 'market' | 'limit';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'expired';

export interface Order {
  id: string;
  userId: string;
  companyId: string;
  company?: Company;
  orderType: OrderType;
  side: OrderSide;
  quantity: number;
  price: number;
  status: OrderStatus;
  filledQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface Trade {
  id: string;
  buyerId: string;
  sellerId: string;
  companyId: string;
  company?: Company;
  quantity: number;
  price: number;
  totalAmount: number;
  executedAt: string;
}

export interface OrderBook {
  companyId: string;
  buyOrders: Array<{
    id: string;
    price: number;
    quantity: number;
  }>;
  sellOrders: Array<{
    id: string;
    price: number;
    quantity: number;
  }>;
  spread: number;
}

export interface PriceHistory {
  id: string;
  companyId: string;
  price: number;
  volume: number;
  timestamp: string;
}

export interface PlaceOrderData {
  companyId: string;
  orderType: OrderType;
  side: OrderSide;
  quantity: number;
  price?: number;
}

// Revenue Types
export type RevenueVerificationStatus = 'auto_verified' | 'pending_review' | 'verified' | 'rejected';

export interface RevenueReport {
  id: string;
  companyId: string;
  reportMonth: number;
  reportYear: number;
  totalDeposits: number;
  totalWithdrawals: number;
  netRevenue: number;
  operatingCosts?: number;
  grossProfit: number;
  platformFee: number;
  netProfit: number;
  dividendPool: number;
  reinvestmentAmount: number;
  verificationStatus: RevenueVerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Dividend Types
export type DividendStatus = 'pending' | 'paid' | 'failed';

export interface DividendPayout {
  id: string;
  userId: string;
  companyId: string;
  company?: Company;
  dividendId: string;
  dividend?: {
    distributionDate: string;
  };
  sharesHeld: number;
  payoutAmount: number;
  status: DividendStatus;
  paidAt?: string;
  createdAt: string;
}

// Transaction Types
export type TransactionType = 'deposit' | 'withdrawal' | 'trade' | 'dividend' | 'fee' | 'refund';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type PaymentMethod = 'wave' | 'orange_money' | 'card' | 'bank_transfer' | 'crypto';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description?: string;
  status: TransactionStatus;
  paymentMethod?: PaymentMethod;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Filter Types
export interface FilterOptions {
  businessType?: BusinessType;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minDividendYield?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  filter?: string;
  sort?: string;
}

// Admin Types
export interface AdminStats {
  totalUsers: number;
  totalCompanies: number;
  totalTradingVolume: number;
  totalDividendsDistributed: number;
  pendingVerifications: number;
  monthlyRevenue: number;
}

// Registration Types
export interface CompanyRegistrationData {
  businessName: string;
  businessType: BusinessType;
  category: string;
  description: string;
  registrationNumber: string;
  address: string;
  yearsInOperation: number;
  initialValuation: number;
  totalShares: number;
  bankId?: string;
  bankAccountNumber?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Socket Types
export interface SocketPriceUpdate {
  companyId: string;
  newPrice: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

export interface SocketTradeUpdate {
  tradeId: string;
  companyId: string;
  quantity: number;
  price: number;
  timestamp: string;
}

// ============================================
// Auth Types
// ============================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role?: UserRole;
}

// ============================================
// WebSocket Types
// ============================================

export enum WebSocketEvents {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  PRICE_UPDATE = 'price_update',
  ORDER_MATCHED = 'order_matched',
  NEW_TRADE = 'new_trade',
  ORDER_BOOK_UPDATE = 'order_book_update',
  DIVIDEND_DISTRIBUTED = 'dividend_distributed',
  PORTFOLIO_UPDATE = 'portfolio_update',
}

export interface PriceUpdatePayload {
  companyId: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface OrderMatchedPayload {
  orderId: string;
  companyId: string;
  quantity: number;
  price: number;
  side: OrderSide;
}

export interface NewTradePayload {
  tradeId: string;
  companyId: string;
  quantity: number;
  price: number;
  totalAmount: number;
}

export interface DividendDistributedPayload {
  dividendId: string;
  companyId: string;
  companyName: string;
  amount: number;
  sharesHeld: number;
  payoutAmount: number;
  distributedAt: Date;
}
