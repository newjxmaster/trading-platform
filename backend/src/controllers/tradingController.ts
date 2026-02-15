/**
 * Trading Controller
 * 
 * Handles all trading-related HTTP endpoints:
 * - Order book viewing
 * - Order placement (buy/sell, market/limit)
 * - Order management (view, cancel)
 * - Trade history
 * - Portfolio viewing
 * 
 * All endpoints require authentication (JWT).
 * Uses Prisma transactions for data integrity.
 * Emits WebSocket events for real-time updates.
 * 
 * Endpoints:
 * GET  /api/trading/orderbook/:companyId - View order book
 * POST /api/trading/orders               - Place buy/sell order
 * GET  /api/trading/orders/my            - Get user's active orders
 * DELETE /api/trading/orders/:id         - Cancel order
 * GET  /api/trading/trades/history       - Trade history
 * GET  /api/trading/portfolio            - User's stock holdings
 */

import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';
import { 
  OrderType, 
  OrderSide, 
  OrderStatus,
  TradingErrorCode,
  CreateOrderRequest,
  OrderResponse,
  TradeHistoryFilter,
  PaginatedResponse,
  PriceTimeframe,
  TradingEventType
} from '../types/trading';
import orderMatchingService from '../services/orderMatching';
import portfolioService from '../services/portfolioService';
import priceHistoryService from '../services/priceHistoryService';

// ============================================================================
// PRISMA CLIENT
// ============================================================================

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION
// ============================================================================

const PLATFORM_FEE_PERCENTAGE = 0.005; // 0.5%
const MIN_ORDER_QUANTITY = 1;
const MAX_ORDER_QUANTITY = 1000000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ============================================================================
// SOCKET.IO INSTANCE (injected from app)
// ============================================================================

let io: SocketIOServer | undefined;

export function setSocketIO(socketIO: SocketIOServer) {
  io = socketIO;
}

// ============================================================================
// ORDER BOOK ENDPOINT
// ============================================================================

/**
 * GET /api/trading/orderbook/:companyId
 * View the order book for a specific company
 * Returns aggregated buy and sell orders
 */
