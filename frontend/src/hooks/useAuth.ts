import { useCallback, useEffect } from 'react';
import { useAuthStore, selectUser, selectIsAuthenticated, selectIsLoading, selectAuthError } from '@stores/authStore';
import { LoginCredentials, RegisterData, UserRole } from '@types/index';

// ============================================
// useAuth Hook
// ============================================

export const useAuth = () => {
  const store = useAuthStore();
  const user = useAuthStore(selectUser);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isLoading = useAuthStore(selectIsLoading);
  const error = useAuthStore(selectAuthError);

  // ============================================
  // Auth Actions
  // ============================================

  const login = useCallback(async (credentials: LoginCredentials) => {
    return store.login(credentials);
  }, [store]);

  const register = useCallback(async (data: RegisterData) => {
    return store.register(data);
  }, [store]);

  const logout = useCallback(async () => {
    return store.logout();
  }, [store]);

  const refreshUser = useCallback(async () => {
    return store.refreshUser();
  }, [store]);

  const clearError = useCallback(() => {
    store.clearError();
  }, [store]);

  // ============================================
  // User Helpers
  // ============================================

  const hasRole = useCallback((role: UserRole): boolean => {
    return user?.role === role;
  }, [user]);

  const isAdmin = useCallback((): boolean => {
    return user?.role === 'admin';
  }, [user]);

  const isBusinessOwner = useCallback((): boolean => {
    return user?.role === 'business_owner';
  }, [user]);

  const isInvestor = useCallback((): boolean => {
    return user?.role === 'investor';
  }, [user]);

  const isKycVerified = useCallback((): boolean => {
    return user?.kycStatus === 'verified';
  }, [user]);

  // ============================================
  // Initial Auth Check
  // ============================================

  useEffect(() => {
    if (isAuthenticated && !user) {
      refreshUser();
    }
  }, [isAuthenticated, user, refreshUser]);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,

    // Actions
    login,
    register,
    logout,
    refreshUser,
    clearError,

    // Helpers
    hasRole,
    isAdmin,
    isBusinessOwner,
    isInvestor,
    isKycVerified,
  };
};

export default useAuth;
