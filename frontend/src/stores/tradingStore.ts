import { create } from 'zustand';
import { tradingApi } from '@services/api';
import { StockHolding, PortfolioSummary, Trade, OrderBook, PlaceOrderData } from '@types/index';

// ============================================
// Trading Store
// ============================================

interface TradingState {
  // Portfolio
  portfolio: {
    holdings: StockHolding[];
    summary: PortfolioSummary;
  };
  
  // Order Book
  orderBook: OrderBook | null;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchPortfolio: () => Promise<void>;
  fetchOrderBook: (companyId: string) => Promise<void>;
  placeOrder: (orderData: PlaceOrderData) => Promise<void>;
  getTradeHistory: (params?: { page?: number; limit?: number }) => Promise<Trade[]>;
}

const initialPortfolioSummary: PortfolioSummary = {
  totalValue: 0,
  totalInvestment: 0,
  totalProfitLoss: 0,
  profitLossPercent: 0,
  totalDividendsEarned: 0,
};

export const useTradingStore = create<TradingState>((set, get) => ({
  // Initial state
  portfolio: {
    holdings: [],
    summary: initialPortfolioSummary,
  },
  orderBook: null,
  isLoading: false,
  error: null,

  // Fetch portfolio
  fetchPortfolio: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await tradingApi.getPortfolio();
      if (response.data.success && response.data.data) {
        const { holdings, summary } = response.data.data as { holdings: StockHolding[]; summary: PortfolioSummary };
        set({ 
          portfolio: { 
            holdings: holdings || [], 
            summary: summary || initialPortfolioSummary 
          } 
        });
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      set({ error: 'Failed to fetch portfolio' });
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch order book
  fetchOrderBook: async (companyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await tradingApi.getOrderBook(companyId);
      if (response.data.success && response.data.data) {
        set({ orderBook: response.data.data as OrderBook });
      }
    } catch (error) {
      console.error('Error fetching order book:', error);
      set({ error: 'Failed to fetch order book' });
    } finally {
      set({ isLoading: false });
    }
  },

  // Place order
  placeOrder: async (orderData: PlaceOrderData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await tradingApi.placeOrder(orderData);
      if (response.data.success) {
        // Refresh portfolio after order
        await get().fetchPortfolio();
      }
    } catch (error) {
      console.error('Error placing order:', error);
      set({ error: 'Failed to place order' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Get trade history
  getTradeHistory: async (params = {}) => {
    try {
      const response = await tradingApi.getTradeHistory(params);
      if (response.data.success && response.data.data) {
        return response.data.data as Trade[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching trade history:', error);
      return [];
    }
  },
}));

export default useTradingStore;