export async function getOrderBook(req: Request, res: Response): Promise<void> {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      res.status(400).json({
        success: false,
        error: {
          code: TradingErrorCode.INVALID_ORDER_TYPE,
          message: 'Company ID is required'
        }
      });
      return;
    }

    // Verify company exists and is active
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        businessName: true,
        currentPrice: true,
        listingStatus: true
      }
    });

    if (!company) {
      res.status(404).json({
        success: false,
        error: {
          code: TradingErrorCode.COMPANY_NOT_FOUND,
          message: 'Company not found'
        }
      });
      return;
    }

    if (company.listingStatus !== 'active' && company.listingStatus !== 'ipo') {
      res.status(400).json({
        success: false,
        error: {
          code: TradingErrorCode.COMPANY_NOT_ACTIVE,
          message: 'Company is not currently trading'
        }
      });
      return;
    }

    // Get active buy orders (aggregated by price)
    const buyOrders = await prisma.order.groupBy({
      by: ['price'],
      where: {
        companyId,
        side: 'buy',
        status: { in: ['pending', 'partial'] },
        remainingQuantity: { gt: 0 }
      },
      _sum: {
        remainingQuantity: true
      },
      _count: {
        id: true
      },
      orderBy: {
        price: 'desc'
      },
      take: 10
    });

    // Get active sell orders (aggregated by price)
    const sellOrders = await prisma.order.groupBy({
      by: ['price'],
      where: {
        companyId,
        side: 'sell',
        status: { in: ['pending', 'partial'] },
        remainingQuantity: { gt: 0 }
      },
      _sum: {
        remainingQuantity: true
      },
      _count: {
        id: true
      },
      orderBy: {
        price: 'asc'
      },
      take: 10
    });

    // Format order book entries
    const formattedBuyOrders = buyOrders.map(order => ({
      price: order.price || 0,
      quantity: order._sum.remainingQuantity || 0,
      total: (order.price || 0) * (order._sum.remainingQuantity || 0),
      orderCount: order._count.id
    }));

    const formattedSellOrders = sellOrders.map(order => ({
      price: order.price || 0,
      quantity: order._sum.remainingQuantity || 0,
      total: (order.price || 0) * (order._sum.remainingQuantity || 0),
      orderCount: order._count.id
    }));

    res.status(200).json({
      success: true,
      data: {
        companyId: company.id,
        companyName: company.businessName,
        currentPrice: company.currentPrice,
        buyOrders: formattedBuyOrders,
        sellOrders: formattedSellOrders,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[TradingController] Error getting order book:', error);
    res.status(500).json({
      success: false,
      error: {
        code: TradingErrorCode.INTERNAL_ERROR,
        message: 'Failed to retrieve order book'
      }
    });
  }
}

// ============================================================================
// PLACE ORDER ENDPOINT
// ============================================================================

/**
 * POST /api/trading/orders
 * Place a new buy or sell order (market or limit)
 * 
 * Request body:
 * {
 *   companyId: string,
 *   orderType: 'market' | 'limit',
 *   side: 'buy' | 'sell',
 *   quantity: number,
 *   price?: number (required for limit orders)
 *   expiresAt?: string (ISO date for limit orders)
 * }
 */
export async function placeOrder(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: {
        code: TradingErrorCode.UNAUTHORIZED,
        message: 'Authentication required'
      }
    });
    return;
  }

  try {
    const orderData: CreateOrderRequest = req.body;

    // Validate required fields
    if (!orderData.companyId || !orderData.orderType || !orderData.side || !orderData.quantity) {
      res.status(400).json({
        success: false,
        error: {
          code: TradingErrorCode.INVALID_ORDER_TYPE,
          message: 'Missing required fields: companyId, orderType, side, quantity'
        }
      });
      return;
    }

    // Validate order type
    if (!Object.values(OrderType).includes(orderData.orderType)) {
      res.status(400).json({
        success: false,
        error: {
          code: TradingErrorCode.INVALID_ORDER_TYPE,
          message: `Invalid order type. Must be one of: ${Object.values(OrderType).join(', ')}`
        }
      });
      return;
    }

    // Validate side
    if (!Object.values(OrderSide).includes(orderData.side)) {
      res.status(400).json({
        success: false,
        error: {
          code: TradingErrorCode.INVALID_ORDER_TYPE,
          message: `Invalid side. Must be one of: ${Object.values(OrderSide).join(', ')}`
        }
      });
      return;
    }

    // Validate quantity
    if (orderData.quantity < MIN_ORDER_QUANTITY || orderData.quantity > MAX_ORDER_QUANTITY) {
      res.status(400).json({
        success: false,
        error: {
          code: TradingErrorCode.INVALID_QUANTITY,
          message: `Quantity must be between ${MIN_ORDER_QUANTITY} and ${MAX_ORDER_QUANTITY}`
        }
      });
      return;
    }

    // Validate limit order price
    if (orderData.orderType === OrderType.LIMIT) {
      if (!orderData.price || orderData.price <= 0) {
        res.status(400).json({
          success: false,
          error: {
            code: TradingErrorCode.INVALID_PRICE,
            message: 'Limit orders require a valid price greater than 0'
          }
        });
        return;
      }
    }

    // Get company info
    const company = await prisma.company.findUnique({
      where: { id: orderData.companyId },
      select: {
        id: true,
        businessName: true,
        currentPrice: true,
        listingStatus: true,
        availableShares: true
      }
    });

    if (!company) {
      res.status(404).json({
        success: false,
        error: {
          code: TradingErrorCode.COMPANY_NOT_FOUND,
          message: 'Company not found'
        }
      });
      return;
    }

    if (company.listingStatus !== 'active' && company.listingStatus !== 'ipo') {
      res.status(400).json({
        success: false,
        error: {
          code: TradingErrorCode.COMPANY_NOT_ACTIVE,
          message: 'Company is not currently open for trading'
        }
      });
      return;
    }

    // For sell orders, verify user has sufficient shares
    if (orderData.side === OrderSide.SELL) {
      const holding = await prisma.stockHolding.findUnique({
        where: {
          userId_companyId: {
            userId,
            companyId: orderData.companyId
          }
        }
      });

      if (!holding || holding.sharesOwned < orderData.quantity) {
        res.status(400).json({
          success: false,
          error: {
            code: TradingErrorCode.INSUFFICIENT_SHARES,
            message: `Insufficient shares. You own ${holding?.sharesOwned || 0} shares, trying to sell ${orderData.quantity}`
          }
        });
        return;
      }
    }

    // For buy orders, verify user has sufficient funds
    if (orderData.side === OrderSide.BUY) {
      const price = orderData.orderType === OrderType.MARKET 
        ? company.currentPrice 
        : (orderData.price || company.currentPrice);
      
      const totalCost = orderData.quantity * price;
      const platformFee = totalCost * PLATFORM_FEE_PERCENTAGE;
      const totalRequired = totalCost + platformFee;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { walletFiat: true }
      });

      if (!user || user.walletFiat < totalRequired) {
        res.status(400).json({
          success: false,
          error: {
            code: TradingErrorCode.INSUFFICIENT_FUNDS,
            message: `Insufficient funds. Required: $${totalRequired.toFixed(2)}, Available: $${user?.walletFiat.toFixed(2) || '0.00'}`
          }
        });
        return;
      }
    }

    // Create the order within a transaction
    const order = await prisma.$transaction(async (tx) => {
      // For market orders, set price to null
      // For limit orders, use the provided price
      const orderPrice = orderData.orderType === OrderType.MARKET ? null : orderData.price;

      // Calculate expiration for limit orders (default 30 days)
      let expiresAt = null;
      if (orderData.orderType === OrderType.LIMIT) {
        expiresAt = orderData.expiresAt 
          ? new Date(orderData.expiresAt)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      const newOrder = await tx.order.create({
        data: {
          userId,
          companyId: orderData.companyId,
          orderType: orderData.orderType,
          side: orderData.side,
          quantity: orderData.quantity,
          price: orderPrice,
          filledQuantity: 0,
          remainingQuantity: orderData.quantity,
          status: OrderStatus.PENDING,
          expiresAt
        },
        include: {
          company: {
            select: {
              businessName: true,
              currentPrice: true
            }
          }
        }
      });

      return newOrder;
    });

    // Emit order placed event
    if (io) {
      io.to(`company:${orderData.companyId}`).emit(TradingEventType.ORDER_PLACED, {
        orderId: order.id,
        companyId: orderData.companyId,
        side: orderData.side,
        orderType: orderData.orderType,
        quantity: orderData.quantity,
        price: orderData.price,
        timestamp: new Date()
      });
    }

    // Try to match the order immediately
    let matchedTrades = [];
    try {
      const orderForMatching = {
        id: order.id,
        userId: order.userId,
        companyId: order.companyId,
        orderType: order.orderType as OrderType,
        side: order.side as OrderSide,
        quantity: order.quantity,
        price: order.price,
        filledQuantity: order.filledQuantity,
        remainingQuantity: order.remainingQuantity,
        status: order.status as OrderStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        expiresAt: order.expiresAt
      };

      matchedTrades = await orderMatchingService.matchOrders(orderForMatching, io);
    } catch (matchError) {
      console.error('[TradingController] Order matching error:', matchError);
      // Don't fail the request if matching fails - order is still created
    }

    // Get updated order status
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id }
    });

    // Calculate total amount and fees
    const orderPrice = orderData.price || company.currentPrice;
    const totalAmount = orderData.quantity * orderPrice;
    const platformFee = totalAmount * PLATFORM_FEE_PERCENTAGE;

    const response: OrderResponse = {
      id: updatedOrder!.id,
      companyId: updatedOrder!.companyId,
      companyName: company.businessName,
      orderType: updatedOrder!.orderType as OrderType,
      side: updatedOrder!.side as OrderSide,
      quantity: updatedOrder!.quantity,
      price: updatedOrder!.price,
      filledQuantity: updatedOrder!.filledQuantity,
      remainingQuantity: updatedOrder!.remainingQuantity,
      status: updatedOrder!.status as OrderStatus,
      totalAmount,
      platformFee,
      createdAt: updatedOrder!.createdAt.toISOString(),
      updatedAt: updatedOrder!.updatedAt.toISOString(),
      expiresAt: updatedOrder!.expiresAt?.toISOString() || null
    };

    res.status(201).json({
      success: true,
      data: {
        order: response,
        matchedTrades: matchedTrades.length,
        message: matchedTrades.length > 0 
          ? `Order placed and ${matchedTrades.length} trade(s) executed`
          : 'Order placed successfully'
      }
    });

  } catch (error) {
    console.error('[TradingController] Error placing order:', error);
    res.status(500).json({
      success: false,
      error: {
        code: TradingErrorCode.INTERNAL_ERROR,
        message: 'Failed to place order'
      }
    });
  }
}

