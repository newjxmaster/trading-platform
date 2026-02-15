/**
 * Authentication Controller
 * 
 * This module handles all authentication-related operations including:
 * - User registration
 * - User login
 * - Token refresh
 * - Get current user
 * - User logout
 * 
 * @module controllers/auth
 */

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import logger from '../utils/logger';
import { generateTokenPair, verifyRefreshToken, generateAccessToken } from '../utils/jwt';
import { AuthenticatedRequest, RegisterUserData, LoginUserData, ApiError } from '../types';

/**
 * Bcrypt salt rounds for password hashing
 */
const SALT_ROUNDS = 12;

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, fullName, phone, role }: RegisterUserData = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'User with this email already exists',
        errors: [{ field: 'email', message: 'Email already registered' }],
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone,
        role: role || 'investor',
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        kycStatus: true,
        role: true,
        walletFiat: true,
        walletCryptoUsdt: true,
        walletCryptoBtc: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: tokens.refreshTokenExpires,
      },
    });

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          kycStatus: user.kycStatus,
          role: user.role,
          walletFiat: user.walletFiat,
          walletCryptoUsdt: user.walletCryptoUsdt,
          walletCryptoBtc: user.walletCryptoBtc,
          createdAt: user.createdAt,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: 900, // 15 minutes in seconds
          tokenType: 'Bearer',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password }: LoginUserData = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Log failed login attempt
      logger.warn('Failed login attempt', {
        email,
        ip: req.ip,
      });

      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: tokens.refreshTokenExpires,
      },
    });

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          kycStatus: user.kycStatus,
          role: user.role,
          walletFiat: user.walletFiat,
          walletCryptoUsdt: user.walletCryptoUsdt,
          walletCryptoBtc: user.walletCryptoBtc,
          createdAt: user.createdAt,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: 900, // 15 minutes in seconds
          tokenType: 'Bearer',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh-token
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
      return;
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (error) {
      if (error instanceof Error && error.message === 'Refresh token expired') {
        res.status(401).json({
          success: false,
          message: 'Refresh token expired',
          code: 'REFRESH_TOKEN_EXPIRED',
        });
        return;
      }
      throw error;
    }

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!storedToken) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
      return;
    }

    // Check if token is expired in database
    if (new Date() > storedToken.expiresAt) {
      // Delete expired token
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      res.status(401).json({
        success: false,
        message: 'Refresh token expired',
        code: 'REFRESH_TOKEN_EXPIRED',
      });
      return;
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Generate new token pair
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Delete old refresh token
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: tokens.refreshTokenExpires,
      },
    });

    logger.info('Token refreshed successfully', {
      userId: user.id,
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: 900, // 15 minutes in seconds
          tokenType: 'Bearer',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
export const getCurrentUser = async (
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
        id: true,
        email: true,
        fullName: true,
        phone: true,
        kycStatus: true,
        role: true,
        walletFiat: true,
        walletCryptoUsdt: true,
        walletCryptoBtc: true,
        idDocumentUrl: true,
        selfieUrl: true,
        createdAt: true,
        updatedAt: true,
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
      message: 'User retrieved successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    const authReq = req as AuthenticatedRequest;

    // If refresh token is provided, delete it from database
    if (token) {
      try {
        await prisma.refreshToken.deleteMany({
          where: { token },
        });
      } catch (error) {
        // Token might not exist, continue with logout
        logger.warn('Refresh token not found during logout', { error });
      }
    }

    // If user is authenticated, delete all refresh tokens for the user
    if (authReq.user?.userId) {
      await prisma.refreshToken.deleteMany({
        where: { userId: authReq.user.userId },
      });

      logger.info('User logged out successfully', {
        userId: authReq.user.userId,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout from all devices
 * POST /api/auth/logout-all
 */
export const logoutAll = async (
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

    // Delete all refresh tokens for the user
    const result = await prisma.refreshToken.deleteMany({
      where: { userId: authReq.user.userId },
    });

    logger.info('User logged out from all devices', {
      userId: authReq.user.userId,
      tokensDeleted: result.count,
    });

    res.status(200).json({
      success: true,
      message: 'Logged out from all devices successfully',
      data: {
        sessionsTerminated: result.count,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 * POST /api/auth/change-password
 */
export const changePassword = async (
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

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: authReq.user.userId },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
        errors: [{ field: 'currentPassword', message: 'Incorrect password' }],
      });
      return;
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { id: authReq.user.userId },
      data: { passwordHash: newPasswordHash },
    });

    // Delete all refresh tokens to force re-login
    await prisma.refreshToken.deleteMany({
      where: { userId: authReq.user.userId },
    });

    logger.info('Password changed successfully', {
      userId: authReq.user.userId,
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login again.',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  register,
  login,
  refreshToken,
  getCurrentUser,
  logout,
  logoutAll,
  changePassword,
};
