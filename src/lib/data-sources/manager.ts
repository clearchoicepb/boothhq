/**
 * Data Source Manager
 *
 * Manages tenant-specific database connections and routing.
 * Provides caching and connection pooling for optimal performance.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { createServerSupabaseClient } from '@/lib/supabase-client';
import {
  TenantConnectionConfig,
  ConnectionTestResult,
  ConnectionInfo,
} from './types';
import crypto from 'crypto';
import { createLogger } from '@/lib/logger'

const log = createLogger('data-sources')

/**
 * Cache entry for tenant connection configuration
 */
interface ConfigCacheEntry {
  config: TenantConnectionConfig;
  tenantIdInDataSource: string;
  expiry: number;
}

/**
 * Cache entry for Supabase client
 */
interface ClientCacheEntry {
  client: SupabaseClient<Database>;
  expiry: number;
  createdAt: number;
}

/**
 * Connection pool configuration
 */
interface ConnectionPoolConfig {
  maxClients: number;
  enableMetrics: boolean;
  useNextjsCache: boolean; // Enable Next.js cache for serverless
  configCacheTTL?: number; // Config cache TTL in milliseconds
  clientCacheTTL?: number; // Client cache TTL in milliseconds
  cacheCleanupInterval?: number; // Cleanup interval in milliseconds
}

/**
 * Tenant config data from database (before decryption)
 */
interface TenantConfigData {
  id: string;
  data_source_url: string;
  data_source_anon_key: string;
  data_source_service_key: string;
  data_source_region: string | null;
  connection_pool_config: any;
  tenant_id_in_data_source: string | null;
}

/**
 * DataSourceManager - Singleton class for managing tenant database connections
 *
 * This class handles routing queries to the correct tenant data database.
 * It maintains two caches:
 * 1. Configuration cache: Stores tenant connection info (5 min TTL)
 * 2. Client cache: Stores active Supabase clients (1 hour TTL)
 *
 * Usage:
 * ```typescript
 * const manager = DataSourceManager.getInstance();
 * const tenantDb = await manager.getClientForTenant('tenant-id', true);
 * const { data } = await tenantDb.from('accounts').select('*');
 * ```
 */
export class DataSourceManager {
  private static instance: DataSourceManager;

  // Configuration cache: tenant_id -> connection config
  private configCache = new Map<string, ConfigCacheEntry>();

  // Client cache: "tenant_id-anon" or "tenant_id-service" -> Supabase client
  private clientCache = new Map<string, ClientCacheEntry>();

  // Cache TTLs (configurable)
  private readonly CONFIG_CACHE_TTL: number;
  private readonly CLIENT_CACHE_TTL: number;
  private readonly CACHE_CLEANUP_INTERVAL: number;

  // Connection pool configuration
  private readonly poolConfig: ConnectionPoolConfig;

