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

  // Cache TTLs
  private readonly CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CLIENT_CACHE_TTL = 60 * 60 * 1000; // 1 hour

  private constructor() {
    // Private constructor for singleton pattern
    this.startCacheCleanup();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): DataSourceManager {
    if (!DataSourceManager.instance) {
      DataSourceManager.instance = new DataSourceManager();
    }
    return DataSourceManager.instance;
  }

  /**
   * Get Supabase client for a specific tenant's data database
   *
   * @param tenantId - The tenant UUID
   * @param useServiceRole - Whether to use service role key (bypasses RLS)
   * @returns Supabase client connected to tenant's data database
   */
  async getClientForTenant(
    tenantId: string,
    useServiceRole: boolean = true
  ): Promise<SupabaseClient<Database>> {
    const cacheKey = `${tenantId}-${useServiceRole ? 'service' : 'anon'}`;

    // Check client cache
    const cached = this.clientCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.client;
    }

    // Fetch tenant connection config
    const { config } = await this.getTenantConnectionConfig(tenantId);

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

    // Cache the client
    this.clientCache.set(cacheKey, {
      client,
      expiry: Date.now() + this.CLIENT_CACHE_TTL,
    });

    return client;
  }

  /**
   * Fetch tenant's connection configuration from APPLICATION database
   *
   * IMPORTANT: This always queries the APPLICATION database, not tenant data
   *
   * @param tenantId - The tenant UUID
   * @returns Connection config and tenant ID in data source
   * @throws Error if tenant not found or missing configuration
   */
  private async getTenantConnectionConfig(tenantId: string): Promise<{
    config: TenantConnectionConfig;
    tenantIdInDataSource: string;
  }> {
    // Check config cache
    const cached = this.configCache.get(tenantId);
    if (cached && cached.expiry > Date.now()) {
      return {
        config: cached.config,
        tenantIdInDataSource: cached.tenantIdInDataSource,
      };
    }

    // Query APPLICATION database for tenant metadata
    // This uses the main application Supabase connection
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

    // Decrypt sensitive keys
    const config: TenantConnectionConfig = {
      supabaseUrl: tenant.data_source_url,
      supabaseAnonKey: this.decryptKey(tenant.data_source_anon_key),
      supabaseServiceKey: this.decryptKey(tenant.data_source_service_key),
      region: tenant.data_source_region || undefined,
      poolConfig: tenant.connection_pool_config as any,
    };

    // Cache the config
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
   * Decrypt API keys
   *
   * TODO: Implement actual decryption based on your security requirements
   *
   * Options:
   * 1. AWS KMS - Best for AWS deployments
   * 2. HashiCorp Vault - Best for multi-cloud
   * 3. Supabase Vault - If using Supabase
   * 4. Node.js crypto with environment key - Simple option
   *
   * @param encryptedKey - Encrypted API key
   * @returns Decrypted API key
   */
  private decryptKey(encryptedKey: string): string {
    // TODO: Implement actual decryption
    // For now, assume keys are stored in plain text (NOT RECOMMENDED FOR PRODUCTION)

    // Example with Node.js crypto (uncomment and configure for production):
    /*
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

    try {
      const [ivHex, authTagHex, encryptedHex] = encryptedKey.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error(`Failed to decrypt key: ${error.message}`);
    }
    */

    return encryptedKey;
  }

  /**
   * Encrypt API keys
   *
   * TODO: Implement actual encryption
   *
   * @param plainKey - Plain text API key
   * @returns Encrypted API key
   */
  public encryptKey(plainKey: string): string {
    // TODO: Implement actual encryption
    // For now, return plain text (NOT RECOMMENDED FOR PRODUCTION)

    // Example with Node.js crypto (uncomment and configure for production):
    /*
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(plainKey, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted (all hex encoded)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
    */

    return plainKey;
  }

  /**
   * Clear all caches for a specific tenant
   *
   * Call this when tenant configuration changes
   *
   * @param tenantId - The tenant UUID
   */
  clearTenantCache(tenantId: string): void {
    this.configCache.delete(tenantId);
    this.clientCache.delete(`${tenantId}-anon`);
    this.clientCache.delete(`${tenantId}-service`);
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
   * Removes expired entries every 10 minutes
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
    }, 10 * 60 * 1000); // Every 10 minutes
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    configCacheSize: number;
    clientCacheSize: number;
  } {
    return {
      configCacheSize: this.configCache.size,
      clientCacheSize: this.clientCache.size,
    };
  }
}

// Export singleton instance
export const dataSourceManager = DataSourceManager.getInstance();

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
