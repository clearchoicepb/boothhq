'use client'

import type { LogisticsStaffProps, LogisticsStaff as StaffMember } from '@/types/logistics'

/**
 * StaffColumn Component
 *
 * Displays a column of staff members with their details.
 */
function StaffColumn({
  title,
  staff,
  emptyMessage
}: {
  title: string
  staff: StaffMember[]
  emptyMessage: string
}) {
  return (
    <div>
      <h4 className="text-sm font-bold text-gray-900 uppercase mb-3">{title}</h4>
      {staff.length > 0 ? (
        <div className="space-y-3">
          {staff.map(member => (
            <div key={member.id} className="border-l-2 border-gray-300 pl-4">
              <div className="space-y-1">
                <div className="flex">
                  <span className="text-sm font-semibold text-gray-700 w-24">Name:</span>
                  <span className="text-sm text-gray-900">{member.name}</span>
                </div>
                {member.role && (
                  <div className="flex">
                    <span className="text-sm font-semibold text-gray-700 w-24">Role:</span>
                    <span className="text-sm text-[#347dc4]">{member.role}</span>
                  </div>
                )}
                {member.email && (
                  <div className="flex">
                    <span className="text-sm font-semibold text-gray-700 w-24">Email:</span>
                    <span className="text-sm text-gray-900">{member.email}</span>
                  </div>
                )}
                {member.notes && (
                  <div className="flex">
                    <span className="text-sm font-semibold text-gray-700 w-24">Notes:</span>
                    <span className="text-sm text-gray-900">{member.notes}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">{emptyMessage}</p>
      )}
    </div>
  )
}

/**
 * LogisticsStaff Component
 *
 * Displays event staff in a 2-column layout (Operations Team & Event Day Staff).
 */
export function LogisticsStaff({ staff }: LogisticsStaffProps) {
  const operationsStaff = staff?.filter(s => s.role_type === 'operations') || []
  const eventDayStaff = staff?.filter(s => s.role_type === 'event_staff') || []

  return (
    <section className="pb-6 border-b border-gray-300">
      <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">
        Event Staff
      </h3>

      <div className="pl-4">
        {/* 2-column layout for staff */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {/* Operations Team Column */}
          <StaffColumn
            title="Operations Team"
            staff={operationsStaff}
            emptyMessage="No operations team assigned"
          />

          {/* Event Day Staff Column */}
          <StaffColumn
            title="Event Day Staff"
            staff={eventDayStaff}
            emptyMessage="No event day staff assigned"
          />
        </div>
      </div>
    </section>
  )
}
