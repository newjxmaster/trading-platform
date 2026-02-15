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
}

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
