/**
 * Trading Routes
 * 
 * Defines all API routes for the trading module.
 * All routes are protected by authentication middleware.
 */

import { Router } from 'express';
import tradingController from '../controllers/tradingController';

const router = Router();

// ============================================================================
// ORDER BOOK ROUTES
// ============================================================================

/**
 * GET /api/trading/orderbook/:companyId
 * View the order book for a specific company
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     companyId: string,
 *     companyName: string,
 *     currentPrice: number,
 *     buyOrders: [{ price, quantity, total, orderCount }],
 *     sellOrders: [{ price, quantity, total, orderCount }],
 *     lastUpdated: string
 *   }
 * }
 */
router.get('/orderbook/:companyId', tradingController.getOrderBook);

// ============================================================================
// ORDER ROUTES
// ============================================================================

/**
 * POST /api/trading/orders
 * Place a new buy or sell order
 * 
 * Body:
 * {
 *   companyId: string,
 *   orderType: 'market' | 'limit',
 *   side: 'buy' | 'sell',
 *   quantity: number,
 *   price?: number (required for limit orders),
 *   expiresAt?: string (ISO date for limit orders)
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     order: OrderResponse,
 *     matchedTrades: number,
 *     message: string
 *   }
 * }
 */
router.post('/orders', tradingController.placeOrder);

/**
 * GET /api/trading/orders/my
 * Get the current user's active orders
 * 
 * Query params:
 * - status: Filter by status (pending, partial, filled, cancelled)
 * - companyId: Filter by company
 * - limit: Number of results (default 20, max 100)
 * - offset: Pagination offset
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     data: OrderResponse[],
 *     total: number,
 *     page: number,
 *     limit: number,
 *     totalPages: number
 *   }
 * }
 */
router.get('/orders/my', tradingController.getMyOrders);

/**
 * DELETE /api/trading/orders/:id
 * Cancel a pending or partially filled order
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     orderId: string,
 *     status: string,
 *     message: string
 *   }
 * }
 */
router.delete('/orders/:id', tradingController.cancelOrder);

// ============================================================================
// TRADE HISTORY ROUTES
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
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     data: TradeHistoryItem[],
 *     total: number,
 *     page: number,
 *     limit: number,
 *     totalPages: number
 *   }
 * }
 */
router.get('/trades/history', tradingController.getTradeHistory);

// ============================================================================
// PORTFOLIO ROUTES
// ============================================================================

/**
 * GET /api/trading/portfolio
 * Get the current user's portfolio with holdings and performance metrics
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     summary: {
 *       totalValue: number,
 *       totalInvested: number,
 *       totalProfitLoss: number,
 *       totalProfitLossPercentage: number,
 *       totalDividendsEarned: number,
 *       dayChange: number,
 *       dayChangePercentage: number
 *     },
 *     holdings: HoldingItem[],
 *     performance: {
 *       totalReturn: number,
 *       totalReturnPercentage: number,
 *       bestPerformer: HoldingPerformance | null,
 *       worstPerformer: HoldingPerformance | null
 *     },
 *     diversification: {
 *       byBusinessType: Record<string, { value, percentage }>,
 *       byCategory: Record<string, { value, percentage }>
 *     },
 *     dividends: DividendHistory,
 *     lastUpdated: string
 *   }
 * }
 */
router.get('/portfolio', tradingController.getPortfolio);

// ============================================================================
// PRICE HISTORY ROUTES
// ============================================================================

/**
 * GET /api/trading/price-history/:companyId
 * Get price history for charting
 * 
 * Query params:
 * - timeframe: 1h, 1d, 1w, 1m, 3m, 6m, 1y, all (default: 1m)
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     companyId: string,
 *     timeframe: string,
 *     prices: [{ timestamp, price, volume }],
 *     ohlc: [{ timestamp, open, high, low, close, volume }],
 *     statistics: PriceStatistics
 *   }
 * }
 */
router.get('/price-history/:companyId', tradingController.getPriceHistory);

// ============================================================================
// EXPORTS
// ============================================================================

export default router;