// ============================================================================
// GET USER ORDERS ENDPOINT
// ============================================================================

/**
 * GET /api/trading/orders/my
 * Get the current user's active orders
 * 
 * Query params:
 * - status: Filter by status (pending, partial, filled, cancelled)
 * - companyId: Filter by company
 * - limit: Number of results (default 20, max 100)
 * - offset: Pagination offset
 */
export async function getMyOrders(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: {
        code: TradingErrorCode.UNAUTHORIZED,
        message: 'Authentication required'
      }
    });
    return;
  }

  try {
    const { status, companyId, limit = DEFAULT_LIMIT, offset = 0 } = req.query;

    // Build where clause
    const where: any = { userId };

    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      where.status = status;
    }

    if (companyId) {
      where.companyId = companyId;
    }

    // Parse pagination
    const parsedLimit = Math.min(parseInt(limit as string) || DEFAULT_LIMIT, MAX_LIMIT);
    const parsedOffset = parseInt(offset as string) || 0;

    // Get orders with company info
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          company: {
            select: {
              businessName: true,
              currentPrice: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parsedOffset,
        take: parsedLimit
      }),
      prisma.order.count({ where })
    ]);

    // Format response
    const formattedOrders: OrderResponse[] = orders.map(order => {
      const totalAmount = order.quantity * (order.price || order.company.currentPrice);
      const platformFee = totalAmount * PLATFORM_FEE_PERCENTAGE;

      return {
        id: order.id,
        companyId: order.companyId,
        companyName: order.company.businessName,
        orderType: order.orderType as OrderType,
        side: order.side as OrderSide,
        quantity: order.quantity,
        price: order.price,
        filledQuantity: order.filledQuantity,
        remainingQuantity: order.remainingQuantity,
        status: order.status as OrderStatus,
        totalAmount,
        platformFee,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        expiresAt: order.expiresAt?.toISOString() || null
      };
    });

    const response: PaginatedResponse<OrderResponse> = {
      data: formattedOrders,
      total,
      page: Math.floor(parsedOffset / parsedLimit) + 1,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    };

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('[TradingController] Error getting user orders:', error);
    res.status(500).json({
      success: false,
      error: {
        code: TradingErrorCode.INTERNAL_ERROR,
        message: 'Failed to retrieve orders'
      }
    });
  }
}

