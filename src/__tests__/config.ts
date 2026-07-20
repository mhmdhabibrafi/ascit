/**
 * Testing Configuration
 * Setup untuk unit tests dan integration tests
 */

/**
 * Jest configuration untuk project
 * File ini harus di-copy ke jest.config.js di root project
 */

export const jestConfig = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/types/**",
    "!src/middleware.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  globals: {
    "ts-jest": {
      tsconfig: {
        jsx: "react",
        esModuleInterop: true,
      },
    },
  },
};

/**
 * Vitest configuration untuk rapid testing
 */
export const vitestConfig = {
  include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
  exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
  globals: true,
  environment: "node",
  coverage: {
    provider: "v8",
    reporter: ["text", "json", "html"],
    exclude: ["node_modules/", "src/__tests__/"],
  },
};
