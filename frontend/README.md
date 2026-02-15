# TradeFlow Frontend

A modern React 18 + TypeScript + Tailwind CSS frontend for the TradeFlow Trading Platform.

## Features

- **React 18** with TypeScript for type-safe development
- **Tailwind CSS** for utility-first styling
- **Vite** for fast development and optimized builds
- **Zustand** for state management
- **React Query** for server state management
- **React Hook Form + Zod** for form handling and validation
- **Socket.io Client** for real-time updates
- **Recharts** for data visualization
- **Lucide React** for beautiful icons

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI components (Button, Input, Card, etc.)
│   ├── layout/         # Layout components (Navbar, Sidebar, Layout)
│   └── feedback/       # Feedback components (LoadingSpinner, ErrorMessage)
├── pages/              # Page components
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── Marketplace.tsx
│   └── Portfolio.tsx
├── hooks/              # Custom React hooks
│   ├── useAuth.ts
│   ├── useSocket.ts
│   ├── useForm.ts
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   └── useMediaQuery.ts
├── stores/             # Zustand stores
│   ├── authStore.ts
│   ├── walletStore.ts
│   ├── tradingStore.ts
│   └── companyStore.ts
├── services/           # API services
│   └── api.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── utils/              # Utility functions
│   ├── formatters.ts
│   └── helpers.ts
├── styles/             # Global styles
│   └── index.css
├── App.tsx             # Main App component
└── main.tsx            # Application entry point
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your API URLs:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

4. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Type Checking

```bash
npm run type-check
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run type-check` - Run TypeScript type checking

## Key Features

### Authentication
- JWT-based authentication with refresh tokens
- Login and registration with role selection
- Protected routes with role-based access control

### Trading
- Real-time stock price updates via WebSocket
- Order placement (market and limit orders)
- Portfolio tracking
- Dividend history

### Marketplace
- Browse companies with filtering and sorting
- Company cards with price information
- Quick buy functionality

### Dashboard
- Portfolio summary with key metrics
- Recent activity feed
- Quick action buttons

### Responsive Design
- Mobile-first approach
- Responsive navigation with mobile menu
- Touch-friendly UI elements

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI library |
| TypeScript | Type safety |
| Vite | Build tool |
| Tailwind CSS | Styling |
| Zustand | State management |
| React Query | Server state |
| Axios | HTTP client |
| Socket.io | Real-time communication |
| Recharts | Charts |
| React Hook Form | Form handling |
| Zod | Schema validation |
| Lucide React | Icons |

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
