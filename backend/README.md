# Trading Platform - Payment Integration Module

A comprehensive payment processing module for the Trading Platform, supporting multiple payment methods including mobile money (Wave, Orange Money), card payments (Stripe), and cryptocurrency (USDT, USDC, BTC, ETH).

## Features

### Payment Methods
- **Wave Mobile Money** - West Africa mobile money deposits
- **Orange Money** - West Africa mobile money deposits
- **Stripe** - Credit/Debit card payments
- **Cryptocurrency** - USDT, USDC, BTC, ETH deposits via Web3

### Core Features
- ✅ Secure webhook handling with signature verification
- ✅ Idempotent payment processing
- ✅ Transaction status tracking
- ✅ Fee calculation (Wave 1%, Orange 1%, Card 2.9%+$0.30)
- ✅ Wallet management (credit/debit/balance)
- ✅ Transaction history with filtering
- ✅ Crypto address validation
- ✅ Network fee estimation

## Project Structure

```
backend/
├── src/
│   ├── controllers/
│   │   └── paymentController.ts    # HTTP request handlers
│   ├── services/
│   │   ├── waveService.ts          # Wave API integration
│   │   ├── orangeMoneyService.ts   # Orange Money API integration
│   │   ├── stripeService.ts        # Stripe API integration
│   │   ├── cryptoService.ts        # Web3/crypto integration
│   │   └── walletService.ts        # Wallet management
│   ├── routes/
│   │   ├── payments.ts             # Payment API routes
│   │   └── webhooks.ts             # Webhook endpoints
│   ├── middleware/
│   │   └── auth.ts                 # Authentication middleware
│   ├── types/
│   │   └── payment.types.ts        # TypeScript type definitions
│   ├── utils/
│   │   ├── errors.ts               # Custom error classes
│   │   └── logger.ts               # Logging utility
│   ├── app.ts                      # Express app configuration
│   └── index.ts                    # Module exports
├── prisma/
│   └── schema.prisma               # Database schema
├── .env.example                    # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

## Environment Variables

See `.env.example` for all required environment variables.

### Required API Keys

```bash
# Wave
WAVE_API_KEY=your_wave_api_key
WAVE_SECRET=your_wave_secret

# Orange Money
ORANGE_API_KEY=your_orange_api_key
ORANGE_SECRET=your_orange_secret
ORANGE_MERCHANT_ID=your_merchant_id

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Crypto
INFURA_API_KEY=your_infura_key
CRYPTO_DEPOSIT_ADDRESS=0x...
```

## API Endpoints

### Deposits

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/deposit/wave` | Wave mobile money deposit |
| POST | `/api/payments/deposit/orange` | Orange Money deposit |
| POST | `/api/payments/deposit/card` | Stripe card deposit |
| POST | `/api/payments/deposit/crypto` | Crypto deposit |

### Withdrawals

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/withdraw` | Withdrawal request |

### Wallet & Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments/wallet/balance` | Get wallet balance |
| GET | `/api/payments/transactions` | Transaction history |
| GET | `/api/payments/verify/:id` | Verify payment status |
| POST | `/api/payments/fees/deposit` | Calculate deposit fees |
| POST | `/api/payments/fees/withdrawal` | Calculate withdrawal fees |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/webhooks/wave` | Wave webhook |
| POST | `/api/payments/webhooks/orange` | Orange Money webhook |
| POST | `/api/payments/webhooks/stripe` | Stripe webhook |
| POST | `/api/payments/webhooks/crypto` | Crypto webhook |

## Usage Examples

### Wave Deposit

```typescript
const response = await fetch('/api/payments/deposit/wave', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    amount: 10000,
    currency: 'XOF',
    phone: '+22501234567',
  }),
});

const result = await response.json();
// { success: true, data: { transactionId, paymentUrl, status, ... } }
```

### Card Deposit (Stripe)

```typescript
const response = await fetch('/api/payments/deposit/card', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    amount: 100,
    currency: 'USD',
  }),
});

const result = await response.json();
// Redirect user to result.data.checkoutUrl
```

### Crypto Deposit

```typescript
const response = await fetch('/api/payments/deposit/crypto', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    amount: 100,
    currency: 'USDT',
  }),
});

const result = await response.json();
// Show QR code and address to user
// { data: { depositAddress, qrCode, network, expiresAt } }
```

### Withdrawal

```typescript
const response = await fetch('/api/payments/withdraw', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    amount: 5000,
    currency: 'XOF',
    method: 'wave',
    phone: '+22501234567',
  }),
});
```

## Fee Structure

| Method | Deposit Fee | Withdrawal Fee |
|--------|-------------|----------------|
| Wave | 1% | 1% (min 100 XOF) |
| Orange Money | 1% | 1% (min 100 XOF) |
| Card | 2.9% + $0.30 | N/A |
| Bank Transfer | Free | $5 flat |
| Crypto | Network fees only | Network fees |

## Webhook Configuration

### Wave
Set webhook URL in Wave dashboard:
```
https://yourapi.com/api/payments/webhooks/wave
```

### Orange Money
Set webhook URL in Orange Money dashboard:
```
https://yourapi.com/api/payments/webhooks/orange
```

### Stripe
Set webhook URL in Stripe dashboard:
```
https://yourapi.com/api/payments/webhooks/stripe
```

Configure events:
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

### Crypto
Use a blockchain monitoring service (BlockCypher, Alchemy, etc.) and set:
```
https://yourapi.com/api/payments/webhooks/crypto
```

## Security

- ✅ Webhook signature verification for all providers
- ✅ JWT authentication for all API endpoints
- ✅ Rate limiting on all routes
- ✅ Input validation with express-validator
- ✅ Idempotent payment processing
- ✅ SQL injection protection via Prisma
- ✅ XSS protection via helmet

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- waveService.test.ts
```

## License

MIT