// ============================================================================
// CANCEL ORDER ENDPOINT
// ============================================================================

/**
 * DELETE /api/trading/orders/:id
 * Cancel a pending or partially filled order
 */
export async function cancelOrder(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: {
        code: TradingErrorCode.UNAUTHORIZED,
        message: 'Authentication required'
      }
    });
    return;
  }

  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: {
          code: TradingErrorCode.INVALID_ORDER_TYPE,
          message: 'Order ID is required'
        }
      });
      return;
    }

    // Cancel the order using the service
    const cancelledOrder = await orderMatchingService.cancelOrder(id, userId);

    // Emit order cancelled event
    if (io) {
      io.to(`company:${cancelledOrder.companyId}`).emit(TradingEventType.ORDER_CANCELLED, {
        orderId: cancelledOrder.id,
        companyId: cancelledOrder.companyId,
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
      data: {
        orderId: cancelledOrder.id,
        status: cancelledOrder.status,
        message: 'Order cancelled successfully'
      }
    });

  } catch (error: any) {
    console.error('[TradingController] Error cancelling order:', error);

    // Handle specific errors
    if (error.code === TradingErrorCode.ORDER_NOT_FOUND) {
      res.status(404).json({
        success: false,
        error: {
          code: TradingErrorCode.ORDER_NOT_FOUND,
          message: error.message
        }
      });
      return;
    }

    if (error.code === TradingErrorCode.UNAUTHORIZED) {
      res.status(403).json({
        success: false,
        error: {
          code: TradingErrorCode.UNAUTHORIZED,
          message: error.message
        }
      });
      return;
    }

    if (error.code === TradingErrorCode.ORDER_ALREADY_FILLED || 
        error.code === TradingErrorCode.ORDER_ALREADY_CANCELLED) {
      res.status(400).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: TradingErrorCode.INTERNAL_ERROR,
        message: 'Failed to cancel order'
      }
    });
  }
}

