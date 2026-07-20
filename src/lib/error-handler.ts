/**
 * Standardized API Error Handling
 * Centralized error responses dengan format konsisten
 */

export enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = "BAD_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  RATE_LIMITED = "RATE_LIMITED",

  // Server errors (5xx)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
}

export interface ApiErrorResponse {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  path?: string;
  requestId?: string;
  statusCode: number;
}

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: number,
    message: string,
    public details?: Record<string, any>,
    public requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
  }

  toJSON(): ApiErrorResponse {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
      statusCode: this.statusCode,
    };
  }
}

// Predefined error factory functions
export const ApiErrors = {
  badRequest: (message: string, details?: Record<string, any>, requestId?: string) =>
    new ApiError(ErrorCode.BAD_REQUEST, 400, message, details, requestId),

  unauthorized: (message: string = "Unauthorized", details?: Record<string, any>, requestId?: string) =>
    new ApiError(ErrorCode.UNAUTHORIZED, 401, message, details, requestId),

  forbidden: (message: string = "Forbidden", details?: Record<string, any>, requestId?: string) =>
    new ApiError(ErrorCode.FORBIDDEN, 403, message, details, requestId),

  notFound: (resource: string, requestId?: string) =>
    new ApiError(ErrorCode.NOT_FOUND, 404, `${resource} not found`, undefined, requestId),

  conflict: (message: string, details?: Record<string, any>, requestId?: string) =>
    new ApiError(ErrorCode.CONFLICT, 409, message, details, requestId),

  validationError: (message: string, details?: Record<string, any>, requestId?: string) =>
    new ApiError(ErrorCode.VALIDATION_ERROR, 422, message, details, requestId),

  rateLimited: (retryAfter?: number, requestId?: string) =>
    new ApiError(ErrorCode.RATE_LIMITED, 429, "Too many requests", retryAfter ? { retryAfter } : undefined, requestId),

  internalError: (message: string = "Internal server error", requestId?: string) =>
    new ApiError(ErrorCode.INTERNAL_ERROR, 500, message, undefined, requestId),

  serviceUnavailable: (message: string = "Service unavailable", requestId?: string) =>
    new ApiError(ErrorCode.SERVICE_UNAVAILABLE, 503, message, undefined, requestId),

  databaseError: (message: string = "Database error occurred", requestId?: string) =>
    new ApiError(ErrorCode.DATABASE_ERROR, 500, message, undefined, requestId),

  externalServiceError: (service: string, message?: string, requestId?: string) =>
    new ApiError(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      502,
      `${service} service error${message ? `: ${message}` : ""}`,
      { service },
      requestId
    ),
};

/**
 * Error handler middleware untuk Next.js API routes
 * Gunakan di dalam try-catch blocks
 */
export function handleApiError(error: any, requestId?: string): ApiErrorResponse {
  // Handle custom ApiError
  if (error instanceof ApiError) {
    return {
      ...error.toJSON(),
      requestId: requestId || error.requestId,
    };
  }

  // Handle Prisma errors
  if (error.code === "P2025") {
    return ApiErrors.notFound("Resource", requestId).toJSON();
  }
  if (error.code === "P2002") {
    const field = error.meta?.target?.[0] || "field";
    return ApiErrors.conflict(`${field} already exists`, { field }, requestId).toJSON();
  }
  if (error.code?.startsWith("P")) {
    return ApiErrors.databaseError(`Database error: ${error.message}`, requestId).toJSON();
  }

  // Handle Zod validation errors
  if (error.name === "ZodError") {
    const fieldErrors = error.errors.reduce((acc: any, err: any) => {
      acc[err.path.join(".")] = err.message;
      return acc;
    }, {});
    return ApiErrors.validationError("Validation failed", fieldErrors, requestId).toJSON();
  }

  // Handle authentication errors
  if (error.message?.includes("Unauthorized") || error.message?.includes("JWT")) {
    return ApiErrors.unauthorized("Authentication failed", undefined, requestId).toJSON();
  }

  // Handle generic errors
  console.error("[API Error]", error);
  return ApiErrors.internalError(error.message || "An unexpected error occurred", requestId).toJSON();
}

/**
 * Wrapper untuk API route handlers dengan error handling
 */
export function createApiHandler<T extends any[]>(
  handler: (...args: T) => Promise<Response | any>
) {
  return async (...args: T) => {
    const requestId = crypto.randomUUID?.() || Math.random().toString(36).substr(2, 9);
    try {
      const result = await handler(...args);
      return result instanceof Response ? result : Response.json(result);
    } catch (error) {
      const errorResponse = handleApiError(error, requestId);
      return Response.json(errorResponse, { status: errorResponse.statusCode });
    }
  };
}
