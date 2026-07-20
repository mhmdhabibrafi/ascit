/**
 * OpenAPI/Swagger Documentation Configuration
 * Dokumentasi API lengkap untuk semua endpoints
 */

export const apiDocumentation = {
  openapi: "3.0.0",
  info: {
    title: "ASCIT - Asset Care Information Technology System API",
    description: "API untuk manajemen aset IT di RS Awal Bros Panam dengan AI Decision Support",
    version: "1.0.0",
    contact: {
      name: "IT Department",
      email: "it@awalbrosmedia.id",
    },
    license: {
      name: "MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:3000/api",
      description: "Development Server",
    },
    {
      url: "https://ascit.awalbrosmedia.id/api",
      description: "Production Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "next-auth.session-token",
      },
    },
    schemas: {
      Asset: {
        type: "object",
        required: ["assetCode", "assetName", "categoryId", "brandId", "vendorId", "unitId", "roomId"],
        properties: {
          id: { type: "string", format: "cuid" },
          assetCode: { type: "string", description: "Unique asset code" },
          assetName: { type: "string" },
          categoryId: { type: "string", format: "cuid" },
          brandId: { type: "string", format: "cuid" },
          vendorId: { type: "string", format: "cuid" },
          unitId: { type: "string", format: "cuid" },
          roomId: { type: "string", format: "cuid" },
          model: { type: "string" },
          serialNumber: { type: "string" },
          ipAddress: { type: "string", format: "ipv4" },
          macAddress: { type: "string" },
          operatingSystem: { type: "string" },
          processor: { type: "string" },
          ram: { type: "string" },
          storage: { type: "string" },
          purchaseDate: { type: "string", format: "date-time" },
          purchasePrice: { type: "number", format: "decimal" },
          warrantyStartDate: { type: "string", format: "date-time" },
          warrantyEndDate: { type: "string", format: "date-time" },
          conditionStatus: {
            type: "string",
            enum: ["BAIK", "RUSAK_RINGAN", "RUSAK_BERAT", "LAYAK_GANTI", "DIHAPUS"],
          },
          lifecycleStatus: {
            type: "string",
            enum: [
              "PENGADAAN",
              "PENERIMAAN",
              "INSTALASI",
              "AKTIF",
              "DIPINDAHKAN",
              "DIPINJAM",
              "MAINTENANCE",
              "DALAM_PERBAIKAN",
              "RUSAK",
              "LAYAK_GANTI",
              "DIHAPUS",
            ],
          },
          qrToken: { type: "string" },
          qrCodeUrl: { type: "string", format: "uri" },
          photoUrl: { type: "string", format: "uri" },
          notes: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "cuid" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          roleId: { type: "string", format: "cuid" },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: {
          code: { type: "string", description: "Error code" },
          message: { type: "string" },
          details: {
            type: "object",
            additionalProperties: true,
          },
          timestamp: { type: "string", format: "date-time" },
          path: { type: "string" },
          requestId: { type: "string" },
        },
      },
      PaginatedResponse: {
        type: "object",
        properties: {
          data: { type: "array" },
          pagination: {
            type: "object",
            properties: {
              page: { type: "integer", minimum: 1 },
              pageSize: { type: "integer", minimum: 1 },
              total: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
        },
      },
    },
  },
  security: [
    { bearerAuth: [] },
    { cookieAuth: [] },
  ],
  paths: {
    "/assets": {
      get: {
        tags: ["Assets"],
        summary: "Get all assets",
        description: "Retrieve paginated list of assets with filters",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 10 } },
          { name: "categoryId", in: "query", schema: { type: "string" } },
          { name: "conditionStatus", in: "query", schema: { type: "string" } },
          { name: "lifecycleStatus", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "Successfully retrieved assets",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaginatedResponse" },
              },
            },
          },
          401: { description: "Unauthorized" },
          500: { description: "Internal server error" },
        },
      },
      post: {
        tags: ["Assets"],
        summary: "Create new asset",
        description: "Create a new asset with all required information",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Asset" },
            },
          },
        },
        responses: {
          201: {
            description: "Asset created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Asset" },
              },
            },
          },
          400: { description: "Invalid input" },
          401: { description: "Unauthorized" },
          409: { description: "Asset code already exists" },
        },
      },
    },
    "/assets/{id}": {
      get: {
        tags: ["Assets"],
        summary: "Get asset by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Asset retrieved",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Asset" },
              },
            },
          },
          404: { description: "Asset not found" },
          401: { description: "Unauthorized" },
        },
      },
      put: {
        tags: ["Assets"],
        summary: "Update asset",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Asset" },
            },
          },
        },
        responses: {
          200: { description: "Asset updated successfully" },
          404: { description: "Asset not found" },
          401: { description: "Unauthorized" },
        },
      },
      delete: {
        tags: ["Assets"],
        summary: "Delete asset (soft delete)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Asset deleted successfully" },
          404: { description: "Asset not found" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/mutations": {
      get: {
        tags: ["Mutations"],
        summary: "Get asset mutations",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 10 } },
          { name: "approvalStatus", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Mutations retrieved" },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Mutations"],
        summary: "Create asset mutation",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  assetId: { type: "string" },
                  toUnitId: { type: "string" },
                  toRoomId: { type: "string" },
                  reason: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Mutation created" },
          400: { description: "Invalid input" },
        },
      },
    },
    "/maintenance": {
      get: {
        tags: ["Maintenance"],
        summary: "Get maintenance schedules",
        responses: {
          200: { description: "Maintenance schedules retrieved" },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Maintenance"],
        summary: "Create maintenance schedule",
        responses: {
          201: { description: "Maintenance scheduled" },
        },
      },
    },
    "/repairs": {
      get: {
        tags: ["Repairs"],
        summary: "Get repair records",
        responses: {
          200: { description: "Repair records retrieved" },
        },
      },
      post: {
        tags: ["Repairs"],
        summary: "Create repair record",
        responses: {
          201: { description: "Repair record created" },
        },
      },
    },
    "/warranties": {
      get: {
        tags: ["Warranties"],
        summary: "Get warranty information",
        responses: {
          200: { description: "Warranty data retrieved" },
        },
      },
    },
    "/recommendations": {
      get: {
        tags: ["AI"],
        summary: "Get AI replacement recommendations",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "priority", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Recommendations retrieved" },
        },
      },
    },
    "/audit-log": {
      get: {
        tags: ["Audit"],
        summary: "Get audit logs",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "action", in: "query", schema: { type: "string" } },
          { name: "userId", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Audit logs retrieved" },
        },
      },
    },
    "/health": {
      get: {
        tags: ["System"],
        summary: "System health check",
        security: [],
        responses: {
          200: { description: "System is healthy" },
          503: { description: "Service unavailable" },
        },
      },
    },
  },
};
