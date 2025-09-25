interface CacheOptions {
  ttl?: number // Time to live in seconds
  key?: string // Custom cache key
  tags?: string[] // Cache tags for invalidation
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  tags: string[]
}

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultTTL = 300 // 5 minutes
  private maxSize = 1000 // Maximum number of cache entries

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTTL
    const tags = options.tags || []

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest()
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl * 1000, // Convert to milliseconds
      tags
    }

    this.cache.set(key, entry)
  }

  /**
   * Delete data from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Invalidate cache entries by tags
   */
  invalidateByTags(tags: string[]): void {
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (tags.some(tag => entry.tags.includes(tag))) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidateByPattern(pattern: string): void {
    const regex = new RegExp(pattern)
    const keysToDelete: string[] = []

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    maxSize: number
    hitRate: number
    entries: Array<{
      key: string
      age: number
      ttl: number
      tags: string[]
    }>
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      ttl: entry.ttl,
      tags: entry.tags
    }))

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // TODO: Implement hit rate tracking
      entries
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  /**
   * Evict the oldest cache entry
   */
  private evictOldest(): void {
    let oldestKey = ''
    let oldestTimestamp = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Generate cache key for entity operations
   */
  static generateKey(entity: string, operation: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|')
    
    return `${entity}:${operation}:${sortedParams}`
  }

  /**
   * Generate cache tags for entity
   */
  static generateTags(entity: string, tenantId?: string): string[] {
    const tags = [entity]
    if (tenantId) {
      tags.push(`tenant:${tenantId}`)
    }
    return tags
  }
}

// Singleton instance
export const cacheManager = new CacheManager()

// Cache decorator for repository methods
export function Cache(options: CacheOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      // Generate cache key
      const cacheKey = CacheManager.generateKey(
        target.constructor.name,
        propertyName,
        { args: JSON.stringify(args) }
      )

      // Try to get from cache
      const cached = cacheManager.get(cacheKey)
      if (cached !== null) {
        return cached
      }

      // Execute method and cache result
      const result = await method.apply(this, args)
      
      // Generate cache tags
      const tags = options.tags || CacheManager.generateTags(
        target.constructor.name,
        args.find(arg => typeof arg === 'string' && arg.length > 10) // Assume tenantId is a long string
      )

      cacheManager.set(cacheKey, result, {
        ...options,
        tags
      })

      return result
    }

    return descriptor
  }
}
