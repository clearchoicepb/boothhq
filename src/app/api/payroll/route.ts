/**
 * Payroll API Route
 *
 * GET /api/payroll - Calculate payroll for a period
 * Query params:
 *   - periodStart: Start date (ISO string, Monday)
 *   - periodEnd: End date (ISO string, Sunday)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'
import {
  PayrollPeriod,
  StaffPayrollEntry,
  EventPayrollDetail,
  PayrollTotals,
  PayrollResult,
  getPayrollPeriod,
  calculateHours,
  getDrivingDistance,
  getEffectivePayType
} from '@/lib/payroll-calculator'
import { format, parseISO, addDays } from 'date-fns'

const log = createLogger('api:payroll')

interface Assignment {
  id: string
  event_id: string
  user_id: string
  event_date_id: string
  arrival_time: string | null
  start_time: string | null
  end_time: string | null
  pay_type_override: 'hourly' | 'flat_rate' | null
  flat_rate_amount: number | null
  events: {
    id: string
    title: string
  } | null
  event_dates: {
    id: string
    event_date: string
    setup_time: string | null
    start_time: string | null
    end_time: string | null
  } | null
  users: {
    id: string
    first_name: string
    last_name: string
    user_type: 'staff' | 'white_label' | null
    pay_type: 'hourly' | 'flat_rate' | null
    pay_rate: number | null
    default_flat_rate: number | null
    mileage_enabled: boolean | null
    mileage_rate: number | null
    home_latitude: number | null
    home_longitude: number | null
  } | null
}

interface Location {
  id: string
  name: string
  latitude: number | null
  longitude: number | null
}

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const periodStartStr = searchParams.get('periodStart')
    const periodEndStr = searchParams.get('periodEnd')

    // Parse period dates or use default (last week)
    let period: PayrollPeriod

    if (periodStartStr && periodEndStr) {
      const startDate = parseISO(periodStartStr)
      const endDate = parseISO(periodEndStr)
      const payoutDate = addDays(endDate, 5) // Following Friday

      period = {
        startDate,
        endDate,
        payoutDate,
        label: `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
      }
    } else {
      period = getPayrollPeriod(1) // Default to last week
    }

    log.debug({ period: period.label }, 'Calculating payroll for period')

    // Format dates for SQL query
    const startDateStr = format(period.startDate, 'yyyy-MM-dd')
    const endDateStr = format(period.endDate, 'yyyy-MM-dd')

    // Step 1: Get all staff assignments for the period
    // Join with event_dates to filter by date range
    const { data: assignments, error: assignmentsError } = await supabase
      .from('event_staff_assignments')
      .select(`
        id,
        event_id,
        user_id,
        event_date_id,
        arrival_time,
        start_time,
        end_time,
        pay_type_override,
        flat_rate_amount,
        events!event_staff_assignments_event_id_fkey (
          id,
          title
        ),
        event_dates!event_staff_assignments_event_date_id_fkey (
          id,
          event_date,
          setup_time,
          start_time,
          end_time
        ),
        users!event_staff_assignments_user_id_fkey (
          id,
          first_name,
          last_name,
          user_type,
          pay_type,
          pay_rate,
          default_flat_rate,
          mileage_enabled,
          mileage_rate,
          home_latitude,
          home_longitude
        )
      `)
      .eq('tenant_id', dataSourceTenantId)

    if (assignmentsError) {
      log.error({ error: assignmentsError }, 'Failed to fetch assignments')
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
    }

    // Filter assignments to only those within the period and normalize structure
    const filteredAssignments = (assignments || []).filter((a: any) => {
      // Handle both array and single object for event_dates (Supabase join returns array)
      const eventDatesData = a.event_dates
      const eventDate = Array.isArray(eventDatesData) ? eventDatesData[0]?.event_date : eventDatesData?.event_date
      if (!eventDate) return false
      return eventDate >= startDateStr && eventDate <= endDateStr
    }).map((a: any): Assignment => ({
      id: a.id,
      event_id: a.event_id,
      user_id: a.user_id,
      event_date_id: a.event_date_id,
      arrival_time: a.arrival_time,
      start_time: a.start_time,
      end_time: a.end_time,
      pay_type_override: a.pay_type_override,
      flat_rate_amount: a.flat_rate_amount,
      events: Array.isArray(a.events) ? a.events[0] || null : a.events,
      event_dates: Array.isArray(a.event_dates) ? a.event_dates[0] || null : a.event_dates,
      users: Array.isArray(a.users) ? a.users[0] || null : a.users
    }))

    log.debug({ count: filteredAssignments.length }, 'Filtered assignments in period')

    if (filteredAssignments.length === 0) {
      return NextResponse.json({
        period: {
          startDate: period.startDate.toISOString(),
          endDate: period.endDate.toISOString(),
          payoutDate: period.payoutDate.toISOString(),
          label: period.label
        },
        staff: [],
        totals: {
          staffCount: 0,
          eventCount: 0,
          totalHours: 0,
          totalMiles: 0,
          totalHourlyPay: 0,
          totalMileagePay: 0,
          totalFlatRatePay: 0,
          totalReimbursements: 0,
          totalPay: 0
        }
      })
    }

    // Step 2: Get event locations for mileage calculation
    const eventIds = [...new Set(filteredAssignments.map(a => a.event_id))]
    const eventDateIds = [...new Set(filteredAssignments.map(a => a.event_date_id).filter(Boolean))]

    // Get locations from event_dates
    const { data: eventDatesWithLocations } = await supabase
      .from('event_dates')
      .select(`
        id,
        location_id,
        locations!event_dates_location_id_fkey (
          id,
          name,
          latitude,
          longitude
        )
      `)
      .in('id', eventDateIds)
      .eq('tenant_id', dataSourceTenantId)

    // Build location map: event_date_id -> location
    const locationMap = new Map<string, Location>()
    eventDatesWithLocations?.forEach((ed: any) => {
      if (ed.locations) {
        locationMap.set(ed.id, {
          id: ed.locations.id,
          name: ed.locations.name,
          latitude: ed.locations.latitude,
          longitude: ed.locations.longitude
        })
      }
    })

    // Step 3: Get reimbursements for users in this period
    const userIds = [...new Set(filteredAssignments.map(a => a.user_id))]

    const { data: adjustments } = await supabase
      .from('payroll_adjustments')
      .select('user_id, amount, notes')
      .eq('tenant_id', dataSourceTenantId)
      .eq('period_start', startDateStr)
      .eq('period_end', endDateStr)
      .in('user_id', userIds)

    // Build adjustment map: user_id -> amount
    const adjustmentMap = new Map<string, number>()
    adjustments?.forEach((adj: any) => {
      adjustmentMap.set(adj.user_id, adj.amount || 0)
    })

    // Step 4: Group assignments by user and calculate pay
    const userAssignments = new Map<string, Assignment[]>()

    filteredAssignments.forEach(assignment => {
      const userId = assignment.user_id
      if (!userAssignments.has(userId)) {
        userAssignments.set(userId, [])
      }
      userAssignments.get(userId)!.push(assignment)
    })

    // Step 5: Calculate payroll for each user
    const staffEntries: StaffPayrollEntry[] = []

    for (const [userId, assignments] of userAssignments) {
      const firstAssignment = assignments[0]
      const user = firstAssignment.users

      if (!user) continue

      const userType = user.user_type || 'staff'
      const hourlyRate = user.pay_rate || 0
      const mileageRate = user.mileage_rate || 0.50
      const mileageEnabled = user.mileage_enabled ?? false

      let totalHours = 0
      let totalMiles = 0
      let totalFlatRateAmount = 0
      let hourlyPay = 0
      let mileagePay = 0
      let flatRatePay = 0

      const eventDetails: EventPayrollDetail[] = []

      for (const assignment of assignments) {
        const eventDate = assignment.event_dates
        const event = assignment.events
        const location = assignment.event_date_id ? locationMap.get(assignment.event_date_id) : null

        // Determine pay type for this assignment
        const payType = getEffectivePayType(
          user.pay_type,
          user.user_type,
          assignment.pay_type_override
        )

        const detail: EventPayrollDetail = {
          assignmentId: assignment.id,
          eventId: assignment.event_id,
          eventName: event?.title || 'Unknown Event',
          eventDate: eventDate?.event_date || '',
          locationName: location?.name || 'Unknown Location',
          payType
        }

        if (payType === 'hourly') {
          // Calculate hours: use assignment arrival_time, fallback to event setup_time
          const arrivalTime = assignment.arrival_time || eventDate?.setup_time || eventDate?.start_time
          const endTime = assignment.end_time || eventDate?.end_time

          const hours = calculateHours(arrivalTime, endTime)

          detail.arrivalTime = arrivalTime || undefined
          detail.endTime = endTime || undefined
          detail.hoursWorked = hours
          detail.hourlyPay = hours * hourlyRate

          totalHours += hours
          hourlyPay += hours * hourlyRate

          // Calculate mileage if enabled
          if (mileageEnabled && user.home_latitude && user.home_longitude && location?.latitude && location?.longitude) {
            const distance = await getDrivingDistance(
              user.home_latitude,
              user.home_longitude,
              location.latitude,
              location.longitude
            )

            if (distance !== null) {
              const roundTrip = distance * 2
              const mileageCost = roundTrip * mileageRate

              detail.distanceOneway = distance
              detail.distanceRoundTrip = roundTrip
              detail.mileagePay = mileageCost

              totalMiles += roundTrip
              mileagePay += mileageCost
            }
          }
        } else {
          // Flat rate
          const amount = assignment.flat_rate_amount || user.default_flat_rate || 0

          detail.flatRateAmount = amount

          totalFlatRateAmount += amount
          flatRatePay += amount
        }

        eventDetails.push(detail)
      }

      // Get reimbursement for this user
      const reimbursements = adjustmentMap.get(userId) || 0

      // Calculate total pay
      const totalPay = hourlyPay + mileagePay + flatRatePay + reimbursements

      staffEntries.push({
        userId,
        firstName: user.first_name,
        lastName: user.last_name,
        userType,
        eventCount: assignments.length,
        totalHours,
        totalMiles,
        totalFlatRateAmount,
        hourlyRate,
        mileageRate,
        mileageEnabled,
        hourlyPay,
        mileagePay,
        flatRatePay,
        reimbursements,
        totalPay,
        events: eventDetails
      })
    }

    // Sort staff by last name, first name
    staffEntries.sort((a, b) => {
      const nameA = `${a.lastName} ${a.firstName}`.toLowerCase()
      const nameB = `${b.lastName} ${b.firstName}`.toLowerCase()
      return nameA.localeCompare(nameB)
    })

    // Step 6: Calculate totals
    const totals: PayrollTotals = {
      staffCount: staffEntries.length,
      eventCount: staffEntries.reduce((sum, s) => sum + s.eventCount, 0),
      totalHours: staffEntries.reduce((sum, s) => sum + s.totalHours, 0),
      totalMiles: staffEntries.reduce((sum, s) => sum + s.totalMiles, 0),
      totalHourlyPay: staffEntries.reduce((sum, s) => sum + s.hourlyPay, 0),
      totalMileagePay: staffEntries.reduce((sum, s) => sum + s.mileagePay, 0),
      totalFlatRatePay: staffEntries.reduce((sum, s) => sum + s.flatRatePay, 0),
      totalReimbursements: staffEntries.reduce((sum, s) => sum + s.reimbursements, 0),
      totalPay: staffEntries.reduce((sum, s) => sum + s.totalPay, 0)
    }

    const result: PayrollResult = {
      period: {
        startDate: period.startDate,
        endDate: period.endDate,
        payoutDate: period.payoutDate,
        label: period.label
      },
      staff: staffEntries,
      totals
    }

    log.debug({ staffCount: staffEntries.length, totalPay: totals.totalPay }, 'Payroll calculated')

    return NextResponse.json(result)
  } catch (error) {
    log.error({ error }, 'Error calculating payroll')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
