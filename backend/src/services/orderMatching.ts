/**
 * Order Matching Service
 * 
 * Core trading engine that matches buy and sell orders using price-time priority.
 * Supports both market orders (immediate execution at best price) and limit orders
 * (execution when price conditions are met).
 * 
 * Key Features:
 * - Price-time priority matching
 * - 0.5% platform fee on trades
 * - Transactional integrity using Prisma transactions
 * - Real-time WebSocket notifications
 * - Partial fill support
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';
import {
  Order,
  Trade,
  OrderType,
  OrderSide,
  OrderStatus,
  TradeExecutionResult,
  TradingErrorCode,
  TradingError,
  DEFAULT_TRADING_CONFIG,
  TradingConfig,
  TradingEventType
} from '../types/trading';

// ============================================================================
// PRISMA CLIENT
// ============================================================================

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION
// ============================================================================

const config: TradingConfig = DEFAULT_TRADING_CONFIG;

// ============================================================================
// MAIN MATCHING FUNCTIONS
// ============================================================================

/**
 * Main entry point for order matching
 * Routes to appropriate handler based on order type
 * 
 * @param newOrder - The newly created order to match
 * @param io - Socket.io server for real-time notifications
 * @returns TradeExecutionResult with match details
 */
export async function matchOrders(
  newOrder: Order,
  io?: SocketIOServer
): Promise<TradeExecutionResult[]> {
  console.log(`[OrderMatching] Starting match for order ${newOrder.id}, type: ${newOrder.orderType}, side: ${newOrder.side}`);

  try {
    if (newOrder.orderType === OrderType.MARKET) {
      return await handleMarketOrder(newOrder, io);
    } else if (newOrder.orderType === OrderType.LIMIT) {
      return await handleLimitOrder(newOrder, io);
    } else {
      throw createError(TradingErrorCode.INVALID_ORDER_TYPE, `Invalid order type: ${newOrder.orderType}`);
    }
  } catch (error) {
    console.error(`[OrderMatching] Error matching order ${newOrder.id}:`, error);
    throw error;
  }
}

/**
 * Handle market order execution
 * Market orders are executed immediately at the best available price
 * 
 * Algorithm:
 * 1. Find opposite orders (sells for buys, buys for sells)
 * 2. Sort by price (best first), then by time (oldest first)
 * 3. Match until order is filled or no more matches available
 * 
 * @param order - Market order to execute
 * @param io - Socket.io server for notifications
 * @returns Array of trade execution results
 */
export async function handleMarketOrder(
  order: Order,
  io?: SocketIOServer
): Promise<TradeExecutionResult[]> {
  console.log(`[OrderMatching] Processing market order ${order.id} (${order.side} ${order.quantity} shares)`);

  const results: TradeExecutionResult[] = [];
  let remainingQty = order.remainingQuantity;

  // Execute within transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // Get opposite orders sorted by price-time priority
    const oppositeOrders = await getOppositeOrders(tx, order);

    if (oppositeOrders.length === 0) {
      console.log(`[OrderMatching] No matching orders available for market order ${order.id}`);
      // For market orders with no matches, we could reject or keep pending
      // Here we'll keep it pending until matches are available
      return;
    }

    for (const oppositeOrder of oppositeOrders) {
      if (remainingQty <= 0) break;

      // Calculate match quantity
      const matchQty = Math.min(remainingQty, oppositeOrder.remainingQuantity);
      const matchPrice = oppositeOrder.price!; // Market orders match at opposite order's price

      console.log(`[OrderMatching] Matching ${matchQty} shares at $${matchPrice}`);

      // Create the trade
      const tradeResult = await executeTrade(
        tx,
        order,
        oppositeOrder,
        matchQty,
        matchPrice,
        io
      );

      results.push(tradeResult);
      remainingQty -= matchQty;
    }

    // Update the original order status
    if (remainingQty === 0) {
      await updateOrderStatus(tx, order.id, order.quantity, 0, OrderStatus.FILLED);
    } else if (remainingQty < order.quantity) {
      await updateOrderStatus(tx, order.id, order.quantity - remainingQty, remainingQty, OrderStatus.PARTIAL);
    }
    // If no matches, order stays PENDING

  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5000,
    timeout: 10000
  });

  return results;
}

