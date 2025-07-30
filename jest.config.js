/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Root directory
  rootDir: '.',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/web/tests/**/*.test.{ts,tsx,js,jsx}',
    '<rootDir>/tests/**/*.test.{ts,tsx,js,jsx}'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/web/tests/setup.ts'],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Module name mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/web/src/$1',
    '^@tests/(.*)$': '<rootDir>/web/tests/$1'
  },
  
  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'web/src/**/*.{ts,tsx}',
    '!web/src/**/*.d.ts',
    '!web/src/**/*.stories.{ts,tsx}',
    '!web/src/index.ts'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // Coverage directory
  coverageDirectory: 'coverage',
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],
  
  // Mock WebGPU and other browser APIs
  setupFiles: ['<rootDir>/web/tests/mocks/webgpu.ts'],
  
  // Performance testing
  testTimeout: 10000,
  
  // Verbose output for CI
  verbose: process.env.CI === 'true'
};