// ============================================================================
// TRADE HISTORY ENDPOINT
// ============================================================================

/**
 * GET /api/trading/trades/history
 * Get trade history for the current user
 * 
 * Query params:
 * - companyId: Filter by company
 * - startDate: Filter from date (ISO string)
 * - endDate: Filter to date (ISO string)
 * - limit: Number of results (default 20, max 100)
 * - offset: Pagination offset
 */
export async function getTradeHistory(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: {
        code: TradingErrorCode.UNAUTHORIZED,
        message: 'Authentication required'
      }
    });
    return;
  }

  try {
    const { 
      companyId, 
      startDate, 
      endDate, 
      limit = DEFAULT_LIMIT, 
      offset = 0 
    } = req.query;

    // Build where clause
    const where: any = {
      OR: [
        { buyerId: userId },
        { sellerId: userId }
      ]
    };

    if (companyId) {
      where.companyId = companyId;
    }

    if (startDate || endDate) {
      where.executedAt = {};
      if (startDate) {
        where.executedAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.executedAt.lte = new Date(endDate as string);
      }
    }

    // Parse pagination
    const parsedLimit = Math.min(parseInt(limit as string) || DEFAULT_LIMIT, MAX_LIMIT);
    const parsedOffset = parseInt(offset as string) || 0;

    // Get trades with company info
    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        include: {
          company: {
            select: {
              businessName: true
            }
          },
          buyer: {
            select: {
              fullName: true
            }
          },
          seller: {
            select: {
              fullName: true
            }
          }
        },
        orderBy: { executedAt: 'desc' },
        skip: parsedOffset,
        take: parsedLimit
      }),
      prisma.trade.count({ where })
    ]);

    // Format response
    const formattedTrades = trades.map(trade => ({
      id: trade.id,
      companyId: trade.companyId,
      companyName: trade.company.businessName,
      side: trade.buyerId === userId ? 'buy' : 'sell',
      quantity: trade.quantity,
      price: trade.price,
      totalAmount: trade.totalAmount,
      platformFee: trade.platformFee,
      netAmount: trade.buyerId === userId 
        ? trade.totalAmount 
        : trade.totalAmount - trade.platformFee,
      counterparty: trade.buyerId === userId 
        ? trade.seller.fullName 
        : trade.buyer.fullName,
      executedAt: trade.executedAt.toISOString()
    }));

    const response: PaginatedResponse<typeof formattedTrades[0]> = {
      data: formattedTrades,
      total,
      page: Math.floor(parsedOffset / parsedLimit) + 1,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    };

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('[TradingController] Error getting trade history:', error);
    res.status(500).json({
      success: false,
      error: {
        code: TradingErrorCode.INTERNAL_ERROR,
        message: 'Failed to retrieve trade history'
      }
    });
  }
}

// ============================================================================
// PORTFOLIO ENDPOINT
// ============================================================================

/**
 * GET /api/trading/portfolio
 * Get the current user's portfolio with holdings and performance metrics
 */
