/**
 * Trading Engine Module
 * 
 * Main entry point for the trading engine module.
 * Exports all components for the trading platform.
 */

// ============================================================================
// TYPES
// ============================================================================

export * from './types/trading';

// ============================================================================
// SERVICES
// ============================================================================

export { default as orderMatchingService } from './services/orderMatching';
export { default as portfolioService } from './services/portfolioService';
export { default as priceHistoryService } from './services/priceHistoryService';

// ============================================================================
// CONTROLLERS
// ============================================================================

export { default as tradingController } from './controllers/tradingController';
export { setSocketIO as setTradingSocketIO } from './controllers/tradingController';

// ============================================================================
// ROUTES
// ============================================================================

export { default as tradingRoutes } from './routes/tradingRoutes';

// ============================================================================
// WEBSOCKET
// ============================================================================

export { 
  default as tradingEvents,
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
} from './websocket/tradingEvents';

// ============================================================================
// MODULE INITIALIZATION
// ============================================================================

import { Server as SocketIOServer } from 'socket.io';

/**
 * Initialize the trading module with Socket.io
 * 
 * @param io - Socket.io server instance
 */
export function initializeTradingModule(io: SocketIOServer): void {
  setTradingSocketIO(io);
  initializeTradingEvents(io);
  console.log('[TradingModule] Trading module initialized');
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  initializeTradingModule
};
