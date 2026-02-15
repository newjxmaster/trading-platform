/**
 * Price History Service
 * 
 * Manages stock price history for charting and analytics.
 * Records price changes from trades and provides historical data
 * for various timeframes (1h, 1d, 1w, 1m, etc.).
 */

import { PrismaClient } from '@prisma/client';
import {
  PriceHistory,
  PriceUpdate,
  PriceTimeframe
} from '../types/trading';

const prisma = new PrismaClient();

/**
 * Record a new price point from a trade
 */
export async function recordPrice(
  companyId: string,
  price: number,
  volume: number = 0
): Promise<PriceHistory> {
  console.log(`[PriceHistoryService] Recording price for company ${companyId}: $${price}, volume: ${volume}`);

  const priceRecord = await prisma.priceHistory.create({
    data: {
      companyId,
      price,
      volume,
      timestamp: new Date()
    }
  });

  await prisma.company.update({
    where: { id: companyId },
    data: { 
      currentPrice: price,
      updatedAt: new Date()
    }
  });

  return mapPriceHistoryFromPrisma(priceRecord);
}

/**
 * Record price with OHLC data for candlestick charts
 */
export async function recordOHLC(data: {
  companyId: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
}): Promise<PriceHistory> {
  console.log(`[PriceHistoryService] Recording OHLC for company ${data.companyId}`);

  const priceRecord = await prisma.priceHistory.create({
    data: {
      companyId: data.companyId,
      price: data.close,
      volume: data.volume,
      timestamp: data.timestamp
    }
  });

  return mapPriceHistoryFromPrisma(priceRecord);
}

/**
 * Get current price for a company
 */
export async function getCurrentPrice(companyId: string): Promise<number | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { currentPrice: true }
  });

  return company?.currentPrice || null;
}

/**
 * Get current prices for multiple companies
 */
