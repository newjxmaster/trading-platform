# Trading Engine Module

Complete trading engine for the Trading Platform, implementing order matching, portfolio management, and real-time price updates.

## Features

- **Order Matching Engine**: Price-time priority matching for buy/sell orders
- **Market & Limit Orders**: Support for both immediate and conditional execution
- **Portfolio Management**: Real-time P&L tracking and diversification analysis
- **Price History**: OHLC data for charting with multiple timeframes
- **WebSocket Events**: Real-time updates for prices, trades, and order book
- **Transactional Integrity**: Prisma transactions ensure data consistency
- **0.5% Platform Fee**: Automatically calculated and collected on trades

## Architecture

```
trading/
├── types/
│   └── trading.ts          # TypeScript interfaces and enums
├── services/
│   ├── orderMatching.ts    # Core order matching engine
│   ├── portfolioService.ts # Portfolio management
│   └── priceHistoryService.ts # Price tracking & charts
├── controllers/
│   └── tradingController.ts # HTTP request handlers
├── routes/
│   └── tradingRoutes.ts    # API route definitions
├── websocket/
│   └── tradingEvents.ts    # Socket.io event handlers
└── index.ts                # Module exports
```

## API Endpoints

### Order Book
```
GET /api/trading/orderbook/:companyId
```
View the aggregated order book for a company.

### Orders
```
POST /api/trading/orders
```
Place a new order (market or limit).

**Request Body:**
```json
{
  "companyId": "uuid",
  "orderType": "market" | "limit",
  "side": "buy" | "sell",
  "quantity": 100,
  "price": 10.50,        // Required for limit orders
  "expiresAt": "2025-03-15T00:00:00Z"  // Optional for limit orders
}
```

```
GET /api/trading/orders/my?status=pending&limit=20
```
Get user's active orders with optional filtering.

```
DELETE /api/trading/orders/:id
```
Cancel a pending or partially filled order.

### Trade History
```
GET /api/trading/trades/history?companyId=uuid&startDate=2025-01-01
```
Get user's trade history with filtering options.

### Portfolio
```
GET /api/trading/portfolio
```
Get complete portfolio with holdings, performance metrics, and diversification.

### Price History
```
GET /api/trading/price-history/:companyId?timeframe=1m
```
Get price history for charting. Timeframes: 1h, 1d, 1w, 1m, 3m, 6m, 1y, all

## WebSocket Events

### Client to Server
```javascript
// Subscribe to company events
socket.emit('subscribe_company', 'company-uuid');

// Subscribe to user events
socket.emit('subscribe_user');

// Subscribe to market events
socket.emit('subscribe_market');

// Get price history
socket.emit('get_price_history', { companyId: 'uuid', timeframe: '1m' });

// Get order book
socket.emit('get_order_book', 'company-uuid');
```

### Server to Client
```javascript
// Price update
socket.on('price_update', (data) => {
  console.log(data); // { companyId, newPrice, volume, timestamp }
});

// Order matched
socket.on('order_matched', (data) => {
  console.log(data); // { orderId, tradeId, companyId, filledQuantity, price }
});

// New trade
socket.on('new_trade', (data) => {
  console.log(data); // { tradeId, companyId, quantity, price, executedAt }
});

// Order book update
socket.on('order_book_update', (data) => {
  console.log(data); // { companyId, buyOrders, sellOrders }
});

// Dividend distributed
socket.on('dividend_distributed', (data) => {
  console.log(data); // { dividendId, companyId, payoutAmount, sharesHeld }
});
```

## Order Matching Algorithm

The order matching engine uses **price-time priority**:

1. **Price Priority**: Best prices are matched first
   - Buy orders: Highest price first
   - Sell orders: Lowest price first

2. **Time Priority**: For orders at the same price, oldest order is filled first

3. **Partial Fills**: Orders can be partially filled with multiple counterparties

### Market Orders
- Executed immediately at the best available price
- Matched against existing limit orders in the order book
- May result in multiple fills at different prices

### Limit Orders
- Only executed when price conditions are met
- Buy limit: Executes at or below the limit price
- Sell limit: Executes at or above the limit price
- Default expiration: 30 days

## Trade Execution Flow

```
1. User places order
2. Validate order (funds/shares, company status)
3. Create order record
4. Attempt to match order
5. For each match:
   a. Validate buyer has funds
   b. Validate seller has shares
   c. Create trade record
   d. Update wallets (atomic)
   e. Update holdings (atomic)
   f. Update order statuses
   g. Record price history
   h. Emit WebSocket events
6. Return order status and trade results
```

## Configuration

```typescript
const config = {
  platformFeePercentage: 0.005,  // 0.5%
  minOrderQuantity: 1,
  maxOrderQuantity: 1000000,
  minPriceIncrement: 0.01,
  maxPriceDeviation: 0.20,       // 20% from market
  orderExpiryDays: 30
};
```

## Monthly Price Adjustment

Stock prices are automatically adjusted monthly based on:
- Revenue growth (40% weight)
- Profit margin (30% weight)
- Trading volume (20% weight)
- Dividend consistency (10% weight)

Maximum change per month: ±20%

## Usage Example

```typescript
import { initializeTradingModule, tradingRoutes } from './trading';
import { Server } from 'socket.io';

// In your app initialization:
const io = new Server(server);
initializeTradingModule(io);

// In your routes:
app.use('/api/trading', tradingRoutes);
```

## Error Codes

| Code | Description |
|------|-------------|
| INSUFFICIENT_FUNDS | Buyer doesn't have enough funds |
| INSUFFICIENT_SHARES | Seller doesn't have enough shares |
| INVALID_ORDER_TYPE | Invalid order type specified |
| INVALID_PRICE | Invalid price for limit order |
| INVALID_QUANTITY | Quantity out of allowed range |
| ORDER_NOT_FOUND | Order doesn't exist |
| ORDER_ALREADY_FILLED | Cannot cancel filled order |
| ORDER_ALREADY_CANCELLED | Order already cancelled |
| COMPANY_NOT_FOUND | Company doesn't exist |
| COMPANY_NOT_ACTIVE | Company not trading |
| UNAUTHORIZED | Not authorized for this action |
| INTERNAL_ERROR | Server error |

## License

MIT
