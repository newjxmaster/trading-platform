/**
 * Socket.io Service
 * 
 * This module handles all real-time WebSocket communication
 * including price updates, order matching, and notifications.
 * 
 * @module services/socket
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { WebSocketEvent, PriceUpdatePayload, OrderMatchedPayload, NewTradePayload, DividendDistributedPayload } from '../types';

/**
 * JWT secret for socket authentication
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Authenticated socket interface
 */
interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

/**
 * Setup Socket.io event handlers
 * @param io - Socket.io server instance
 */
export const setupSocketHandlers = (io: SocketIOServer): void => {
  // Middleware for socket authentication
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        // Allow connection without auth for public events
        return next();
      }
      
      const decoded = jwt.verify(token as string, JWT_SECRET) as { userId: string; role: string };
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      
      next();
    } catch (error) {
      logger.warn('Socket authentication failed', { error });
      // Still allow connection for public events
      next();
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info('Client connected', {
      socketId: socket.id,
      userId: socket.userId,
      ip: socket.handshake.address,
    });

    // ============================================
    // Subscription Events
    // ============================================

    /**
     * Subscribe to company price updates
     */
    socket.on(WebSocketEvent.SUBSCRIBE, (data: { companyId: string }) => {
      if (data.companyId) {
        const room = `company:${data.companyId}`;
        socket.join(room);
        logger.debug(`Socket ${socket.id} subscribed to ${room}`);
        
        // Send confirmation
        socket.emit('subscribed', { companyId: data.companyId });
      }
    });

    /**
     * Unsubscribe from company price updates
     */
    socket.on(WebSocketEvent.UNSUBSCRIBE, (data: { companyId: string }) => {
      if (data.companyId) {
        const room = `company:${data.companyId}`;
        socket.leave(room);
        logger.debug(`Socket ${socket.id} unsubscribed from ${room}`);
        
        // Send confirmation
        socket.emit('unsubscribed', { companyId: data.companyId });
      }
    });

    /**
     * Subscribe to user's personal events
     */
    socket.on('subscribe_user', () => {
      if (socket.userId) {
        const room = `user:${socket.userId}`;
        socket.join(room);
        logger.debug(`Socket ${socket.id} subscribed to user events`);
        
        socket.emit('user_subscribed', { userId: socket.userId });
      }
    });

    /**
     * Subscribe to order book updates
     */
    socket.on('subscribe_orderbook', (data: { companyId: string }) => {
      if (data.companyId) {
        const room = `orderbook:${data.companyId}`;
        socket.join(room);
        logger.debug(`Socket ${socket.id} subscribed to orderbook ${data.companyId}`);
        
        socket.emit('orderbook_subscribed', { companyId: data.companyId });
      }
    });

    // ============================================
    // Disconnection Handler
    // ============================================

    socket.on('disconnect', (reason) => {
      logger.info('Client disconnected', {
        socketId: socket.id,
        userId: socket.userId,
        reason,
      });
    });

    // ============================================
    // Error Handler
    // ============================================

    socket.on('error', (error) => {
      logger.error('Socket error', {
        socketId: socket.id,
        userId: socket.userId,
        error,
      });
    });
  });
};

// ============================================
// Broadcast Functions
// ============================================

/**
 * Broadcast price update to all subscribers
 * @param io - Socket.io server instance
 * @param payload - Price update data
 */
export const broadcastPriceUpdate = (
  io: SocketIOServer,
  payload: PriceUpdatePayload
): void => {
  const room = `company:${payload.companyId}`;
  
  io.to(room).emit(WebSocketEvent.PRICE_UPDATE, {
    ...payload,
    timestamp: new Date(),
  });
  
  logger.debug('Price update broadcasted', {
    companyId: payload.companyId,
    newPrice: payload.newPrice,
    subscribers: io.sockets.adapter.rooms.get(room)?.size || 0,
  });
};

/**
 * Broadcast order matched event
 * @param io - Socket.io server instance
 * @param payload - Order matched data
 */
export const broadcastOrderMatched = (
  io: SocketIOServer,
  payload: OrderMatchedPayload
): void => {
  // Notify the user who placed the order
  const userRoom = `user:${payload.side === 'buy' ? payload.orderId : payload.orderId}`;
  io.to(userRoom).emit(WebSocketEvent.ORDER_MATCHED, {
    ...payload,
    timestamp: new Date(),
  });
  
  // Update order book for all subscribers
  const orderbookRoom = `orderbook:${payload.companyId}`;
  io.to(orderbookRoom).emit('orderbook_update', {
    companyId: payload.companyId,
    side: payload.side,
    quantity: payload.quantity,
    price: payload.price,
  });
  
  logger.debug('Order matched broadcasted', {
    orderId: payload.orderId,
    companyId: payload.companyId,
  });
};

/**
 * Broadcast new trade event
 * @param io - Socket.io server instance
 * @param payload - New trade data
 */
export const broadcastNewTrade = (
  io: SocketIOServer,
  payload: NewTradePayload
): void => {
  const room = `company:${payload.companyId}`;
  
  io.to(room).emit(WebSocketEvent.NEW_TRADE, {
    ...payload,
    timestamp: new Date(),
  });
  
  logger.debug('New trade broadcasted', {
    tradeId: payload.tradeId,
    companyId: payload.companyId,
    volume: payload.quantity,
  });
};

/**
 * Broadcast dividend distributed event
 * @param io - Socket.io server instance
 * @param payload - Dividend distributed data
 */
export const broadcastDividendDistributed = (
  io: SocketIOServer,
  payload: DividendDistributedPayload
): void => {
  // Notify all users who received dividends
  const room = `company:${payload.companyId}`;
  
  io.to(room).emit(WebSocketEvent.DIVIDEND_DISTRIBUTED, {
    ...payload,
    timestamp: new Date(),
  });
  
  logger.info('Dividend distributed broadcasted', {
    dividendId: payload.dividendId,
    companyId: payload.companyId,
    amount: payload.amount,
  });
};

/**
 * Send notification to specific user
 * @param io - Socket.io server instance
 * @param userId - User ID
 * @param notification - Notification data
 */
export const sendUserNotification = (
  io: SocketIOServer,
  userId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }
): void => {
  const room = `user:${userId}`;
  
  io.to(room).emit('notification', {
    ...notification,
    timestamp: new Date(),
  });
  
  logger.debug('User notification sent', {
    userId,
    type: notification.type,
  });
};

/**
 * Broadcast system message to all connected clients
 * @param io - Socket.io server instance
 * @param message - System message
 */
export const broadcastSystemMessage = (
  io: SocketIOServer,
  message: {
    type: 'info' | 'warning' | 'error';
    title: string;
    content: string;
  }
): void => {
  io.emit('system_message', {
    ...message,
    timestamp: new Date(),
  });
  
  logger.info('System message broadcasted', {
    type: message.type,
    title: message.title,
  });
};

export default {
  setupSocketHandlers,
  broadcastPriceUpdate,
  broadcastOrderMatched,
  broadcastNewTrade,
  broadcastDividendDistributed,
  sendUserNotification,
  broadcastSystemMessage,
};
