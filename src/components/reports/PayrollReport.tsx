'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { format, parseISO } from 'date-fns'
import { Loader2, Info, Pencil, Calendar, Clock, MapPin, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

// ============================================
// TYPES
// ============================================

interface PayrollPeriod {
  startDate: string
  endDate: string
  payoutDate: string
  label: string
}

interface EventPayrollDetail {
  assignmentId: string
  eventId: string
  eventName: string
  eventDate: string
  locationName: string
  payType: 'hourly' | 'flat_rate'
  arrivalTime?: string
  endTime?: string
  hoursWorked?: number
  hourlyPay?: number
  distanceOneway?: number
  distanceRoundTrip?: number
  mileagePay?: number
  flatRateAmount?: number
}

interface StaffPayrollEntry {
  userId: string
  firstName: string
  lastName: string
  userType: 'staff' | 'white_label'
  eventCount: number
  totalHours: number
  totalMiles: number
  totalFlatRateAmount: number
  hourlyRate: number
  mileageRate: number
  mileageEnabled: boolean
  hourlyPay: number
  mileagePay: number
  flatRatePay: number
  reimbursements: number
  totalPay: number
  events: EventPayrollDetail[]
}

interface PayrollTotals {
  staffCount: number
  eventCount: number
  totalHours: number
  totalMiles: number
  totalHourlyPay: number
  totalMileagePay: number
  totalFlatRatePay: number
  totalReimbursements: number
  totalPay: number
}

interface PayrollResult {
  period: PayrollPeriod
  staff: StaffPayrollEntry[]
  totals: PayrollTotals
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

function formatTime(time: string | undefined): string {
  if (!time) return '--'
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d')
  } catch {
    return dateStr
  }
}

// ============================================
// API FUNCTIONS
// ============================================

async function fetchPayrollPeriods(): Promise<PayrollPeriod[]> {
  const response = await fetch('/api/payroll/periods')
  if (!response.ok) throw new Error('Failed to fetch periods')
  return response.json()
}

async function fetchPayroll(periodStart: string, periodEnd: string): Promise<PayrollResult> {
  const params = new URLSearchParams({ periodStart, periodEnd })
  const response = await fetch(`/api/payroll?${params}`)
  if (!response.ok) throw new Error('Failed to fetch payroll')
  return response.json()
}

async function saveReimbursement(
  userId: string,
  periodStart: string,
  periodEnd: string,
  amount: number,
  notes: string
): Promise<void> {
  const response = await fetch('/api/payroll/reimbursement', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, periodStart, periodEnd, amount, notes })
  })
  if (!response.ok) throw new Error('Failed to save reimbursement')
}

