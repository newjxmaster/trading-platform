/**
 * Trading Types Module
 * 
 * Defines all TypeScript interfaces and types for the trading engine:
 * - Order types (market/limit, buy/sell)
 * - Trade execution records
 * - Portfolio holdings
 * - Price history for charts
 */

// ============================================================================
// ENUM TYPES
// ============================================================================

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit'
}

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell'
}

export enum OrderStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export enum TradeStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// ============================================================================
// ORDER INTERFACES
// ============================================================================

/**
 * Order entity representing a buy or sell order in the order book
 */
export interface Order {
  id: string;
  userId: string;
  companyId: string;
  orderType: OrderType;
  side: OrderSide;
  quantity: number;
  price: number | null; // null for market orders
  filledQuantity: number;
  remainingQuantity: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null; // For limit orders
  
  // Joined fields (optional)
  user?: UserInfo;
  company?: CompanyInfo;
}

/**
 * Simplified order info for order book display
 */
export interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
  orderCount: number;
}

/**
 * Order book structure for a company
 */
export interface OrderBook {
  companyId: string;
  companyName: string;
  currentPrice: number;
  buyOrders: OrderBookEntry[];
  sellOrders: OrderBookEntry[];
  lastUpdated: Date;
}

// ============================================================================
// TRADE INTERFACES
// ============================================================================

/**
 * Trade entity representing an executed transaction
 */
export interface Trade {
  id: string;
  buyOrderId: string;
  sellOrderId: string;
  buyerId: string;
  sellerId: string;
  companyId: string;
  quantity: number;
  price: number;
  totalAmount: number;
  platformFee: number; // 0.5% trading fee
  buyerFee: number;
  sellerFee: number;
  executedAt: Date;
  
  // Joined fields (optional)
  buyer?: UserInfo;
  seller?: UserInfo;
  company?: CompanyInfo;
  buyOrder?: Order;
  sellOrder?: Order;
}

/**
 * Trade execution result
 */
export interface TradeExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  filledQuantity: number;
  remainingQuantity: number;
}

// ============================================================================
// PORTFOLIO INTERFACES
// ============================================================================

/**
 * Stock holding entity representing user's ownership in a company
 */
export interface Holding {
  id: string;
  userId: string;
  companyId: string;
  sharesOwned: number;
  averageBuyPrice: number;
  totalInvested: number;
  totalDividendsEarned: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Joined fields (optional)
  user?: UserInfo;
  company?: CompanyInfo;
  
  // Calculated fields (optional)
  currentValue?: number;
  profitLoss?: number;
  profitLossPercentage?: number;
}

/**
 * Portfolio summary for a user
 */
export interface Portfolio {
  userId: string;
  totalValue: number;
  totalInvested: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
  totalDividendsEarned: number;
  holdings: Holding[];
  lastUpdated: Date;
}

/**
 * Portfolio performance metrics
 */
export interface PortfolioPerformance {
  totalValue: number;
  totalCost: number;
  totalReturn: number;
  totalReturnPercentage: number;
  dayChange: number;
  dayChangePercentage: number;
  bestPerformer: HoldingPerformance | null;
  worstPerformer: HoldingPerformance | null;
}

export interface HoldingPerformance {
  companyId: string;
  companyName: string;
  sharesOwned: number;
  currentPrice: number;
  averageBuyPrice: number;
  profitLoss: number;
  profitLossPercentage: number;
}

// ============================================================================
// PRICE HISTORY INTERFACES
// ============================================================================

/**
 * Price history entry for charting
 */
export interface PriceHistory {
  id: string;
  companyId: string;
  price: number;
  volume: number;
  timestamp: Date;
  
