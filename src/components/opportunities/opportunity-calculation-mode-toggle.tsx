interface OpportunityCalculationModeToggleProps {
  mode: 'total' | 'expected'
  onChange: (mode: 'total' | 'expected') => void
  settings: any
}

/**
 * Toggle buttons for switching between calculation modes
 * Allows users to view Total or Expected Value statistics
 * 
 * @param props - Current mode, change handler, and settings
 * @returns Toggle button group component
 */
export function OpportunityCalculationModeToggle({
  mode,
  onChange,
  settings
}: OpportunityCalculationModeToggleProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Statistics Calculation - {mode === 'total' && 'Total View'}
            {mode === 'expected' && 'Expected Value View'}
          </h3>
          {mode === 'expected' && (
            <p className="text-xs text-gray-500 mt-1">
              Using {settings.opportunities?.autoCalculateProbability ? 'stage-based' : 'individual'} probabilities
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onChange('total')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              mode === 'total' 
                ? 'bg-[#347dc4] text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Total
          </button>
          <button
            onClick={() => onChange('expected')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              mode === 'expected' 
                ? 'bg-[#347dc4] text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Expected Value
          </button>
        </div>
      </div>
    </div>
  )
}