/**
 * Handle limit order execution
 * Limit orders are executed only when price conditions are met
 * 
 * Algorithm:
 * 1. Find opposite orders that meet price criteria
 *    - Buy limit: match with sells at or below limit price
 *    - Sell limit: match with buys at or above limit price
 * 2. Sort by price (best first), then by time
 * 3. Match while price conditions are satisfied
 * 
 * @param order - Limit order to execute
 * @param io - Socket.io server for notifications
 * @returns Array of trade execution results
 */
export async function handleLimitOrder(
  order: Order,
  io?: SocketIOServer
): Promise<TradeExecutionResult[]> {
  console.log(`[OrderMatching] Processing limit order ${order.id} (${order.side} ${order.quantity} shares @ $${order.price})`);

  const results: TradeExecutionResult[] = [];
  let remainingQty = order.remainingQuantity;

  await prisma.$transaction(async (tx) => {
    // Get matchable opposite orders that meet price criteria
    const matchableOrders = await getMatchableLimitOrders(tx, order);

    if (matchableOrders.length === 0) {
      console.log(`[OrderMatching] No matchable orders for limit order ${order.id} at price $${order.price}`);
      // Limit order stays pending until price conditions are met
      return;
    }

    for (const oppositeOrder of matchableOrders) {
      if (remainingQty <= 0) break;

      // Verify price condition still holds
      if (!isPriceMatchValid(order, oppositeOrder)) {
        console.log(`[OrderMatching] Price condition no longer valid, stopping match`);
        break;
      }

      const matchQty = Math.min(remainingQty, oppositeOrder.remainingQuantity);
      
      // For limit orders, price is determined by the order that was placed first
      // This follows standard exchange rules (maker-taker)
      const matchPrice = determineMatchPrice(order, oppositeOrder);

      console.log(`[OrderMatching] Matching ${matchQty} shares at $${matchPrice}`);

      const tradeResult = await executeTrade(
        tx,
        order,
        oppositeOrder,
        matchQty,
        matchPrice,
        io
      );

      results.push(tradeResult);
      remainingQty -= matchQty;
    }

    // Update order status based on fill amount
    if (remainingQty === 0) {
      await updateOrderStatus(tx, order.id, order.quantity, 0, OrderStatus.FILLED);
    } else if (remainingQty < order.quantity) {
      await updateOrderStatus(tx, order.id, order.quantity - remainingQty, remainingQty, OrderStatus.PARTIAL);
    }
    // If no matches, order stays PENDING

  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5000,
    timeout: 10000
  });

  return results;
}

// ============================================================================
// TRADE EXECUTION
// ============================================================================

/**
 * Execute a single trade between two orders
 * Handles:
 * - Trade record creation
 * - Portfolio updates (share transfer)
 * - Wallet updates (fund transfer)
 * - Fee collection
 * - Price history update
 * 
 * @param tx - Prisma transaction
 * @param order1 - First order (the new order)
 * @param order2 - Second order (existing order in book)
 * @param quantity - Number of shares to trade
 * @param price - Execution price
 * @param io - Socket.io server
 * @returns Trade execution result
 */
