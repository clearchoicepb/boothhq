/**
 * Data Source Types
 *
 * Types for managing tenant-specific database connections
 */

/**
 * Connection configuration for a tenant's data database
 */
export interface TenantConnectionConfig {
  /** Supabase project URL or PostgreSQL connection string */
  supabaseUrl: string;

  /** Supabase anon key (for client-side operations) */
  supabaseAnonKey: string;

  /** Supabase service role key (for server-side operations, bypasses RLS) */
  supabaseServiceKey: string;

  /** Database region (e.g., 'us-east-1', 'eu-west-1') */
  region?: string;

  /** Connection pool configuration */
  poolConfig?: {
    /** Minimum connections */
    min: number;
    /** Maximum connections */
    max: number;
  };
}

/**
 * Tenant metadata including connection configuration
 */
export interface TenantMetadata {
  /** Tenant UUID */
  id: string;

  /** Tenant name */
  name: string;

  /** Subdomain */
  subdomain: string;

  /** Current status */
  status: string;

  /** Subscription plan */
  plan?: string;

  /** Connection configuration for tenant's data database */
  connectionConfig: TenantConnectionConfig;

  /** Tenant ID as it appears in the tenant data database */
  tenantIdInDataSource?: string;
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  /** Whether connection was successful */
  success: boolean;

  /** Error message if connection failed */
  error?: string;

  /** Response time in milliseconds */
  responseTimeMs?: number;

  /** Additional diagnostic info */
  diagnostics?: {
    canConnect: boolean;
    canQuery: boolean;
    rlsEnabled: boolean;
  };
}

/**
 * Connection info for debugging (without sensitive keys)
 */
export interface ConnectionInfo {
  /** Database URL */
  url: string;

  /** Database region */
  region?: string;

  /** Connection pool configuration */
  poolConfig?: {
    min: number;
    max: number;
  };

  /** Whether connection is cached */
  isCached: boolean;

  /** Cache expiry time */
  cacheExpiry?: Date;
}
