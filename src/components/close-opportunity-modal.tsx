'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { X, ThumbsUp, ThumbsDown } from 'lucide-react'

export interface CloseOpportunityModalProps {
  isOpen: boolean
  onClose: () => void
  opportunityId: string
  opportunityName: string
  closedAs: 'won' | 'lost'
  onConfirm: (data: { closeReason: string; closeNotes: string }) => Promise<void>
}

const WON_REASONS = [
  'Better Price/Value',
  'Better Features/Capabilities',
  'Strong Relationship',
  'Competitive Advantage',
  'Other'
]

const LOST_REASONS = [
  'Price Too High',
  'Lost to Competitor',
  'No Budget',
  'Poor Timing',
  'Requirements Not Met',
  'Lost Contact/No Response',
  'Other'
]

export function CloseOpportunityModal({
  isOpen,
  onClose,
  opportunityId,
  opportunityName,
  closedAs,
  onConfirm
}: CloseOpportunityModalProps) {
  const [closeReason, setCloseReason] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const reasons = closedAs === 'won' ? WON_REASONS : LOST_REASONS
  const isWon = closedAs === 'won'

  const handleSave = async () => {
    setSaving(true)
    try {
      await onConfirm({
        closeReason,
        closeNotes
      })
      // Reset form
      setCloseReason('')
      setCloseNotes('')
      onClose()
    } catch (error) {
      console.error('Error saving close reason:', error)
      alert('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = () => {
    // Allow user to close without selecting reason
    onConfirm({
      closeReason: '',
      closeNotes: ''
    })
    setCloseReason('')
    setCloseNotes('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isWon ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              isWon ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {isWon ? (
                <ThumbsUp className="h-5 w-5 text-white" />
              ) : (
                <ThumbsDown className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${
                isWon ? 'text-green-900' : 'text-red-900'
              }`}>
                Opportunity {isWon ? 'Won' : 'Lost'}
              </h2>
              <p className={`text-sm ${
                isWon ? 'text-green-700' : 'text-red-700'
              }`}>
                {opportunityName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Message */}
          <div className={`p-4 rounded-lg ${
            isWon ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-sm ${
              isWon ? 'text-green-800' : 'text-red-800'
            }`}>
              {isWon
                ? '🎉 Congratulations on winning this opportunity! Help us understand what led to this success.'
                : '📊 Help us learn from this experience by sharing why this opportunity was lost.'
              }
            </p>
          </div>

          {/* Close Reason Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isWon ? 'Why did you win?' : 'Why was it lost?'}
              <span className="text-gray-400 ml-1">(Optional but encouraged)</span>
            </label>
            <Select
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              className="w-full"
            >
              <option value="">Select a reason...</option>
              {reasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </Select>
          </div>

          {/* Close Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
              <span className="text-gray-400 ml-1">(Optional)</span>
            </label>
            <textarea
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              placeholder={isWon
                ? "What factors contributed to winning this deal? Any key insights to replicate this success?"
                : "What could we have done differently? Any lessons learned?"
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              These insights help improve our sales process and inform future strategies.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <button
              onClick={handleSkip}
              disabled={saving}
              className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Skip for now
            </button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className={`${
                  isWon
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } text-white`}
              >
                {saving ? 'Saving...' : 'Save & Close'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