export async function executeTrade(
  tx: Prisma.TransactionClient,
  order1: Order,
  order2: Order,
  quantity: number,
  price: number,
  io?: SocketIOServer
): Promise<TradeExecutionResult> {
  const buyerId = order1.side === OrderSide.BUY ? order1.userId : order2.userId;
  const sellerId = order1.side === OrderSide.SELL ? order1.userId : order2.userId;
  const buyOrderId = order1.side === OrderSide.BUY ? order1.id : order2.id;
  const sellOrderId = order1.side === OrderSide.SELL ? order1.id : order2.id;

  const totalAmount = quantity * price;
  const platformFee = totalAmount * config.platformFeePercentage;
  const buyerFee = platformFee; // Buyer pays the fee
  const sellerReceives = totalAmount - platformFee;

  console.log(`[OrderMatching] Executing trade: ${quantity} shares @ $${price}, fee: $${platformFee}`);

  try {
    // 1. Validate buyer has sufficient funds
    const buyer = await tx.user.findUnique({
      where: { id: buyerId },
      select: { walletFiat: true, email: true, fullName: true }
    });

    if (!buyer || buyer.walletFiat < totalAmount) {
      throw createError(TradingErrorCode.INSUFFICIENT_FUNDS, 
        `Buyer ${buyerId} has insufficient funds. Required: $${totalAmount}, Available: $${buyer?.walletFiat || 0}`);
    }

    // 2. Validate seller has sufficient shares
    const sellerHolding = await tx.stockHolding.findUnique({
      where: {
        userId_companyId: {
          userId: sellerId,
          companyId: order1.companyId
        }
      }
    });

    if (!sellerHolding || sellerHolding.sharesOwned < quantity) {
      throw createError(TradingErrorCode.INSUFFICIENT_SHARES,
        `Seller ${sellerId} has insufficient shares. Required: ${quantity}, Available: ${sellerHolding?.sharesOwned || 0}`);
    }

    // 3. Create trade record
    const trade = await tx.trade.create({
      data: {
        buyOrderId,
        sellOrderId,
        buyerId,
        sellerId,
        companyId: order1.companyId,
        quantity,
        price,
        totalAmount,
        platformFee,
        buyerFee,
        sellerFee: 0, // Seller doesn't pay fee directly
        executedAt: new Date()
      }
    });

    // 4. Update buyer's wallet (deduct total amount)
    await tx.user.update({
      where: { id: buyerId },
      data: { walletFiat: { decrement: totalAmount } }
    });

    // 5. Update seller's wallet (add proceeds minus fee)
    await tx.user.update({
      where: { id: sellerId },
      data: { walletFiat: { increment: sellerReceives } }
    });

    // 6. Update seller's holding (deduct shares)
    await tx.stockHolding.update({
      where: { id: sellerHolding.id },
      data: {
        sharesOwned: { decrement: quantity },
        totalInvested: { decrement: quantity * sellerHolding.averageBuyPrice }
      }
    });

    // 7. Update or create buyer's holding (add shares)
    const buyerHolding = await tx.stockHolding.findUnique({
      where: {
        userId_companyId: {
          userId: buyerId,
          companyId: order1.companyId
        }
      }
    });

    if (buyerHolding) {
      // Update existing holding with new average price
      const newTotalShares = buyerHolding.sharesOwned + quantity;
      const newTotalInvested = buyerHolding.totalInvested + totalAmount;
      const newAveragePrice = newTotalInvested / newTotalShares;

      await tx.stockHolding.update({
        where: { id: buyerHolding.id },
        data: {
          sharesOwned: newTotalShares,
          averageBuyPrice: newAveragePrice,
          totalInvested: newTotalInvested
        }
      });
    } else {
      // Create new holding
      await tx.stockHolding.create({
        data: {
          userId: buyerId,
          companyId: order1.companyId,
          sharesOwned: quantity,
          averageBuyPrice: price,
          totalInvested: totalAmount,
          totalDividendsEarned: 0
        }
      });
    }

    // 8. Update opposite order status
    const oppositeOrder = order1.side === OrderSide.BUY ? order2 : order1;
    const oppositeFilled = oppositeOrder.filledQuantity + quantity;
    const oppositeRemaining = oppositeOrder.quantity - oppositeFilled;
    const oppositeStatus = oppositeRemaining === 0 ? OrderStatus.FILLED : OrderStatus.PARTIAL;

    await tx.order.update({
      where: { id: oppositeOrder.id },
      data: {
        filledQuantity: oppositeFilled,
        remainingQuantity: oppositeRemaining,
        status: oppositeStatus,
        updatedAt: new Date()
      }
    });

    // 9. Update company's available shares and current price
    await tx.company.update({
      where: { id: order1.companyId },
      data: {
        currentPrice: price,
        availableShares: { increment: 0 } // No change in total available
      }
    });

    // 10. Record price history
    await tx.priceHistory.create({
      data: {
        companyId: order1.companyId,
        price,
        volume: quantity,
        timestamp: new Date()
      }
    });

    // 11. Record platform fee transaction
    await tx.transaction.create({
      data: {
        userId: buyerId,
        transactionType: 'fee',
        paymentMethod: 'wallet',
        amount: platformFee,
        currency: 'USD',
        status: 'completed',
        metadata: {
          tradeId: trade.id,
          feeType: 'platform_fee'
        }
      }
    });

    // 12. Record trade transactions for buyer and seller
    await tx.transaction.createMany({
      data: [
        {
          userId: buyerId,
          transactionType: 'trade',
          paymentMethod: 'wallet',
          amount: -totalAmount,
          currency: 'USD',
          status: 'completed',
          metadata: {
            tradeId: trade.id,
            type: 'buy',
            companyId: order1.companyId,
            quantity,
            price
          }
        },
        {
          userId: sellerId,
          transactionType: 'trade',
          paymentMethod: 'wallet',
          amount: sellerReceives,
          currency: 'USD',
          status: 'completed',
          metadata: {
            tradeId: trade.id,
            type: 'sell',
            companyId: order1.companyId,
            quantity,
            price
          }
        }
      ]
    });

    // 13. Emit WebSocket events
    if (io) {
      emitTradeEvents(io, trade, order1, order2, price, quantity);
    }

    console.log(`[OrderMatching] Trade executed successfully: ${trade.id}`);

    return {
      success: true,
      trade: mapTradeFromPrisma(trade),
      filledQuantity: quantity,
      remainingQuantity: 0
    };

  } catch (error) {
    console.error(`[OrderMatching] Trade execution failed:`, error);
    throw error;
  }
}

