/** @type {import('jest').Config} */
import jestConfig from './jest.config.js';

const config = {
  // Extend base Jest config
  ...jestConfig,
  
  // Performance test specific configuration
  displayName: 'Performance Tests',
  testMatch: [
    '<rootDir>/web/tests/performance/**/*.perf.{ts,tsx,js,jsx}',
    '<rootDir>/tests/performance/**/*.perf.{ts,tsx,js,jsx}'
  ],
  
  // Longer timeout for performance tests
  testTimeout: 30000,
  
  // Run tests serially to avoid resource contention
  maxWorkers: 1,
  
  // Disable coverage for performance tests
  collectCoverage: false,
  
  // Performance test specific setup
  setupFilesAfterEnv: [
    '<rootDir>/web/tests/setup.ts',
    '<rootDir>/web/tests/performance-setup.ts'
  ],
  
  // Environment variables for performance testing
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    resources: 'usable',
    runScripts: 'dangerously',
  },
  
  // Custom reporters for performance metrics
  reporters: [
    'default',
    ['<rootDir>/web/tests/reporters/performance-reporter.js', {
      outputFile: 'performance-report.json',
      thresholds: {
        renderTime: 16.67, // 60 FPS target
        memoryUsage: 100, // 100MB limit
        gpuMemory: 512, // 512MB limit
      },
    }],
  ],
  
  // Global configuration for performance tests
  globals: {
    PERFORMANCE_MODE: true,
    TARGET_FPS: 90,
    MAX_MEMORY_MB: 512,
    ENABLE_GPU_TIMING: true,
  },
  
  // Module name mapping for performance utilities
  moduleNameMapping: {
    ...jestConfig.moduleNameMapping,
    '^@perf/(.*)$': '<rootDir>/web/tests/performance/$1',
  },
};

export default config;