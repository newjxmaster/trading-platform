/**
 * Trading Platform - Logger Utility
 * Comprehensive logging system for automation and cron jobs
 */

import { LogLevel, LogEntry } from '../types';

class Logger {
  private context: string;
  private static logHistory: LogEntry[] = [];
  private static maxHistorySize = 1000;

  constructor(context: string = 'default') {
    this.context = context;
  }

  /**
   * Create a child logger with a sub-context
   */
  child(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`);
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', message, metadata);
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, metadata);
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, metadata);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log('error', message, metadata, error);
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error
  ): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: this.context,
      metadata,
      error,
    };

    // Add to history
    Logger.logHistory.push(entry);
    if (Logger.logHistory.length > Logger.maxHistorySize) {
      Logger.logHistory.shift();
    }

    // Format and output
    const formattedMessage = this.formatLogEntry(entry);
    
    switch (level) {
      case 'debug':
        if (process.env.NODE_ENV !== 'production') {
          console.debug(formattedMessage);
        }
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        if (error?.stack) {
          console.error(error.stack);
        }
        break;
    }
  }

  /**
   * Format a log entry for output
   */
  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const metadataStr = entry.metadata 
      ? ` | ${JSON.stringify(entry.metadata)}` 
      : '';
    const errorStr = entry.error 
      ? ` | Error: ${entry.error.message}` 
      : '';
    
    return `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.context}] ${entry.message}${metadataStr}${errorStr}`;
  }

  /**
   * Get log history
   */
  static getHistory(level?: LogLevel, limit: number = 100): LogEntry[] {
    let history = Logger.logHistory;
    
    if (level) {
      history = history.filter(entry => entry.level === level);
    }
    
    return history.slice(-limit);
  }

  /**
   * Clear log history
   */
  static clearHistory(): void {
    Logger.logHistory = [];
  }

  /**
   * Create a logger instance for a specific context
   */
  static forContext(context: string): Logger {
    return new Logger(context);
  }

  // Static methods for direct usage - flexible signatures for compatibility
  static debug(message: string, metadata?: Record<string, unknown> | string): void {
    const meta = typeof metadata === 'string' ? { context: metadata } : metadata;
    defaultLogger.debug(message, meta);
  }

  static info(message: string, metadata?: Record<string, unknown> | string, extra?: Record<string, unknown>): void {
    const meta = typeof metadata === 'string' ? { context: metadata, ...extra } : { ...metadata, ...extra };
    defaultLogger.info(message, meta);
  }

  static warn(message: string, metadata?: Record<string, unknown> | string, extra?: Record<string, unknown>): void {
    const meta = typeof metadata === 'string' ? { context: metadata, ...extra } : { ...metadata, ...extra };
    defaultLogger.warn(message, meta);
  }

  static error(message: string, error?: Error | string, metadata?: Record<string, unknown> | string, extra?: Record<string, unknown>): void {
    let err: Error | undefined;
    let meta: Record<string, unknown> | undefined;
    
    if (error instanceof Error) {
      err = error;
      meta = typeof metadata === 'string' ? { context: metadata, ...extra } : { ...metadata, ...extra };
    } else if (typeof error === 'string') {
      err = new Error(error);
      meta = typeof metadata === 'string' ? { context: metadata, ...extra } : { ...metadata, ...extra };
    } else {
      meta = { ...error as Record<string, unknown>, ...metadata as Record<string, unknown>, ...extra };
    }
    
    defaultLogger.error(message, err, meta);
  }

  /**
   * Log a payment transaction
   */
  static logPayment(
    method: string,
    amount: number,
    status: 'success' | 'failed' | 'pending',
    metadata?: Record<string, unknown>
  ): void {
    const message = `Payment ${status} - Method: ${method}, Amount: ${amount}`;
    if (status === 'failed') {
      defaultLogger.error(message, undefined, metadata);
    } else {
      defaultLogger.info(message, metadata);
    }
  }

  /**
   * Log a webhook event
   */
  static logWebhook(
    provider: string,
    eventType: string,
    payload: Record<string, unknown>
  ): void {
    defaultLogger.info(`Webhook received from ${provider} - Event: ${eventType}`, {
      provider,
      eventType,
      payload,
    });
  }

  /**
   * Log wallet operations
   */
  static logWallet(
    userId: string,
    operation: 'credit' | 'debit',
    amount: number,
    currency: string,
    metadata?: Record<string, unknown>
  ): void {
    defaultLogger.info(`Wallet ${operation} - User: ${userId}, Amount: ${amount} ${currency}`, {
      userId,
      operation,
      amount,
      currency,
      ...metadata,
    });
  }

  /**
   * Log transaction status changes
   */
  static logTransaction(
    transactionId: string,
    status: string,
    metadata?: Record<string, unknown>
  ): void {
    defaultLogger.info(`Transaction ${transactionId} status changed to ${status}`, {
      transactionId,
      status,
      ...metadata,
    });
  }
}

// Default logger instance for static methods
const defaultLogger = Logger.forContext('default');

// ============================================================================
// Pre-configured Loggers for Different Modules
// ============================================================================

export const automationLogger = Logger.forContext('automation');
export const revenueLogger = Logger.forContext('automation:revenue');
export const dividendLogger = Logger.forContext('automation:dividend');
export const priceLogger = Logger.forContext('automation:price');
export const queueLogger = Logger.forContext('queue');
export const schedulerLogger = Logger.forContext('scheduler');
export const dbLogger = Logger.forContext('database');

export default Logger;
