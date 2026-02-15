/**
 * Redis Configuration
 * 
 * This module initializes Redis connections for:
 * - Bull job queues
 * - Session caching
 * - Rate limiting storage
 * 
 * @module config/redis
 */

import Redis from 'ioredis';
import logger from '../utils/logger';

/**
 * Redis connection URL from environment variables
 */
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Primary Redis client for general operations
 */
export const redisClient = new Redis(REDIS_URL, {
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

/**
 * Redis client for Bull queues (separate connection)
 */
export const bullRedisClient = new Redis(REDIS_URL, {
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

/**
 * Redis subscriber client for pub/sub operations
 */
export const redisSubscriber = new Redis(REDIS_URL);

// Event handlers for redisClient
redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('error', (error) => {
  logger.error('Redis client error', { error: error.message });
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis client reconnecting...');
});

redisClient.on('end', () => {
  logger.warn('Redis client connection ended');
});

// Event handlers for bullRedisClient
bullRedisClient.on('connect', () => {
  logger.info('Bull Redis client connected');
});

bullRedisClient.on('error', (error) => {
  logger.error('Bull Redis client error', { error: error.message });
});

/**
 * Connect to Redis
 * @returns Promise<void>
 */
export const connectRedis = async (): Promise<void> => {
  try {
    // Ping Redis to verify connection
    await redisClient.ping();
    logger.info('Redis connection verified');
  } catch (error) {
    logger.error('Failed to connect to Redis', { error });
    throw error;
  }
};

/**
 * Disconnect from Redis gracefully
 * @returns Promise<void>
 */
export const disconnectRedis = async (): Promise<void> => {
  try {
    await redisClient.quit();
    await bullRedisClient.quit();
    await redisSubscriber.quit();
    logger.info('Redis connections closed');
  } catch (error) {
    logger.error('Error disconnecting from Redis', { error });
    throw error;
  }
};

/**
 * Cache data with expiration
 * @param key - Cache key
 * @param value - Data to cache
 * @param ttl - Time to live in seconds (default: 3600 = 1 hour)
 */
export const setCache = async <T>(
  key: string, 
  value: T, 
  ttl: number = 3600
): Promise<void> => {
  try {
    const serializedValue = JSON.stringify(value);
    await redisClient.setex(key, ttl, serializedValue);
  } catch (error) {
    logger.error('Cache set error', { key, error });
    throw error;
  }
};

/**
 * Get cached data
 * @param key - Cache key
 * @returns Promise<T | null>
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redisClient.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    logger.error('Cache get error', { key, error });
    return null;
  }
};

/**
 * Delete cached data
 * @param key - Cache key
 */
export const deleteCache = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error('Cache delete error', { key, error });
    throw error;
  }
};

/**
 * Clear cache by pattern
 * @param pattern - Key pattern to match (e.g., "user:*")
 */
export const clearCachePattern = async (pattern: string): Promise<void> => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (error) {
    logger.error('Cache clear pattern error', { pattern, error });
    throw error;
  }
};

export default redisClient;
