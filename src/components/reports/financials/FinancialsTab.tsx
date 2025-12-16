'use client'

import { IncomingPaymentsForecast } from './IncomingPaymentsForecast'
import { YearOverYearChart } from './YearOverYearChart'
import { PaymentSearch } from './PaymentSearch'

export function FinancialsTab() {
  return (
    <div className="space-y-8">
      {/* Row 1: Incoming Payments Forecast */}
      <IncomingPaymentsForecast />

      {/* Row 2: Year over Year Chart */}
      <YearOverYearChart />

      {/* Row 3: Payment Search */}
      <PaymentSearch />
    </div>
  )
}
