/**
 * Tenant Context Helpers
 *
 * Provides centralized helpers for working with tenant-specific data in API routes.
 * Handles the complexity of dual-database architecture and tenant_id mapping.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantDatabaseClient } from '@/lib/supabase-client';
import { getTenantIdInDataSource } from '@/lib/data-sources';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Session } from 'next-auth';

/**
 * Tenant context for API routes
 *
 * Contains everything needed for tenant-scoped operations:
 * - supabase: Client connected to tenant's data database
 * - tenantId: Application tenant ID (from session)
 * - dataSourceTenantId: Data source tenant ID (mapped, for queries)
 * - session: Full NextAuth session
 */
export interface TenantContext {
  /** Supabase client connected to tenant's data database */
  supabase: SupabaseClient<Database>;

  /** Application tenant ID (from session.user.tenantId) */
  tenantId: string;

  /**
   * Data source tenant ID (mapped via tenant_id_in_data_source)
   *
   * IMPORTANT: Always use this in database queries, not tenantId!
   *
   * Example:
   * ```typescript
   * const { data } = await supabase
   *   .from('events')
   *   .select('*')
   *   .eq('tenant_id', dataSourceTenantId) // Use this, not tenantId!
   * ```
   */
  dataSourceTenantId: string;

  /** Full NextAuth session */
  session: Session;
}

/**
 * Get tenant context for API routes
 *
 * This is the recommended way to set up tenant-scoped API routes.
 * Returns either a TenantContext or an error NextResponse.
 *
 * @returns TenantContext if authenticated, NextResponse error if not
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const context = await getTenantContext();
 *
 *   // Type guard: Check if it's an error response
 *   if (context instanceof NextResponse) {
 *     return context;
 *   }
 *
 *   // Now we have full tenant context
 *   const { supabase, dataSourceTenantId } = context;
 *
 *   const { data } = await supabase
 *     .from('events')
 *     .select('*')
 *     .eq('tenant_id', dataSourceTenantId);
 *
 *   return NextResponse.json(data);
 * }
 * ```
 */
export async function getTenantContext(): Promise<TenantContext | NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  if (!session.user.tenantId) {
    return NextResponse.json(
      { error: 'No tenant ID found', message: 'User session is missing tenant information' },
      { status: 400 }
    );
  }

  const tenantId = session.user.tenantId;

  try {
    // Get database client (connects to correct tenant database)
    const supabase = await getTenantDatabaseClient(tenantId);

    // Get mapped tenant ID (CRITICAL for multi-tenant queries!)
    const dataSourceTenantId = await getTenantIdInDataSource(tenantId);

    // Log mapping if different (useful for debugging)
    if (tenantId !== dataSourceTenantId && process.env.NODE_ENV === 'development') {
      console.log(`[Tenant Mapping] ${tenantId} -> ${dataSourceTenantId}`);
    }

    return {
      supabase,
      tenantId,
      dataSourceTenantId,
      session,
    };
  } catch (error: any) {
    console.error('[getTenantContext] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize tenant context',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Get tenant context with additional validation
 *
 * Same as getTenantContext but with extra checks for specific permissions or roles.
 *
 * @param options - Additional validation options
 * @returns TenantContext if authenticated and validated, NextResponse error if not
 *
 * @example
 * ```typescript
 * export async function DELETE(request: NextRequest) {
 *   const context = await getTenantContextWithValidation({
 *     requireRole: 'admin',
 *     requirePermission: 'events:delete'
 *   });
 *
 *   if (context instanceof NextResponse) {
 *     return context;
 *   }
 *
 *   // User is admin with delete permission
 *   const { supabase, dataSourceTenantId } = context;
 *   // ... delete operation
 * }
 * ```
 */
export async function getTenantContextWithValidation(options?: {
  requireRole?: string;
  requirePermission?: string;
}): Promise<TenantContext | NextResponse> {
  const context = await getTenantContext();

  if (context instanceof NextResponse) {
    return context;
  }

  // Additional validation based on options
  if (options?.requireRole) {
    if (context.session.user.role !== options.requireRole) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: `This operation requires ${options.requireRole} role`,
        },
        { status: 403 }
      );
    }
  }

  if (options?.requirePermission) {
    // TODO: Implement permission check
    // This would integrate with your permission system
    // For now, just a placeholder
  }

  return context;
}

/**
 * Type guard to check if value is a NextResponse (error)
 *
 * Useful for narrowing types after getTenantContext()
 *
 * @param value - Value to check
 * @returns true if value is NextResponse
 *
 * @example
 * ```typescript
 * const context = await getTenantContext();
 *
 * if (isErrorResponse(context)) {
 *   return context; // Error response
 * }
 *
 * // TypeScript now knows context is TenantContext
 * const { supabase } = context;
 * ```
 */
export function isErrorResponse(value: any): value is NextResponse {
  return value instanceof NextResponse;
}

/**
 * Create a tenant-scoped query builder
 *
 * Returns a query builder that automatically applies tenant_id filter.
 * Useful for complex queries with multiple filters.
 *
 * @param supabase - Supabase client
 * @param table - Table name
 * @param dataSourceTenantId - Mapped tenant ID
 * @returns Query builder with tenant_id already filtered
 *
 * @example
 * ```typescript
 * const context = await getTenantContext();
 * if (isErrorResponse(context)) return context;
 *
 * const { supabase, dataSourceTenantId } = context;
 *
 * const query = createTenantQuery(supabase, 'events', dataSourceTenantId);
 *
 * const { data } = await query
 *   .select('*')
 *   .eq('status', 'upcoming')
 *   .order('start_date', { ascending: true });
 * ```
 */
