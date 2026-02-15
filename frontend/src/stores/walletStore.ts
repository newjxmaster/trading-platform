import { create } from 'zustand';
import { paymentApi } from '@services/api';
import { Transaction, PaymentMethod } from '@types/index';

// ============================================
// Wallet Store
// ============================================

interface WalletState {
  // Balance
  balance: {
    fiat: number;
    cryptoUsdt: number;
    cryptoBtc: number;
  };
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchBalance: () => Promise<void>;
  deposit: (data: {
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    phone?: string;
    cryptoCurrency?: string;
  }) => Promise<void>;
  withdraw: (data: {
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    accountDetails: Record<string, string>;
  }) => Promise<void>;
  getTransactions: (params?: { page?: number; limit?: number }) => Promise<Transaction[]>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  // Initial state
  balance: {
    fiat: 0,
    cryptoUsdt: 0,
    cryptoBtc: 0,
  },
  isLoading: false,
  error: null,

  // Fetch balance
  fetchBalance: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await paymentApi.getBalance();
      if (response.data.success && response.data.data) {
        const { fiat, cryptoUsdt, cryptoBtc } = response.data.data as {
          fiat: number;
          cryptoUsdt: number;
          cryptoBtc: number;
        };
        set({ 
          balance: { 
            fiat: fiat || 0, 
            cryptoUsdt: cryptoUsdt || 0, 
            cryptoBtc: cryptoBtc || 0 
          } 
        });
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      set({ error: 'Failed to fetch balance' });
    } finally {
      set({ isLoading: false });
    }
  },

  // Deposit
  deposit: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await paymentApi.deposit(data);
      if (response.data.success) {
        await get().fetchBalance();
      }
    } catch (error) {
      console.error('Error depositing:', error);
      set({ error: 'Failed to process deposit' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Withdraw
  withdraw: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await paymentApi.withdraw(data);
      if (response.data.success) {
        await get().fetchBalance();
      }
    } catch (error) {
      console.error('Error withdrawing:', error);
      set({ error: 'Failed to process withdrawal' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Get transactions
  getTransactions: async (params = {}) => {
    try {
      const response = await paymentApi.getTransactions(params);
      if (response.data.success && response.data.data) {
        return response.data.data as Transaction[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  },
}));

export default useWalletStore;