export async function getCurrentPrices(companyIds: string[]): Promise<Record<string, number>> {
  const companies = await prisma.company.findMany({
    where: {
      id: { in: companyIds }
    },
    select: {
      id: true,
      currentPrice: true
    }
  });

  return companies.reduce((acc, company) => {
    acc[company.id] = company.currentPrice;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Get all active company prices
 */
export async function getAllCurrentPrices(): Promise<Array<{
  companyId: string;
  companyName: string;
  currentPrice: number;
  previousPrice: number | null;
  change: number;
  changePercentage: number;
  volume24h: number;
}>> {
  const companies = await prisma.company.findMany({
    where: {
      listingStatus: { in: ['active', 'ipo'] }
    },
    select: {
      id: true,
      businessName: true,
      currentPrice: true
    }
  });

  const results = [];

  for (const company of companies) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const previousPriceRecord = await prisma.priceHistory.findFirst({
      where: {
        companyId: company.id,
        timestamp: { lte: yesterday }
      },
      orderBy: { timestamp: 'desc' }
    });

    const volume24h = await prisma.trade.aggregate({
      where: {
        companyId: company.id,
        executedAt: { gte: yesterday }
      },
      _sum: { quantity: true }
    });

    const previousPrice = previousPriceRecord?.price || company.currentPrice;
    const change = company.currentPrice - previousPrice;
    const changePercentage = previousPrice > 0 ? (change / previousPrice) * 100 : 0;

    results.push({
      companyId: company.id,
      companyName: company.businessName,
      currentPrice: company.currentPrice,
      previousPrice: previousPrice !== company.currentPrice ? previousPrice : null,
      change,
      changePercentage,
      volume24h: volume24h._sum.quantity || 0
    });
  }

  return results;
}

/**
 * Get price history for a company
 */
export async function getPriceHistory(
  companyId: string,
  timeframe: PriceTimeframe = PriceTimeframe.ONE_MONTH
): Promise<PriceHistory[]> {
  console.log(`[PriceHistoryService] Getting price history for company ${companyId}, timeframe: ${timeframe}`);

  const startDate = getStartDateForTimeframe(timeframe);

  const rawData = await prisma.priceHistory.findMany({
    where: {
      companyId,
      timestamp: { gte: startDate }
    },
    orderBy: { timestamp: 'asc' }
  });

  if (rawData.length === 0) {
    return [];
  }

  const aggregatedData = aggregatePriceData(rawData, timeframe);

  return aggregatedData.map(mapPriceHistoryFromPrisma);
}

/**
 * Get price history with OHLC data for candlestick charts
 */
export async function getPriceHistoryOHLC(
  companyId: string,
  timeframe: PriceTimeframe = PriceTimeframe.ONE_DAY
): Promise<Array<{
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}>> {
  const startDate = getStartDateForTimeframe(timeframe);

  const trades = await prisma.trade.findMany({
    where: {
      companyId,
      executedAt: { gte: startDate }
    },
    orderBy: { executedAt: 'asc' }
  });

  if (trades.length === 0) {
    return [];
  }

  const interval = getIntervalForTimeframe(timeframe);
  const ohlcMap = new Map<string, {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: Date;
  }>();

  for (const trade of trades) {
    const periodKey = getPeriodKey(trade.executedAt, interval);
    
    if (!ohlcMap.has(periodKey)) {
      ohlcMap.set(periodKey, {
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: trade.quantity,
        timestamp: new Date(trade.executedAt)
      });
    } else {
      const candle = ohlcMap.get(periodKey)!;
      candle.high = Math.max(candle.high, trade.price);
      candle.low = Math.min(candle.low, trade.price);
      candle.close = trade.price;
      candle.volume += trade.quantity;
    }
  }

  return Array.from(ohlcMap.values()).sort((a, b) => 
    a.timestamp.getTime() - b.timestamp.getTime()
  );
}

/**
 * Get latest price update for a company
 */
export async function getLatestPriceUpdate(companyId: string): Promise<PriceUpdate | null> {
  const latestPrice = await prisma.priceHistory.findFirst({
    where: { companyId },
    orderBy: { timestamp: 'desc' }
  });

  if (!latestPrice) {
    return null;
  }

  const previousPrice = await prisma.priceHistory.findFirst({
    where: {
      companyId,
      timestamp: { lt: latestPrice.timestamp }
    },
    orderBy: { timestamp: 'desc' }
  });

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { businessName: true }
  });

  const oldPrice = previousPrice?.price || latestPrice.price;
  const change = latestPrice.price - oldPrice;
  const changePercentage = oldPrice > 0 ? (change / oldPrice) * 100 : 0;

  return {
    companyId,
    companyName: company?.businessName || 'Unknown',
    oldPrice,
    newPrice: latestPrice.price,
    change,
    changePercentage,
    volume: latestPrice.volume,
    timestamp: latestPrice.timestamp
  };
}

/**
 * Get price statistics for a company
 */
export async function getPriceStatistics(
  companyId: string,
  days: number = 30
): Promise<{
  currentPrice: number;
  high: number;
  low: number;
  average: number;
  volume: number;
  volatility: number;
  change24h: number;
  change7d: number;
  change30d: number;
}> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const prices = await prisma.priceHistory.findMany({
    where: {
      companyId,
      timestamp: { gte: startDate, lte: endDate }
    },
    orderBy: { timestamp: 'asc' }
  });

  if (prices.length === 0) {
    const currentPrice = await getCurrentPrice(companyId) || 0;
    return {
      currentPrice,
      high: currentPrice,
      low: currentPrice,
      average: currentPrice,
      volume: 0,
      volatility: 0,
      change24h: 0,
      change7d: 0,
      change30d: 0
    };
  }

  const priceValues = prices.map(p => p.price);
  const high = Math.max(...priceValues);
  const low = Math.min(...priceValues);
  const average = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
  const volume = prices.reduce((sum, p) => sum + p.volume, 0);

  const variance = priceValues.reduce((sum, price) => 
    sum + Math.pow(price - average, 2), 0) / priceValues.length;
  const volatility = Math.sqrt(variance);

  const currentPrice = priceValues[priceValues.length - 1];
  const change24h = calculateChange(prices, 1);
  const change7d = calculateChange(prices, 7);
  const change30d = calculateChange(prices, 30);

  return {
    currentPrice,
    high,
    low,
    average,
    volume,
    volatility,
    change24h,
    change7d,
    change30d
  };
}