async function saveFlatRateAmount(
  assignmentId: string,
  amount: number
): Promise<void> {
  const response = await fetch(`/api/event-staff/${assignmentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flat_rate_amount: amount })
  })
  if (!response.ok) throw new Error('Failed to save flat rate')
}

// ============================================
// MODAL COMPONENTS
// ============================================

interface EventsModalProps {
  isOpen: boolean
  onClose: () => void
  staff: StaffPayrollEntry | null
  period: PayrollPeriod | null
}

function EventsModal({ isOpen, onClose, staff, period }: EventsModalProps) {
  if (!staff || !period) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Events Worked - ${staff.firstName} ${staff.lastName}`}>
      <p className="text-sm text-gray-500 mb-4">Period: {period.label}</p>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Event</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Location</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Pay Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {staff.events.map((event, idx) => (
              <tr key={idx}>
                <td className="px-4 py-2 text-sm text-gray-900">{event.eventName}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{formatDate(event.eventDate)}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{event.locationName}</td>
                <td className="px-4 py-2 text-sm text-gray-600 capitalize">{event.payType.replace('_', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}

interface HoursModalProps {
  isOpen: boolean
  onClose: () => void
  staff: StaffPayrollEntry | null
  period: PayrollPeriod | null
}

function HoursModal({ isOpen, onClose, staff, period }: HoursModalProps) {
  if (!staff || !period) return null

  const hourlyEvents = staff.events.filter(e => e.payType === 'hourly')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Hours Breakdown - ${staff.firstName} ${staff.lastName}`}>
      <div className="flex justify-between text-sm text-gray-500 mb-4">
        <span>Period: {period.label}</span>
        <span>Rate: {formatCurrency(staff.hourlyRate)}/hr</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Event</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Arrival</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">End</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">+30min</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Hours</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Pay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {staff.events.map((event, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2 text-sm text-gray-900">{event.eventName}</td>
                {event.payType === 'hourly' ? (
                  <>
                    <td className="px-3 py-2 text-sm text-gray-600">{formatTime(event.arrivalTime)}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{formatTime(event.endTime)}</td>
                    <td className="px-3 py-2 text-sm text-gray-400">+0:30</td>
                    <td className="px-3 py-2 text-sm text-gray-900 text-right">{event.hoursWorked?.toFixed(1)}</td>
                    <td className="px-3 py-2 text-sm text-gray-900 text-right">{formatCurrency(event.hourlyPay || 0)}</td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2 text-sm text-gray-400" colSpan={4}>--</td>
                    <td className="px-3 py-2 text-sm text-gray-500 text-right">(Flat)</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={4} className="px-3 py-2 text-sm font-medium text-gray-900 text-right">TOTAL</td>
              <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">{staff.totalHours.toFixed(1)}</td>
              <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">{formatCurrency(staff.hourlyPay)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}

interface MileageModalProps {
  isOpen: boolean
  onClose: () => void
  staff: StaffPayrollEntry | null
  period: PayrollPeriod | null
}

function MileageModal({ isOpen, onClose, staff, period }: MileageModalProps) {
  if (!staff || !period) return null

  const mileageEvents = staff.events.filter(e => e.payType === 'hourly' && e.distanceRoundTrip)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Mileage Breakdown - ${staff.firstName} ${staff.lastName}`}>
      <div className="flex justify-between text-sm text-gray-500 mb-4">
        <span>Period: {period.label}</span>
        <span>Rate: {formatCurrency(staff.mileageRate)}/mi</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Event</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Location</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">One-Way</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Round Trip</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Pay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {staff.events.map((event, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2 text-sm text-gray-900">{event.eventName}</td>
                <td className="px-3 py-2 text-sm text-gray-600">{event.locationName}</td>
                {event.payType === 'hourly' && event.distanceOneway ? (
                  <>
                    <td className="px-3 py-2 text-sm text-gray-600 text-right">{event.distanceOneway.toFixed(1)} mi</td>
                    <td className="px-3 py-2 text-sm text-gray-600 text-right">{event.distanceRoundTrip?.toFixed(1)} mi</td>
                    <td className="px-3 py-2 text-sm text-gray-900 text-right">{formatCurrency(event.mileagePay || 0)}</td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2 text-sm text-gray-400 text-right">--</td>
                    <td className="px-3 py-2 text-sm text-gray-400 text-right">--</td>
                    <td className="px-3 py-2 text-sm text-gray-500 text-right">(Flat)</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={3} className="px-3 py-2 text-sm font-medium text-gray-900 text-right">TOTAL</td>
              <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">{staff.totalMiles.toFixed(1)} mi</td>
              <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">{formatCurrency(staff.mileagePay)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}

interface FlatRateModalProps {
  isOpen: boolean
  onClose: () => void
  staff: StaffPayrollEntry | null
  period: PayrollPeriod | null
  onSave: (assignmentId: string, amount: number) => Promise<void>
}

function FlatRateModal({ isOpen, onClose, staff, period, onSave }: FlatRateModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  if (!staff || !period) return null

  const flatRateEvents = staff.events.filter(e => e.payType === 'flat_rate')

  const handleEditClick = (event: EventPayrollDetail) => {
    setEditingId(event.assignmentId)
    setEditAmount((event.flatRateAmount || 0).toString())
  }

  const handleSave = async (assignmentId: string) => {
    setIsSaving(true)
    try {
      await onSave(assignmentId, parseFloat(editAmount) || 0)
      setEditingId(null)
      setEditAmount('')
    } catch (error) {
      toast.error('Failed to save flat rate')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditAmount('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Flat Rate Events - ${staff.firstName} ${staff.lastName}`}>
      <p className="text-sm text-gray-500 mb-4">Period: {period.label}</p>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Event</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Location</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {flatRateEvents.map((event) => (
              <tr key={event.assignmentId}>
                <td className="px-4 py-2 text-sm text-gray-900">{event.eventName}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{formatDate(event.eventDate)}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{event.locationName}</td>
                <td className="px-4 py-2 text-sm text-gray-900 text-right">
                  {editingId === event.assignmentId ? (
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                        autoFocus
                      />
                    </div>
                  ) : (
                    formatCurrency(event.flatRateAmount || 0)
                  )}
                </td>
                <td className="px-4 py-2 text-center">
                  {editingId === event.assignmentId ? (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleSave(event.assignmentId)}
                        disabled={isSaving}
                        className="text-green-600 hover:text-green-800 text-xs font-medium"
                      >
                        {isSaving ? '...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="text-gray-500 hover:text-gray-700 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditClick(event)}
                      className="text-gray-400 hover:text-blue-600"
                      title="Edit flat rate"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={4} className="px-4 py-2 text-sm font-medium text-gray-900 text-right">TOTAL</td>
              <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">{formatCurrency(staff.flatRatePay)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}

interface ReimbursementModalProps {
  isOpen: boolean
  onClose: () => void
  staff: StaffPayrollEntry | null
  period: PayrollPeriod | null
  onSave: (amount: number, notes: string) => Promise<void>
}

function ReimbursementModal({ isOpen, onClose, staff, period, onSave }: ReimbursementModalProps) {
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (staff) {
      setAmount(staff.reimbursements > 0 ? staff.reimbursements.toString() : '')
      setNotes('')
    }
  }, [staff])

  if (!staff || !period) return null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(parseFloat(amount) || 0, notes)
      onClose()
    } catch (error) {
      toast.error('Failed to save reimbursement')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Reimbursement - ${staff.firstName} ${staff.lastName}`}>
      <p className="text-sm text-gray-500 mb-4">Period: {period.label}</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reimbursement Amount
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">$</span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Parking reimbursement"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save
        </Button>
      </div>
    </Modal>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PayrollReport() {
  const queryClient = useQueryClient()
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null)
  const [hasRun, setHasRun] = useState(false)

  // Modal state
  const [eventsModal, setEventsModal] = useState<{ isOpen: boolean; staff: StaffPayrollEntry | null }>({ isOpen: false, staff: null })
  const [hoursModal, setHoursModal] = useState<{ isOpen: boolean; staff: StaffPayrollEntry | null }>({ isOpen: false, staff: null })
  const [mileageModal, setMileageModal] = useState<{ isOpen: boolean; staff: StaffPayrollEntry | null }>({ isOpen: false, staff: null })
  const [flatRateModal, setFlatRateModal] = useState<{ isOpen: boolean; staff: StaffPayrollEntry | null }>({ isOpen: false, staff: null })
  const [reimbursementModal, setReimbursementModal] = useState<{ isOpen: boolean; staff: StaffPayrollEntry | null }>({ isOpen: false, staff: null })

  // Fetch available periods
  const { data: periods = [], isLoading: periodsLoading } = useQuery({
    queryKey: ['payroll-periods'],
    queryFn: fetchPayrollPeriods,
    staleTime: 5 * 60 * 1000
  })

  // Set default period when loaded
  useEffect(() => {
    if (periods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(periods[0])
    }
  }, [periods, selectedPeriod])

  // Fetch payroll data
  const {
    data: payrollData,
    isLoading: payrollLoading,
    refetch: runPayroll
  } = useQuery({
    queryKey: ['payroll', selectedPeriod?.startDate, selectedPeriod?.endDate],
    queryFn: () => fetchPayroll(selectedPeriod!.startDate, selectedPeriod!.endDate),
    enabled: false // Manual trigger only
  })

  const handleRunPayroll = () => {
    if (selectedPeriod) {
      setHasRun(true)
      runPayroll()
    }
  }

  const handleSaveReimbursement = async (amount: number, notes: string) => {
    if (!reimbursementModal.staff || !selectedPeriod) return

    await saveReimbursement(
      reimbursementModal.staff.userId,
      selectedPeriod.startDate,
      selectedPeriod.endDate,
      amount,
      notes
    )

    toast.success('Reimbursement saved')
    runPayroll() // Refresh data
  }

  const handleSaveFlatRate = async (assignmentId: string, amount: number) => {
    await saveFlatRateAmount(assignmentId, amount)
    toast.success('Flat rate updated')
    runPayroll() // Refresh data
  }

  const isLoading = periodsLoading || payrollLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Payroll Report</h2>

        <div className="flex flex-wrap items-end gap-4">
          {/* Period Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payroll Period
            </label>
            <select
              value={selectedPeriod?.label || ''}
              onChange={(e) => {
                const period = periods.find(p => p.label === e.target.value)
                if (period) {
                  setSelectedPeriod(period)
                  setHasRun(false)
                }
              }}
              disabled={periodsLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              {periods.map(period => (
                <option key={period.label} value={period.label}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payout Date */}
          {selectedPeriod && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Payout Date:</span>{' '}
              {format(parseISO(selectedPeriod.payoutDate), 'EEEE, MMMM d, yyyy')}
            </div>
          )}

          {/* Run Button */}
          <Button
            onClick={handleRunPayroll}
            disabled={!selectedPeriod || isLoading}
          >
            {payrollLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Calculating...
              </>
            ) : (
              'Run Payroll Report'
            )}
          </Button>
        </div>
      </div>

      {/* Results */}
      {hasRun && payrollData && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    # Events
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mileage
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Flat Rates
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reimb
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payrollData.staff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No staff assignments found for this period.
                    </td>
                  </tr>
                ) : (
                  payrollData.staff.map(staff => (
                    <tr key={staff.userId} className="hover:bg-gray-50">
                      {/* Staff Name */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {staff.firstName} {staff.lastName}
                        </span>
                        {staff.userType === 'white_label' && (
                          <span className="ml-2 text-xs text-gray-500">(WL)</span>
                        )}
                      </td>

                      {/* Events */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => setEventsModal({ isOpen: true, staff })}
                          className="inline-flex items-center gap-1 text-sm text-gray-900 hover:text-blue-600"
                        >
                          {staff.eventCount}
                          <Info className="h-3 w-3 text-gray-400" />
                        </button>
                      </td>

                      {/* Hours */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {staff.totalHours > 0 ? (
                          <button
                            onClick={() => setHoursModal({ isOpen: true, staff })}
                            className="inline-flex items-center gap-1 text-sm text-gray-900 hover:text-blue-600"
                          >
                            {staff.totalHours.toFixed(1)}
                            <Info className="h-3 w-3 text-gray-400" />
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">--</span>
                        )}
                      </td>

                      {/* Mileage */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {staff.totalMiles > 0 ? (
                          <button
                            onClick={() => setMileageModal({ isOpen: true, staff })}
                            className="inline-flex items-center gap-1 text-sm text-gray-900 hover:text-blue-600"
                          >
                            {staff.totalMiles.toFixed(0)} mi
                            <Info className="h-3 w-3 text-gray-400" />
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">--</span>
                        )}
                      </td>

                      {/* Flat Rates */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {staff.flatRatePay > 0 ? (
                          <button
                            onClick={() => setFlatRateModal({ isOpen: true, staff })}
                            className="inline-flex items-center gap-1 text-sm text-gray-900 hover:text-blue-600"
                          >
                            {formatCurrency(staff.flatRatePay)}
                            <Info className="h-3 w-3 text-gray-400" />
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">--</span>
                        )}
                      </td>

                      {/* Reimbursement */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => setReimbursementModal({ isOpen: true, staff })}
                          className="inline-flex items-center gap-1 text-sm text-gray-900 hover:text-blue-600"
                        >
                          {staff.reimbursements > 0 ? formatCurrency(staff.reimbursements) : '$0'}
                          <Pencil className="h-3 w-3 text-gray-400" />
                        </button>
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(staff.totalPay)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Totals Footer */}
              {payrollData.staff.length > 0 && (
                <tfoot className="bg-gray-100">
                  <tr className="font-medium">
                    <td className="px-4 py-3 text-sm text-gray-900">TOTALS</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">{payrollData.totals.eventCount}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">{payrollData.totals.totalHours.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">{payrollData.totals.totalMiles.toFixed(0)} mi</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">{formatCurrency(payrollData.totals.totalFlatRatePay)}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">{formatCurrency(payrollData.totals.totalReimbursements)}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900 font-bold">{formatCurrency(payrollData.totals.totalPay)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {hasRun && !payrollLoading && payrollData?.staff.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Payroll Data</h3>
          <p className="text-gray-500">
            No staff assignments found for the selected period.
          </p>
        </div>
      )}

      {/* Modals */}
      <EventsModal
        isOpen={eventsModal.isOpen}
        onClose={() => setEventsModal({ isOpen: false, staff: null })}
        staff={eventsModal.staff}
        period={selectedPeriod}
      />
      <HoursModal
        isOpen={hoursModal.isOpen}
        onClose={() => setHoursModal({ isOpen: false, staff: null })}
        staff={hoursModal.staff}
        period={selectedPeriod}
      />
      <MileageModal
        isOpen={mileageModal.isOpen}
        onClose={() => setMileageModal({ isOpen: false, staff: null })}
        staff={mileageModal.staff}
        period={selectedPeriod}
      />
      <FlatRateModal
        isOpen={flatRateModal.isOpen}
        onClose={() => setFlatRateModal({ isOpen: false, staff: null })}
        staff={flatRateModal.staff}
        period={selectedPeriod}
        onSave={handleSaveFlatRate}
      />
      <ReimbursementModal
        isOpen={reimbursementModal.isOpen}
        onClose={() => setReimbursementModal({ isOpen: false, staff: null })}
        staff={reimbursementModal.staff}
        period={selectedPeriod}
        onSave={handleSaveReimbursement}
      />
    </div>
  )
}
