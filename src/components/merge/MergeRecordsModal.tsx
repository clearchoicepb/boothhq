'use client'

import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Field configuration - defines which fields to show and how
export interface FieldConfig {
  key: string
  label: string
  type: 'text' | 'email' | 'phone' | 'date' | 'boolean' | 'select'
}

interface MergeRecordsModalProps<T extends Record<string, unknown>> {
  isOpen: boolean
  onClose: () => void
  entityType: 'contact' | 'account'
  record1: T
  record2: T
  fieldConfigs: FieldConfig[]
  record1Label?: string
  record2Label?: string
  relatedDataCounts?: {
    record1: Record<string, number>
    record2: Record<string, number>
  }
  onMerge: (survivorId: string, victimId: string, mergedData: Partial<T>) => Promise<void>
}

export function MergeRecordsModal<T extends Record<string, unknown>>({
  isOpen,
  onClose,
  entityType,
  record1,
  record2,
  fieldConfigs,
  record1Label,
  record2Label,
  relatedDataCounts,
  onMerge
}: MergeRecordsModalProps<T>) {
  // Track which record's value to use for each field
  // 1 = use record1's value, 2 = use record2's value
  const [fieldSelections, setFieldSelections] = useState<Record<string, 1 | 2>>(() => {
    // Default to record1 for all fields
    const initial: Record<string, 1 | 2> = {}
    fieldConfigs.forEach(f => { initial[f.key] = 1 })
    return initial
  })

  // Track which record will be the "survivor" (kept) vs "victim" (deleted)
  const [survivorRecord, setSurvivorRecord] = useState<1 | 2>(1)

  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Calculate the merged result based on selections
  const mergedResult = useMemo(() => {
    const result: Partial<T> = {}
    fieldConfigs.forEach(field => {
      const source = fieldSelections[field.key] === 1 ? record1 : record2
      result[field.key as keyof T] = source[field.key] as T[keyof T]
    })
    return result
  }, [fieldSelections, record1, record2, fieldConfigs])

  // Format value for display
  const formatValue = (value: unknown, type: string) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">Empty</span>
    }
    if (type === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    if (type === 'date' && value) {
      return new Date(value as string).toLocaleDateString()
    }
    return String(value)
  }

  // Handle field selection
  const handleFieldSelect = (fieldKey: string, recordNum: 1 | 2) => {
    setFieldSelections(prev => ({ ...prev, [fieldKey]: recordNum }))
  }

  // Handle merge confirmation
  const handleMerge = async () => {
    setIsLoading(true)
    try {
      const survivorId = survivorRecord === 1 ? (record1.id as string) : (record2.id as string)
      const victimId = survivorRecord === 1 ? (record2.id as string) : (record1.id as string)
      await onMerge(survivorId, victimId, mergedResult)
      onClose()
    } catch (error) {
      console.error('Merge failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate related data totals
  const totalRelatedRecord1 = relatedDataCounts?.record1
    ? Object.values(relatedDataCounts.record1).reduce((a, b) => a + (b || 0), 0)
    : 0
  const totalRelatedRecord2 = relatedDataCounts?.record2
    ? Object.values(relatedDataCounts.record2).reduce((a, b) => a + (b || 0), 0)
    : 0

  const getRecordLabel = (recordNum: 1 | 2) => {
    if (recordNum === 1 && record1Label) return record1Label
    if (recordNum === 2 && record2Label) return record2Label

    if (entityType === 'contact') {
      const r = recordNum === 1 ? record1 : record2
      return `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Unknown'
    }
    const r = recordNum === 1 ? record1 : record2
    return (r.name as string) || 'Unknown'
  }

  if (showConfirmation) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Confirm Merge"
        className="sm:max-w-lg"
      >
        <div className="space-y-4 py-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-800">This action cannot be undone!</h4>
                <div className="text-sm text-amber-700 mt-2">
                  <p>You are about to merge two {entityType} records:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Keep:</strong> {getRecordLabel(survivorRecord)}</li>
                    <li><strong>Delete:</strong> {getRecordLabel(survivorRecord === 1 ? 2 : 1)}</li>
                  </ul>
                  <p className="mt-2">
                    All related events, invoices, and opportunities will be transferred to the kept record.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {relatedDataCounts && (
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">Related data being transferred:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-500">
                {(relatedDataCounts.record1.events || 0) + (relatedDataCounts.record2.events || 0) > 0 && (
                  <li>{(relatedDataCounts.record1.events || 0) + (relatedDataCounts.record2.events || 0)} events</li>
                )}
                {(relatedDataCounts.record1.invoices || 0) + (relatedDataCounts.record2.invoices || 0) > 0 && (
                  <li>{(relatedDataCounts.record1.invoices || 0) + (relatedDataCounts.record2.invoices || 0)} invoices</li>
                )}
                {(relatedDataCounts.record1.opportunities || 0) + (relatedDataCounts.record2.opportunities || 0) > 0 && (
                  <li>{(relatedDataCounts.record1.opportunities || 0) + (relatedDataCounts.record2.opportunities || 0)} opportunities</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setShowConfirmation(false)}>
            Go Back
          </Button>
          <Button
            variant="destructive"
            onClick={handleMerge}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Merging...
              </>
            ) : (
              'Confirm Merge'
            )}
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Merge ${entityType === 'contact' ? 'Contacts' : 'Accounts'}`}
      size="full"
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-600">
          Select which values to keep for each field. Click on a value to select it. The preview column shows the final result.
        </p>

        {/* Survivor Selection */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <p className="text-sm font-medium mb-3">Which record should be kept? (The other will be deleted)</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="survivor"
                checked={survivorRecord === 1}
                onChange={() => setSurvivorRecord(1)}
                className="w-4 h-4 text-[#347dc4]"
              />
              <span className="text-sm">
                Keep: <strong>{getRecordLabel(1)}</strong>
                {totalRelatedRecord1 > 0 && (
                  <Badge variant="outline" className="ml-2">{totalRelatedRecord1} related</Badge>
                )}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="survivor"
                checked={survivorRecord === 2}
                onChange={() => setSurvivorRecord(2)}
                className="w-4 h-4 text-[#347dc4]"
              />
              <span className="text-sm">
                Keep: <strong>{getRecordLabel(2)}</strong>
                {totalRelatedRecord2 > 0 && (
                  <Badge variant="outline" className="ml-2">{totalRelatedRecord2} related</Badge>
                )}
              </span>
            </label>
          </div>
        </div>

        {/* Field Selection Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header Row */}
            <div className="grid grid-cols-[1fr_24px_1fr_24px_1fr] gap-2 mb-2">
              <div className="font-semibold text-sm p-2 bg-blue-50 rounded flex items-center justify-between">
                <span>Record 1: {getRecordLabel(1)}</span>
                {survivorRecord === 1 && <Badge className="bg-green-500 hover:bg-green-500">Keeping</Badge>}
              </div>
              <div />
              <div className="font-semibold text-sm p-2 bg-purple-50 rounded flex items-center justify-between">
                <span>Record 2: {getRecordLabel(2)}</span>
                {survivorRecord === 2 && <Badge className="bg-green-500 hover:bg-green-500">Keeping</Badge>}
              </div>
              <div />
              <div className="font-semibold text-sm p-2 bg-green-50 rounded">
                Merged Result (Preview)
              </div>
            </div>

            {/* Field Rows */}
            {fieldConfigs.map(field => (
              <div key={field.key} className="grid grid-cols-[1fr_24px_1fr_24px_1fr] gap-2 mb-2">
                {/* Record 1 Value */}
                <div
                  className={cn(
                    "p-3 rounded border cursor-pointer transition-all hover:shadow-sm",
                    fieldSelections[field.key] === 1
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => handleFieldSelect(field.key, 1)}
                >
                  <div className="text-xs text-gray-500 mb-1">{field.label}</div>
                  <div className="text-sm">{formatValue(record1[field.key], field.type)}</div>
                  {fieldSelections[field.key] === 1 && (
                    <CheckCircle2 className="h-4 w-4 text-blue-500 mt-2" />
                  )}
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  {fieldSelections[field.key] === 1 && (
                    <ArrowRight className="h-4 w-4 text-blue-500" />
                  )}
                </div>

                {/* Record 2 Value */}
                <div
                  className={cn(
                    "p-3 rounded border cursor-pointer transition-all hover:shadow-sm",
                    fieldSelections[field.key] === 2
                      ? "border-purple-500 bg-purple-50 ring-1 ring-purple-500"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => handleFieldSelect(field.key, 2)}
                >
                  <div className="text-xs text-gray-500 mb-1">{field.label}</div>
                  <div className="text-sm">{formatValue(record2[field.key], field.type)}</div>
                  {fieldSelections[field.key] === 2 && (
                    <CheckCircle2 className="h-4 w-4 text-purple-500 mt-2" />
                  )}
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  {fieldSelections[field.key] === 2 && (
                    <ArrowRight className="h-4 w-4 text-purple-500" />
                  )}
                </div>

                {/* Merged Preview */}
                <div className="p-3 rounded bg-green-50 border border-green-200">
                  <div className="text-xs text-gray-500 mb-1">{field.label}</div>
                  <div className="text-sm font-medium">
                    {formatValue(mergedResult[field.key as keyof T], field.type)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => setShowConfirmation(true)}>
            Review & Merge
          </Button>
        </div>
      </div>
    </Modal>
  )
}
