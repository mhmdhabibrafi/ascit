/**
 * Role-Based Access Control (RBAC) Utilities
 * Enhanced permission checking dan middleware
 */

import { getServerSession } from "next-auth";
import { logger } from "./logger";

export enum Permission {
  // Asset permissions
  ASSET_CREATE = "asset:create",
  ASSET_READ = "asset:read",
  ASSET_UPDATE = "asset:update",
  ASSET_DELETE = "asset:delete",
  ASSET_EXPORT = "asset:export",

  // Mutation permissions
  MUTATION_CREATE = "mutation:create",
  MUTATION_APPROVE = "mutation:approve",
  MUTATION_READ = "mutation:read",

  // Maintenance permissions
  MAINTENANCE_CREATE = "maintenance:create",
  MAINTENANCE_READ = "maintenance:read",
  MAINTENANCE_UPDATE = "maintenance:update",

  // Repair permissions
  REPAIR_CREATE = "repair:create",
  REPAIR_READ = "repair:read",
  REPAIR_UPDATE = "repair:update",

  // Report permissions
  REPORT_READ = "report:read",
  REPORT_EXPORT = "report:export",

  // User management
  USER_CREATE = "user:create",
  USER_READ = "user:read",
  USER_UPDATE = "user:update",
  USER_DELETE = "user:delete",

  // Master data
  MASTER_DATA_CREATE = "master_data:create",
  MASTER_DATA_UPDATE = "master_data:update",
  MASTER_DATA_DELETE = "master_data:delete",

  // System
  SYSTEM_ADMIN = "system:admin",
  SETTINGS_MANAGE = "settings:manage",
  AUDIT_LOG_READ = "audit_log:read",
}

/**
 * Role definitions dengan permissions
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: [
    // Full access
    ...Object.values(Permission),
  ],
  ADMIN_IT: [
    // Asset management
    Permission.ASSET_CREATE,
    Permission.ASSET_READ,
    Permission.ASSET_UPDATE,
    Permission.ASSET_DELETE,
    Permission.ASSET_EXPORT,

    // Mutation management
    Permission.MUTATION_CREATE,
    Permission.MUTATION_APPROVE,
    Permission.MUTATION_READ,

    // Maintenance
    Permission.MAINTENANCE_CREATE,
    Permission.MAINTENANCE_READ,
    Permission.MAINTENANCE_UPDATE,

    // Repair
    Permission.REPAIR_CREATE,
    Permission.REPAIR_READ,
    Permission.REPAIR_UPDATE,

    // Reports
    Permission.REPORT_READ,
    Permission.REPORT_EXPORT,

    // User management
    Permission.USER_READ,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,

    // Master data
    Permission.MASTER_DATA_CREATE,
    Permission.MASTER_DATA_UPDATE,
    Permission.MASTER_DATA_DELETE,

    // System
    Permission.SETTINGS_MANAGE,
    Permission.AUDIT_LOG_READ,
  ],
  KEPALA_IT: [
    // Read most things
    Permission.ASSET_READ,
    Permission.ASSET_EXPORT,
    Permission.MUTATION_READ,
    Permission.MUTATION_APPROVE,
    Permission.MAINTENANCE_READ,
    Permission.REPAIR_READ,
    Permission.REPORT_READ,
    Permission.REPORT_EXPORT,
    Permission.USER_READ,
    Permission.AUDIT_LOG_READ,
  ],
  STAF_IT: [
    // Limited operations
    Permission.ASSET_READ,
    Permission.ASSET_CREATE,
    Permission.ASSET_UPDATE,
    Permission.MUTATION_CREATE,
    Permission.MAINTENANCE_CREATE,
    Permission.MAINTENANCE_READ,
    Permission.MAINTENANCE_UPDATE,
    Permission.REPAIR_CREATE,
    Permission.REPAIR_READ,
  ],
  MANAJEMEN: [
    // Read-only access
    Permission.ASSET_READ,
    Permission.REPORT_READ,
    Permission.REPORT_EXPORT,
    Permission.AUDIT_LOG_READ,
  ],
};

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: Permission[];
}

/**
 * Get user permissions based on role
 */
export function getUserPermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if user has permission
 */
export function hasPermission(userPermissions: Permission[], requiredPermission: Permission): boolean {
  return userPermissions.includes(requiredPermission);
}

/**
 * Check if user has any of the permissions
 */
export function hasAnyPermission(userPermissions: Permission[], permissions: Permission[]): boolean {
  return permissions.some((p) => userPermissions.includes(p));
}

/**
 * Check if user has all permissions
 */
export function hasAllPermissions(userPermissions: Permission[], permissions: Permission[]): boolean {
  return permissions.every((p) => userPermissions.includes(p));
}

/**
 * Middleware untuk memeriksa permission di API routes
 */
export async function checkPermission(
  requiredPermission: Permission | Permission[],
  options?: { throwError?: boolean; requestId?: string }
): Promise<{ authorized: boolean; user: AuthUser | null }> {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      logger.warn("Unauthorized access attempt", {
        requestId: options?.requestId,
        metadata: { reason: "No session" },
      });
      return { authorized: false, user: null };
    }

    const userRole = (session.user as any).role || "STAF_IT";
    const permissions = getUserPermissions(userRole);

    const requiredPerms = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    const authorized = hasAllPermissions(permissions, requiredPerms);

    if (!authorized && options?.throwError) {
      logger.warn("Permission denied", {
        requestId: options?.requestId,
        userId: (session.user as any).id,
        metadata: { required: requiredPerms, user_role: userRole },
      });
    }

    const user: AuthUser = {
      id: (session.user as any).id,
      email: session.user.email || "",
      name: session.user.name || "",
      role: userRole,
      permissions,
    };

    return { authorized, user };
  } catch (error) {
    logger.error("Permission check failed", error as Error, { requestId: options?.requestId });
    return { authorized: false, user: null };
  }
}

/**
 * Wrapper untuk API handler dengan permission checking
 */
export function withPermission<T extends any[]>(
  requiredPermission: Permission | Permission[],
  handler: (user: AuthUser, ...args: T) => Promise<Response | any>
) {
  return async (...args: T): Promise<Response> => {
    const { authorized, user } = await checkPermission(requiredPermission);

    if (!authorized || !user) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      const actionTaken = await handler(user, ...args);
      return actionTaken instanceof Response ? actionTaken : Response.json(actionTaken);
    } catch (error) {
      logger.error("Handler error", error as Error, { userId: user.id });
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

/**
 * Audit log permission changes
 */
export async function logPermissionCheck(
  userId: string,
  action: string,
  permission: Permission,
  authorized: boolean,
  requestId?: string
) {
  logger.info(`Permission check: ${action}`, {
    userId,
    requestId,
    metadata: {
      action,
      permission,
      authorized,
    },
  });
}
