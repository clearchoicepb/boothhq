import { getTenantClient, getTenantIdInDataSource } from '@/lib/data-sources'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createLogger } from '@/lib/logger'

const log = createLogger('repositories')

export interface TransactionOperation {
  type: 'create' | 'update' | 'delete'
  table: string
  data?: any
  where?: Record<string, any>
  id?: string
}

export interface TransactionResult {
  success: boolean
  data?: any[]
  errors?: string[]
  rollbackData?: any[]
}

export class TransactionManager {
  private supabase: SupabaseClient<Database> | null = null
  private tenantId: string | null = null
  private dataSourceTenantId: string | null = null
  private operations: TransactionOperation[] = []
  private rollbackData: any[] = []

  /**
   * Constructor is now private - use createTransaction() factory function
   */
  private constructor() {
    // Client will be initialized in execute()
  }

  /**
   * Create a TransactionManager instance for a specific tenant
   *
   * @param tenantId - Application tenant ID
   * @returns Promise<TransactionManager> with initialized tenant client
   */
  static async forTenant(tenantId: string): Promise<TransactionManager> {
    const manager = new TransactionManager()
    manager.tenantId = tenantId
    manager.supabase = await getTenantClient(tenantId)
    manager.dataSourceTenantId = await getTenantIdInDataSource(tenantId)
    return manager
  }

  /**
   * Add a create operation to the transaction
   */
  create(table: string, data: any): TransactionManager {
    this.operations.push({
      type: 'create',
      table,
      data
    })
    return this
  }

  /**
   * Add an update operation to the transaction
   */
  update(table: string, id: string, data: any): TransactionManager {
    this.operations.push({
      type: 'update',
      table,
      id,
      data
    })
    return this
  }

  /**
   * Add a delete operation to the transaction
   */
  delete(table: string, id: string): TransactionManager {
    this.operations.push({
      type: 'delete',
      table,
      id
    })
    return this
  }

  /**
   * Execute all operations in the transaction
   *
   * Note: tenantId is no longer needed as parameter - it's set during forTenant()
   */
  async execute(): Promise<TransactionResult> {
    if (!this.supabase || !this.dataSourceTenantId) {
      return {
        success: false,
        errors: ['Transaction not initialized. Use TransactionManager.forTenant() to create instance.']
      }
    }

    const results: any[] = []
    const errors: string[] = []

    try {
      // Execute operations in sequence
      for (const operation of this.operations) {
        try {
          const result = await this.executeOperation(operation)
          results.push(result)

          // Store rollback data
          this.rollbackData.push({
            operation,
            originalData: result
          })
        } catch (error) {
          errors.push(`Failed to execute ${operation.type} on ${operation.table}: ${error instanceof Error ? error.message : 'Unknown error'}`)

          // Rollback previous operations
          await this.rollback()
          break
        }
      }

      return {
        success: errors.length === 0,
        data: results,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      // Rollback on any error
      await this.rollback()
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        rollbackData: this.rollbackData
      }
    }
  }

  /**
   * Execute a single operation
   *
   * Uses the dataSourceTenantId for all tenant_id filters/inserts
   */
  private async executeOperation(operation: TransactionOperation): Promise<any> {
    if (!this.supabase || !this.dataSourceTenantId) {
      throw new Error('Transaction not initialized')
    }

    const { type, table, data, id } = operation

    switch (type) {
      case 'create':
        const { data: createResult, error: createError } = await this.supabase
          .from(table as any)
          .insert({
            ...data,
            tenant_id: this.dataSourceTenantId  // Use mapped tenant ID
          })
          .select()
          .single()

        if (createError) {
          throw new Error(createError.message)
        }

        return createResult

      case 'update':
        const { data: updateResult, error: updateError } = await this.supabase
          .from(table as any)
          .update(data)
          .eq('id', id)
          .eq('tenant_id', this.dataSourceTenantId)  // Use mapped tenant ID
          .select()
          .single()

        if (updateError) {
          throw new Error(updateError.message)
        }

        return updateResult

      case 'delete':
        const { error: deleteError } = await this.supabase
          .from(table as any)
          .delete()
          .eq('id', id)
          .eq('tenant_id', this.dataSourceTenantId)  // Use mapped tenant ID

        if (deleteError) {
          throw new Error(deleteError.message)
        }

        return { id, deleted: true }

      default:
        throw new Error(`Unknown operation type: ${type}`)
    }
  }

  /**
   * Rollback all operations
   */
  private async rollback(): Promise<void> {
    // Execute rollback operations in reverse order
    for (let i = this.rollbackData.length - 1; i >= 0; i--) {
      const { operation, originalData } = this.rollbackData[i]
      
      try {
        await this.rollbackOperation(operation, originalData)
      } catch (error) {
        log.error({ error }, 'Failed to rollback operation')
        // Continue with other rollbacks even if one fails
      }
    }
  }

  /**
   * Rollback a single operation
   */
  private async rollbackOperation(operation: TransactionOperation, originalData: any): Promise<void> {
    if (!this.supabase) {
      throw new Error('Transaction not initialized')
    }

    const { type, table, id } = operation

    switch (type) {
      case 'create':
        // Delete the created record
        if (originalData?.id) {
          await this.supabase
            .from(table as any)
            .delete()
            .eq('id', originalData.id)
        }
        break

      case 'update':
        // Restore the original data
        if (id) {
          await this.supabase
            .from(table as any)
            .update(originalData)
            .eq('id', id)
        }
        break

      case 'delete':
        // Restore the deleted record
        if (originalData?.id) {
          await this.supabase
            .from(table as any)
            .insert(originalData)
        }
        break
    }
  }

  /**
   * Clear all operations
   */
  clear(): void {
    this.operations = []
    this.rollbackData = []
  }

  /**
   * Get the number of operations in the transaction
   */
  getOperationCount(): number {
    return this.operations.length
  }

  /**
   * Get all operations in the transaction
   */
  getOperations(): TransactionOperation[] {
    return [...this.operations]
  }
}

/**
 * Convenience function for creating transactions
 *
 * @param tenantId - Application tenant ID
 * @returns Promise<TransactionManager> initialized for the tenant
 *
 * @example
 * ```typescript
 * const transaction = await createTransaction('tenant-id-123');
 * transaction
 *   .create('events', { title: 'New Event', ... })
 *   .create('event_dates', { event_id: '...', ... });
 * const result = await transaction.execute();
 * ```
 */
export const createTransaction = async (tenantId: string): Promise<TransactionManager> => {
  return TransactionManager.forTenant(tenantId)
}

/**
 * Transaction decorator for repository methods
 *
 * Automatically wraps method in a transaction and executes it.
 * The method must accept tenantId as one of its parameters.
 *
 * @deprecated Use TransactionManager.forTenant() directly for better control
 */
export function Transaction() {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      // Find tenantId in arguments (assume it's a UUID string)
      const tenantId = args.find(arg => typeof arg === 'string' && arg.length > 10)

      if (!tenantId) {
        throw new Error('Transaction decorator requires tenantId parameter')
      }

      const transaction = await TransactionManager.forTenant(tenantId)

      // Pass transaction to the method
      const result = await method.apply(this, [...args, transaction])

      // Execute transaction if it has operations
      if (transaction.getOperationCount() > 0) {
        return await transaction.execute()
      }

      return result
    }

    return descriptor
  }
}