// ============================================================================
// ORDER STATUS MANAGEMENT
// ============================================================================

/**
 * Update order status after partial or complete fill
 * 
 * @param tx - Prisma transaction
 * @param orderId - Order ID to update
 * @param filledQuantity - Total filled quantity
 * @param remainingQuantity - Remaining quantity to fill
 * @param status - New order status
 */
export async function updateOrderStatus(
  tx: Prisma.TransactionClient,
  orderId: string,
  filledQuantity: number,
  remainingQuantity: number,
  status: OrderStatus
): Promise<void> {
  console.log(`[OrderMatching] Updating order ${orderId}: filled=${filledQuantity}, remaining=${remainingQuantity}, status=${status}`);

  await tx.order.update({
    where: { id: orderId },
    data: {
      filledQuantity,
      remainingQuantity,
      status,
      updatedAt: new Date()
    }
  });
}

/**
 * Cancel an order
 * Only pending or partially filled orders can be cancelled
 * 
 * @param orderId - Order ID to cancel
 * @param userId - User requesting cancellation (for authorization)
 * @returns Cancelled order
 */
export async function cancelOrder(
  orderId: string,
  userId: string
): Promise<Order> {
  console.log(`[OrderMatching] Cancelling order ${orderId} by user ${userId}`);

  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!order) {
    throw createError(TradingErrorCode.ORDER_NOT_FOUND, `Order ${orderId} not found`);
  }

  if (order.userId !== userId) {
    throw createError(TradingErrorCode.UNAUTHORIZED, 'Not authorized to cancel this order');
  }

  if (order.status === OrderStatus.FILLED) {
    throw createError(TradingErrorCode.ORDER_ALREADY_FILLED, 'Cannot cancel a filled order');
  }

  if (order.status === OrderStatus.CANCELLED) {
    throw createError(TradingErrorCode.ORDER_ALREADY_CANCELLED, 'Order is already cancelled');
  }

  const cancelledOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.CANCELLED,
      remainingQuantity: 0,
      updatedAt: new Date()
    }
  });

  console.log(`[OrderMatching] Order ${orderId} cancelled successfully`);

  return mapOrderFromPrisma(cancelledOrder);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get opposite orders for matching
 * For buy orders: get sell orders sorted by price (lowest first), then time
 * For sell orders: get buy orders sorted by price (highest first), then time
 */
async function getOppositeOrders(
  tx: Prisma.TransactionClient,
  order: Order
): Promise<Order[]> {
  const oppositeSide = order.side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY;
  
  const priceOrder = order.side === OrderSide.BUY ? 'asc' : 'desc';

  const orders = await tx.order.findMany({
    where: {
      companyId: order.companyId,
      side: oppositeSide,
      status: { in: [OrderStatus.PENDING, OrderStatus.PARTIAL] },
      userId: { not: order.userId }, // Don't match with self
      remainingQuantity: { gt: 0 }
    },
    order: [
      { price: priceOrder },
      { createdAt: 'asc' } // Time priority: oldest first
    ]
  });

  return orders.map(mapOrderFromPrisma);
}

/**
 * Get matchable orders for limit orders with price criteria
 */
