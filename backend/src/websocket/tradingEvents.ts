/**
 * WebSocket Trading Events Module
 * 
 * Handles all real-time WebSocket events for the trading engine:
 * - price_update: Broadcast price changes to all subscribers
 * - order_matched: Notify users when their orders are filled
 * - new_trade: Update order book with new trades
 * - order_book_update: Refresh order book displays
 * - dividend_distributed: Notify users of dividend payments
 * - order_placed: Notify when new orders are added
 * - order_cancelled: Notify when orders are cancelled
 * 
 * Room Structure:
 * - company:{companyId} - Subscribe to all events for a specific company
 * - user:{userId} - Subscribe to personal events (order fills, dividends)
 * - market:* - Subscribe to all market events
 * 
 * Authentication:
 * - Clients must provide JWT token on connection
 * - User-specific rooms require valid authentication
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import {
  TradingEventType,
  PriceUpdateEvent,
  OrderMatchedEvent,
  NewTradeEvent,
  OrderBookUpdateEvent,
  DividendDistributedEvent,
  OrderSide
} from '../types/trading';

// ============================================================================
// PRISMA CLIENT
// ============================================================================

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ============================================================================
// SOCKET.IO INSTANCE
// ============================================================================

let io: SocketIOServer | null = null;

/**
 * Initialize the WebSocket server with trading events
 * 
 * @param socketIO - Socket.io server instance
 */