export function createTenantQuery<T extends keyof Database['public']['Tables']>(
  supabase: SupabaseClient<Database>,
  table: T,
  dataSourceTenantId: string
) {
  return supabase.from(table).select().eq('tenant_id', dataSourceTenantId);
}

/**
 * Add audit fields to data object
 *
 * Automatically adds created_by and updated_by fields from session.
 * Follows the Single Responsibility Principle - only handles audit field enrichment.
 *
 * @param data - Data object to enrich
 * @param userId - User ID from session
 * @param operation - 'create' or 'update'
 * @returns Data with audit fields added
 *
 * @example
 * ```typescript
 * const context = await getTenantContext();
 * if (isErrorResponse(context)) return context;
 *
 * const dataWithAudit = withAuditFields(
 *   { title: 'New Event', event_type: 'conference' },
 *   context.session.user.id,
 *   'create'
 * );
 * // Result: { title: 'New Event', event_type: 'conference', created_by: 'user-id', updated_by: 'user-id' }
 * ```
 */
export function withAuditFields<T extends Record<string, any>>(
  data: T,
  userId: string,
  operation: 'create' | 'update'
): T & { created_by?: string; updated_by: string } {
  if (operation === 'create') {
    return {
      ...data,
      created_by: userId,
      updated_by: userId,
    };
  } else {
    return {
      ...data,
      updated_by: userId,
    };
  }
}

/**
 * Insert data with automatic tenant_id and audit fields
 *
 * Helper to insert data with tenant_id and audit fields (created_by, updated_by) automatically added.
 * Enhanced version following the Open/Closed Principle - extended functionality without breaking existing code.
 *
 * @param supabase - Supabase client
 * @param table - Table name
 * @param data - Data to insert (tenant_id and audit fields will be added automatically)
 * @param dataSourceTenantId - Mapped tenant ID
 * @param userId - User ID for audit trail (optional, will use system if not provided)
 * @returns Insert query
 *
 * @example
 * ```typescript
 * const context = await getTenantContext();
 * if (isErrorResponse(context)) return context;
 *
 * const { supabase, dataSourceTenantId, session } = context;
 *
 * const { data, error } = await insertWithTenantId(
 *   supabase,
 *   'events',
 *   { title: 'New Event', event_type: 'conference', start_date: '2025-12-01' },
 *   dataSourceTenantId,
 *   session.user.id // Audit: who created this
 * );
 * ```
 */
export async function insertWithTenantId<T extends keyof Database['public']['Tables']>(
  supabase: SupabaseClient<Database>,
  table: T,
  data: Partial<Database['public']['Tables'][T]['Insert']>,
  dataSourceTenantId: string,
  userId?: string
) {
  // Enrich data with audit fields if userId is provided
  const enrichedData = userId
    ? withAuditFields(data, userId, 'create')
    : data;

  return supabase
    .from(table)
    .insert({
      ...enrichedData,
      tenant_id: dataSourceTenantId,
    } as any)
    .select()
    .single();
}

/**
 * Update data with tenant_id filter and audit fields
 *
 * Helper to update data with tenant_id automatically filtered and updated_by audit field added.
 * Enhanced version following the Open/Closed Principle - extended functionality without breaking existing code.
 *
 * @param supabase - Supabase client
 * @param table - Table name
 * @param id - Record ID to update
 * @param data - Data to update (updated_by will be added automatically if userId provided)
 * @param dataSourceTenantId - Mapped tenant ID
 * @param userId - User ID for audit trail (optional)
 * @returns Update query
 *
 * @example
 * ```typescript
 * const context = await getTenantContext();
 * if (isErrorResponse(context)) return context;
 *
 * const { supabase, dataSourceTenantId, session } = context;
 *
 * const { data, error } = await updateWithTenantId(
 *   supabase,
 *   'events',
 *   'event-id-123',
 *   { title: 'Updated Event Title' },
 *   dataSourceTenantId,
 *   session.user.id // Audit: who updated this
 * );
 * ```
 */
export async function updateWithTenantId<T extends keyof Database['public']['Tables']>(
  supabase: SupabaseClient<Database>,
  table: T,
  id: string,
  data: Partial<Database['public']['Tables'][T]['Update']>,
  dataSourceTenantId: string,
  userId?: string
) {
  // Enrich data with audit fields if userId is provided
  const enrichedData = userId
    ? withAuditFields(data, userId, 'update')
    : data;

  return supabase
    .from(table)
    .update(enrichedData as any)
    .eq('id', id)
    .eq('tenant_id', dataSourceTenantId)
    .select()
    .single();
}

/**
 * Delete data with tenant_id filter
 *
 * Helper to delete data with tenant_id automatically filtered.
 *
 * @param supabase - Supabase client
 * @param table - Table name
 * @param id - Record ID to delete
 * @param dataSourceTenantId - Mapped tenant ID
 * @returns Delete query
 *
 * @example
 * ```typescript
 * const context = await getTenantContext();
 * if (isErrorResponse(context)) return context;
 *
 * const { supabase, dataSourceTenantId } = context;
 *
 * const { error } = await deleteWithTenantId(
 *   supabase,
 *   'events',
 *   'event-id-123',
 *   dataSourceTenantId
 * );
 * ```
 */
export async function deleteWithTenantId<T extends keyof Database['public']['Tables']>(
  supabase: SupabaseClient<Database>,
  table: T,
  id: string,
  dataSourceTenantId: string
) {
  return supabase.from(table).delete().eq('id', id).eq('tenant_id', dataSourceTenantId);
}
