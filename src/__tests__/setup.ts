/**
 * Test Setup File
 * Initialize test environment
 */

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/ascit_test";
process.env.NEXTAUTH_SECRET = "test-secret-key-123456789";

// Mock next-auth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn(),
}));

// Global test utilities
global.testUtils = {
  // Mock user session
  mockUserSession: (role: string = "STAF_IT") => ({
    user: {
      id: "test-user-id",
      email: "test@example.com",
      name: "Test User",
      role,
    },
  }),

  // Mock request
  mockRequest: (method: string = "GET", body?: any) => ({
    method,
    json: async () => body,
    headers: new Headers({
      "content-type": "application/json",
    }),
  }),

  // Generate test ID
  generateTestId: () => Math.random().toString(36).substr(2, 9),
};

// Suppress console in tests
const originalConsole = { ...console };
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
} as any;

afterAll(() => {
  global.console = originalConsole;
});