export async function getPortfolio(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: {
        code: TradingErrorCode.UNAUTHORIZED,
        message: 'Authentication required'
      }
    });
    return;
  }

  try {
    // Get portfolio from service
    const portfolio = await portfolioService.getPortfolio(userId);

    // Get additional performance metrics
    const performance = await portfolioService.calculatePortfolioPerformance(userId);

    // Get diversification analysis
    const diversification = await portfolioService.getPortfolioDiversification(userId);

    // Get dividend summary
    const dividendHistory = await portfolioService.getDividendHistory(userId);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalValue: portfolio.totalValue,
          totalInvested: portfolio.totalInvested,
          totalProfitLoss: portfolio.totalProfitLoss,
          totalProfitLossPercentage: portfolio.totalProfitLossPercentage,
          totalDividendsEarned: portfolio.totalDividendsEarned,
          dayChange: performance.dayChange,
          dayChangePercentage: performance.dayChangePercentage
        },
        holdings: portfolio.holdings.map(h => ({
          companyId: h.companyId,
          companyName: h.company?.businessName || 'Unknown',
          businessType: h.company?.businessType,
          category: h.company?.category,
          sharesOwned: h.sharesOwned,
          averageBuyPrice: h.averageBuyPrice,
          currentPrice: h.company?.currentPrice || 0,
          currentValue: h.currentValue,
          totalInvested: h.totalInvested,
          profitLoss: h.profitLoss,
          profitLossPercentage: h.profitLossPercentage,
          totalDividendsEarned: h.totalDividendsEarned
        })),
        performance: {
          totalReturn: performance.totalReturn,
          totalReturnPercentage: performance.totalReturnPercentage,
          bestPerformer: performance.bestPerformer,
          worstPerformer: performance.worstPerformer
        },
        diversification,
        dividends: dividendHistory,
        lastUpdated: portfolio.lastUpdated.toISOString()
      }
    });

  } catch (error) {
    console.error('[TradingController] Error getting portfolio:', error);
    res.status(500).json({
      success: false,
      error: {
        code: TradingErrorCode.INTERNAL_ERROR,
        message: 'Failed to retrieve portfolio'
      }
    });
  }
}

// ============================================================================
// ADDITIONAL ENDPOINTS
// ============================================================================

/**
 * GET /api/trading/price-history/:companyId
 * Get price history for charting
 * 
 * Query params:
 * - timeframe: 1h, 1d, 1w, 1m, 3m, 6m, 1y, all
 */
export async function getPriceHistory(req: Request, res: Response): Promise<void> {
  try {
    const { companyId } = req.params;
    const { timeframe = PriceTimeframe.ONE_MONTH } = req.query;

    if (!companyId) {
      res.status(400).json({
        success: false,
        error: {
          code: TradingErrorCode.INVALID_ORDER_TYPE,
          message: 'Company ID is required'
        }
      });
      return;
    }

    // Validate timeframe
    const validTimeframe = Object.values(PriceTimeframe).includes(timeframe as PriceTimeframe)
      ? (timeframe as PriceTimeframe)
      : PriceTimeframe.ONE_MONTH;

    // Get price history
    const priceHistory = await priceHistoryService.getPriceHistory(companyId, validTimeframe);

    // Get OHLC data for candlestick charts
    const ohlcData = await priceHistoryService.getPriceHistoryOHLC(companyId, validTimeframe);

    // Get current price stats
    const stats = await priceHistoryService.getPriceStatistics(companyId);

    res.status(200).json({
      success: true,
      data: {
        companyId,
        timeframe: validTimeframe,
        prices: priceHistory.map(p => ({
          timestamp: p.timestamp.toISOString(),
          price: p.price,
          volume: p.volume
        })),
        ohlc: ohlcData.map(c => ({
          timestamp: c.timestamp.toISOString(),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume
        })),
        statistics: stats
      }
    });

  } catch (error) {
    console.error('[TradingController] Error getting price history:', error);
    res.status(500).json({
      success: false,
      error: {
        code: TradingErrorCode.INTERNAL_ERROR,
        message: 'Failed to retrieve price history'
      }
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getOrderBook,
  placeOrder,
  getMyOrders,
  cancelOrder,
  getTradeHistory,
  getPortfolio,
  getPriceHistory,
  setSocketIO
};
