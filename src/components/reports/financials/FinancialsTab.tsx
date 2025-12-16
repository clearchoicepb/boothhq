'use client'

import { useSearchParams, useRouter, useParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { IncomingPaymentsForecast } from './IncomingPaymentsForecast'
import { YearOverYearChart } from './YearOverYearChart'
import { PaymentSearch } from './PaymentSearch'
import { CalendarDays, CreditCard } from 'lucide-react'

export function FinancialsTab() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { tenant: tenantSubdomain } = useParams()

  // Get subTab from URL, default to 'payments-due'
  const subTab = searchParams.get('subTab') || 'payments-due'

  const handleSubTabChange = (value: string) => {
    // Build new URL with updated subTab
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'financials')
    params.set('subTab', value)
    router.push(`/${tenantSubdomain}/reports?${params.toString()}`)
  }

  return (
    <div>
      <Tabs value={subTab} onValueChange={handleSubTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="payments-due" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Payments Due
          </TabsTrigger>
          <TabsTrigger value="payments-received" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payments Received
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments-due">
          <IncomingPaymentsForecast />
        </TabsContent>

        <TabsContent value="payments-received">
          <div className="space-y-8">
            <YearOverYearChart />
            <PaymentSearch />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