/**
 * Get price change over a period
 */
export async function getPriceChange(
  companyId: string,
  days: number
): Promise<{ amount: number; percentage: number }> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [startPrice, endPrice] = await Promise.all([
    prisma.priceHistory.findFirst({
      where: {
        companyId,
        timestamp: { lte: startDate }
      },
      orderBy: { timestamp: 'desc' }
    }),
    prisma.priceHistory.findFirst({
      where: {
        companyId,
        timestamp: { lte: endDate }
      },
      orderBy: { timestamp: 'desc' }
    })
  ]);

  if (!startPrice || !endPrice) {
    return { amount: 0, percentage: 0 };
  }

  const amount = endPrice.price - startPrice.price;
  const percentage = startPrice.price > 0 ? (amount / startPrice.price) * 100 : 0;

  return { amount, percentage };
}

/**
 * Calculate new stock price based on company performance
 * Implements the algorithm from specification section 1.4
 */
export async function calculateNewPrice(companyId: string): Promise<number> {
  console.log(`[PriceHistoryService] Calculating new price for company ${companyId}`);

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      revenueReports: {
        orderBy: [
          { reportYear: 'desc' },
          { reportMonth: 'desc' }
        ],
        take: 2
      }
    }
  });

  if (!company) {
    throw new Error(`Company ${companyId} not found`);
  }

  const currentPrice = company.currentPrice;
  const reports = company.revenueReports;

  if (reports.length < 2) {
    console.log(`[PriceHistoryService] Not enough revenue data for price calculation`);
    return currentPrice;
  }

  const [thisMonth, lastMonth] = reports;

  const revenueGrowth = lastMonth.netRevenue > 0
    ? (thisMonth.netRevenue - lastMonth.netRevenue) / lastMonth.netRevenue
    : 0;

  const profitMargin = thisMonth.netRevenue > 0
    ? thisMonth.netProfit / thisMonth.netRevenue
    : 0;

  const lastMonthStart = new Date();
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
  lastMonthStart.setDate(1);
  const lastMonthEnd = new Date();
  lastMonthEnd.setDate(0);

  const tradingVolume = await prisma.trade.aggregate({
    where: {
      companyId,
      executedAt: {
        gte: lastMonthStart,
        lte: lastMonthEnd
      }
    },
    _sum: { quantity: true }
  });

  const volumeScore = Math.min(
    (tradingVolume._sum.quantity || 0) / company.totalShares,
    0.2
  );

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const dividendCount = await prisma.dividend.count({
    where: {
      companyId,
      paymentStatus: 'completed',
      distributionDate: { gte: threeMonthsAgo }
    }
  });

  const dividendScore = Math.min(dividendCount / 3, 0.1);

  const performanceScore =
    (revenueGrowth * 0.4) +
    (profitMargin * 0.3) +
    (volumeScore * 0.2) +
    (dividendScore * 0.1);

  let newPrice = currentPrice * (1 + performanceScore);

  const maxIncrease = currentPrice * 1.20;
  const maxDecrease = currentPrice * 0.80;
  newPrice = Math.min(Math.max(newPrice, maxDecrease), maxIncrease);

  newPrice = Math.round(newPrice * 100) / 100;

  console.log(`[PriceHistoryService] Price calculation: $${currentPrice} → $${newPrice}`);

  return newPrice;
}

/**
 * Apply monthly price adjustment for all active companies
 */
