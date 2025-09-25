import { createServerSupabaseClient } from '@/lib/supabase-client'

export interface JoinConfig {
  table: string
  on: string
  type?: 'inner' | 'left' | 'right' | 'full'
  select?: string[]
}

export interface AggregationConfig {
  field: string
  function: 'count' | 'sum' | 'avg' | 'min' | 'max'
  alias?: string
}

export interface GroupByConfig {
  field: string
  having?: Record<string, any>
}

export interface QueryBuilderOptions {
  select?: string[]
  joins?: JoinConfig[]
  where?: Record<string, any>
  groupBy?: GroupByConfig[]
  aggregations?: AggregationConfig[]
  orderBy?: { field: string; direction: 'asc' | 'desc' }[]
  limit?: number
  offset?: number
  distinct?: boolean
}

export class QueryBuilder {
  private supabase: ReturnType<typeof createServerSupabaseClient>
  private table: string
  private options: QueryBuilderOptions

  constructor(table: string) {
    this.supabase = createServerSupabaseClient()
    this.table = table
    this.options = {}
  }

  /**
   * Set the select fields
   */
  select(fields: string[]): QueryBuilder {
    this.options.select = fields
    return this
  }

  /**
   * Add a join
   */
  join(config: JoinConfig): QueryBuilder {
    if (!this.options.joins) {
      this.options.joins = []
    }
    this.options.joins.push(config)
    return this
  }

  /**
   * Add where conditions
   */
  where(conditions: Record<string, any>): QueryBuilder {
    this.options.where = { ...this.options.where, ...conditions }
    return this
  }

  /**
   * Add group by clause
   */
  groupBy(field: string, having?: Record<string, any>): QueryBuilder {
    if (!this.options.groupBy) {
      this.options.groupBy = []
    }
    this.options.groupBy.push({ field, having })
    return this
  }

  /**
   * Add aggregation
   */
  aggregate(config: AggregationConfig): QueryBuilder {
    if (!this.options.aggregations) {
      this.options.aggregations = []
    }
    this.options.aggregations.push(config)
    return this
  }

  /**
   * Add order by clause
   */
  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryBuilder {
    if (!this.options.orderBy) {
      this.options.orderBy = []
    }
    this.options.orderBy.push({ field, direction })
    return this
  }

  /**
   * Set limit
   */
  limit(count: number): QueryBuilder {
    this.options.limit = count
    return this
  }

  /**
   * Set offset
   */
  offset(count: number): QueryBuilder {
    this.options.offset = count
    return this
  }

  /**
   * Set distinct
   */
  distinct(): QueryBuilder {
    this.options.distinct = true
    return this
  }

  /**
   * Execute the query
   */
  async execute(): Promise<any[]> {
    try {
      let query = this.supabase.from(this.table)

      // Build select clause
      if (this.options.select) {
        query = query.select(this.options.select.join(', '))
      } else if (this.options.aggregations) {
        // Build aggregation select
        const selectFields = this.options.aggregations.map(agg => {
          const alias = agg.alias || `${agg.function}_${agg.field}`
          return `${agg.function}(${agg.field}) as ${alias}`
        })
        query = query.select(selectFields.join(', '))
      } else {
        query = query.select('*')
      }

      // Apply joins
      if (this.options.joins) {
        for (const join of this.options.joins) {
          // Note: Supabase doesn't support explicit joins in the same way
          // This would need to be handled through the select clause with relations
          // For now, we'll use the select clause to include related data
        }
      }

      // Apply where conditions
      if (this.options.where) {
        query = this.applyWhereConditions(query, this.options.where)
      }

      // Apply group by
      if (this.options.groupBy) {
        const groupByFields = this.options.groupBy.map(gb => gb.field)
        query = query.select(`${query.select || '*'}, ${groupByFields.join(', ')}`)
      }

      // Apply order by
      if (this.options.orderBy) {
        for (const order of this.options.orderBy) {
          query = query.order(order.field, { ascending: order.direction === 'asc' })
        }
      }

      // Apply limit and offset
      if (this.options.limit) {
        query = query.limit(this.options.limit)
      }

      if (this.options.offset) {
        query = query.range(this.options.offset, this.options.offset + (this.options.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Query execution failed: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('QueryBuilder execution error:', error)
      throw error
    }
  }

  /**
   * Execute query and return count
   */
  async count(): Promise<number> {
    try {
      let query = this.supabase
        .from(this.table)
        .select('*', { count: 'exact', head: true })

      // Apply where conditions
      if (this.options.where) {
        query = this.applyWhereConditions(query, this.options.where)
      }

      const { count, error } = await query

      if (error) {
        throw new Error(`Count query failed: ${error.message}`)
      }

      return count || 0
    } catch (error) {
      console.error('QueryBuilder count error:', error)
      throw error
    }
  }

  /**
   * Execute query and return first result
   */
  async first(): Promise<any | null> {
    const results = await this.limit(1).execute()
    return results[0] || null
  }

  /**
   * Execute query and return single result
   */
  async single(): Promise<any> {
    const results = await this.limit(1).execute()
    if (results.length === 0) {
      throw new Error('No results found')
    }
    if (results.length > 1) {
      throw new Error('Multiple results found, expected single result')
    }
    return results[0]
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
            case 'not':
              query = query.not(field, 'eq', operatorValue)
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
   * Reset the query builder
   */
  reset(): QueryBuilder {
    this.options = {}
    return this
  }

  /**
   * Clone the query builder
   */
  clone(): QueryBuilder {
    const cloned = new QueryBuilder(this.table)
    cloned.options = { ...this.options }
    return cloned
  }
}

// Convenience function for creating query builders
export const createQueryBuilder = (table: string): QueryBuilder => {
  return new QueryBuilder(table)
}
