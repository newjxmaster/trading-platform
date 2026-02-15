/**
 * Portfolio Service
 * 
 * Manages user stock holdings, portfolio calculations, and profit/loss tracking.
 * Provides comprehensive portfolio analytics including:
 * - Current holdings with real-time valuations
 * - Profit/loss calculations (realized and unrealized)
 * - Portfolio performance metrics
 * - Dividend earnings tracking
 * 
 * Key Features:
 * - Real-time portfolio valuation using current market prices
 * - Average cost basis tracking for accurate P&L
 * - Performance analytics (best/worst performers)
 * - Transaction history integration
 */

import { PrismaClient } from '@prisma/client';
import {
  Portfolio,
  Holding,
  PortfolioPerformance,
  HoldingPerformance,
  CompanyInfo
} from '../types/trading';

// ============================================================================
// PRISMA CLIENT
// ============================================================================

const prisma = new PrismaClient();

// ============================================================================
// PORTFOLIO RETRIEVAL
// ============================================================================

/**
 * Get complete portfolio for a user
 * Includes all holdings with current valuations and performance metrics
 * 
 * @param userId - User ID to get portfolio for
 * @returns Complete portfolio with holdings and summary
 */
export async function getPortfolio(userId: string): Promise<Portfolio> {
  console.log(`[PortfolioService] Getting portfolio for user ${userId}`);

  // Get all holdings with company info
  const holdingsData = await prisma.stockHolding.findMany({
    where: { userId },
    include: {
      company: {
        select: {
          id: true,
          businessName: true,
          businessType: true,
          category: true,
          currentPrice: true,
          totalShares: true,
          availableShares: true,
          listingStatus: true
        }
      }
    }
  });

  // Filter out holdings with 0 shares and calculate valuations
  const holdings: Holding[] = holdingsData
    .filter(h => h.sharesOwned > 0)
    .map(h => calculateHoldingMetrics(h));

  // Calculate portfolio summary
  const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
  const totalInvested = holdings.reduce((sum, h) => h.totalInvested, 0);
  const totalDividendsEarned = holdings.reduce((sum, h) => h.totalDividendsEarned, 0);
  const totalProfitLoss = totalValue - totalInvested;
  const totalProfitLossPercentage = totalInvested > 0 
    ? (totalProfitLoss / totalInvested) * 100 
    : 0;

  const portfolio: Portfolio = {
    userId,
    totalValue,
    totalInvested,
    totalProfitLoss,
    totalProfitLossPercentage,
    totalDividendsEarned,
    holdings,
    lastUpdated: new Date()
  };

  console.log(`[PortfolioService] Portfolio retrieved: ${holdings.length} holdings, total value: $${totalValue}`);

  return portfolio;
}

/**
 * Get a specific holding for a user
 * 
 * @param userId - User ID
 * @param companyId - Company ID
 * @returns Holding details or null if not found
 */
export async function getHolding(
  userId: string, 
  companyId: string
): Promise<Holding | null> {
  console.log(`[PortfolioService] Getting holding for user ${userId}, company ${companyId}`);

  const holding = await prisma.stockHolding.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId
      }
    },
    include: {
      company: {
        select: {
          id: true,
          businessName: true,
          businessType: true,
          category: true,
          currentPrice: true,
          totalShares: true,
          availableShares: true,
          listingStatus: true
        }
      }
    }
  });

  if (!holding || holding.sharesOwned === 0) {
    return null;
  }

  return calculateHoldingMetrics(holding);
}

/**
 * Get all holdings for a user (simplified version)
 * 
 * @param userId - User ID
 * @returns Array of holdings
 */
export async function getHoldings(userId: string): Promise<Holding[]> {
  const portfolio = await getPortfolio(userId);
  return portfolio.holdings;
}

// ============================================================================
// HOLDING MANAGEMENT
// ============================================================================

/**
 * Update or create a holding after a trade
 * This is typically called by the order matching service
 * 
 * @param userId - User ID
 * @param companyId - Company ID
 * @param sharesDelta - Change in shares (positive for buy, negative for sell)
 * @param price - Trade price
 * @param totalAmount - Total trade amount
 * @returns Updated holding
 */
