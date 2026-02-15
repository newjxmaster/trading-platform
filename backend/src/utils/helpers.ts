/**
 * Trading Platform - Helper Utilities
 * Common helper functions for automation processes
 */

import { automationLogger } from './logger';

// ============================================================================
// Number Formatting Helpers
// ============================================================================

/**
 * Round a number to specified decimal places
 */
export function roundToDecimals(value: number, decimals: number = 2): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${roundToDecimals(value * 100, decimals)}%`;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ============================================================================
// Calculation Helpers
// ============================================================================

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return (current - previous) / previous;
}

/**
 * Calculate weighted average
 */
export function calculateWeightedAverage(
  values: Array<{ value: number; weight: number }>
): number {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 0;
  
  const weightedSum = values.reduce((sum, item) => sum + item.value * item.weight, 0);
  return weightedSum / totalWeight;
}

/**
 * Calculate platform fee (5% of net revenue)
 */
export function calculatePlatformFee(netRevenue: number, feeRate: number = 0.05): number {
  return roundToDecimals(netRevenue * feeRate);
}

/**
 * Calculate dividend pool (60% of net profit)
 */
export function calculateDividendPool(netProfit: number, poolRate: number = 0.60): number {
  return roundToDecimals(netProfit * poolRate);
}

/**
 * Calculate reinvestment amount (40% of net profit)
 */
export function calculateReinvestment(netProfit: number, reinvestRate: number = 0.40): number {
  return roundToDecimals(netProfit * reinvestRate);
}

/**
 * Calculate dividend per share
 */
export function calculateDividendPerShare(dividendPool: number, totalShares: number): number {
  if (totalShares === 0) return 0;
  return roundToDecimals(dividendPool / totalShares, 4);
}

/**
 * Calculate shareholder payout
 */
export function calculateShareholderPayout(sharesOwned: number, dividendPerShare: number): number {
  return roundToDecimals(sharesOwned * dividendPerShare);
}

// ============================================================================
// Stock Price Calculation Helpers
// ============================================================================

/**
 * Calculate performance score based on multiple factors
 * Formula: (revenueGrowth * 0.4) + (profitMargin * 0.3) + (volumeScore * 0.2) + (dividendScore * 0.1)
 */
export function calculatePerformanceScore(factors: {
  revenueGrowth: number;
  profitMargin: number;
  volumeScore: number;
  dividendScore: number;
}): number {
  const weights = {
    revenueGrowth: 0.4,
    profitMargin: 0.3,
    volumeScore: 0.2,
    dividendScore: 0.1,
  };

  const score = 
    factors.revenueGrowth * weights.revenueGrowth +
    factors.profitMargin * weights.profitMargin +
    factors.volumeScore * weights.volumeScore +
    factors.dividendScore * weights.dividendScore;

  return roundToDecimals(score, 4);
}

/**
 * Calculate new stock price based on performance score
 * Caps at ±20% change per month
 */
export function calculateNewStockPrice(
  currentPrice: number,
  performanceScore: number,
  maxChangePercent: number = 0.20
): { newPrice: number; capped: boolean } {
  let newPrice = currentPrice * (1 + performanceScore);
  
  const maxIncrease = currentPrice * (1 + maxChangePercent);
  const maxDecrease = currentPrice * (1 - maxChangePercent);
  
  const capped = newPrice > maxIncrease || newPrice < maxDecrease;
  newPrice = clamp(newPrice, maxDecrease, maxIncrease);
  
  return {
    newPrice: roundToDecimals(newPrice),
    capped,
  };
}

/**
 * Calculate volume score (capped at 20%)
 */
export function calculateVolumeScore(tradingVolume: number, totalShares: number): number {
  if (totalShares === 0) return 0;
  const rawScore = tradingVolume / totalShares;
  return clamp(rawScore, 0, 0.2);
}

/**
 * Calculate dividend score based on consistency (capped at 10%)
 */
export function calculateDividendScore(dividendCount: number, monthsToCheck: number = 3): number {
  const rawScore = dividendCount / monthsToCheck;
  return clamp(rawScore, 0, 0.1);
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that a value is a positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value) && value >= 0;
}

/**
 * Validate that a value is a valid percentage (0-1)
 */
export function isValidPercentage(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 1;
}

/**
 * Validate UUID format
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// ============================================================================
// Date Helpers
// ============================================================================

/**
 * Get start of day
 */
export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 */
export function endOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Format date for logging
 */
export function formatDateForLog(date: Date): string {
  return date.toISOString();
}

// ============================================================================
// Async Helpers
// ============================================================================

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute promises with concurrency limit
 */
export async function withConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = processor(item).then(result => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= limit) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }

  await Promise.all(executing);
  return results;
}

// ============================================================================
// Error Helpers
// ============================================================================

/**
 * Create a standardized error object
 */
export function createError(
  message: string,
  code: string,
  details?: Record<string, unknown>
): Error {
  const error = new Error(message) as Error & { code: string; details?: Record<string, unknown> };
  error.code = code;
  error.details = details;
  return error;
}

/**
 * Safely parse JSON
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

// ============================================================================
// Result Helpers
// ============================================================================

export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

/**
 * Create a success result
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Create a failure result
 */
export function failure<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

// ============================================================================
// Logging Helpers
// ============================================================================

/**
 * Log job start
 */
export function logJobStart(jobName: string, metadata?: Record<string, unknown>): void {
  automationLogger.info(`[JOB START] ${jobName}`, {
    ...metadata,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log job completion
 */
export function logJobComplete(
  jobName: string,
  durationMs: number,
  metadata?: Record<string, unknown>
): void {
  automationLogger.info(`[JOB COMPLETE] ${jobName}`, {
    ...metadata,
    durationMs,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log job error
 */
export function logJobError(
  jobName: string,
  error: Error,
  durationMs: number,
  metadata?: Record<string, unknown>
): void {
  automationLogger.error(`[JOB FAILED] ${jobName}`, error, {
    ...metadata,
    durationMs,
    timestamp: new Date().toISOString(),
  });
}