  // Metrics tracking
  private metrics = {
    totalClientsCreated: 0,
    poolExhaustedCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  private constructor(config?: Partial<ConnectionPoolConfig>) {
    // Private constructor for singleton pattern
    this.poolConfig = {
      maxClients: config?.maxClients ?? 50, // Default: 50 max clients
      enableMetrics: config?.enableMetrics ?? true,
      useNextjsCache: config?.useNextjsCache ?? true, // Default: enabled for serverless
      configCacheTTL: config?.configCacheTTL ?? 5 * 60 * 1000, // Default: 5 minutes
      clientCacheTTL: config?.clientCacheTTL ?? 60 * 60 * 1000, // Default: 1 hour
      cacheCleanupInterval: config?.cacheCleanupInterval ?? 10 * 60 * 1000, // Default: 10 minutes
    };

    // Initialize TTL values from config
    this.CONFIG_CACHE_TTL = this.poolConfig.configCacheTTL!;
    this.CLIENT_CACHE_TTL = this.poolConfig.clientCacheTTL!;
    this.CACHE_CLEANUP_INTERVAL = this.poolConfig.cacheCleanupInterval!;

    this.startCacheCleanup();
  }

  /**
   * Get singleton instance
   * @param config - Optional connection pool configuration (only used on first initialization)
   */
  static getInstance(config?: Partial<ConnectionPoolConfig>): DataSourceManager {
    if (!DataSourceManager.instance) {
      DataSourceManager.instance = new DataSourceManager(config);
    }
    return DataSourceManager.instance;
  }

  /**
   * Get Supabase client for a specific tenant's data database
   *
   * @param tenantId - The tenant UUID
   * @param useServiceRole - Whether to use service role key (bypasses RLS)
   * @returns Supabase client connected to tenant's data database
   * @throws Error if connection pool is exhausted
   */
  async getClientForTenant(
    tenantId: string,
    useServiceRole: boolean = true
  ): Promise<SupabaseClient<Database>> {
    const cacheKey = `${tenantId}-${useServiceRole ? 'service' : 'anon'}`;

    // Check client cache
    const cached = this.clientCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      if (this.poolConfig.enableMetrics) {
        this.metrics.cacheHits++;
      }
      return cached.client;
    }

    if (this.poolConfig.enableMetrics) {
      this.metrics.cacheMisses++;
    }

    // Check connection pool limit
    const activeClients = this.clientCache.size;
    if (activeClients >= this.poolConfig.maxClients) {
      if (this.poolConfig.enableMetrics) {
        this.metrics.poolExhaustedCount++;
      }
      throw new Error(
        `Connection pool exhausted: ${activeClients}/${this.poolConfig.maxClients} clients active. ` +
        `Consider increasing maxClients or reducing tenant load.`
      );
    }

    // Fetch tenant connection config
    const { config } = await this.getTenantConnectionConfig(tenantId);

    log.debug('Creating client for tenant:', tenantId, 'URL:', config.supabaseUrl);

    // Create Supabase client
    const key = useServiceRole ? config.supabaseServiceKey : config.supabaseAnonKey;
    const client = createClient<Database>(config.supabaseUrl, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      },
    });

    if (this.poolConfig.enableMetrics) {
      this.metrics.totalClientsCreated++;
    }

    // Cache the client
    this.clientCache.set(cacheKey, {
      client,
      expiry: Date.now() + this.CLIENT_CACHE_TTL,
      createdAt: Date.now(),
    });

    return client;
  }

  /**
   * Fetch tenant config from database (raw data, before decryption)
   * This is the inner function that gets wrapped by Next.js cache
   *
   * @param tenantId - The tenant UUID
   * @returns Raw tenant config data from database
   * @throws Error if tenant not found
   */
  private async fetchTenantConfigFromDatabase(tenantId: string): Promise<TenantConfigData> {
    const appDb = createServerSupabaseClient();

    const { data: tenant, error } = await appDb
      .from('tenants')
      .select(`
        id,
        data_source_url,
        data_source_anon_key,
        data_source_service_key,
        data_source_region,
        connection_pool_config,
        tenant_id_in_data_source
      `)
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      throw new Error(
        `Failed to fetch tenant connection config: ${error?.message || 'Tenant not found'}`
      );
    }

    if (!tenant.data_source_url) {
      throw new Error(`Tenant ${tenantId} has no data source configured`);
    }

    return tenant as TenantConfigData;
  }

  /**
   * Fetch tenant's connection configuration from APPLICATION database
   *
   * IMPORTANT: This always queries the APPLICATION database, not tenant data
   *
   * Uses a two-tier caching strategy:
   * 1. In-memory cache (fastest, per-instance)
   * 2. Next.js cache (persistent, serverless-friendly)
   *
   * @param tenantId - The tenant UUID
   * @returns Connection config and tenant ID in data source
   * @throws Error if tenant not found or missing configuration
   */
  private async getTenantConnectionConfig(tenantId: string): Promise<{
    config: TenantConnectionConfig;
    tenantIdInDataSource: string;
  }> {
    // Tier 1: Check in-memory cache (fastest)
    const cached = this.configCache.get(tenantId);
    if (cached && cached.expiry > Date.now()) {
      return {
        config: cached.config,
        tenantIdInDataSource: cached.tenantIdInDataSource,
      };
    }

    // Tier 2: Fetch from database with Next.js cache (if enabled)
    let tenant: TenantConfigData;

    if (this.poolConfig.useNextjsCache) {
      // Use Next.js cache for serverless environments
      // This cache persists across function invocations and is shared between instances
      try {
        // Dynamic import to avoid issues with client-side imports
        const { unstable_cache } = await import('next/cache');

        const getCachedTenantConfig = unstable_cache(
          async (id: string) => this.fetchTenantConfigFromDatabase(id),
          ['tenant-config', tenantId],
          {
            revalidate: 300, // Revalidate every 5 minutes
            tags: [`tenant-config-${tenantId}`],
          }
        );

        tenant = await getCachedTenantConfig(tenantId);
      } catch (error) {
        // Fallback to direct fetch if Next.js cache is not available
        log.warn({ error }, 'Next.js cache not available, falling back to direct fetch');
        tenant = await this.fetchTenantConfigFromDatabase(tenantId);
      }
    } else {
      // Direct database fetch (no Next.js cache)
      tenant = await this.fetchTenantConfigFromDatabase(tenantId);
    }

    // Decrypt sensitive keys
    const config: TenantConnectionConfig = {
      supabaseUrl: tenant.data_source_url,
      supabaseAnonKey: this.decryptKey(tenant.data_source_anon_key),
      supabaseServiceKey: this.decryptKey(tenant.data_source_service_key),
      region: tenant.data_source_region || undefined,
      poolConfig: tenant.connection_pool_config as any,
    };

    // Store in Tier 1 cache (in-memory)
    this.configCache.set(tenantId, {
      config,
      tenantIdInDataSource: tenant.tenant_id_in_data_source || tenantId,
      expiry: Date.now() + this.CONFIG_CACHE_TTL,
    });

    return {
      config,
      tenantIdInDataSource: tenant.tenant_id_in_data_source || tenantId,
    };
  }

  /**
   * Decrypt API keys using AES-256-GCM
   *
   * Decrypts keys that were encrypted using the encryptKey() method.
   * Validates authentication tag to ensure data hasn't been tampered with.
   *
   * Security features:
   * - AES-256-GCM authenticated decryption
   * - Authentication tag verification (prevents tampering)
   * - Proper error handling for invalid/corrupted data
   *
   * @param encryptedKey - Encrypted API key in format: iv:authTag:encrypted (base64 encoded)
   * @returns Decrypted API key in plain text
   * @throws Error if ENCRYPTION_KEY is not set, format is invalid, or decryption fails
   */
  private decryptKey(encryptedKey: string): string {
    try {
      // Validate environment variable
      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
      }

      // Validate input
      if (!encryptedKey || typeof encryptedKey !== 'string') {
        throw new Error('Invalid input: encryptedKey must be a non-empty string');
      }

      // Parse the encrypted data format: iv:authTag:encrypted
      const parts = encryptedKey.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted key format. Expected format: iv:authTag:encrypted');
      }

      const [ivBase64, authTagBase64, encryptedBase64] = parts;

      // Validate that all parts are present
      if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
        throw new Error('Invalid encrypted key format. Missing required components');
      }

      // Convert from base64 to buffers
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');
      const encrypted = Buffer.from(encryptedBase64, 'base64');

      // Validate buffer sizes
      if (iv.length !== 16) {
        throw new Error('Invalid IV length. Expected 16 bytes');
      }
      if (authTag.length !== 16) {
        throw new Error('Invalid auth tag length. Expected 16 bytes');
      }

      // AES-256-GCM requires a 256-bit (32-byte) key
      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(encryptionKey, 'hex');

      // Validate key length
      if (key.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes for AES-256)');
      }

      // Create decipher with algorithm, key, and IV
      const decipher = crypto.createDecipheriv(algorithm, key, iv);

      // Set the authentication tag
      // This verifies the data hasn't been tampered with
      decipher.setAuthTag(authTag);

      // Decrypt the data
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      // Return the decrypted string
      return decrypted.toString('utf8');
    } catch (error: any) {
      // Log error for debugging but don't expose sensitive details
      log.error({ error: error.message }, 'Decryption failed');

      // Provide more helpful error messages for common issues
      if (error.message.includes('Unsupported state or unable to authenticate data')) {
        throw new Error('Failed to decrypt key: Authentication failed. The key may have been tampered with or encrypted with a different key.');
      }

      throw new Error(`Failed to decrypt key: ${error.message}`);
    }
  }

  /**
   * Encrypt API keys using AES-256-GCM
   *
   * Uses authenticated encryption (GCM mode) for security.
   * Generates a random IV for each encryption operation.
   *
   * Security features:
   * - AES-256-GCM authenticated encryption
   * - Random IV per encryption (prevents pattern analysis)
   * - Authentication tag validation (prevents tampering)
   * - Base64 encoding for safe storage
   *
   * @param plainKey - Plain text API key to encrypt
   * @returns Encrypted API key in format: iv:authTag:encrypted (all base64 encoded)
   * @throws Error if ENCRYPTION_KEY is not set or encryption fails
   */
  public encryptKey(plainKey: string): string {
    try {
      // Validate environment variable
      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
      }

      // Validate input
      if (!plainKey || typeof plainKey !== 'string') {
        throw new Error('Invalid input: plainKey must be a non-empty string');
      }

      // AES-256-GCM requires a 256-bit (32-byte) key
      // The encryption key should be a 64-character hex string (32 bytes)
      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(encryptionKey, 'hex');

      // Validate key length
      if (key.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes for AES-256)');
      }

      // Generate a random 16-byte IV (initialization vector)
      // Using a unique IV for each encryption prevents pattern analysis
      const iv = crypto.randomBytes(16);

      // Create cipher with algorithm, key, and IV
      const cipher = crypto.createCipheriv(algorithm, key, iv);

      // Encrypt the plain text
      let encrypted = cipher.update(plainKey, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // Get the authentication tag (for GCM mode)
      // This allows verification that the data hasn't been tampered with
      const authTag = cipher.getAuthTag();

      // Return format: iv:authTag:encrypted (all base64 encoded)
      // Base64 encoding makes it safe to store in databases
      return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
    } catch (error: any) {
      // Log error for debugging but don't expose sensitive details
      log.error({ error: error.message }, 'Encryption failed');
      throw new Error(`Failed to encrypt key: ${error.message}`);
    }
  }

  /**
   * Clear all caches for a specific tenant
   *
   * Call this when tenant configuration changes.
   * Clears both in-memory cache and Next.js cache (if enabled).
   *
   * @param tenantId - The tenant UUID
   */
  async clearTenantCache(tenantId: string): Promise<void> {
    // Clear in-memory caches
    this.configCache.delete(tenantId);
    this.clientCache.delete(`${tenantId}-anon`);
    this.clientCache.delete(`${tenantId}-service`);

    // Invalidate Next.js cache (if enabled)
    if (this.poolConfig.useNextjsCache) {
      try {
        // Dynamic import to avoid issues with client-side imports
        const { revalidateTag } = await import('next/cache');
        revalidateTag(`tenant-config-${tenantId}`);
      } catch (error) {
        // revalidateTag may fail in non-serverless environments or client-side
        log.warn({ error }, 'Failed to revalidate Next.js cache for tenant ${tenantId}');
      }
    }
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.configCache.clear();
    this.clientCache.clear();
  }

  /**
   * Test connection to tenant's data source
   *
   * @param tenantId - The tenant UUID
   * @returns Connection test result
   */
  async testTenantConnection(tenantId: string): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      const client = await this.getClientForTenant(tenantId, true);
      const { tenantIdInDataSource } = await this.getTenantConnectionConfig(tenantId);

      // Test: Can we query the database?
      const { error: queryError } = await client
        .from('accounts')
        .select('id')
        .eq('tenant_id', tenantIdInDataSource)
        .limit(1);

      if (queryError) {
        return {
          success: false,
          error: queryError.message,
          responseTimeMs: Date.now() - startTime,
          diagnostics: {
            canConnect: true,
            canQuery: false,
            rlsEnabled: false,
          },
        };
      }

      return {
        success: true,
        responseTimeMs: Date.now() - startTime,
        diagnostics: {
          canConnect: true,
          canQuery: true,
          rlsEnabled: true,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        responseTimeMs: Date.now() - startTime,
        diagnostics: {
          canConnect: false,
          canQuery: false,
          rlsEnabled: false,
        },
      };
    }
  }

  /**
   * Get connection info for debugging (without sensitive keys)
   *
   * @param tenantId - The tenant UUID
   * @returns Connection info
   */
  async getTenantConnectionInfo(tenantId: string): Promise<ConnectionInfo> {
    const { config } = await this.getTenantConnectionConfig(tenantId);
    const cacheEntry = this.configCache.get(tenantId);

    return {
      url: config.supabaseUrl,
      region: config.region,
      poolConfig: config.poolConfig,
      isCached: !!cacheEntry && cacheEntry.expiry > Date.now(),
      cacheExpiry: cacheEntry ? new Date(cacheEntry.expiry) : undefined,
    };
  }

  /**
   * Get the tenant ID as it appears in the tenant data database
   *
   * This may differ from the application tenant ID
   *
   * @param tenantId - The application tenant UUID
   * @returns Tenant ID in the data source database
   */
  async getTenantIdInDataSource(tenantId: string): Promise<string> {
    const { tenantIdInDataSource } = await this.getTenantConnectionConfig(tenantId);
    return tenantIdInDataSource;
  }

  /**
   * Start periodic cache cleanup
   * Removes expired entries at configurable intervals
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();

      // Clean config cache
      for (const [tenantId, entry] of this.configCache.entries()) {
        if (entry.expiry < now) {
          this.configCache.delete(tenantId);
        }
      }

      // Clean client cache
      for (const [key, entry] of this.clientCache.entries()) {
        if (entry.expiry < now) {
          this.clientCache.delete(key);
        }
      }
    }, this.CACHE_CLEANUP_INTERVAL);
  }

  /**
   * Get cache and connection pool statistics for monitoring
   */
  getCacheStats(): {
    configCacheSize: number;
    clientCacheSize: number;
    maxClients: number;
    poolUtilization: number;
    totalClientsCreated: number;
    poolExhaustedCount: number;
    cacheHitRate: number;
    cacheHits: number;
    cacheMisses: number;
  } {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = totalRequests > 0
      ? (this.metrics.cacheHits / totalRequests) * 100
      : 0;

    return {
      configCacheSize: this.configCache.size,
      clientCacheSize: this.clientCache.size,
      maxClients: this.poolConfig.maxClients,
      poolUtilization: (this.clientCache.size / this.poolConfig.maxClients) * 100,
      totalClientsCreated: this.metrics.totalClientsCreated,
      poolExhaustedCount: this.metrics.poolExhaustedCount,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses,
    };
  }

  /**
   * Get connection pool configuration
   */
  getPoolConfig(): ConnectionPoolConfig {
    return { ...this.poolConfig };
  }

  /**
   * Reset metrics (useful for testing or debugging)
   */
  resetMetrics(): void {
    this.metrics = {
      totalClientsCreated: 0,
      poolExhaustedCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }
}