  // OHLC data for candlestick charts (optional)
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

/**
 * Price update event data
 */
export interface PriceUpdate {
  companyId: string;
  companyName: string;
  oldPrice: number;
  newPrice: number;
  change: number;
  changePercentage: number;
  volume: number;
  timestamp: Date;
}

/**
 * Timeframe for price history queries
 */
export enum PriceTimeframe {
  ONE_HOUR = '1h',
  ONE_DAY = '1d',
  ONE_WEEK = '1w',
  ONE_MONTH = '1m',
  THREE_MONTHS = '3m',
  SIX_MONTHS = '6m',
  ONE_YEAR = '1y',
  ALL = 'all'
}

// ============================================================================
// DIVIDEND INTERFACES
// ============================================================================

/**
 * Dividend distribution record
 */
export interface Dividend {
  id: string;
  companyId: string;
  revenueReportId: string;
  totalDividendPool: number;
  totalSharesEligible: number;
  amountPerShare: number;
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed';
  distributionDate: Date | null;
  createdAt: Date;
}

/**
 * Individual dividend payout
 */
export interface DividendPayout {
  id: string;
  dividendId: string;
  userId: string;
  sharesHeld: number;
  payoutAmount: number;
  paymentMethod: 'wave' | 'orange_money' | 'bank_transfer' | 'wallet';
  paymentReference: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paidAt: Date | null;
  createdAt: Date;
}

// ============================================================================
// SUPPORTING INTERFACES
// ============================================================================

/**
 * Minimal user info for joins
 */
export interface UserInfo {
  id: string;
  email: string;
  fullName: string;
}

/**
 * Minimal company info for joins
 */
export interface CompanyInfo {
  id: string;
  businessName: string;
  businessType: string;
  category: string;
  currentPrice: number;
  totalShares: number;
  availableShares: number;
  listingStatus: string;
}

// ============================================================================
// REQUEST/RESPONSE DTOs
// ============================================================================

/**
 * Create order request DTO
 */
export interface CreateOrderRequest {
  companyId: string;
  orderType: OrderType;
  side: OrderSide;
  quantity: number;
  price?: number; // Required for limit orders
  expiresAt?: string; // ISO date string for limit orders
}

/**
 * Order response DTO
 */
export interface OrderResponse {
  id: string;
  companyId: string;
  companyName: string;
  orderType: OrderType;
  side: OrderSide;
  quantity: number;
  price: number | null;
  filledQuantity: number;
  remainingQuantity: number;
  status: OrderStatus;
  totalAmount: number;
  platformFee: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

/**
 * Trade history filter DTO
 */
export interface TradeHistoryFilter {
  companyId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// WEBSOCKET EVENT INTERFACES
// ============================================================================

/**
 * WebSocket event types for trading
 */
export enum TradingEventType {
  PRICE_UPDATE = 'price_update',
  ORDER_MATCHED = 'order_matched',
  NEW_TRADE = 'new_trade',
  ORDER_BOOK_UPDATE = 'order_book_update',
  DIVIDEND_DISTRIBUTED = 'dividend_distributed',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_PLACED = 'order_placed'
}

/**
 * Price update WebSocket event
 */
export interface PriceUpdateEvent {
  type: TradingEventType.PRICE_UPDATE;
  data: PriceUpdate;
}

/**
 * Order matched WebSocket event
 */
export interface OrderMatchedEvent {
  type: TradingEventType.ORDER_MATCHED;
  data: {
    orderId: string;
    tradeId: string;
    companyId: string;
    companyName: string;
    side: OrderSide;
    filledQuantity: number;
    price: number;
    totalAmount: number;
    timestamp: Date;
  };
}

/**
 * New trade WebSocket event
 */
export interface NewTradeEvent {
  type: TradingEventType.NEW_TRADE;
  data: {
    tradeId: string;
    companyId: string;
    companyName: string;
    quantity: number;
    price: number;
    totalAmount: number;
    executedAt: Date;
  };
}

/**
 * Order book update WebSocket event
 */
export interface OrderBookUpdateEvent {
  type: TradingEventType.ORDER_BOOK_UPDATE;
  data: {
    companyId: string;
    buyOrders: OrderBookEntry[];
    sellOrders: OrderBookEntry[];
    timestamp: Date;
  };
}

/**
 * Dividend distributed WebSocket event
 */
export interface DividendDistributedEvent {
  type: TradingEventType.DIVIDEND_DISTRIBUTED;
  data: {
    dividendId: string;
    companyId: string;
    companyName: string;
    amount: number;
    sharesHeld: number;
    payoutAmount: number;
    distributedAt: Date;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Trading error codes
 */
export enum TradingErrorCode {
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INSUFFICIENT_SHARES = 'INSUFFICIENT_SHARES',
  INVALID_ORDER_TYPE = 'INVALID_ORDER_TYPE',
  INVALID_PRICE = 'INVALID_PRICE',
  INVALID_QUANTITY = 'INVALID_QUANTITY',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  ORDER_ALREADY_FILLED = 'ORDER_ALREADY_FILLED',
  ORDER_ALREADY_CANCELLED = 'ORDER_ALREADY_CANCELLED',
  COMPANY_NOT_FOUND = 'COMPANY_NOT_FOUND',
  COMPANY_NOT_ACTIVE = 'COMPANY_NOT_ACTIVE',
  MARKET_CLOSED = 'MARKET_CLOSED',
  PRICE_OUT_OF_RANGE = 'PRICE_OUT_OF_RANGE',
  TRADE_EXECUTION_FAILED = 'TRADE_EXECUTION_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * Trading error
 */
export interface TradingError {
  code: TradingErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Trading engine configuration
 */
export interface TradingConfig {
  platformFeePercentage: number; // 0.5% = 0.005
  minOrderQuantity: number;
  maxOrderQuantity: number;
  minPriceIncrement: number;
  maxPriceDeviation: number; // Max % price can deviate from market
  orderExpiryDays: number; // Default expiry for limit orders
  enableMarketOrders: boolean;
  enableLimitOrders: boolean;
}

// Default trading configuration
export const DEFAULT_TRADING_CONFIG: TradingConfig = {
  platformFeePercentage: 0.005, // 0.5%
  minOrderQuantity: 1,
  maxOrderQuantity: 1000000,
  minPriceIncrement: 0.01,
  maxPriceDeviation: 0.20, // 20%
  orderExpiryDays: 30,
  enableMarketOrders: true,
  enableLimitOrders: true
};
