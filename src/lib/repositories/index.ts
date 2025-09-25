import { GenericRepository } from './GenericRepository'
import { ContactRepository } from './ContactRepository'
import { EventRepository } from './EventRepository'
import { getAllEntityTypes } from '@/lib/api-entities'

// Repository factory for creating entity-specific repositories
export class RepositoryFactory {
  private static repositories = new Map<string, GenericRepository>()

  /**
   * Get a repository instance for an entity
   */
  static getRepository<T = any>(entity: string): GenericRepository<T> {
    if (!this.repositories.has(entity)) {
      this.repositories.set(entity, new GenericRepository(entity))
    }
    return this.repositories.get(entity) as GenericRepository<T>
  }

  /**
   * Get a specialized repository for specific entities
   */
  static getSpecializedRepository(entity: string): GenericRepository {
    switch (entity) {
      case 'contacts':
        return new ContactRepository()
      case 'events':
        return new EventRepository()
      default:
        return this.getRepository(entity)
    }
  }

  /**
   * Get all available entity types
   */
  static getAvailableEntities(): string[] {
    return getAllEntityTypes()
  }

  /**
   * Clear all cached repositories (useful for testing)
   */
  static clearCache(): void {
    this.repositories.clear()
  }
}

// Export individual repositories for direct use
export { GenericRepository, ContactRepository, EventRepository }

// Export the factory as default
export default RepositoryFactory

// Convenience function for getting repositories
export const getRepository = <T = any>(entity: string): GenericRepository<T> => {
  return RepositoryFactory.getRepository<T>(entity)
}

// Convenience function for getting specialized repositories
export const getSpecializedRepository = (entity: string): GenericRepository => {
  return RepositoryFactory.getSpecializedRepository(entity)
}
