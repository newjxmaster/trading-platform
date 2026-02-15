/**
 * Password Utility Functions
 * 
 * This module provides password-related utility functions including
 * hashing, verification, and strength validation.
 * 
 * @module utils/password
 */

import bcrypt from 'bcryptjs';
import logger from './logger';

/**
 * Bcrypt salt rounds for password hashing
 */
const SALT_ROUNDS = 12;

/**
 * Minimum password length
 */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Hash a password
 * @param password - Plain text password
 * @returns Promise<string> - Hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    logger.error('Error hashing password', { error });
    throw new Error('Failed to hash password');
  }
};

/**
 * Verify a password against a hash
 * @param password - Plain text password
 * @param hashedPassword - Hashed password
 * @returns Promise<boolean> - True if password matches
 */
export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    logger.error('Error verifying password', { error });
    throw new Error('Failed to verify password');
  }
};

/**
 * Password strength requirements
 */
export interface PasswordStrength {
  isValid: boolean;
  score: number; // 0-4 (0 = very weak, 4 = very strong)
  errors: string[];
}

/**
 * Check password strength
 * @param password - Password to check
 * @returns PasswordStrength - Strength assessment
 */
export const checkPasswordStrength = (password: string): PasswordStrength => {
  const errors: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  } else {
    score += 1;
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Check for numbers
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Check for special characters
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  } else {
    score += 1;
  }

  // Cap score at 4
  score = Math.min(score, 4);

  return {
    isValid: errors.length === 0,
    score,
    errors,
  };
};

/**
 * Generate a random password
 * @param length - Password length (default: 16)
 * @returns string - Generated password
 */
export const generateRandomPassword = (length: number = 16): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '@$!%*?&';
  const all = uppercase + lowercase + numbers + special;

  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate password against requirements
 * @param password - Password to validate
 * @returns PasswordValidationResult - Validation result
 */
export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];

  // Check minimum length
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for numbers
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special characters
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export default {
  hashPassword,
  verifyPassword,
  checkPasswordStrength,
  generateRandomPassword,
  validatePassword,
};
