import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse } from '@types/index';

// ============================================
// API Configuration
// ============================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// Auth API
// ============================================

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<ApiResponse<{ user: unknown; token: string }>>('/auth/login', { email, password }),
  
  register: (data: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    role?: string;
  }) => apiClient.post<ApiResponse<{ user: unknown; token: string }>>('/auth/register', data),
  
  logout: () => apiClient.post<ApiResponse<void>>('/auth/logout'),
  
  refreshToken: () => apiClient.post<ApiResponse<{ token: string }>>('/auth/refresh'),
  
  forgotPassword: (email: string) =>
    apiClient.post<ApiResponse<void>>('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) =>
    apiClient.post<ApiResponse<void>>('/auth/reset-password', { token, password }),
  
  verifyEmail: (token: string) =>
    apiClient.get<ApiResponse<void>>(`/auth/verify-email/${token}`),
  
  me: () => apiClient.get<ApiResponse<unknown>>('/auth/me'),
};

// ============================================
// Company API
// ============================================

export const companyApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    filter?: string;
    sort?: string;
  }) => apiClient.get<ApiResponse<unknown[]>>('/companies', { params }),
  
  getById: (id: string) =>
    apiClient.get<ApiResponse<unknown>>(`/companies/${id}`),
  
  register: (data: unknown) =>
    apiClient.post<ApiResponse<unknown>>('/companies', data),
  
  update: (id: string, data: unknown) =>
    apiClient.patch<ApiResponse<unknown>>(`/companies/${id}`, data),
  
  uploadDocuments: (id: string, formData: FormData) =>
    apiClient.post<ApiResponse<unknown>>(`/companies/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  getPriceHistory: (id: string, params?: { days?: number }) =>
    apiClient.get<ApiResponse<unknown[]>>(`/companies/${id}/price-history`, { params }),
  
  getFinancials: (id: string) =>
    apiClient.get<ApiResponse<unknown>>(`/companies/${id}/financials`),
  
  getShareholders: (id: string) =>
    apiClient.get<ApiResponse<unknown[]>>(`/companies/${id}/shareholders`),
  
  getDividends: (id: string) =>
    apiClient.get<ApiResponse<unknown[]>>(`/companies/${id}/dividends`),
};

// ============================================
// Trading API
// ============================================

export const tradingApi = {
  getPortfolio: () =>
    apiClient.get<ApiResponse<unknown>>('/trading/portfolio'),
  
  getOrderBook: (companyId: string) =>
    apiClient.get<ApiResponse<unknown>>(`/trading/order-book/${companyId}`),
  
  placeOrder: (data: unknown) =>
    apiClient.post<ApiResponse<unknown>>('/trading/orders', data),
  
  cancelOrder: (orderId: string) =>
    apiClient.delete<ApiResponse<unknown>>(`/trading/orders/${orderId}`),
  
  getOrders: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<unknown[]>>('/trading/orders', { params }),
  
  getTradeHistory: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<unknown[]>>('/trading/history', { params }),
};

// ============================================
// Payment API
// ============================================

export const paymentApi = {
  getBalance: () =>
    apiClient.get<ApiResponse<unknown>>('/payments/balance'),
  
  deposit: (data: unknown) =>
    apiClient.post<ApiResponse<unknown>>('/payments/deposit', data),
  
  withdraw: (data: unknown) =>
    apiClient.post<ApiResponse<unknown>>('/payments/withdraw', data),
  
  getTransactions: (params?: { page?: number; limit?: number; type?: string }) =>
    apiClient.get<ApiResponse<unknown[]>>('/payments/transactions', { params }),
  
  getBanks: () =>
    apiClient.get<ApiResponse<unknown[]>>('/payments/banks'),
  
  verifyBankAccount: (bankId: string, accountNumber: string) =>
    apiClient.post<ApiResponse<unknown>>('/payments/verify-bank', { bankId, accountNumber }),
};

// ============================================
// Revenue API
// ============================================

export const revenueApi = {
  getReports: (companyId: string, params?: { year?: number; month?: number }) =>
    apiClient.get<ApiResponse<unknown>>(`/revenue/company/${companyId}`, { params }),
  
  sync: (companyId: string) =>
    apiClient.post<ApiResponse<unknown>>(`/revenue/company/${companyId}/sync`),
  
  submitReport: (companyId: string, data: unknown) =>
    apiClient.post<ApiResponse<unknown>>(`/revenue/company/${companyId}`, data),
};

// ============================================
// Dividend API
// ============================================

export const dividendApi = {
  getUpcoming: () =>
    apiClient.get<ApiResponse<unknown[]>>('/dividends/upcoming'),
  
  getHistory: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<unknown[]>>('/dividends/history', { params }),
  
  getCompanyDividends: (companyId: string) =>
    apiClient.get<ApiResponse<unknown[]>>(`/dividends/company/${companyId}`),
};

// ============================================
// Admin API
// ============================================

export const adminApi = {
  getStats: () =>
    apiClient.get<ApiResponse<unknown>>('/admin/stats'),
  
  getPendingCompanies: () =>
    apiClient.get<ApiResponse<unknown[]>>('/admin/companies/pending'),
  
  verifyCompany: (companyId: string, data: unknown) =>
    apiClient.post<ApiResponse<unknown>>(`/admin/companies/${companyId}/verify`, data),
  
  getPendingRevenue: () =>
    apiClient.get<ApiResponse<unknown[]>>('/admin/revenue/pending'),
  
  verifyRevenue: (reportId: string, data: unknown) =>
    apiClient.post<ApiResponse<unknown>>(`/admin/revenue/${reportId}/verify`, data),
  
  getUsers: (params?: { page?: number; limit?: number; role?: string }) =>
    apiClient.get<ApiResponse<unknown[]>>('/admin/users', { params }),
  
  updateUser: (userId: string, data: unknown) =>
    apiClient.patch<ApiResponse<unknown>>(`/admin/users/${userId}`, data),
  
  getAnalytics: (params?: { period?: string }) =>
    apiClient.get<ApiResponse<unknown>>('/admin/analytics', { params }),
};

export default apiClient;