export async function updateHolding(
  userId: string,
  companyId: string,
  sharesDelta: number,
  price: number,
  totalAmount: number
): Promise<Holding> {
  console.log(`[PortfolioService] Updating holding: user=${userId}, company=${companyId}, delta=${sharesDelta}, price=$${price}`);

  const existingHolding = await prisma.stockHolding.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId
      }
    },
    include: {
      company: {
        select: {
          id: true,
          businessName: true,
          businessType: true,
          category: true,
          currentPrice: true,
          totalShares: true,
          availableShares: true,
          listingStatus: true
        }
      }
    }
  });

  if (existingHolding) {
    // Update existing holding
    const currentShares = existingHolding.sharesOwned;
    const currentInvested = existingHolding.totalInvested;
    const newShares = currentShares + sharesDelta;

    if (newShares < 0) {
      throw new Error(`Insufficient shares to sell. Have: ${currentShares}, Selling: ${Math.abs(sharesDelta)}`);
    }

    let newAveragePrice: number;
    let newTotalInvested: number;

    if (sharesDelta > 0) {
      // Buying more shares - update average price
      newTotalInvested = currentInvested + totalAmount;
      newAveragePrice = newTotalInvested / newShares;
    } else {
      // Selling shares - reduce invested proportionally
      const sellRatio = Math.abs(sharesDelta) / currentShares;
      newTotalInvested = currentInvested * (1 - sellRatio);
      newAveragePrice = newShares > 0 ? newTotalInvested / newShares : 0;
    }

    const updatedHolding = await prisma.stockHolding.update({
      where: { id: existingHolding.id },
      data: {
        sharesOwned: newShares,
        averageBuyPrice: newAveragePrice,
        totalInvested: newTotalInvested
      },
      include: {
        company: {
          select: {
            id: true,
            businessName: true,
            businessType: true,
            category: true,
            currentPrice: true,
            totalShares: true,
            availableShares: true,
            listingStatus: true
          }
        }
      }
    });

    console.log(`[PortfolioService] Holding updated: ${newShares} shares @ $${newAveragePrice}`);
    return calculateHoldingMetrics(updatedHolding);
  } else {
    // Create new holding (must be a buy)
    if (sharesDelta <= 0) {
      throw new Error('Cannot create new holding with sell transaction');
    }

    const newHolding = await prisma.stockHolding.create({
      data: {
        userId,
        companyId,
        sharesOwned: sharesDelta,
        averageBuyPrice: price,
        totalInvested: totalAmount,
        totalDividendsEarned: 0
      },
      include: {
        company: {
          select: {
            id: true,
            businessName: true,
            businessType: true,
            category: true,
            currentPrice: true,
            totalShares: true,
            availableShares: true,
            listingStatus: true
          }
        }
      }
    });

    console.log(`[PortfolioService] New holding created: ${sharesDelta} shares @ $${price}`);
    return calculateHoldingMetrics(newHolding);
  }
}

/**
 * Add dividend earnings to a holding
 * 
 * @param userId - User ID
 * @param companyId - Company ID
 * @param dividendAmount - Dividend amount received
 * @returns Updated holding
 */
export async function addDividendEarnings(
  userId: string,
  companyId: string,
  dividendAmount: number
): Promise<Holding> {
  console.log(`[PortfolioService] Adding dividend $${dividendAmount} to holding: user=${userId}, company=${companyId}`);

  const holding = await prisma.stockHolding.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId
      }
    }
  });

  if (!holding) {
    throw new Error(`Holding not found for user ${userId} and company ${companyId}`);
  }

  const updatedHolding = await prisma.stockHolding.update({
    where: { id: holding.id },
    data: {
      totalDividendsEarned: { increment: dividendAmount }
    },
    include: {
      company: {
        select: {
          id: true,
          businessName: true,
          businessType: true,
          category: true,
          currentPrice: true,
          totalShares: true,
          availableShares: true,
          listingStatus: true
        }
      }
    }
  });

  return calculateHoldingMetrics(updatedHolding);
}

// ============================================================================
// PROFIT/LOSS CALCULATIONS
// ============================================================================

/**
 * Calculate profit/loss for a holding
 * 
 * @param holding - Holding data
 * @returns P&L amount and percentage
 */
export function calculateProfitLoss(holding: Holding): { 
  profitLoss: number; 
  profitLossPercentage: number;
  currentValue: number;
} {
  const currentPrice = holding.company?.currentPrice || holding.averageBuyPrice;
  const currentValue = holding.sharesOwned * currentPrice;
  const costBasis = holding.totalInvested;
  const profitLoss = currentValue - costBasis;
  const profitLossPercentage = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

  return {
    profitLoss,
    profitLossPercentage,
    currentValue
  };
}

/**
 * Calculate comprehensive portfolio performance metrics
 * 
 * @param userId - User ID
 * @returns Portfolio performance metrics
 */
