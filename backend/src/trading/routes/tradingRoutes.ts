/**
 * Trading Routes
 * 
 * Defines all API routes for the trading module.
 * All routes are protected by authentication middleware.
 */

import { Router } from 'express';
import tradingController from '../controllers/tradingController';

const router = Router();

// GET /api/trading/orderbook/:companyId - View order book
router.get('/orderbook/:companyId', tradingController.getOrderBook);

// POST /api/trading/orders - Place buy/sell order
router.post('/orders', tradingController.placeOrder);

// GET /api/trading/orders/my - Get user's active orders
router.get('/orders/my', tradingController.getMyOrders);

// DELETE /api/trading/orders/:id - Cancel order
router.delete('/orders/:id', tradingController.cancelOrder);

// GET /api/trading/trades/history - Trade history
router.get('/trades/history', tradingController.getTradeHistory);

// GET /api/trading/portfolio - User's stock holdings
router.get('/portfolio', tradingController.getPortfolio);

// GET /api/trading/price-history/:companyId - Price history for charts
router.get('/price-history/:companyId', tradingController.getPriceHistory);

export default router;
