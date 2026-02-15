/**
 * Custom Error Classes - Trading Platform
 * Standardized error handling for payment and wallet operations
 */

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;

  constructor(message: string, statusCode: number, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

// Payment-specific errors
export class PaymentError extends AppError {
  public paymentMethod?: string;
  public transactionId?: string;

  constructor(message: string, paymentMethod?: string, transactionId?: string) {
    super(message, 400, 'PAYMENT_ERROR');
    this.paymentMethod = paymentMethod;
    this.transactionId = transactionId;
  }
}

export class InsufficientFundsError extends AppError {
  constructor(message: string = 'Insufficient funds') {
    super(message, 400, 'INSUFFICIENT_FUNDS');
  }
}

export class PaymentProcessingError extends AppError {
  constructor(message: string = 'Payment processing failed') {
    super(message, 502, 'PAYMENT_PROCESSING_ERROR');
  }
}

export class WebhookError extends AppError {
  constructor(message: string = 'Webhook processing failed') {
    super(message, 400, 'WEBHOOK_ERROR');
  }
}

export class InvalidSignatureError extends AppError {
  constructor(message: string = 'Invalid webhook signature') {
    super(message, 401, 'INVALID_SIGNATURE');
  }
}

// Wallet-specific errors
export class WalletError extends AppError {
  constructor(message: string) {
    super(message, 400, 'WALLET_ERROR');
  }
}

export class TransactionError extends AppError {
  constructor(message: string) {
    super(message, 400, 'TRANSACTION_ERROR');
  }
}

// Crypto-specific errors
export class CryptoError extends AppError {
  constructor(message: string) {
    super(message, 400, 'CRYPTO_ERROR');
  }
}

export class InvalidAddressError extends AppError {
  constructor(message: string = 'Invalid cryptocurrency address') {
    super(message, 400, 'INVALID_ADDRESS');
  }
}

// Rate limiting
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}
