'use client'

import { useState, useRef } from 'react'

interface ColorPickerProps {
  label: string
  value: string
  onChange: (color: string) => void
  className?: string
}

export function ColorPicker({ label, value, onChange, className = '' }: ColorPickerProps) {
  const colorInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={className}>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      
      <div className="flex items-center gap-2">
        {/* Hidden native color input */}
        <input
          ref={colorInputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="hidden"
        />
        
        {/* Clickable color swatch */}
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          className="h-10 w-10 rounded border-2 border-gray-300 cursor-pointer hover:border-gray-400 transition-colors flex-shrink-0"
          style={{ backgroundColor: value }}
          title={`Click to pick ${label.toLowerCase()}`}
        />
        
        {/* Hex value input */}
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const val = e.target.value.toUpperCase()
            // Validate hex color format
            if (val === '' || /^#[0-9A-F]{0,6}$/i.test(val)) {
              onChange(val)
            }
          }}
          placeholder="#000000"
          className="flex-1 px-3 py-2 font-mono text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={7}
        />
      </div>
    </div>
  )
}