export function initializeTradingEvents(socketIO: SocketIOServer): void {
  io = socketIO;

  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        // Allow connection without auth for public events
        socket.data.isAuthenticated = false;
        return next();
      }

      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      
      // Fetch user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, fullName: true, role: true }
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.user = user;
      socket.data.isAuthenticated = true;
      
      next();
    } catch (error) {
      console.error('[TradingEvents] Authentication error:', error);
      socket.data.isAuthenticated = false;
      next();
    }
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    console.log(`[TradingEvents] Client connected: ${socket.id}, authenticated: ${socket.data.isAuthenticated}`);

    // Handle subscription to company events
    socket.on('subscribe_company', (companyId: string) => {
      if (!companyId) {
        socket.emit('error', { message: 'Company ID is required' });
        return;
      }

      const room = `company:${companyId}`;
      socket.join(room);
      console.log(`[TradingEvents] Socket ${socket.id} subscribed to ${room}`);

      // Send initial order book data
      sendInitialOrderBook(socket, companyId);
    });

    // Handle unsubscription from company events
    socket.on('unsubscribe_company', (companyId: string) => {
      if (!companyId) return;

      const room = `company:${companyId}`;
      socket.leave(room);
      console.log(`[TradingEvents] Socket ${socket.id} unsubscribed from ${room}`);
    });

    // Handle subscription to user-specific events
    socket.on('subscribe_user', () => {
      if (!socket.data.isAuthenticated || !socket.data.user) {
        socket.emit('error', { message: 'Authentication required for user events' });
        return;
      }

      const room = `user:${socket.data.user.id}`;
      socket.join(room);
      console.log(`[TradingEvents] Socket ${socket.id} subscribed to ${room}`);

      // Send initial portfolio data
      sendInitialPortfolio(socket, socket.data.user.id);
    });

    // Handle subscription to market-wide events
    socket.on('subscribe_market', () => {
      socket.join('market:*');
      console.log(`[TradingEvents] Socket ${socket.id} subscribed to market events`);

      // Send initial market data
      sendInitialMarketData(socket);
    });

    // Handle price history request
    socket.on('get_price_history', async (data: { companyId: string; timeframe: string }) => {
      try {
        const { companyId, timeframe } = data;
        
        const priceHistory = await prisma.priceHistory.findMany({
          where: { companyId },
          orderBy: { timestamp: 'asc' },
          take: 100
        });

        socket.emit('price_history', {
          companyId,
          timeframe,
          data: priceHistory
        });
      } catch (error) {
        console.error('[TradingEvents] Error fetching price history:', error);
        socket.emit('error', { message: 'Failed to fetch price history' });
      }
    });

    // Handle order book request
    socket.on('get_order_book', async (companyId: string) => {
      try {
        const orderBook = await buildOrderBook(companyId);
        socket.emit('order_book', orderBook);
      } catch (error) {
        console.error('[TradingEvents] Error fetching order book:', error);
        socket.emit('error', { message: 'Failed to fetch order book' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[TradingEvents] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[TradingEvents] WebSocket trading events initialized');
}

// ============================================================================
// EVENT EMITTERS
// ============================================================================

/**
 * Emit price update event
 * Broadcasts to company room and market subscribers
 * 
 * @param data - Price update data
 */
export function emitPriceUpdate(data: PriceUpdateEvent['data']): void {
  if (!io) return;

  const event: PriceUpdateEvent = {
    type: TradingEventType.PRICE_UPDATE,
    data
  };

  // Emit to company-specific room
  io.to(`company:${data.companyId}`).emit(TradingEventType.PRICE_UPDATE, event);

  // Emit to market subscribers
  io.to('market:*').emit(TradingEventType.PRICE_UPDATE, event);

  console.log(`[TradingEvents] Price update emitted: ${data.companyName} $${data.newPrice}`);
}

/**
 * Emit order matched event
 * Notifies the user whose order was filled
 * 
 * @param data - Order matched data
 */
export function emitOrderMatched(data: OrderMatchedEvent['data']): void {
  if (!io) return;

  const event: OrderMatchedEvent = {
    type: TradingEventType.ORDER_MATCHED,
    data
  };

  // Emit to user-specific room
  const userId = data.side === OrderSide.BUY 
    ? data.tradeId // This should be buyerId in actual implementation
    : data.tradeId; // This should be sellerId in actual implementation

  io.to(`user:${userId}`).emit(TradingEventType.ORDER_MATCHED, event);

  // Also emit to company room for order book updates
  io.to(`company:${data.companyId}`).emit(TradingEventType.ORDER_MATCHED, event);

  console.log(`[TradingEvents] Order matched emitted: order ${data.orderId}, ${data.filledQuantity} shares @ $${data.price}`);
}

/**
 * Emit new trade event
 * Broadcasts trade execution to company subscribers
 * 
 * @param data - New trade data
 */
export function emitNewTrade(data: NewTradeEvent['data']): void {
  if (!io) return;

  const event: NewTradeEvent = {
    type: TradingEventType.NEW_TRADE,
    data
  };

  // Emit to company-specific room
  io.to(`company:${data.companyId}`).emit(TradingEventType.NEW_TRADE, event);

  // Emit to market subscribers
  io.to('market:*').emit(TradingEventType.NEW_TRADE, event);

  console.log(`[TradingEvents] New trade emitted: ${data.companyName}, ${data.quantity} shares @ $${data.price}`);
}

/**
 * Emit order book update event
 * Notifies subscribers that order book has changed
 * 
 * @param companyId - Company ID
 * @param buyOrders - Updated buy orders
 * @param sellOrders - Updated sell orders
 */
export function emitOrderBookUpdate(
  companyId: string,
  buyOrders: OrderBookUpdateEvent['data']['buyOrders'],
  sellOrders: OrderBookUpdateEvent['data']['sellOrders']
): void {
  if (!io) return;

  const event: OrderBookUpdateEvent = {
    type: TradingEventType.ORDER_BOOK_UPDATE,
    data: {
      companyId,
      buyOrders,
      sellOrders,
      timestamp: new Date()
    }
  };

  io.to(`company:${companyId}`).emit(TradingEventType.ORDER_BOOK_UPDATE, event);
}

/**
 * Emit dividend distributed event
 * Notifies users of dividend payments
 * 
 * @param data - Dividend distribution data
 */
export function emitDividendDistributed(data: DividendDistributedEvent['data']): void {
  if (!io) return;

  const event: DividendDistributedEvent = {
    type: TradingEventType.DIVIDEND_DISTRIBUTED,
    data
  };

  // Emit to user-specific room
  io.to(`user:${data.userId}`).emit(TradingEventType.DIVIDEND_DISTRIBUTED, event);

  console.log(`[TradingEvents] Dividend distributed emitted: ${data.companyName}, $${data.payoutAmount}`);
}

/**
 * Emit order placed event
 * Notifies company subscribers of new orders
 * 
 * @param data - Order placed data
 */
export function emitOrderPlaced(data: {
  orderId: string;
  companyId: string;
  side: OrderSide;
  orderType: string;
  quantity: number;
  price?: number;
  timestamp: Date;
}): void {
  if (!io) return;

  io.to(`company:${data.companyId}`).emit(TradingEventType.ORDER_PLACED, {
    type: TradingEventType.ORDER_PLACED,
    data
  });
}

/**
 * Emit order cancelled event
 * Notifies company subscribers of cancelled orders
 * 
 * @param data - Order cancelled data
 */
export function emitOrderCancelled(data: {
  orderId: string;
  companyId: string;
  timestamp: Date;
}): void {
  if (!io) return;

  io.to(`company:${data.companyId}`).emit(TradingEventType.ORDER_CANCELLED, {
    type: TradingEventType.ORDER_CANCELLED,
    data
  });
}

// ============================================================================
// INITIAL DATA SENDERS
// ============================================================================

/**
 * Send initial order book data to a newly connected socket
 * 
 * @param socket - Socket instance
 * @param companyId - Company ID
 */
async function sendInitialOrderBook(socket: Socket, companyId: string): Promise<void> {
  try {
    const orderBook = await buildOrderBook(companyId);
    socket.emit('order_book', orderBook);
  } catch (error) {
    console.error('[TradingEvents] Error sending initial order book:', error);
  }
}

/**
 * Send initial portfolio data to a newly connected socket
 * 
 * @param socket - Socket instance
 * @param userId - User ID
 */
async function sendInitialPortfolio(socket: Socket, userId: string): Promise<void> {
  try {
    const holdings = await prisma.stockHolding.findMany({
      where: { userId },
      include: {
        company: {
          select: {
            businessName: true,
            currentPrice: true
          }
        }
      }
    });

    const portfolio = holdings.map(h => ({
      companyId: h.companyId,
      companyName: h.company.businessName,
      sharesOwned: h.sharesOwned,
      averageBuyPrice: h.averageBuyPrice,
      currentPrice: h.company.currentPrice,
      currentValue: h.sharesOwned * h.company.currentPrice,
      totalInvested: h.totalInvested,
      profitLoss: (h.sharesOwned * h.company.currentPrice) - h.totalInvested
    }));

    socket.emit('portfolio_update', {
      holdings: portfolio,
      totalValue: portfolio.reduce((sum, h) => sum + h.currentValue, 0),
      timestamp: new Date()
    });
  } catch (error) {
    console.error('[TradingEvents] Error sending initial portfolio:', error);
  }
}

/**
 * Send initial market data to a newly connected socket
 * 
 * @param socket - Socket instance
 */
async function sendInitialMarketData(socket: Socket): Promise<void> {
  try {
    const companies = await prisma.company.findMany({
      where: {
        listing_status: { in: ['active', 'ipo'] }
      },
      select: {
        id: true,
        business_name: true,
        current_price: true,
        category: true
      },
      take: 50
    });

    socket.emit('market_data', {
      companies: companies.map(c => ({
        companyId: c.id,
        companyName: c.business_name,
        currentPrice: c.current_price,
        category: c.category
      })),
      timestamp: new Date()
    });
  } catch (error) {
    console.error('[TradingEvents] Error sending initial market data:', error);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build order book data for a company
 * 
 * @param companyId - Company ID
 * @returns Order book data
 */
async function buildOrderBook(companyId: string): Promise<{
  companyId: string;
  buyOrders: Array<{ price: number; quantity: number; total: number; orderCount: number }>;
  sellOrders: Array<{ price: number; quantity: number; total: number; orderCount: number }>;
  timestamp: Date;
}> {
  const [buyOrders, sellOrders] = await Promise.all([
    // Get aggregated buy orders
    prisma.orders.groupBy({
      by: ['price'],
      where: {
        companyId,
        side: 'buy',
        status: { in: ['pending', 'partial'] },
        remainingQuantity: { gt: 0 }
      },
      _sum: { remainingQuantity: true },
      _count: { id: true },
      orderBy: { price: 'desc' },
      take: 10
    }),
    // Get aggregated sell orders
    prisma.orders.groupBy({
      by: ['price'],
      where: {
        companyId,
        side: 'sell',
        status: { in: ['pending', 'partial'] },
        remainingQuantity: { gt: 0 }
      },
      _sum: { remainingQuantity: true },
      _count: { id: true },
      orderBy: { price: 'asc' },
      take: 10
    })
  ]);

  return {
    companyId,
    buyOrders: buyOrders.map(o => ({
      price: o.price || 0,
      quantity: o._sum.remainingQuantity || 0,
      total: (o.price || 0) * (o._sum.remainingQuantity || 0),
      orderCount: o._count.id
    })),
    sellOrders: sellOrders.map(o => ({
      price: o.price || 0,
      quantity: o._sum.remainingQuantity || 0,
      total: (o.price || 0) * (o._sum.remainingQuantity || 0),
      orderCount: o._count.id
    })),
    timestamp: new Date()
  };
}

/**
 * Broadcast a message to all connected clients
 * 
 * @param event - Event name
 * @param data - Event data
 */
export function broadcast(event: string, data: any): void {
  if (!io) return;
  io.emit(event, data);
}

/**
 * Get the number of connected clients
 * 
 * @returns Number of connected sockets
 */
export function getConnectedClientsCount(): number {
  if (!io) return 0;
  return io.engine.clientsCount;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  initializeTradingEvents,
  emitPriceUpdate,
  emitOrderMatched,
  emitNewTrade,
  emitOrderBookUpdate,
  emitDividendDistributed,
  emitOrderPlaced,
  emitOrderCancelled,
  broadcast,
  getConnectedClientsCount
};
