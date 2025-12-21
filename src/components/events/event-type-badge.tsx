interface EventCategory {
  name: string
  color: string
}

interface EventType {
  name: string
}

interface EventTypeBadgeProps {
  category?: EventCategory | null
  type?: EventType | string | null
}

/**
 * Helper to get the display name from event_type which can be a string or object
 */
function getTypeName(type: EventType | string | null | undefined): string | null {
  if (!type) return null
  if (typeof type === 'string') return type
  return type.name
}

export function EventTypeBadge({ category, type }: EventTypeBadgeProps) {
  const typeName = getTypeName(type)

  if (!category && !typeName) {
    return (
      <span className="text-gray-400 italic text-sm">
        No category/type set
      </span>
    )
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Category Badge with Color */}
      {category && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
          style={{
            borderColor: category.color,
            backgroundColor: category.color + '10',
          }}
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <span
            className="font-medium text-sm"
            style={{ color: category.color }}
          >
            {category.name}
          </span>
        </div>
      )}

      {/* Event Type */}
      {typeName && (
        <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
          {typeName}
        </span>
      )}
    </div>
  )
}

