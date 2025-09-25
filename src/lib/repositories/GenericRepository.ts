import { createServerSupabaseClient } from '@/lib/supabase-client'
import { getEntityConfig, EntityConfig } from '@/lib/api-entities'
import { cacheManager, CacheManager } from './CacheManager'

export interface QueryOptions {
  select?: string[]
  where?: Record<string, any>
  orderBy?: { field: string; direction: 'asc' | 'desc' }
  limit?: number
  offset?: number
  include?: string[] // Relations to include
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface SearchOptions {
  query: string
  fields: string[]
  fuzzy?: boolean
}

export interface BulkOperationResult<T> {
  success: boolean
  data?: T[]
  errors?: string[]
  count: number
}

export interface AuditLog {
  id: string
  entity_type: string
  entity_id: string
  action: 'create' | 'update' | 'delete'
  changes?: Record<string, any>
  user_id: string
  tenant_id: string
  timestamp: string
}

export class GenericRepository<T = any> {
  protected entity: string
  protected config: EntityConfig
  protected supabase: ReturnType<typeof createServerSupabaseClient>

  constructor(entity: string) {
    this.entity = entity
    this.config = getEntityConfig(entity)
    this.supabase = createServerSupabaseClient()
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>, tenantId: string): Promise<T> {
    try {
      const { data: result, error } = await this.supabase
        .from(this.config.table)
        .insert({
          ...data,
          tenant_id: tenantId
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create ${this.entity}: ${error.message}`)
      }

      // Log audit trail
      await this.logAudit('create', result.id, tenantId, null, result)

      return this.config.transformResponse ? 
        this.config.transformResponse([result])[0] : result
    } catch (error) {
      console.error(`Error creating ${this.entity}:`, error)
      throw error
    }
  }

  /**
   * Find a record by ID
   */
  async findById(id: string, tenantId: string, options?: QueryOptions): Promise<T | null> {
    try {
      // Check cache first
      const cacheKey = CacheManager.generateKey(this.entity, 'findById', { id, tenantId })
      const cached = cacheManager.get<T>(cacheKey)
      if (cached !== null) {
        return cached
      }

      let query = this.supabase
        .from(this.config.table)
        .select(this.buildSelectQuery(options?.include))
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (options?.where) {
        query = this.applyWhereConditions(query, options.where)
      }

      const { data, error } = await query.single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Record not found
        }
        throw new Error(`Failed to find ${this.entity}: ${error.message}`)
      }

      const result = this.config.transformResponse ? 
        this.config.transformResponse([data])[0] : data

      // Cache the result
      cacheManager.set(cacheKey, result, {
        ttl: 300, // 5 minutes
        tags: CacheManager.generateTags(this.entity, tenantId)
      })

      return result
    } catch (error) {
      console.error(`Error finding ${this.entity} by ID:`, error)
      throw error
    }
  }

  /**
   * Find multiple records with optional filtering
   */
  async findMany(tenantId: string, options?: QueryOptions): Promise<T[]> {
    try {
      let query = this.supabase
        .from(this.config.table)
        .select(this.buildSelectQuery(options?.include))
        .eq('tenant_id', tenantId)

      if (options?.where) {
        query = this.applyWhereConditions(query, options.where)
      }

      if (options?.orderBy) {
        query = query.order(options.orderBy.field, { 
          ascending: options.orderBy.direction === 'asc' 
        })
      } else if (this.config.defaultOrder) {
        query = query.order(this.config.defaultOrder.field, { 
          ascending: this.config.defaultOrder.direction === 'asc' 
        })
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to find ${this.entity} records: ${error.message}`)
      }

      return this.config.transformResponse ? 
        this.config.transformResponse(data) : data
    } catch (error) {
      console.error(`Error finding ${this.entity} records:`, error)
      throw error
    }
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: Partial<T>, tenantId: string): Promise<T> {
    try {
      // Get the original record for audit logging
      const originalRecord = await this.findById(id, tenantId)

      const { data: result, error } = await this.supabase
        .from(this.config.table)
        .update(data)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update ${this.entity}: ${error.message}`)
      }

      // Invalidate cache
      this.invalidateCache(id, tenantId)

      // Log audit trail
      await this.logAudit('update', id, tenantId, originalRecord, result)

      return this.config.transformResponse ? 
        this.config.transformResponse([result])[0] : result
    } catch (error) {
      console.error(`Error updating ${this.entity}:`, error)
      throw error
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    try {
      // Get the original record for audit logging
      const originalRecord = await this.findById(id, tenantId)

      const { error } = await this.supabase
        .from(this.config.table)
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) {
        throw new Error(`Failed to delete ${this.entity}: ${error.message}`)
      }

      // Invalidate cache
      this.invalidateCache(id, tenantId)

      // Log audit trail
      await this.logAudit('delete', id, tenantId, originalRecord, null)

      return true
    } catch (error) {
      console.error(`Error deleting ${this.entity}:`, error)
      throw error
    }
  }

  /**
   * Search records with text search
   */
  async search(tenantId: string, searchOptions: SearchOptions, queryOptions?: QueryOptions): Promise<T[]> {
    try {
      let query = this.supabase
        .from(this.config.table)
        .select(this.buildSelectQuery(queryOptions?.include))
        .eq('tenant_id', tenantId)

      if (searchOptions.fuzzy) {
        // Use full-text search if available
        const searchConditions = searchOptions.fields.map(field => 
          `${field}.ilike.%${searchOptions.query}%`
        ).join(',')
        query = query.or(searchConditions)
      } else {
        // Use exact match search
        const searchConditions = searchOptions.fields.map(field => 
          `${field}.eq.${searchOptions.query}`
        ).join(',')
        query = query.or(searchConditions)
      }

      if (queryOptions?.orderBy) {
        query = query.order(queryOptions.orderBy.field, { 
          ascending: queryOptions.orderBy.direction === 'asc' 
        })
      }

      if (queryOptions?.limit) {
        query = query.limit(queryOptions.limit)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to search ${this.entity}: ${error.message}`)
      }

