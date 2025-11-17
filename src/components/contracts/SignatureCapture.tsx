'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, X } from 'lucide-react'

interface SignatureCaptureProps {
  onSign: (signature: string) => void
  onCancel: () => void
  signerName?: string
}

export function SignatureCapture({ onSign, onCancel, signerName }: SignatureCaptureProps) {
  const [typedName, setTypedName] = useState(signerName || '')
  const [agreed, setAgreed] = useState(false)

  const handleSign = () => {
    if (typedName.trim() && agreed) {
      onSign(typedName.trim())
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Sign Agreement</h2>

      <div className="space-y-6">
        {/* Agreement Checkbox */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                I agree to the terms and conditions
              </p>
              <p className="text-xs text-gray-600 mt-1">
                By typing my name below, I agree that this electronic signature
                has the same legal effect as a handwritten signature.
              </p>
            </div>
          </label>
        </div>

        {/* Name Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type your full name to sign
          </label>
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="John Smith"
            disabled={!agreed}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Signature Preview */}
        {typedName && agreed && (
          <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50">
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Your Signature:
            </label>
            <div className="py-4 border-b-2 border-gray-400">
              <p className="text-4xl text-gray-900" style={{ fontFamily: "'Great Vibes', cursive" }}>
                {typedName}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Date: {new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSign}
            disabled={!typedName.trim() || !agreed}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Sign Agreement
          </Button>
        </div>
      </div>

      {/* Add Great Vibes font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
      `}</style>
    </div>
  )
}

