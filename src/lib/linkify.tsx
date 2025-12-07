import React from 'react'

/**
 * Regular expression to match URLs in text
 * Matches http://, https://, and www. URLs
 */
const URL_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi

/**
 * Converts URLs in text to clickable hyperlinks
 * Returns an array of React elements (strings and anchor tags)
 *
 * @param text - The text to process
 * @param className - Optional className for link styling
 * @returns Array of React elements with URLs converted to links
 */
export function linkifyText(
  text: string,
  className?: string
): React.ReactNode[] {
  if (!text) return []

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  // Reset regex state
  URL_REGEX.lastIndex = 0

  while ((match = URL_REGEX.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const url = match[0]
    // Ensure URL has protocol for href
    const href = url.startsWith('http') ? url : `https://${url}`

    parts.push(
      <a
        key={`link-${match.index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className || 'underline hover:opacity-80'}
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    )

    lastIndex = match.index + url.length
  }

  // Add remaining text after last URL
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

/**
 * React component that renders text with URLs converted to clickable links
 * Preserves whitespace and word breaking behavior
 */
export function LinkifiedText({
  text,
  className,
  linkClassName
}: {
  text: string
  className?: string
  linkClassName?: string
}) {
  return (
    <span className={className}>
      {linkifyText(text, linkClassName)}
    </span>
  )
}
