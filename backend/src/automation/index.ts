/**
 * Trading Platform - Automation Module Index
 * 
 * Centralized exports for all automation modules.
 * Provides a unified interface for revenue calculation,
 * dividend distribution, and stock price adjustment.
 */

// ============================================================================
// Revenue Calculation
// ============================================================================

export {
  executeRevenueCalculation,
  manuallyCalculateRevenue,
  revenueCalculationConfig,
  type BankApiClient,
} from './revenueCalculation';

// ============================================================================
// Dividend Distribution
// ============================================================================

export {
  executeDividendDistribution,
  manuallyDistributeDividend,
  dividendDistributionConfig,
  type NotificationService,
} from './dividendDistribution';

// ============================================================================
// Stock Price Adjustment
// ============================================================================

export {
  executeStockPriceAdjustment,
  manuallyAdjustStockPrice,
  stockPriceAdjustmentConfig,
  type WebSocketService,
} from './stockPriceAdjustment';

// ============================================================================
// Automation Configuration
// ============================================================================

export interface AutomationConfig {
  revenueCalculation: {
    enabled: boolean;
    cronExpression: string;
    platformFeeRate: number;
    dividendPoolRate: number;
    reinvestmentRate: number;
  };
  dividendDistribution: {
    enabled: boolean;
    cronExpression: string;
    batchSize: number;
    minimumPayoutAmount: number;
  };
  stockPriceAdjustment: {
    enabled: boolean;
    cronExpression: string;
    maxPriceChangePercent: number;
    weights: {
      revenueGrowth: number;
      profitMargin: number;
      volumeScore: number;
      dividendScore: number;
    };
  };
}

/**
 * Default automation configuration
 */
export const defaultAutomationConfig: AutomationConfig = {
  revenueCalculation: {
    enabled: true,
    cronExpression: '0 0 1 * *',  // Midnight on 1st of each month
    platformFeeRate: 0.05,         // 5%
    dividendPoolRate: 0.60,        // 60%
    reinvestmentRate: 0.40,        // 40%
  },
  dividendDistribution: {
    enabled: true,
    cronExpression: '0 2 1 * *',   // 2 AM on 1st of each month
    batchSize: 100,
    minimumPayoutAmount: 0.01,     // $0.01 minimum
  },
  stockPriceAdjustment: {
    enabled: true,
    cronExpression: '0 3 1 * *',   // 3 AM on 1st of each month
    maxPriceChangePercent: 0.20,   // ±20%
    weights: {
      revenueGrowth: 0.4,
      profitMargin: 0.3,
      volumeScore: 0.2,
      dividendScore: 0.1,
    },
  },
};

// ============================================================================
// Automation Health Check
// ============================================================================

import { automationLogger as logger } from '../utils/logger';

export interface AutomationHealth {
  revenueCalculation: {
    lastRun?: Date;
    lastSuccess?: Date;
    lastError?: Date;
    successCount: number;
    errorCount: number;
    healthy: boolean;
  };
  dividendDistribution: {
    lastRun?: Date;
    lastSuccess?: Date;
    lastError?: Date;
    successCount: number;
    errorCount: number;
    healthy: boolean;
  };
  stockPriceAdjustment: {
    lastRun?: Date;
    lastSuccess?: Date;
    lastError?: Date;
    successCount: number;
    errorCount: number;
    healthy: boolean;
  };
  overall: boolean;
}

/**
 * Get automation health status
 * Note: This is a placeholder - actual implementation would track job execution history
 */
export function getAutomationHealth(): AutomationHealth {
  // In a real implementation, this would read from a database or cache
  // that tracks job execution history
  
  return {
    revenueCalculation: {
      successCount: 0,
      errorCount: 0,
      healthy: true,
    },
    dividendDistribution: {
      successCount: 0,
      errorCount: 0,
      healthy: true,
    },
    stockPriceAdjustment: {
      successCount: 0,
      errorCount: 0,
      healthy: true,
    },
    overall: true,
  };
}

// ============================================================================
// Manual Job Execution
// ============================================================================

import { DatabaseClient } from '../types';

export interface ManualExecutionOptions {
  month?: number;
  year?: number;
  companyId?: string;
  revenueReportId?: string;
}

/**
 * Manually execute a specific automation job
 */
export async function executeManualJob(
  jobType: 'revenue' | 'dividend' | 'price',
  db: DatabaseClient,
  dependencies: {
    bankApiClient: {
      fetchTransactions: (accountNumber: string, startDate: Date, endDate: Date) => Promise<unknown[]>;
    };
    notificationService?: {
      sendDividendNotification: (userId: string, companyName: string, amount: number, sharesOwned: number) => Promise<void>;
    };
    websocketService?: {
      broadcastPriceUpdate: (companyId: string, newPrice: number, oldPrice: number, changePercent: number) => Promise<void>;
    };
  },
  options: ManualExecutionOptions = {}
): Promise<unknown> {
  const now = new Date();
  const month = options.month ?? now.getMonth();
  const year = options.year ?? now.getFullYear();

  logger.info(`Manual job execution requested`, { jobType, month, year, options });

  switch (jobType) {
    case 'revenue':
      if (!options.companyId) {
        throw new Error('companyId is required for revenue calculation');
      }
      const { manuallyCalculateRevenue } = await import('./revenueCalculation');
      return manuallyCalculateRevenue(db, dependencies.bankApiClient, options.companyId, month, year);

    case 'dividend':
      if (!options.revenueReportId) {
        throw new Error('revenueReportId is required for dividend distribution');
      }
      const { manuallyDistributeDividend } = await import('./dividendDistribution');
      return manuallyDistributeDividend(db, options.revenueReportId, dependencies.notificationService);

    case 'price':
      if (!options.companyId) {
        throw new Error('companyId is required for price adjustment');
      }
      const { manuallyAdjustStockPrice } = await import('./stockPriceAdjustment');
      return manuallyAdjustStockPrice(
        db, 
        options.companyId, 
        month, 
        year, 
        dependencies.websocketService
      );

    default:
      throw new Error(`Unknown job type: ${jobType}`);
  }
}
