# Trading Platform for Small & Medium Businesses

A comprehensive web-based stock trading platform where small businesses (stores, supermarkets) and medium businesses (factories) can raise capital through IPOs, and investors can buy/sell their stocks using crypto or fiat payment methods.

## Features

### For Investors
- Browse and invest in verified SMBs
- Real-time stock trading with market/limit orders
- Portfolio tracking with P&L calculations
- Monthly dividend payments
- Multiple payment options (Wave, Orange Money, Cards, Crypto)

### For Business Owners
- Complete IPO registration workflow
- Document upload and verification
- Bank account integration for revenue tracking
- Shareholder management
- Financial reporting dashboard

### For Admins
- Company verification dashboard
- Revenue report approval
- User management and KYC verification
- Platform analytics and statistics

## Tech Stack

### Backend
- **Runtime**: Node.js 20+ with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Authentication**: JWT + Refresh Tokens
- **Real-time**: Socket.io
- **Queue**: Bull with Redis
- **File Storage**: AWS S3 / Cloudinary

### Frontend
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Build Tool**: Vite

### Payment Integration
- **Mobile Money**: Wave API, Orange Money API
- **Cards**: Stripe
- **Crypto**: Web3.js (USDT, USDC, BTC, ETH)
- **Bank**: Partner Bank API

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: NGINX
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry + LogRocket

## Project Structure

```
trading-platform/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── services/        # Business logic
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── types/           # TypeScript interfaces
│   │   ├── utils/           # Helper functions
│   │   ├── trading/         # Trading engine module
│   │   ├── payments/        # Payment integration
│   │   ├── companies/       # Company management
│   │   ├── bank/            # Bank integration
│   │   ├── automation/      # Cron jobs
│   │   └── queues/          # Bull job queues
│   ├── prisma/              # Database schema & migrations
│   └── tests/               # Test files
├── frontend/                # React application
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── stores/          # Zustand stores
│   │   ├── services/        # API services
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utility functions
│   └── public/              # Static assets
├── docker/                  # Docker configurations
├── nginx/                   # NGINX configurations
├── scripts/                 # Deployment scripts
├── terraform/               # Infrastructure as Code
└── docs/                    # Documentation
```

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npx prisma migrate dev

# Seed the database
npx prisma db seed

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start development server
npm run dev
```

### Docker Setup (Recommended)

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate dev

# Seed database
docker-compose exec app npx prisma db seed
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh-token` - Refresh access token
- `GET /api/auth/me` - Get current user

### Companies
- `POST /api/companies/register` - Register company
- `GET /api/companies` - List companies
- `GET /api/companies/:id` - Get company details
- `GET /api/companies/:id/financials` - View financials

### Trading
- `GET /api/trading/orderbook/:companyId` - View order book
- `POST /api/trading/orders` - Place order
- `GET /api/trading/portfolio` - Get portfolio
- `GET /api/trading/trades/history` - Trade history

### Payments
- `POST /api/payments/deposit/wave` - Wave deposit
- `POST /api/payments/deposit/orange` - Orange Money deposit
- `POST /api/payments/deposit/card` - Card deposit
- `POST /api/payments/deposit/crypto` - Crypto deposit

### Admin
- `GET /api/admin/companies/pending` - Pending approvals
- `PATCH /api/admin/companies/:id/verify` - Verify company
- `GET /api/admin/dashboard/stats` - Platform stats

## Environment Variables

### Backend (.env)
```env
# Server
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/trading_platform

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Payment APIs
WAVE_API_KEY=your_wave_key
ORANGE_API_KEY=your_orange_key
STRIPE_SECRET_KEY=your_stripe_key

# Redis
REDIS_URL=redis://localhost:6379
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy with Docker

```bash
# Production deployment
./scripts/deploy.sh production

# Staging deployment
./scripts/deploy.sh staging
```

## Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Key Features Implemented

### Trading Engine
- Market and limit order support
- Price-time priority matching
- Real-time order book updates
- Portfolio tracking with P&L
- 0.5% trading fee

### Revenue Tracking
- Bank API integration
- Automatic monthly revenue calculation
- Profit distribution (5% platform, 60% dividends, 40% reinvestment)
- Anomaly detection

### Dividend Distribution
- Automated monthly distribution
- Per-share dividend calculation
- Wallet credit system
- Distribution history

### Stock Price Algorithm
- Monthly price adjustment based on:
  - Revenue growth (40%)
  - Profit margin (30%)
  - Trading volume (20%)
  - Dividend consistency (10%)
- ±20% monthly change cap

### Security
- JWT authentication with refresh tokens
- Bcrypt password hashing
- Rate limiting
- Helmet security headers
- CORS protection
- Input validation

## License

MIT License - see LICENSE file for details

## Support

For support, email support@tradingplatform.com or join our Slack channel.

---

Built with by the Trading Platform Team
