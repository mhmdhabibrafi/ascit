/**
 * Example Unit Tests untuk Error Handler
 * Test cases untuk error handling system
 */

import { ApiError, ApiErrors, handleApiError, ErrorCode } from "@/lib/error-handler";

describe("Error Handler", () => {
  describe("ApiError class", () => {
    it("should create error with correct properties", () => {
      const error = new ApiError(ErrorCode.NOT_FOUND, 404, "Asset not found", undefined, "req-123");

      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Asset not found");
      expect(error.requestId).toBe("req-123");
    });

    it("should convert to JSON correctly", () => {
      const error = new ApiError(
        ErrorCode.VALIDATION_ERROR,
        422,
        "Validation failed",
        { field: "email" },
        "req-456"
      );

      const json = error.toJSON();
      expect(json.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(json.statusCode).toBe(422);
      expect(json.details).toEqual({ field: "email" });
      expect(json.timestamp).toBeDefined();
    });
  });

  describe("ApiErrors factory", () => {
    it("should create bad request error", () => {
      const error = ApiErrors.badRequest("Invalid input", { field: "name" });
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCode.BAD_REQUEST);
    });

    it("should create unauthorized error", () => {
      const error = ApiErrors.unauthorized("Invalid token");
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it("should create not found error", () => {
      const error = ApiErrors.notFound("Asset");
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain("Asset not found");
    });

    it("should create conflict error", () => {
      const error = ApiErrors.conflict("Asset code already exists", { code: "ASSET-001" });
      expect(error.statusCode).toBe(409);
      expect(error.details?.code).toBe("ASSET-001");
    });

    it("should create validation error", () => {
      const error = ApiErrors.validationError("Invalid data", { errors: ["field1", "field2"] });
      expect(error.statusCode).toBe(422);
      expect(error.details?.errors).toContain("field1");
    });
  });

  describe("handleApiError", () => {
    it("should handle custom ApiError", () => {
      const error = ApiErrors.notFound("User");
      const result = handleApiError(error, "req-789");

      expect(result.code).toBe(ErrorCode.NOT_FOUND);
      expect(result.statusCode).toBe(404);
      expect(result.requestId).toBe("req-789");
    });

    it("should handle Prisma P2025 error (not found)", () => {
      const prismaError = new Error() as any;
      prismaError.code = "P2025";

      const result = handleApiError(prismaError);
      expect(result.code).toBe(ErrorCode.NOT_FOUND);
      expect(result.statusCode).toBe(404);
    });

    it("should handle Prisma P2002 error (unique constraint)", () => {
      const prismaError = new Error() as any;
      prismaError.code = "P2002";
      prismaError.meta = { target: ["email"] };

      const result = handleApiError(prismaError);
      expect(result.code).toBe(ErrorCode.CONFLICT);
      expect(result.statusCode).toBe(409);
      expect(result.message).toContain("email");
    });

    it("should handle Zod validation errors", () => {
      const zodError = new Error() as any;
      zodError.name = "ZodError";
      zodError.errors = [
        { path: ["email"], message: "Invalid email" },
        { path: ["name"], message: "Name is required" },
      ];

      const result = handleApiError(zodError);
      expect(result.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.statusCode).toBe(422);
      expect(result.details?.email).toBe("Invalid email");
    });

    it("should handle generic errors", () => {
      const error = new Error("Something went wrong");
      const result = handleApiError(error, "req-999");

      expect(result.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.statusCode).toBe(500);
      expect(result.requestId).toBe("req-999");
    });
  });
});
