/**
 * Caching System untuk Master Data
 * In-memory cache dengan TTL dan invalidation
 */

import { logger } from "./logger";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

class Cache {
  private store = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0 };
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly maxSize = 1000;
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Cleanup expired entries setiap 1 menit
    if (typeof globalThis !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    }
  }

  /**
   * Get value dari cache
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    logger.debug("Cache hit", { module: "Cache", metadata: { key } });
    return entry.data as T;
  }

  /**
   * Set value ke cache
   */
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    // Simple size management
    if (this.store.size >= this.maxSize) {
      this.cleanup();
    }

    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    this.stats.size = this.store.size;
    logger.debug("Cache set", { module: "Cache", metadata: { key, ttl } });
  }

  /**
   * Get atau set dengan function
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const data = await fn();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Delete key dari cache
   */
  delete(key: string): void {
    this.store.delete(key);
    this.stats.size = this.store.size;
  }

  /**
   * Invalidate pattern (mis: "user:*")
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
    let deleted = 0;

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        deleted++;
      }
    }

    this.stats.size = this.store.size;
    logger.debug("Cache pattern invalidated", {
      module: "Cache",
      metadata: { pattern, deleted },
    });
  }

  /**
   * Clear semua cache
   */
  clear(): void {
    this.store.clear();
    this.stats = { hits: 0, misses: 0, size: 0 };
    logger.info("Cache cleared", { module: "Cache" });
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let deleted = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.store.delete(key);
        deleted++;
      }
    }

    this.stats.size = this.store.size;

    if (deleted > 0) {
      logger.debug("Cache cleanup", { module: "Cache", metadata: { deleted } });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: string } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total === 0 ? "N/A" : `${((this.stats.hits / total) * 100).toFixed(2)}%`;
    return { ...this.stats, hitRate };
  }

  /**
   * Destroy cache (cleanup interval)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Singleton instance
export const cache = new Cache();

/**
 * Cache keys constants
 */
export const CACHE_KEYS = {
  // Master data
  UNITS: "master:units",
  ROOMS: (unitId: string) => `master:rooms:${unitId}`,
  CATEGORIES: "master:categories",
  BRANDS: "master:brands",
  VENDORS: "master:vendors",
  TECHNICIANS: "master:technicians",

  // Users
  USER: (userId: string) => `user:${userId}`,
  USER_ROLE: (userId: string) => `user:role:${userId}`,
  ROLES: "roles:all",

  // Assets
  ASSET: (assetId: string) => `asset:${assetId}`,
  ASSET_BY_CODE: (code: string) => `asset:code:${code}`,
  ASSETS_LIST: (page: number, size: number) => `assets:list:${page}:${size}`,

  // Settings
  SYSTEM_SETTINGS: "system:settings",
  SYSTEM_SETTING: (key: string) => `system:setting:${key}`,

  // Other
  HEALTH_CHECK: "health:check",
  STATS: "stats:all",
};

/**
 * Cache manager untuk master data
 */
export const masterDataCache = {
  /**
   * Cache units dengan TTL 10 menit
   */
  getUnits: async (fetchFn: () => Promise<any>) => {
    return cache.getOrSet(CACHE_KEYS.UNITS, fetchFn, 10 * 60 * 1000);
  },

  /**
   * Cache rooms by unit dengan TTL 10 menit
   */
  getRooms: async (unitId: string, fetchFn: () => Promise<any>) => {
    return cache.getOrSet(CACHE_KEYS.ROOMS(unitId), fetchFn, 10 * 60 * 1000);
  },

  /**
   * Cache categories dengan TTL 30 menit
   */
  getCategories: async (fetchFn: () => Promise<any>) => {
    return cache.getOrSet(CACHE_KEYS.CATEGORIES, fetchFn, 30 * 60 * 1000);
  },

  /**
   * Cache brands dengan TTL 30 menit
   */
  getBrands: async (fetchFn: () => Promise<any>) => {
    return cache.getOrSet(CACHE_KEYS.BRANDS, fetchFn, 30 * 60 * 1000);
  },

  /**
   * Cache vendors dengan TTL 30 menit
   */
  getVendors: async (fetchFn: () => Promise<any>) => {
    return cache.getOrSet(CACHE_KEYS.VENDORS, fetchFn, 30 * 60 * 1000);
  },

  /**
   * Invalidate semua master data cache
   */
  invalidateAll: () => {
    cache.invalidatePattern("master:*");
  },
};
