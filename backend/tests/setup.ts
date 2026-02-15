/**
 * Jest Test Setup
 * 
 * This file is executed before each test file.
 * Use it to set up test environment, mocks, and global configurations.
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test timeout
jest.setTimeout(30000);

// Mock console methods during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Global test utilities
global.testUtils = {
  generateTestUser: () => ({
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    fullName: 'Test User',
    phone: '+1234567890',
  }),
};

// Cleanup after all tests
afterAll(async () => {
  // Add any global cleanup here
});

// Extend Jest matchers
declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        generateTestUser: () => {
          email: string;
          password: string;
          fullName: string;
          phone: string;
        };
      };
    }
  }
}

export {};
