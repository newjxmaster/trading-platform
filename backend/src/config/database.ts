/**
 * Database Configuration
 * 
 * This module initializes and exports the Prisma client instance.
 * It includes connection handling, query logging, and proper cleanup.
 * 
 * @module config/database
 */

import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

/**
 * PrismaClient with logging configuration
 * In development: logs all queries, info, and warnings
 * In production: logs only errors
 */
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ]
    : [
        { emit: 'stdout', level: 'error' },
      ],
});

// Log queries in development mode
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as never, (e: { query: string; params: string; duration: number }) => {
    logger.debug('Prisma Query', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });
}

/**
 * Connect to the database
 * @returns Promise<void>
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    throw error;
  }
};

/**
 * Disconnect from the database
 * Use this for graceful shutdown
 * @returns Promise<void>
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from database', { error });
    throw error;
  }
};

/**
 * Execute a transaction with proper error handling
 * @param fn - Function to execute within the transaction
 * @returns Promise<T>
 */
export const executeTransaction = async <T>(
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> => {
  try {
    return await prisma.$transaction(fn);
  } catch (error) {
    logger.error('Transaction failed', { error });
    throw error;
  }
};

export default prisma;
