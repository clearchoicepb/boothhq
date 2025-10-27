/**
 * Data Sources Module
 *
 * Provides tenant-specific database routing and connection management
 *
 * Usage:
 * ```typescript
 * import { getTenantClient, dataSourceManager } from '@/lib/data-sources';
 *
 * // Get client for tenant
 * const tenantDb = await getTenantClient('tenant-id', true);
 *
 * // Query tenant data
 * const { data } = await tenantDb.from('accounts').select('*');
 *
 * // Test connection
 * const result = await dataSourceManager.testTenantConnection('tenant-id');
 * ```
 */

export { DataSourceManager, dataSourceManager, getTenantClient, getTenantIdInDataSource } from './manager';
export type {
  TenantConnectionConfig,
  TenantMetadata,
  ConnectionTestResult,
  ConnectionInfo,
} from './types';
