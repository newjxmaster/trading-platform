/**
 * Bank Integration Module
 * Trading Platform
 * 
 * This module provides bank API integration for revenue tracking and verification.
 * Supports: Ecobank, UBA, GTBank, Access Bank APIs
 */

// Export types
export * from './types/bank.types';

// Export services
export * as BankApiService from './services/bankApiService';
export * as RevenueSyncService from './services/revenueSyncService';
export * as TransactionProcessor from './services/transactionProcessor';

// Export mock (for testing)
export * as MockBankApi from './mock/bankApi.mock';

// Export controllers
export * as BankController from './controllers/bankController';
export * as RevenueController from './controllers/revenueController';

// Export routes
export { default as bankRoutes } from './routes/bankRoutes';
export { default as revenueRoutes } from './routes/revenueRoutes';
