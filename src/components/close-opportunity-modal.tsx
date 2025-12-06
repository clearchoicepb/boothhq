'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { createLogger } from '@/lib/logger'
import toast from 'react-hot-toast'

const log = createLogger('components')

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
      log.error({ error }, 'Error saving close reason')
      toast.error('Failed to save. Please try again.')
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Opportunity ${isWon ? 'Won' : 'Lost'}`}
      className="sm:max-w-2xl"
    >
      <div
        className="flex max-h-[70vh] flex-col space-y-6 overflow-y-auto pr-1"
        data-opportunity-id={opportunityId}
      >
        <div className={`flex items-center gap-3 rounded-lg border p-4 ${
          isWon ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
        }`}>
          <div className={`rounded-full p-2 ${
            isWon ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {isWon ? (
              <ThumbsUp className="h-5 w-5 text-white" />
            ) : (
              <ThumbsDown className="h-5 w-5 text-white" />
            )}
          </div>
          <div>
            <p className={`text-sm font-semibold ${
              isWon ? 'text-green-900' : 'text-red-900'
            }`}>
              {opportunityName}
            </p>
            <p className={`text-sm ${
              isWon ? 'text-green-700' : 'text-red-700'
            }`}>
              {isWon
                ? '🎉 Congratulations on winning this opportunity! Help us understand what led to this success.'
                : '📊 Help us learn from this experience by sharing why this opportunity was lost.'}
            </p>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {isWon ? 'Why did you win?' : 'Why was it lost?'}
            <span className="ml-1 text-gray-400">(Optional but encouraged)</span>
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

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Additional Notes
            <span className="ml-1 text-gray-400">(Optional)</span>
          </label>
          <textarea
            value={closeNotes}
            onChange={(e) => setCloseNotes(e.target.value)}
            placeholder={isWon
              ? 'What factors contributed to winning this deal? Any key insights to replicate this success?'
              : 'What could we have done differently? Any lessons learned?'
            }
            rows={4}
            className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-[#347dc4]"
          />
          <p className="mt-1 text-xs text-gray-500">
            These insights help improve our sales process and inform future strategies.
          </p>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <button
            onClick={handleSkip}
            disabled={saving}
            className="text-sm text-gray-600 transition-colors hover:text-gray-800 disabled:opacity-50"
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
    </Modal>
  )
}