export async function applyMonthlyPriceAdjustments(): Promise<Array<{
  companyId: string;
  companyName: string;
  oldPrice: number;
  newPrice: number;
  changePercentage: number;
}>> {
  console.log(`[PriceHistoryService] Applying monthly price adjustments`);

  const companies = await prisma.company.findMany({
    where: { listingStatus: 'active' }
  });

  const results = [];

  for (const company of companies) {
    try {
      const oldPrice = company.currentPrice;
      const newPrice = await calculateNewPrice(company.id);

      if (newPrice !== oldPrice) {
        await prisma.company.update({
          where: { id: company.id },
          data: { currentPrice: newPrice }
        });

        await recordPrice(company.id, newPrice, 0);

        const changePercentage = ((newPrice - oldPrice) / oldPrice) * 100;

        results.push({
          companyId: company.id,
          companyName: company.businessName,
          oldPrice,
          newPrice,
          changePercentage
        });

        console.log(`[PriceHistoryService] Adjusted price for ${company.businessName}: $${oldPrice} → $${newPrice}`);
      }
    } catch (error) {
      console.error(`[PriceHistoryService] Failed to adjust price for ${company.businessName}:`, error);
    }
  }

  return results;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStartDateForTimeframe(timeframe: PriceTimeframe): Date {
  const now = new Date();
  const startDate = new Date();

  switch (timeframe) {
    case PriceTimeframe.ONE_HOUR:
      startDate.setHours(now.getHours() - 1);
      break;
    case PriceTimeframe.ONE_DAY:
      startDate.setDate(now.getDate() - 1);
      break;
    case PriceTimeframe.ONE_WEEK:
      startDate.setDate(now.getDate() - 7);
      break;
    case PriceTimeframe.ONE_MONTH:
      startDate.setMonth(now.getMonth() - 1);
      break;
    case PriceTimeframe.THREE_MONTHS:
      startDate.setMonth(now.getMonth() - 3);
      break;
    case PriceTimeframe.SIX_MONTHS:
      startDate.setMonth(now.getMonth() - 6);
      break;
    case PriceTimeframe.ONE_YEAR:
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case PriceTimeframe.ALL:
      startDate.setFullYear(2000);
      break;
    default:
      startDate.setMonth(now.getMonth() - 1);
  }

  return startDate;
}

function getIntervalForTimeframe(timeframe: PriceTimeframe): number {
  switch (timeframe) {
    case PriceTimeframe.ONE_HOUR:
      return 5 * 60 * 1000;
    case PriceTimeframe.ONE_DAY:
      return 15 * 60 * 1000;
    case PriceTimeframe.ONE_WEEK:
      return 60 * 60 * 1000;
    case PriceTimeframe.ONE_MONTH:
      return 4 * 60 * 60 * 1000;
    case PriceTimeframe.THREE_MONTHS:
    case PriceTimeframe.SIX_MONTHS:
      return 24 * 60 * 60 * 1000;
    case PriceTimeframe.ONE_YEAR:
    case PriceTimeframe.ALL:
      return 7 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

function getPeriodKey(date: Date, interval: number): string {
  const timestamp = Math.floor(date.getTime() / interval) * interval;
  return timestamp.toString();
}

function aggregatePriceData(
  rawData: any[],
  timeframe: PriceTimeframe
): any[] {
  if (timeframe === PriceTimeframe.ONE_HOUR || timeframe === PriceTimeframe.ONE_DAY) {
    return rawData;
  }

  const sampleRate = Math.ceil(rawData.length / 100);
  return rawData.filter((_, index) => index % sampleRate === 0);
}

function calculateChange(prices: any[], daysAgo: number): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

  const oldPrice = prices.find(p => new Date(p.timestamp) <= cutoffDate);
  const currentPrice = prices[prices.length - 1];

  if (!oldPrice || !currentPrice) {
    return 0;
  }

  const change = currentPrice.price - oldPrice.price;
  return oldPrice.price > 0 ? (change / oldPrice.price) * 100 : 0;
}

function mapPriceHistoryFromPrisma(price: any): PriceHistory {
  return {
    id: price.id,
    companyId: price.companyId,
    price: price.price,
    volume: price.volume,
    timestamp: price.timestamp,
    open: price.metadata?.open,
    high: price.metadata?.high,
    low: price.metadata?.low,
    close: price.metadata?.close
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  recordPrice,
  recordOHLC,
  getCurrentPrice,
  getCurrentPrices,
  getAllCurrentPrices,
  getPriceHistory,
  getPriceHistoryOHLC,
  getLatestPriceUpdate,
  getPriceStatistics,
  getPriceChange,
  calculateNewPrice,
  applyMonthlyPriceAdjustments
};
