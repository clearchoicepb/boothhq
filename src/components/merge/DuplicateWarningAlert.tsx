'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export interface DuplicateMatch {
  id: string
  name: string
  email: string | null
  phone?: string | null
  match_score: number
  match_reasons: string[]
}

interface DuplicateWarningAlertProps {
  entityType: 'contact' | 'account'
  duplicates: DuplicateMatch[]
  isChecking: boolean
  onUseExisting?: (duplicateId: string) => void
}

export function DuplicateWarningAlert({
  entityType,
  duplicates,
  isChecking,
  onUseExisting
}: DuplicateWarningAlertProps) {
  const params = useParams()
  const tenantSubdomain = params.tenant as string

  if (isChecking) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking for duplicates...
      </div>
    )
  }

  if (duplicates.length === 0) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-amber-800">
            Potential Duplicate Detected
          </h4>
          <p className="text-sm text-amber-700 mt-1 mb-3">
            This {entityType} may already exist. Please review before creating a duplicate:
          </p>
          <ul className="space-y-2">
            {duplicates.map((dup) => (
              <li
                key={dup.id}
                className="flex items-center justify-between bg-white/60 rounded p-3 border border-amber-100"
              >
                <div>
                  <span className="font-medium text-gray-900">{dup.name}</span>
                  {dup.email && (
                    <span className="text-sm text-gray-600 ml-2">({dup.email})</span>
                  )}
                  <div className="text-xs text-amber-600 mt-0.5">
                    {Math.round(dup.match_score * 100)}% match: {dup.match_reasons.join(', ')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="h-8"
                  >
                    <Link
                      href={`/${tenantSubdomain}/${entityType}s/${dup.id}`}
                      target="_blank"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Link>
                  </Button>
                  {onUseExisting && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onUseExisting(dup.id)}
                      className="h-8"
                    >
                      Use Existing
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