async function getMatchableLimitOrders(
  tx: Prisma.TransactionClient,
  order: Order
): Promise<Order[]> {
  const oppositeSide = order.side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY;
  const orderPrice = order.price!;

  // Build price filter based on order side
  const priceFilter = order.side === OrderSide.BUY
    ? { lte: orderPrice }  // Buy: match with sells at or below limit
    : { gte: orderPrice }; // Sell: match with buys at or above limit

  const priceOrder = order.side === OrderSide.BUY ? 'asc' : 'desc';

  const orders = await tx.order.findMany({
    where: {
      companyId: order.companyId,
      side: oppositeSide,
      status: { in: [OrderStatus.PENDING, OrderStatus.PARTIAL] },
      userId: { not: order.userId },
      remainingQuantity: { gt: 0 },
      price: priceFilter
    },
    order: [
      { price: priceOrder },
      { createdAt: 'asc' }
    ]
  });

  return orders.map(mapOrderFromPrisma);
}

/**
 * Check if price match is still valid for limit orders
 */
function isPriceMatchValid(order: Order, oppositeOrder: Order): boolean {
  if (order.side === OrderSide.BUY) {
    // Buy limit: opposite (sell) price must be <= buy limit price
    return (oppositeOrder.price || 0) <= (order.price || 0);
  } else {
    // Sell limit: opposite (buy) price must be >= sell limit price
    return (oppositeOrder.price || 0) >= (order.price || 0);
  }
}

/**
 * Determine the execution price for a match
 * The order that was placed first (maker) determines the price
 */
function determineMatchPrice(order1: Order, order2: Order): number {
  // The order created first is the maker, their price is used
  if (new Date(order1.createdAt) < new Date(order2.createdAt)) {
    return order1.price || order2.price || 0;
  } else {
    return order2.price || order1.price || 0;
  }
}

/**
 * Create a trading error
 */
function createError(code: TradingErrorCode, message: string): TradingError {
  return { code, message };
}

// ============================================================================
// WEBSOCKET EVENTS
// ============================================================================

/**
 * Emit WebSocket events for trade execution
 */
function emitTradeEvents(
  io: SocketIOServer,
  trade: any,
  order1: Order,
  order2: Order,
  price: number,
  quantity: number
): void {
  const companyRoom = `company:${trade.companyId}`;

  // 1. Emit price update
  io.to(companyRoom).emit(TradingEventType.PRICE_UPDATE, {
    companyId: trade.companyId,
    newPrice: price,
    volume: quantity,
    timestamp: new Date()
  });

  // 2. Emit new trade
  io.to(companyRoom).emit(TradingEventType.NEW_TRADE, {
    tradeId: trade.id,
    companyId: trade.companyId,
    quantity,
    price,
    totalAmount: trade.totalAmount,
    executedAt: trade.executedAt
  });

  // 3. Emit order matched to buyer and seller
  io.to(`user:${trade.buyerId}`).emit(TradingEventType.ORDER_MATCHED, {
    orderId: trade.buyOrderId,
    tradeId: trade.id,
    companyId: trade.companyId,
    side: OrderSide.BUY,
    filledQuantity: quantity,
    price,
    totalAmount: trade.totalAmount,
    timestamp: trade.executedAt
  });

  io.to(`user:${trade.sellerId}`).emit(TradingEventType.ORDER_MATCHED, {
    orderId: trade.sellOrderId,
    tradeId: trade.id,
    companyId: trade.companyId,
    side: OrderSide.SELL,
    filledQuantity: quantity,
    price,
    totalAmount: trade.totalAmount - trade.platformFee,
    timestamp: trade.executedAt
  });

  // 4. Emit order book update
  io.to(companyRoom).emit(TradingEventType.ORDER_BOOK_UPDATE, {
    companyId: trade.companyId,
    timestamp: new Date()
  });
}

// ============================================================================
// MAPPERS
// ============================================================================

function mapOrderFromPrisma(order: any): Order {
  return {
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
}

function mapTradeFromPrisma(trade: any): Trade {
  return {
    id: trade.id,
    buyOrderId: trade.buyOrderId,
    sellOrderId: trade.sellOrderId,
    buyerId: trade.buyerId,
    sellerId: trade.sellerId,
    companyId: trade.companyId,
    quantity: trade.quantity,
    price: trade.price,
    totalAmount: trade.totalAmount,
    platformFee: trade.platformFee,
    buyerFee: trade.buyerFee,
    sellerFee: trade.sellerFee,
    executedAt: trade.executedAt
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  matchOrders,
  handleMarketOrder,
  handleLimitOrder,
  executeTrade,
  updateOrderStatus,
  cancelOrder
};
