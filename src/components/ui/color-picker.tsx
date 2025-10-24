'use client'

interface ColorPickerProps {
  label: string
  value: string
  onChange: (color: string) => void
  className?: string
}

export function ColorPicker({ label, value, onChange, className = '' }: ColorPickerProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-xs text-gray-500 block">{label}</label>
      
      <div className="flex items-center gap-2">
        {/* Native color input */}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-16 cursor-pointer border border-gray-300 rounded"
          title={`Pick ${label.toLowerCase()}`}
        />
        
        {/* Hex value input */}
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const val = e.target.value
            // Validate hex color format
            if (val === '' || /^#[0-9A-F]{0,6}$/i.test(val)) {
              onChange(val)
            }
          }}
          placeholder="#000000"
          className="flex-1 px-2 py-1 font-mono text-xs border border-gray-300 rounded"
          maxLength={7}
        />
        
        {/* Color preview swatch */}
        <div
          className="h-9 w-9 rounded border-2 border-gray-300 flex-shrink-0"
          style={{ backgroundColor: value }}
          title={value}
        />
      </div>
    </div>
  )
}

