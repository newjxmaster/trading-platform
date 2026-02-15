# Trading Platform - Automation & Cron Jobs Module

This module provides comprehensive automation for the trading platform, including monthly revenue calculation, dividend distribution, and stock price adjustment.

## Features

- **Monthly Revenue Calculation**: Automatically calculates revenue from bank transactions
- **Dividend Distribution**: Automatically distributes dividends to shareholders
- **Stock Price Adjustment**: Automatically adjusts stock prices based on performance metrics
- **Bull Queue Integration**: Reliable job processing with Redis
- **Comprehensive Logging**: Full audit trail for all operations
- **Idempotent Operations**: Safe to re-run without duplicate data
- **Transaction Safety**: All database operations are transaction-protected

## Cron Schedule

| Job | Schedule | Description |
|-----|----------|-------------|
| MonthlyRevenueCalculation | `0 0 1 * *` | Midnight on 1st of each month |
| DividendDistribution | `0 2 1 * *` | 2 AM on 1st of each month |
| StockPriceAdjustment | `0 3 1 * *` | 3 AM on 1st of each month |

## Quick Start

### Initialize the Scheduler

```typescript
import { initializeScheduler } from '../scheduler';
import { DatabaseClient } from '../types';

const db: DatabaseClient = /* your database client */;

initializeScheduler(db, {
  bankApiClient: {
    fetchTransactions: async (accountNumber, startDate, endDate) => {
      // Implement bank API integration
      return [];
    },
  },
  notificationService: {
    sendDividendNotification: async (userId, companyName, amount, sharesOwned) => {
      // Implement notification
    },
  },
  websocketService: {
    broadcastPriceUpdate: async (companyId, newPrice, oldPrice, changePercent) => {
      // Implement WebSocket broadcast
    },
  },
});
```

### Initialize Queues

```typescript
import { initializeAllQueues } from '../queues';

const queues = initializeAllQueues({
  redisUrl: 'redis://localhost:6379',
});
```

### Manual Job Execution

```typescript
import { executeManualJob } from './automation';

// Calculate revenue for a specific company
await executeManualJob('revenue', db, dependencies, {
  companyId: 'uuid-here',
  month: 1,
  year: 2025,
});

// Distribute dividends for a specific revenue report
await executeManualJob('dividend', db, dependencies, {
  revenueReportId: 'uuid-here',
});

// Adjust stock price for a specific company
await executeManualJob('price', db, dependencies, {
  companyId: 'uuid-here',
  month: 1,
  year: 2025,
});
```

## Configuration

### Revenue Calculation

```typescript
const config = {
  PLATFORM_FEE_RATE: 0.05,      // 5% platform fee
  DIVIDEND_POOL_RATE: 0.60,     // 60% of net profit to dividends
  REINVESTMENT_RATE: 0.40,      // 40% of net profit to reinvestment
};
```

### Dividend Distribution

```typescript
const config = {
  BATCH_SIZE: 100,              // Process 100 shareholders at a time
  MINIMUM_PAYOUT_AMOUNT: 0.01,  // Skip payouts below $0.01
};
```

### Stock Price Adjustment

```typescript
const config = {
  MAX_PRICE_CHANGE_PERCENT: 0.20,  // ±20% max change per month
  WEIGHTS: {
    revenueGrowth: 0.4,            // 40% weight
    profitMargin: 0.3,             // 30% weight
    volumeScore: 0.2,              // 20% weight
    dividendScore: 0.1,            // 10% weight
  },
};
```

## File Structure

```
src/
├── automation/
│   ├── revenueCalculation.ts    # Monthly revenue calculation
│   ├── dividendDistribution.ts  # Dividend distribution
│   ├── stockPriceAdjustment.ts  # Stock price adjustment
│   └── index.ts                 # Automation exports
├── queues/
│   ├── paymentQueue.ts          # Payment processing queue
│   ├── dividendQueue.ts         # Dividend processing queue
│   ├── emailQueue.ts            # Email notification queue
│   └── index.ts                 # Queue exports
├── scheduler.ts                 # Cron scheduler
├── utils/
│   ├── logger.ts                # Logging utility
│   ├── database.ts              # Database helpers
│   ├── helpers.ts               # General helpers
│   └── index.ts                 # Utility exports
├── types/
│   └── index.ts                 # TypeScript types
└── index.ts                     # Main exports
```

## Health Monitoring

### Check Scheduler Health

```typescript
import { getSchedulerHealth } from '../scheduler';

const health = getSchedulerHealth();
console.log(health);
```

### Check Queue Health

```typescript
import { getQueueHealthStatus } from '../queues';

const health = await getQueueHealthStatus();
console.log(health);
```

### Check Automation Health

```typescript
import { getAutomationHealth } from './automation';

const health = getAutomationHealth();
console.log(health);
```

## Error Handling

All jobs include comprehensive error handling:

- Failed jobs are logged with full error details
- Jobs continue processing other items on individual failures
- Retry logic for transient errors
- Transaction rollback on database errors

## Idempotency

All operations are idempotent:

- Revenue reports: Won't create duplicates for same month/year
- Dividends: Won't create duplicates for same revenue report
- Price history: Won't create duplicates for same timestamp

## Graceful Shutdown

```typescript
import { shutdownScheduler, closeAllQueues } from '../';

// Gracefully shutdown
await shutdownScheduler();
await closeAllQueues();
```

## License

MIT