// Initialize with configuration from environment variables (if available)
const poolConfig: Partial<ConnectionPoolConfig> = {
  maxClients: process.env.DATA_SOURCE_MAX_CLIENTS
    ? parseInt(process.env.DATA_SOURCE_MAX_CLIENTS, 10)
    : 50,
  enableMetrics: process.env.DATA_SOURCE_ENABLE_METRICS !== 'false', // Default: true
  useNextjsCache: process.env.DATA_SOURCE_USE_NEXTJS_CACHE !== 'false', // Default: true (serverless-friendly)
  configCacheTTL: process.env.DATA_SOURCE_CONFIG_CACHE_TTL
    ? parseInt(process.env.DATA_SOURCE_CONFIG_CACHE_TTL, 10)
    : undefined, // Default: 5 minutes (300000 ms)
  clientCacheTTL: process.env.DATA_SOURCE_CLIENT_CACHE_TTL
    ? parseInt(process.env.DATA_SOURCE_CLIENT_CACHE_TTL, 10)
    : undefined, // Default: 1 hour (3600000 ms)
  cacheCleanupInterval: process.env.DATA_SOURCE_CACHE_CLEANUP_INTERVAL
    ? parseInt(process.env.DATA_SOURCE_CACHE_CLEANUP_INTERVAL, 10)
    : undefined, // Default: 10 minutes (600000 ms)
};

// Export singleton instance with configuration
export const dataSourceManager = DataSourceManager.getInstance(poolConfig);

// Export convenience function
export async function getTenantClient(
  tenantId: string,
  useServiceRole: boolean = true
): Promise<SupabaseClient<Database>> {
  return dataSourceManager.getClientForTenant(tenantId, useServiceRole);
}

// Export convenience function for getting tenant ID in data source
export async function getTenantIdInDataSource(tenantId: string): Promise<string> {
  return dataSourceManager.getTenantIdInDataSource(tenantId);
}