export async function calculatePortfolioPerformance(
  userId: string
): Promise<PortfolioPerformance> {
  console.log(`[PortfolioService] Calculating portfolio performance for user ${userId}`);

  const portfolio = await getPortfolio(userId);
  const holdings = portfolio.holdings;

  if (holdings.length === 0) {
    return {
      totalValue: 0,
      totalCost: 0,
      totalReturn: 0,
      totalReturnPercentage: 0,
      dayChange: 0,
      dayChangePercentage: 0,
      bestPerformer: null,
      worstPerformer: null
    };
  }

  // Calculate totals
  const totalValue = portfolio.totalValue;
  const totalCost = portfolio.totalInvested;
  const totalReturn = totalValue - totalCost;
  const totalReturnPercentage = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

  // Calculate individual holding performances
  const holdingPerformances: HoldingPerformance[] = holdings.map(h => ({
    companyId: h.companyId,
    companyName: h.company?.businessName || 'Unknown',
    sharesOwned: h.sharesOwned,
    currentPrice: h.company?.currentPrice || 0,
    averageBuyPrice: h.averageBuyPrice,
    profitLoss: h.profitLoss || 0,
    profitLossPercentage: h.profitLossPercentage || 0
  }));

  // Find best and worst performers
  const sortedByPerformance = [...holdingPerformances].sort(
    (a, b) => b.profitLossPercentage - a.profitLossPercentage
  );

  const bestPerformer = sortedByPerformance[0] || null;
  const worstPerformer = sortedByPerformance[sortedByPerformance.length - 1] || null;

  // Calculate day change (would need historical data in real implementation)
  // For now, we'll estimate based on recent trades
  const dayChange = await calculateDayChange(userId);
  const dayChangePercentage = totalValue > 0 ? (dayChange / totalValue) * 100 : 0;

  return {
    totalValue,
    totalCost,
    totalReturn,
    totalReturnPercentage,
    dayChange,
    dayChangePercentage,
    bestPerformer,
    worstPerformer
  };
}

/**
 * Calculate realized P&L from completed trades
 * This represents actual profits/losses from closed positions
 * 
 * @param userId - User ID
 * @param companyId - Optional company filter
 * @returns Realized P&L amount
 */
export async function calculateRealizedProfitLoss(
  userId: string,
  companyId?: string
): Promise<number> {
  console.log(`[PortfolioService] Calculating realized P&L for user ${userId}`);

  // Get all sell trades for the user
  const sellTrades = await prisma.trade.findMany({
    where: {
      sellerId: userId,
      ...(companyId && { companyId })
    },
    include: {
      sellOrder: true
    }
  });

  let totalRealizedPnl = 0;

  for (const trade of sellTrades) {
    // Get the corresponding buy trades to calculate cost basis
    // This is simplified - in production you'd use FIFO or average cost method
    const buyTrades = await prisma.trade.findMany({
      where: {
        buyerId: userId,
        companyId: trade.companyId
      },
      orderBy: { executedAt: 'asc' }
    });

    if (buyTrades.length > 0) {
      const avgBuyPrice = buyTrades.reduce((sum, t) => sum + t.price, 0) / buyTrades.length;
      const sellProceeds = trade.totalAmount - trade.platformFee;
      const costBasis = trade.quantity * avgBuyPrice;
      totalRealizedPnl += sellProceeds - costBasis;
    }
  }

  return totalRealizedPnl;
}

/**
 * Calculate unrealized P&L from current holdings
 * This represents paper profits/losses on open positions
 * 
 * @param userId - User ID
 * @returns Unrealized P&L amount
 */
export async function calculateUnrealizedProfitLoss(userId: string): Promise<number> {
  console.log(`[PortfolioService] Calculating unrealized P&L for user ${userId}`);

  const portfolio = await getPortfolio(userId);
  return portfolio.totalProfitLoss;
}

// ============================================================================
// PORTFOLIO ANALYTICS
// ============================================================================

/**
 * Get portfolio diversification analysis
 * Shows allocation across different business types and categories
 * 
 * @param userId - User ID
 * @returns Diversification breakdown
 */
