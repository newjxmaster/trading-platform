/**
 * Routes Index
 * 
 * This module exports all routes for easy importing.
 * 
 * @module routes
 */

import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import companyRoutes from './company.routes';
import tradingRoutes from './trading.routes';
import paymentRoutes from './payment.routes';
import revenueRoutes from './revenue.routes';
import adminRoutes from './admin.routes';

const router = Router();

// Mount all routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/companies', companyRoutes);
router.use('/trading', tradingRoutes);
router.use('/payments', paymentRoutes);
router.use('/revenue', revenueRoutes);
router.use('/admin', adminRoutes);

export default router;

// Also export individual routes
export {
  authRoutes,
  userRoutes,
  companyRoutes,
  tradingRoutes,
  paymentRoutes,
  revenueRoutes,
  adminRoutes,
};
