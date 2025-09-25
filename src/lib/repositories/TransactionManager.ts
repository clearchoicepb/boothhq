import { createServerSupabaseClient } from '@/lib/supabase-client'

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
  private supabase: ReturnType<typeof createServerSupabaseClient>
  private operations: TransactionOperation[] = []
  private rollbackData: any[] = []

  constructor() {
    this.supabase = createServerSupabaseClient()
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
   */
  async execute(tenantId: string): Promise<TransactionResult> {
    const results: any[] = []
    const errors: string[] = []

    try {
      // Execute operations in sequence
      for (const operation of this.operations) {
        try {
          const result = await this.executeOperation(operation, tenantId)
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
   */
  private async executeOperation(operation: TransactionOperation, tenantId: string): Promise<any> {
    const { type, table, data, id } = operation

    switch (type) {
      case 'create':
        const { data: createResult, error: createError } = await this.supabase
          .from(table)
          .insert({
            ...data,
            tenant_id: tenantId
          })
          .select()
          .single()

        if (createError) {
          throw new Error(createError.message)
        }

        return createResult

      case 'update':
        const { data: updateResult, error: updateError } = await this.supabase
          .from(table)
          .update(data)
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .select()
          .single()

        if (updateError) {
          throw new Error(updateError.message)
        }

        return updateResult

      case 'delete':
        const { error: deleteError } = await this.supabase
          .from(table)
          .delete()
          .eq('id', id)
          .eq('tenant_id', tenantId)

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
        console.error(`Failed to rollback operation:`, error)
        // Continue with other rollbacks even if one fails
      }
    }
  }

  /**
   * Rollback a single operation
   */
  private async rollbackOperation(operation: TransactionOperation, originalData: any): Promise<void> {
    const { type, table, id } = operation

    switch (type) {
      case 'create':
        // Delete the created record
        if (originalData?.id) {
          await this.supabase
            .from(table)
            .delete()
            .eq('id', originalData.id)
        }
        break

      case 'update':
        // Restore the original data
        if (id) {
          await this.supabase
            .from(table)
            .update(originalData)
            .eq('id', id)
        }
        break

      case 'delete':
        // Restore the deleted record
        if (originalData?.id) {
          await this.supabase
            .from(table)
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

// Convenience function for creating transactions
export const createTransaction = (): TransactionManager => {
  return new TransactionManager()
}

// Transaction decorator for repository methods
export function Transaction() {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const transaction = new TransactionManager()
      
      // Pass transaction to the method
      const result = await method.apply(this, [...args, transaction])
      
      // Execute transaction if it has operations
      if (transaction.getOperationCount() > 0) {
        const tenantId = args.find(arg => typeof arg === 'string' && arg.length > 10) // Assume tenantId is a long string
        return await transaction.execute(tenantId)
      }
      
      return result
    }

    return descriptor
  }
}