export async function getPortfolioDiversification(userId: string): Promise<{
  byBusinessType: Record<string, { value: number; percentage: number }>;
  byCategory: Record<string, { value: number; percentage: number }>;
}> {
  console.log(`[PortfolioService] Getting diversification for user ${userId}`);

  const portfolio = await getPortfolio(userId);
  const totalValue = portfolio.totalValue;

  const byBusinessType: Record<string, { value: number; percentage: number }> = {};
  const byCategory: Record<string, { value: number; percentage: number }> = {};

  for (const holding of portfolio.holdings) {
    const value = holding.currentValue || 0;
    const businessType = holding.company?.businessType || 'Unknown';
    const category = holding.company?.category || 'Unknown';

    // By business type
    if (!byBusinessType[businessType]) {
      byBusinessType[businessType] = { value: 0, percentage: 0 };
    }
    byBusinessType[businessType].value += value;

    // By category
    if (!byCategory[category]) {
      byCategory[category] = { value: 0, percentage: 0 };
    }
    byCategory[category].value += value;
  }

  // Calculate percentages
  for (const key of Object.keys(byBusinessType)) {
    byBusinessType[key].percentage = totalValue > 0 
      ? (byBusinessType[key].value / totalValue) * 100 
      : 0;
  }

  for (const key of Object.keys(byCategory)) {
    byCategory[key].percentage = totalValue > 0 
      ? (byCategory[key].value / totalValue) * 100 
      : 0;
  }

  return { byBusinessType, byCategory };
}

/**
 * Get dividend history for a user's holdings
 * 
 * @param userId - User ID
 * @returns Dividend history with totals
 */
export async function getDividendHistory(userId: string): Promise<{
  totalReceived: number;
  byCompany: Array<{
    companyId: string;
    companyName: string;
    totalReceived: number;
    payments: number;
  }>;
}> {
  console.log(`[PortfolioService] Getting dividend history for user ${userId}`);

  const payouts = await prisma.dividendPayout.findMany({
    where: {
      userId,
      status: 'completed'
    },
    include: {
      dividend: {
        include: {
          company: {
            select: {
              id: true,
              businessName: true
            }
          }
        }
      }
    },
    orderBy: { paidAt: 'desc' }
  });

  const totalReceived = payouts.reduce((sum, p) => sum + p.payoutAmount, 0);

  // Group by company
  const byCompanyMap = new Map<string, {
    companyId: string;
    companyName: string;
    totalReceived: number;
    payments: number;
  }>();

  for (const payout of payouts) {
    const companyId = payout.dividend.companyId;
    const companyName = payout.dividend.company.businessName;

    if (!byCompanyMap.has(companyId)) {
      byCompanyMap.set(companyId, {
        companyId,
        companyName,
        totalReceived: 0,
        payments: 0
      });
    }

    const companyData = byCompanyMap.get(companyId)!;
    companyData.totalReceived += payout.payoutAmount;
    companyData.payments += 1;
  }

  return {
    totalReceived,
    byCompany: Array.from(byCompanyMap.values())
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate metrics for a holding including current value and P&L
 */
function calculateHoldingMetrics(holding: any): Holding {
  const currentPrice = holding.company?.currentPrice || holding.averageBuyPrice;
  const currentValue = holding.sharesOwned * currentPrice;
  const profitLoss = currentValue - holding.totalInvested;
  const profitLossPercentage = holding.totalInvested > 0 
    ? (profitLoss / holding.totalInvested) * 100 
    : 0;

  return {
    id: holding.id,
    userId: holding.userId,
    companyId: holding.companyId,
    sharesOwned: holding.sharesOwned,
    averageBuyPrice: holding.averageBuyPrice,
    totalInvested: holding.totalInvested,
    totalDividendsEarned: holding.totalDividendsEarned,
    createdAt: holding.createdAt,
    updatedAt: holding.updatedAt,
    company: holding.company,
    currentValue,
    profitLoss,
    profitLossPercentage
  };
}

/**
 * Calculate day change based on recent trades
 * This is a simplified implementation
 */
async function calculateDayChange(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get today's trades
  const trades = await prisma.trade.findMany({
    where: {
      OR: [
        { buyerId: userId },
        { sellerId: userId }
      ],
      executedAt: {
        gte: today
      }
    }
  });

  let dayChange = 0;

  for (const trade of trades) {
    if (trade.buyerId === userId) {
      // Bought shares - negative impact
      dayChange -= trade.totalAmount;
    } else {
      // Sold shares - positive impact (proceeds minus fee)
      dayChange += trade.totalAmount - trade.platformFee;
    }
  }

  return dayChange;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getPortfolio,
  getHolding,
  getHoldings,
  updateHolding,
  addDividendEarnings,
  calculateProfitLoss,
  calculatePortfolioPerformance,
  calculateRealizedProfitLoss,
  calculateUnrealizedProfitLoss,
  getPortfolioDiversification,
  getDividendHistory
};
