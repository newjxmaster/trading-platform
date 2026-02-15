/**
 * User Controller
 * 
 * This module handles user-related operations including:
 * - Get user wallet
 * - Upload KYC documents
 * - Get transaction history
 * - Update profile
 * 
 * @module controllers/user
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../types';

/**
 * Get user wallet balance
 * GET /api/users/wallet
 */
export const getWallet = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: authReq.user.userId },
      select: {
        walletFiat: true,
        walletCryptoUsdt: true,
        walletCryptoBtc: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Wallet retrieved successfully',
      data: {
        fiat: user.walletFiat,
        crypto: {
          usdt: user.walletCryptoUsdt,
          btc: user.walletCryptoBtc,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload KYC documents
 * POST /api/users/kyc/upload
 */
export const uploadKyc = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // TODO: Implement file upload logic with multer
    // For now, return a placeholder response

    logger.info('KYC upload requested', {
      userId: authReq.user.userId,
    });

    res.status(200).json({
      success: true,
      message: 'KYC documents uploaded successfully. Pending verification.',
      data: {
        status: 'pending',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user transaction history
 * GET /api/users/transactions
 */
export const getTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: authReq.user.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({
        where: { userId: authReq.user.userId },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: transactions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * PATCH /api/users/profile
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { fullName, phone } = req.body;

    const updateData: { fullName?: string; phone?: string } = {};
    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;

    const user = await prisma.user.update({
      where: { id: authReq.user.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        kycStatus: true,
        role: true,
        updatedAt: true,
      },
    });

    logger.info('Profile updated', {
      userId: authReq.user.userId,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getWallet,
  uploadKyc,
  getTransactions,
  updateProfile,
};