      return this.config.transformResponse ? 
        this.config.transformResponse(data) : data
    } catch (error) {
      console.error(`Error searching ${this.entity}:`, error)
      throw error
    }
  }

  /**
   * Count records with optional filtering
   */
  async count(tenantId: string, where?: Record<string, any>): Promise<number> {
    try {
      let query = this.supabase
        .from(this.config.table)
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)

      if (where) {
        query = this.applyWhereConditions(query, where)
      }

      const { count, error } = await query

      if (error) {
        throw new Error(`Failed to count ${this.entity}: ${error.message}`)
      }

      return count || 0
    } catch (error) {
      console.error(`Error counting ${this.entity}:`, error)
      throw error
    }
  }

  /**
   * Bulk create records
   */
  async bulkCreate(data: Partial<T>[], tenantId: string): Promise<BulkOperationResult<T>> {
    try {
      const recordsWithTenant = data.map(record => ({
        ...record,
        tenant_id: tenantId
      }))

      const { data: results, error } = await this.supabase
        .from(this.config.table)
        .insert(recordsWithTenant)
        .select()

      if (error) {
        throw new Error(`Failed to bulk create ${this.entity}: ${error.message}`)
      }

      // Log audit trail for each record
      for (const result of results) {
        await this.logAudit('create', result.id, tenantId, null, result)
      }

      return {
        success: true,
        data: this.config.transformResponse ? 
          this.config.transformResponse(results) : results,
        count: results.length
      }
    } catch (error) {
      console.error(`Error bulk creating ${this.entity}:`, error)
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        count: 0
      }
    }
  }

  /**
   * Bulk update records
   */
  async bulkUpdate(updates: { id: string; data: Partial<T> }[], tenantId: string): Promise<BulkOperationResult<T>> {
    try {
      const results: T[] = []
      const errors: string[] = []

      for (const update of updates) {
        try {
          const result = await this.update(update.id, update.data, tenantId)
          results.push(result)
        } catch (error) {
          errors.push(`Failed to update ${update.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return {
        success: errors.length === 0,
        data: results,
        errors: errors.length > 0 ? errors : undefined,
        count: results.length
      }
    } catch (error) {
      console.error(`Error bulk updating ${this.entity}:`, error)
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        count: 0
      }
    }
  }

  /**
   * Bulk delete records
   */
  async bulkDelete(ids: string[], tenantId: string): Promise<BulkOperationResult<boolean>> {
    try {
      const { error } = await this.supabase
        .from(this.config.table)
        .delete()
        .in('id', ids)
        .eq('tenant_id', tenantId)

      if (error) {
        throw new Error(`Failed to bulk delete ${this.entity}: ${error.message}`)
      }

      // Log audit trail for each deleted record
      for (const id of ids) {
        await this.logAudit('delete', id, tenantId, null, null)
      }

      return {
        success: true,
        data: ids.map(() => true),
        count: ids.length
      }
    } catch (error) {
      console.error(`Error bulk deleting ${this.entity}:`, error)
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        count: 0
      }
    }
  }

  /**
   * Get paginated results
   */
  async paginate(tenantId: string, pagination: PaginationOptions, options?: QueryOptions): Promise<{
    data: T[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    try {
      const page = pagination.page || 1
      const limit = pagination.limit || 50
      const offset = (page - 1) * limit

      // Get total count
      const total = await this.count(tenantId, options?.where)

      // Get paginated data
      const data = await this.findMany(tenantId, {
        ...options,
        limit,
        offset
      })

      const totalPages = Math.ceil(total / limit)

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    } catch (error) {
      console.error(`Error paginating ${this.entity}:`, error)
      throw error
    }
  }

  /**
   * Build select query with relations
   */
  private buildSelectQuery(include?: string[]): string {
    let select = '*'
    
    if (this.config.relations && this.config.relations.length > 0) {
      const relations = this.config.relations.map((relation: string) => {
        switch (relation) {
          case 'accounts':
            return 'accounts(id, name)'
          case 'contacts':
            return 'contacts(id, first_name, last_name)'
          case 'opportunities':
            return 'opportunities(id, name)'
          default:
            return `${relation}(id, name)`
        }
      })
      select = `*, ${relations.join(', ')}`
    }
    
    return select
  }

  /**
   * Apply where conditions to query
   */
  private applyWhereConditions(query: any, where: Record<string, any>): any {
    for (const [field, value] of Object.entries(where)) {
      if (Array.isArray(value)) {
        query = query.in(field, value)
      } else if (typeof value === 'object' && value !== null) {
        // Handle operators like { gte: 100, lte: 200 }
        for (const [operator, operatorValue] of Object.entries(value)) {
          switch (operator) {
            case 'gte':
              query = query.gte(field, operatorValue)
              break
            case 'lte':
              query = query.lte(field, operatorValue)
              break
            case 'gt':
              query = query.gt(field, operatorValue)
              break
            case 'lt':
              query = query.lt(field, operatorValue)
              break
            case 'like':
              query = query.like(field, `%${operatorValue}%`)
              break
            case 'ilike':
              query = query.ilike(field, `%${operatorValue}%`)
              break
            case 'is':
              query = query.is(field, operatorValue)
              break
            case 'in':
              query = query.in(field, operatorValue)
              break
            default:
              query = query.eq(field, operatorValue)
          }
        }
      } else {
        query = query.eq(field, value)
      }
    }
    return query
  }

  /**
   * Invalidate cache for a specific record
   */
  private invalidateCache(id: string, tenantId: string): void {
    // Invalidate specific record cache
    const cacheKey = CacheManager.generateKey(this.entity, 'findById', { id, tenantId })
    cacheManager.delete(cacheKey)

    // Invalidate entity-level cache
    cacheManager.invalidateByTags(CacheManager.generateTags(this.entity, tenantId))
  }

  /**
   * Log audit trail
   */
  private async logAudit(
    action: 'create' | 'update' | 'delete',
    entityId: string,
    tenantId: string,
    before: any,
    after: any
  ): Promise<void> {
    try {
      const auditLog: Omit<AuditLog, 'id' | 'timestamp'> = {
        entity_type: this.entity,
        entity_id: entityId,
        action,
        changes: action === 'update' ? { before, after } : undefined,
        user_id: 'system', // TODO: Get from session
        tenant_id: tenantId
      }

      // For now, just log to console. In production, save to audit table
      console.log(`[AUDIT] ${action.toUpperCase()} ${this.entity}:${entityId}`, auditLog)
      
      // TODO: Implement actual audit logging to database
      // await this.supabase.from('audit_logs').insert(auditLog)
    } catch (error) {
      console.error('Failed to log audit trail:', error)
      // Don't throw - audit logging failure shouldn't break the main operation
    }
  }
}
