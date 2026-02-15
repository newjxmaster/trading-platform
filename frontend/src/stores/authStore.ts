import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthTokens, LoginCredentials, RegisterData } from '../types';
import { authApi, handleApiError, extractData } from '../services/api';

// ============================================
// Auth State Interface
// ============================================

interface AuthState {
  // State
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
}

// ============================================
// Auth Store
// ============================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ============================================
      // Login Action
      // ============================================
      login: async (credentials) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.login(credentials.email, credentials.password);
          const data = extractData(response);

          set({
            user: data.user as User,
            tokens: data.tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const apiError = handleApiError(error);
          set({
            isLoading: false,
            error: apiError.message,
          });
          throw error;
        }
      },

      // ============================================
      // Register Action
      // ============================================
      register: async (data) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.register(data);
          const result = extractData(response);

          set({
            user: result.user as User,
            tokens: result.tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const apiError = handleApiError(error);
          set({
            isLoading: false,
            error: apiError.message,
          });
          throw error;
        }
      },

      // ============================================
      // Logout Action
      // ============================================
      logout: async () => {
        set({ isLoading: true });

        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear state regardless of API response
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          // Clear persisted storage
          localStorage.removeItem('auth-store');
        }
      },

      // ============================================
      // Refresh User Action
      // ============================================
      refreshUser: async () => {
        const { tokens } = get();

        if (!tokens?.accessToken) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          const response = await authApi.me();
          const user = extractData(response);

          set({
            user: user as User,
            isAuthenticated: true,
          });
        } catch (error) {
          console.error('Failed to refresh user:', error);
          // If refresh fails, clear authentication
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
          });
        }
      },

      // ============================================
      // Clear Error Action
      // ============================================
      clearError: () => {
        set({ error: null });
      },

      // ============================================
      // Set User Action
      // ============================================
      setUser: (user) => {
        set({ user, isAuthenticated: true });
      },

      // ============================================
      // Update User Action
      // ============================================
      updateUser: (updates) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updates } });
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ============================================
// Auth Store Selectors
// ============================================

export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectAuthError = (state: AuthState) => state.error;
export const selectUserRole = (state: AuthState) => state.user?.role;
export const selectIsAdmin = (state: AuthState) => state.user?.role === 'admin';
export const selectIsBusinessOwner = (state: AuthState) => state.user?.role === 'business_owner';
export const selectIsInvestor = (state: AuthState) => state.user?.role === 'investor';
