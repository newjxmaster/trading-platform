/**
 * Payment Types - Trading Platform
 * Type definitions for payment processing, wallets, and transactions
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum PaymentMethod {
  WAVE = 'wave',
  ORANGE_MONEY = 'orange_money',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  CRYPTO = 'crypto'
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  DIVIDEND = 'dividend',
  TRADE = 'trade',
  FEE = 'fee'
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum CryptoCurrency {
  USDT = 'USDT',
  USDC = 'USDC',
  BTC = 'BTC',
  ETH = 'ETH'
}

export enum FiatCurrency {
  USD = 'USD',
  XOF = 'XOF'
}

export enum WithdrawalMethod {
  WAVE = 'wave',
  ORANGE_MONEY = 'orange_money',
  BANK_TRANSFER = 'bank_transfer',
  CRYPTO = 'crypto',
  WALLET = 'wallet'
}

// ============================================================================
// INTERFACES - REQUESTS
// ============================================================================

export interface WaveDepositRequest {
  amount: number;
  currency: FiatCurrency.XOF | FiatCurrency.USD;
  phone: string;
  userId: string;
}

export interface OrangeMoneyDepositRequest {
  amount: number;
  currency: FiatCurrency.XOF | FiatCurrency.USD;
  phone: string;
  userId: string;
}

export interface CardDepositRequest {
  amount: number;
  currency: FiatCurrency.USD;
  userId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CryptoDepositRequest {
  amount: number;
  currency: CryptoCurrency;
  userId: string;
}

export interface WithdrawalRequest {
  userId: string;
  amount: number;
  currency: FiatCurrency | CryptoCurrency;
  method: WithdrawalMethod;
  // Method-specific details
  phone?: string; // For Wave/Orange
  bankAccount?: {
    accountNumber: string;
    bankName: string;
    accountName: string;
  }; // For bank transfer
  cryptoAddress?: string; // For crypto withdrawal
  cryptoCurrency?: CryptoCurrency;
}

// ============================================================================
// INTERFACES - RESPONSES
// ============================================================================

export interface WaveDepositResponse {
  transactionId: string;
  paymentUrl?: string;
  status: TransactionStatus;
  reference: string;
  amount: number;
  currency: string;
  phone: string;
  expiresAt?: Date;
}

export interface OrangeMoneyDepositResponse {
  transactionId: string;
  paymentUrl?: string;
  status: TransactionStatus;
  reference: string;
  amount: number;
  currency: string;
  phone: string;
  expiresAt?: Date;
}

export interface CardDepositResponse {
  transactionId: string;
  checkoutUrl: string;
  sessionId: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
}

export interface CryptoDepositResponse {
  transactionId: string;
  depositAddress: string;
  qrCode: string;
  network: string;
  currency: CryptoCurrency;
  amount: number;
  expiresAt: Date;
  memo?: string; // For certain tokens
}

export interface WithdrawalResponse {
  withdrawalId: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
  method: WithdrawalMethod;
  estimatedArrival?: Date;
  reference: string;
  fee: number;
}

// ============================================================================
// INTERFACES - WEBHOOKS
// ============================================================================

export interface WaveWebhookPayload {
  transaction_id: string;
  reference: string;
  status: 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  phone: string;
  timestamp: string;
  signature: string;
}

export interface OrangeMoneyWebhookPayload {
  transaction_id: string;
  reference: string;
  status: 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  phone: string;
  timestamp: string;
  signature: string;
}

export interface StripeWebhookPayload {
  id: string;
  object: string;
  type: string;
  data: {
    object: {
      id: string;
      status: string;
      amount: number;
      currency: string;
      metadata: {
        userId: string;
        transactionId: string;
      };
      payment_intent?: string;
      customer?: string;
    };
  };
}

export interface CryptoTransactionEvent {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  currency: CryptoCurrency;
  blockNumber: number;
  confirmations: number;
  timestamp: number;
}

// ============================================================================
// INTERFACES - WALLET & TRANSACTIONS
// ============================================================================

export interface WalletBalance {
  userId: string;
  fiat: {
    USD: number;
    XOF: number;
  };
  crypto: {
    USDT: number;
    USDC: number;
    BTC: number;
    ETH: number;
  };
}

export interface Transaction {
  id: string;
  userId: string;
  transactionType: TransactionType;
  paymentMethod: PaymentMethod;
  amount: number;
  currency: FiatCurrency | CryptoCurrency;
  status: TransactionStatus;
  referenceId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionHistoryFilters {
  userId?: string;
  transactionType?: TransactionType;
  paymentMethod?: PaymentMethod;
  status?: TransactionStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// INTERFACES - SERVICES
// ============================================================================

export interface WalletCreditRequest {
  userId: string;
  amount: number;
  currency: FiatCurrency | CryptoCurrency;
  transactionType: TransactionType;
  referenceId: string;
  metadata?: Record<string, any>;
}

export interface WalletDebitRequest {
  userId: string;
  amount: number;
  currency: FiatCurrency | CryptoCurrency;
  transactionType: TransactionType;
  referenceId: string;
  metadata?: Record<string, any>;
}

export interface FeeCalculation {
  amount: number;
  feeAmount: number;
  feePercentage: number;
  fixedFee: number;
  netAmount: number;
}

// ============================================================================
// FEE CONFIGURATION
// ============================================================================

export const DEPOSIT_FEES = {
  [PaymentMethod.WAVE]: { percentage: 0.01, fixed: 0 }, // 1%
  [PaymentMethod.ORANGE_MONEY]: { percentage: 0.01, fixed: 0 }, // 1%
  [PaymentMethod.CARD]: { percentage: 0.029, fixed: 0.30 }, // 2.9% + $0.30
  [PaymentMethod.BANK_TRANSFER]: { percentage: 0, fixed: 0 }, // Free
  [PaymentMethod.CRYPTO]: { percentage: 0, fixed: 0 }, // Network fees only
};

export const WITHDRAWAL_FEES = {
  [PaymentMethod.WAVE]: { percentage: 0.01, fixed: 0, min: 100 }, // 1%, min 100 XOF
  [PaymentMethod.ORANGE_MONEY]: { percentage: 0.01, fixed: 0, min: 100 }, // 1%, min 100 XOF
  [PaymentMethod.BANK_TRANSFER]: { percentage: 0, fixed: 5 }, // $5 flat
  [PaymentMethod.CRYPTO]: { percentage: 0, fixed: 0 }, // Network fees
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const CRYPTO_NETWORKS: Record<CryptoCurrency, string> = {
  [CryptoCurrency.USDT]: 'Ethereum (ERC-20)',
  [CryptoCurrency.USDC]: 'Ethereum (ERC-20)',
  [CryptoCurrency.BTC]: 'Bitcoin',
  [CryptoCurrency.ETH]: 'Ethereum',
};

export const CRYPTO_DECIMALS: Record<CryptoCurrency, number> = {
  [CryptoCurrency.USDT]: 6,
  [CryptoCurrency.USDC]: 6,
  [CryptoCurrency.BTC]: 8,
  [CryptoCurrency.ETH]: 18,
};

export const XOF_TO_USD_RATE = 0.0016; // Approximate rate (1 XOF ≈ 0.0016 USD)
export const USD_TO_XOF_RATE = 625; // Approximate rate (1 USD ≈ 625 XOF)
