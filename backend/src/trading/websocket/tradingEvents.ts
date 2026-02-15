/**
 * WebSocket Trading Events Module
 * 
 * Handles all real-time WebSocket events for the trading engine.
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

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

let io: SocketIOServer | null = null;

/**
 * Initialize the WebSocket server with trading events
 */
export function initializeTradingEvents(socketIO: SocketIOServer): void {
  io = socketIO;

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        socket.data.isAuthenticated = false;
        return next();
      }

      const decoded = jwt.verify(token as string, JWT_SECRET) as { userId: string; email: string };
      
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

  io.on('connection', (socket: Socket) => {
    console.log(`[TradingEvents] Client connected: ${socket.id}, authenticated: ${socket.data.isAuthenticated}`);

    socket.on('subscribe_company', (companyId: string) => {
      if (!companyId) {
        socket.emit('error', { message: 'Company ID is required' });
        return;
      }

      const room = `company:${companyId}`;
      socket.join(room);
      console.log(`[TradingEvents] Socket ${socket.id} subscribed to ${room}`);

      sendInitialOrderBook(socket, companyId);
    });

    socket.on('unsubscribe_company', (companyId: string) => {
      if (!companyId) return;

      const room = `company:${companyId}`;
      socket.leave(room);
      console.log(`[TradingEvents] Socket ${socket.id} unsubscribed from ${room}`);
    });

    socket.on('subscribe_user', () => {
      if (!socket.data.isAuthenticated || !socket.data.user) {
        socket.emit('error', { message: 'Authentication required for user events' });
        return;
      }

      const room = `user:${socket.data.user.id}`;
      socket.join(room);
      console.log(`[TradingEvents] Socket ${socket.id} subscribed to ${room}`);

      sendInitialPortfolio(socket, socket.data.user.id);
    });

    socket.on('subscribe_market', () => {
      socket.join('market:*');
      console.log(`[TradingEvents] Socket ${socket.id} subscribed to market events`);

      sendInitialMarketData(socket);
    });

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

    socket.on('get_order_book', async (companyId: string) => {
      try {
        const orderBook = await buildOrderBook(companyId);
        socket.emit('order_book', orderBook);
      } catch (error) {
        console.error('[TradingEvents] Error fetching order book:', error);
        socket.emit('error', { message: 'Failed to fetch order book' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[TradingEvents] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[TradingEvents] WebSocket trading events initialized');
}

/**
 * Emit price update event
 */
export function emitPriceUpdate(data: PriceUpdateEvent['data']): void {
  if (!io) return;

  const event: PriceUpdateEvent = {
    type: TradingEventType.PRICE_UPDATE,
    data
  };

  io.to(`company:${data.companyId}`).emit(TradingEventType.PRICE_UPDATE, event);
  io.to('market:*').emit(TradingEventType.PRICE_UPDATE, event);

  console.log(`[TradingEvents] Price update emitted: ${data.companyName} $${data.newPrice}`);
}

/**
 * Emit order matched event
 */
export function emitOrderMatched(data: OrderMatchedEvent['data']): void {
  if (!io) return;

  const event: OrderMatchedEvent = {
    type: TradingEventType.ORDER_MATCHED,
    data
  };

  io.to(`user:${data.tradeId}`).emit(TradingEventType.ORDER_MATCHED, event);
  io.to(`company:${data.companyId}`).emit(TradingEventType.ORDER_MATCHED, event);

  console.log(`[TradingEvents] Order matched emitted: order ${data.orderId}`);
}

/**
 * Emit new trade event
 */
export function emitNewTrade(data: NewTradeEvent['data']): void {
  if (!io) return;

  const event: NewTradeEvent = {
    type: TradingEventType.NEW_TRADE,
    data
  };

  io.to(`company:${data.companyId}`).emit(TradingEventType.NEW_TRADE, event);
  io.to('market:*').emit(TradingEventType.NEW_TRADE, event);

  console.log(`[TradingEvents] New trade emitted: ${data.companyName}, ${data.quantity} shares @ $${data.price}`);
}

/**
 * Emit order book update event
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
 */
export function emitDividendDistributed(data: DividendDistributedEvent['data']): void {
  if (!io) return;

  const event: DividendDistributedEvent = {
    type: TradingEventType.DIVIDEND_DISTRIBUTED,
    data
  };

  io.to(`user:${data.userId}`).emit(TradingEventType.DIVIDEND_DISTRIBUTED, event);

  console.log(`[TradingEvents] Dividend distributed emitted: ${data.companyName}, $${data.payoutAmount}`);
}

/**
 * Emit order placed event
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

async function sendInitialOrderBook(socket: Socket, companyId: string): Promise<void> {
  try {
    const orderBook = await buildOrderBook(companyId);
    socket.emit('order_book', orderBook);
  } catch (error) {
    console.error('[TradingEvents] Error sending initial order book:', error);
  }
}

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

async function sendInitialMarketData(socket: Socket): Promise<void> {
  try {
    const companies = await prisma.company.findMany({
      where: {
        listingStatus: { in: ['active', 'ipo'] }
      },
      select: {
        id: true,
        businessName: true,
        currentPrice: true,
        category: true
      },
      take: 50
    });

    socket.emit('market_data', {
      companies: companies.map(c => ({
        companyId: c.id,
        companyName: c.businessName,
        currentPrice: c.currentPrice,
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

async function buildOrderBook(companyId: string): Promise<{
  companyId: string;
  buyOrders: Array<{ price: number; quantity: number; total: number; orderCount: number }>;
  sellOrders: Array<{ price: number; quantity: number; total: number; orderCount: number }>;
  timestamp: Date;
}> {
  const [buyOrders, sellOrders] = await Promise.all([
    prisma.order.groupBy({
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
    prisma.order.groupBy({
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
 */
export function broadcast(event: string, data: any): void {
  if (!io) return;
  io.emit(event, data);
}

/**
 * Get the number of connected clients
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
