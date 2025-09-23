import { forwardRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Select } from './select'

export interface TimeInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value?: string
  onChange?: (value: string) => void
}

const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  ({ className, value = '', onChange, ...props }, ref) => {
    const [time, setTime] = useState(value)
    const [period, setPeriod] = useState('AM')

    // Parse the current value to extract time and period
    const parseValue = (val: string) => {
      if (!val) return { time: '', period: 'AM' }
      
      // Handle 24-hour format
      if (val.includes(':')) {
        const [hours, minutes] = val.split(':')
        const hour24 = parseInt(hours)
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
        const period = hour24 >= 12 ? 'PM' : 'AM'
        return { time: `${hour12.toString().padStart(2, '0')}:${minutes}`, period }
      }
      
      return { time: val, period: 'AM' }
    }

    const { time: currentTime, period: currentPeriod } = parseValue(value)

    const handleTimeChange = (newTime: string) => {
      setTime(newTime)
      if (onChange) {
        // Convert to 24-hour format
        const [hours, minutes] = newTime.split(':')
        if (hours && minutes) {
          let hour24 = parseInt(hours)
          if (period === 'PM' && hour24 !== 12) hour24 += 12
          if (period === 'AM' && hour24 === 12) hour24 = 0
          onChange(`${hour24.toString().padStart(2, '0')}:${minutes}`)
        }
      }
    }

    const handlePeriodChange = (newPeriod: string) => {
      setPeriod(newPeriod)
      if (onChange && time) {
        // Convert to 24-hour format
        const [hours, minutes] = time.split(':')
        if (hours && minutes) {
          let hour24 = parseInt(hours)
          if (newPeriod === 'PM' && hour24 !== 12) hour24 += 12
          if (newPeriod === 'AM' && hour24 === 12) hour24 = 0
          onChange(`${hour24.toString().padStart(2, '0')}:${minutes}`)
        }
      }
    }

    return (
      <div className="flex items-center space-x-2">
        <input
          type="time"
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-gray-900',
            className
          )}
          value={currentTime}
          onChange={(e) => handleTimeChange(e.target.value)}
          {...props}
        />
        <Select
          value={currentPeriod}
          onChange={(e) => handlePeriodChange(e.target.value)}
          className="w-20"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </Select>
      </div>
    )
  }
)
TimeInput.displayName = 'TimeInput'

export { TimeInput }
