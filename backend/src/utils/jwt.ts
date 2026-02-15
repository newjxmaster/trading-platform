/**
 * JWT Utility Functions
 * 
 * This module provides JWT token generation and verification utilities
 * with support for access tokens and refresh tokens.
 * 
 * @module utils/jwt
 */

import jwt from 'jsonwebtoken';
import logger from './logger';

/**
 * JWT configuration from environment variables
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';
const JWT_ACCESS_EXPIRE = process.env.JWT_ACCESS_EXPIRE || '15m';
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '7d';

/**
 * JWT Payload interface
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Token pair interface
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: Date;
  refreshTokenExpires: Date;
}

/**
 * Generate access token
 * @param payload - User data to encode
 * @returns string - JWT access token
 */
export const generateAccessToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_ACCESS_EXPIRE,
    });
  } catch (error) {
    logger.error('Error generating access token', { error });
    throw new Error('Failed to generate access token');
  }
};

/**
 * Generate refresh token
 * @param payload - User data to encode
 * @returns string - JWT refresh token
 */
export const generateRefreshToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  try {
    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRE,
    });
  } catch (error) {
    logger.error('Error generating refresh token', { error });
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Generate both access and refresh tokens
 * @param payload - User data to encode
 * @returns TokenPair - Object containing both tokens and their expiration dates
 */
export const generateTokenPair = (payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Decode to get expiration dates
  const accessDecoded = jwt.decode(accessToken) as { exp: number };
  const refreshDecoded = jwt.decode(refreshToken) as { exp: number };

  return {
    accessToken,
    refreshToken,
    accessTokenExpires: new Date(accessDecoded.exp * 1000),
    refreshTokenExpires: new Date(refreshDecoded.exp * 1000),
  };
};

/**
 * Verify access token
 * @param token - JWT access token
 * @returns JWTPayload - Decoded token payload
 * @throws Error if token is invalid or expired
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Access token expired');
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid access token');
      throw new Error('Invalid token');
    }
    logger.error('Error verifying access token', { error });
    throw new Error('Token verification failed');
  }
};

/**
 * Verify refresh token
 * @param token - JWT refresh token
 * @returns JWTPayload - Decoded token payload
 * @throws Error if token is invalid or expired
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Refresh token expired');
      throw new Error('Refresh token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid refresh token');
      throw new Error('Invalid refresh token');
    }
    logger.error('Error verifying refresh token', { error });
    throw new Error('Token verification failed');
  }
};

/**
 * Decode token without verification (useful for debugging)
 * @param token - JWT token
 * @returns JWTPayload | null - Decoded payload or null
 */
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    logger.error('Error decoding token', { error });
    return null;
  }
};

/**
 * Get token expiration time in milliseconds
 * @param token - JWT token
 * @returns number - Expiration timestamp in milliseconds
 */
export const getTokenExpiration = (token: string): number => {
  const decoded = jwt.decode(token) as { exp: number } | null;
  return decoded?.exp ? decoded.exp * 1000 : 0;
};

/**
 * Check if token is expired
 * @param token - JWT token
 * @returns boolean - True if expired
 */
export const isTokenExpired = (token: string): boolean => {
  const expiration = getTokenExpiration(token);
  return Date.now() >= expiration;
};

/**
 * Calculate time until token expiration in seconds
 * @param token - JWT token
 * @returns number - Seconds until expiration (negative if expired)
 */
export const getTimeUntilExpiration = (token: string): number => {
  const expiration = getTokenExpiration(token);
  return Math.floor((expiration - Date.now()) / 1000);
};

export default {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiration,
  isTokenExpired,
  getTimeUntilExpiration,
};
