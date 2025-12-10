import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { isOpenStage } from '@/lib/constants/opportunity-stages'

const log = createLogger('api:seed-data')

// Realistic data arrays
const firstNames = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Christopher", "Karen", "Daniel", "Nancy", "Matthew", "Lisa",
  "Anthony", "Betty", "Mark", "Margaret", "Donald", "Sandra", "Paul", "Ashley",
  "Steven", "Kimberly", "Andrew", "Emily", "Kenneth", "Donna", "Joshua", "Michelle"
]

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"
]

const companyNames = [
  "Acme Events Inc", "Blue Sky Productions", "Premier Corporate Events", "Sunset Weddings & Events",
  "TechCorp Solutions", "Green Valley Resort", "Downtown Convention Center", "Elite Hospitality Group",
  "Starlight Entertainment", "Golden Gate Catering", "Horizon Business Services", "Luxe Celebrations",
  "Metro Conference Center", "Coastal Events Co", "Summit Productions", "Riverside Venue Group",
  "Crystal Ballroom Events", "Urban Studios LLC", "Paradise Island Resort", "Vintage Event Spaces",
  "Crimson Events", "Silver Lake Productions", "Diamond Hospitality", "Platinum Events Group",
  "Royal Banquet Hall", "Emerald City Catering", "Sapphire Weddings", "Ruby Red Productions",
  "Amber Events Co", "Topaz Corporate Services", "Jade Garden Venue", "Opal Event Center",
  "Pearl Productions", "Onyx Entertainment", "Ivory Tower Events", "Copper Canyon Resort",
  "Bronze Star Catering", "Steel City Events", "Iron Gate Venue", "Marble Hall Productions",
  "Granite Events Group", "Cedar Grove Resort", "Oak Tree Catering", "Pine Ridge Events",
  "Maple Leaf Productions", "Willow Creek Venue", "Birch Wood Events", "Aspen Valley Resort"
]

const industries = [
  "Events & Entertainment", "Corporate Services", "Hospitality", "Education", "Technology",
  "Healthcare", "Retail", "Manufacturing", "Finance", "Real Estate", "Non-Profit",
  "Government", "Construction", "Legal Services", "Marketing & Advertising"
]

const cities = [
  { city: "New York", state: "NY" },
  { city: "Los Angeles", state: "CA" },
  { city: "Chicago", state: "IL" },
  { city: "Houston", state: "TX" },
  { city: "Phoenix", state: "AZ" },
  { city: "Philadelphia", state: "PA" },
  { city: "San Antonio", state: "TX" },
  { city: "San Diego", state: "CA" },
  { city: "Dallas", state: "TX" },
  { city: "San Jose", state: "CA" },
  { city: "Austin", state: "TX" },
  { city: "Jacksonville", state: "FL" },
  { city: "Fort Worth", state: "TX" },
  { city: "Columbus", state: "OH" },
  { city: "Charlotte", state: "NC" },
  { city: "San Francisco", state: "CA" },
  { city: "Indianapolis", state: "IN" },
  { city: "Seattle", state: "WA" },
  { city: "Denver", state: "CO" },
  { city: "Boston", state: "MA" }
]

const eventTypes = [
  "photo_booth", "dj_service", "full_production", "lighting", "audio_visual",
  "staging", "coordination", "other"
]

// Helper functions
const random = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const randomDate = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

const randomAmount = (): number => {
  const rand = Math.random()
  if (rand < 0.5) {
    // 50% small deals: $500 - $2,500
    return Math.floor(Math.random() * 2000 + 500)
  } else if (rand < 0.85) {
    // 35% medium deals: $2,500 - $10,000
    return Math.floor(Math.random() * 7500 + 2500)
  } else {
    // 15% large deals: $10,000 - $50,000
    return Math.floor(Math.random() * 40000 + 10000)
  }
}

const formatPhoneNumber = (): string => {
  const areaCode = Math.floor(Math.random() * 900 + 100)
  const prefix = Math.floor(Math.random() * 900 + 100)
  const lineNumber = Math.floor(Math.random() * 9000 + 1000)
  return `(${areaCode}) ${prefix}-${lineNumber}`
}

const generateEmail = (firstName: string, lastName: string, company?: string): string => {
  const cleanFirst = firstName.toLowerCase()
  const cleanLast = lastName.toLowerCase()

  if (company) {
    const domain = company.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15)
    return `${cleanFirst}.${cleanLast}@${domain}.com`
  }

  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']
  return `${cleanFirst}.${cleanLast}@${random(domains)}`
}

export async function POST(request: Request) {
  try {
    // Safety check: require confirmation
    const body = await request.json()
    if (body.confirm !== 'yes-create-test-data') {
      return NextResponse.json({
        error: 'Confirmation required. Send { "confirm": "yes-create-test-data" } in request body.'
      }, { status: 400 })
    }
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    // Get all users in tenant for owner assignment
    const { data: users } = await supabase
      .from('tenant_users')
      .select('user_id')
      .eq('tenant_id', dataSourceTenantId)

    const userIds = users?.map(u => u.user_id) || [session.user.id]

    const now = new Date()
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)
    const twelveMonthsAgo = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000)
    const nineMonthsAgo = new Date(now.getTime() - 9 * 30 * 24 * 60 * 60 * 1000)
    const threeMonthsFromNow = new Date(now.getTime() + 3 * 30 * 24 * 60 * 60 * 1000)
    const sixMonthsFromNow = new Date(now.getTime() + 6 * 30 * 24 * 60 * 60 * 1000)

    log.debug('Starting seed data generation...')

    // STEP 1: Create Leads (45 records)
    log.debug('Creating leads...')
    const leadStatuses = [
      ...Array(14).fill('new'),
      ...Array(11).fill('contacted'),
      ...Array(9).fill('qualified'),
      ...Array(7).fill('lost'),
      ...Array(4).fill('converted')
    ]

    const leadSources = [
      ...Array(16).fill('website'),
      ...Array(11).fill('referral'),
      ...Array(7).fill('trade_show'),
      ...Array(7).fill('cold_call'),
      ...Array(4).fill('social_media')
    ]

    const leadsData = []
    for (let i = 0; i < 45; i++) {
      const firstName = random(firstNames)
      const lastName = random(lastNames)
      const companyName = Math.random() > 0.3 ? random(companyNames) : null
      const isCompany = !!companyName

      leadsData.push({
        tenant_id: dataSourceTenantId,
        lead_type: isCompany ? 'company' : 'personal',
        first_name: firstName,
        last_name: lastName,
        email: generateEmail(firstName, lastName, companyName || undefined),
        phone: formatPhoneNumber(),
        company: companyName,
        company_url: isCompany ? `www.${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com` : null,
        source: random(leadSources),
        status: random(leadStatuses),
        notes: Math.random() > 0.5 ? `Initial inquiry about ${random(['photo booth services', 'DJ services', 'event production', 'venue rental', 'catering services'])}` : null,
        created_at: randomDate(sixMonthsAgo, now).toISOString()
      })
    }

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .insert(leadsData)
      .select()

    if (leadsError) throw leadsError
    log.debug('Created ${leads?.length} leads')

    // STEP 2: Create Accounts (45 records)
    log.debug('Creating accounts...')
    const accountTypes = [...Array(27).fill('company'), ...Array(18).fill('individual')]
    const accountStatuses = [...Array(32).fill('active'), ...Array(9).fill('inactive'), ...Array(4).fill('suspended')]

    const accountsData = []
    for (let i = 0; i < 45; i++) {
      const isCompany = random(accountTypes) === 'company'
      const location = random(cities)
      const street = `${Math.floor(Math.random() * 9000 + 1000)} ${random(['Main', 'Oak', 'Maple', 'Cedar', 'Park', 'Washington', 'Lake', 'Hill'])} ${random(['St', 'Ave', 'Blvd', 'Dr', 'Ln'])}`
      const zipCode = String(Math.floor(Math.random() * 90000 + 10000))

      accountsData.push({
        tenant_id: dataSourceTenantId,
        name: isCompany ? random(companyNames) : `${random(firstNames)} ${random(lastNames)}`,
        account_type: isCompany ? 'company' : 'individual',
        industry: random(industries),
        phone: formatPhoneNumber(),
        email: isCompany ? `info@${random(companyNames).toLowerCase().replace(/[^a-z0-9]/g, '')}.com` : generateEmail(random(firstNames), random(lastNames)),
        website: isCompany ? `www.${random(companyNames).toLowerCase().replace(/[^a-z0-9]/g, '')}.com` : null,
        billing_address: {
          street,
          city: location.city,
          state: location.state,
          zip: zipCode,
          country: 'USA'
        },
        status: random(accountStatuses),
        assigned_to: random(userIds),
        created_at: randomDate(twelveMonthsAgo, now).toISOString()
      })
    }

    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .insert(accountsData)
      .select()

    if (accountsError) throw accountsError
    log.debug('Created ${accounts?.length} accounts')

    // STEP 3: Create Contacts (45 records, 80% linked to accounts)
    log.debug('Creating contacts...')
    const contactsData = []
    for (let i = 0; i < 45; i++) {
      const firstName = random(firstNames)
      const lastName = random(lastNames)
      const hasAccount = Math.random() < 0.8 && accounts && accounts.length > 0
      const linkedAccount = hasAccount ? random(accounts) : null
      const location = random(cities)
      const street = `${Math.floor(Math.random() * 9000 + 1000)} ${random(['Main', 'Oak', 'Maple', 'Cedar', 'Park', 'Washington', 'Lake', 'Hill'])} ${random(['St', 'Ave', 'Blvd', 'Dr', 'Ln'])}`
      const zipCode = String(Math.floor(Math.random() * 90000 + 10000))

      contactsData.push({
        tenant_id: dataSourceTenantId,
        account_id: linkedAccount?.id || null,
        first_name: firstName,
        last_name: lastName,
        email: generateEmail(firstName, lastName, linkedAccount?.name),
        phone: formatPhoneNumber(),
        job_title: random(['Event Coordinator', 'Marketing Director', 'Operations Manager', 'CEO', 'VP of Sales', 'Manager', 'Director', 'Specialist']),
        department: random(['Sales', 'Marketing', 'Operations', 'Executive', 'Events', 'Customer Success']),
        address: Math.random() > 0.3 ? {
          street,
          city: location.city,
          state: location.state,
          zip: zipCode,
          country: 'USA'
        } : null,
        status: random(['active', 'active', 'active', 'active', 'inactive']),
        created_at: randomDate(twelveMonthsAgo, now).toISOString()
      })
    }

    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .insert(contactsData)
      .select()

    if (contactsError) throw contactsError
    log.debug('Created ${contacts?.length} contacts')

    // STEP 4: Create Opportunities (35 records)
    log.debug('Creating opportunities...')
    const stages = [
      ...Array(7).fill('prospecting'),
      ...Array(7).fill('qualification'),
      ...Array(5).fill('proposal'),
      ...Array(4).fill('negotiation'),
      ...Array(7).fill('closed_won'),
      ...Array(5).fill('closed_lost')
    ]

    const opportunitiesData = []
    for (let i = 0; i < 35; i++) {
      const account = random(accounts!)
      const hasContact = Math.random() < 0.8
      const contact = hasContact ? contacts?.find(c => c.account_id === account.id) || random(contacts!) : null
      const stage = random(stages)
      const amount = randomAmount()
      const createdAt = randomDate(nineMonthsAgo, now)

      // Calculate probability based on stage
      let probability = 10
      if (stage === 'qualification') probability = 25
      if (stage === 'proposal') probability = 50
      if (stage === 'negotiation') probability = 75
      if (stage === 'closed_won') probability = 100
      if (stage === 'closed_lost') probability = 0

      // Calculate expected close date
      let expectedCloseDate
      if (stage === 'closed_won' || stage === 'closed_lost') {
        expectedCloseDate = randomDate(createdAt, now)
      } else {
        expectedCloseDate = randomDate(now, threeMonthsFromNow)
      }

      // Determine event date fields (required by check_date_fields constraint)
      const useMultiDay = Math.random() < 0.2 // 20% multi-day events
      const eventStartDate = expectedCloseDate

      const oppData: any = {
        tenant_id: dataSourceTenantId,
        account_id: account.id,
        contact_id: contact?.id || null,
        name: `${account.name} - ${random(['Annual Event', 'Corporate Meeting', 'Wedding', 'Holiday Party', 'Conference', 'Trade Show', 'Gala', 'Fundraiser'])}`,
        stage,
        amount,
        probability,
        expected_close_date: expectedCloseDate.toISOString().split('T')[0],
        description: `${random(['Photo booth rental', 'DJ services', 'Full event production', 'A/V services', 'Event coordination'])} for ${random(['corporate event', 'wedding', 'conference', 'private party', 'fundraiser'])}`,
        event_type: random(eventTypes),
        date_type: useMultiDay ? 'multiple' : 'single',
        event_date: useMultiDay ? null : eventStartDate.toISOString().split('T')[0],
        initial_date: useMultiDay ? eventStartDate.toISOString().split('T')[0] : null,
        final_date: useMultiDay ? new Date(eventStartDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
        created_at: createdAt.toISOString()
      }

      // Add actual close date for closed opportunities
      if (stage === 'closed_won' || stage === 'closed_lost') {
        oppData.actual_close_date = expectedCloseDate.toISOString().split('T')[0]
      }

      opportunitiesData.push(oppData)
    }

    const { data: opportunities, error: opportunitiesError } = await supabase
      .from('opportunities')
      .insert(opportunitiesData)
      .select()

    if (opportunitiesError) throw opportunitiesError
    log.debug('Created ${opportunities?.length} opportunities')

    // STEP 5: Create Events (from won opportunities, 25 max)
    log.debug('Creating events...')
    const wonOpportunities = opportunities?.filter(o => o.stage === 'closed_won') || []
    const eventsToCreate = Math.min(25, wonOpportunities.length)

    const eventsData = []
    for (let i = 0; i < eventsToCreate; i++) {
      const opp = wonOpportunities[i]
      const startDate = randomDate(sixMonthsAgo, sixMonthsFromNow)
      const isPast = startDate < now
      const isMultiDay = Math.random() < 0.3 // 30% chance of multi-day event
      const endDate = isMultiDay ? new Date(startDate.getTime() + (Math.floor(Math.random() * 3) + 1) * 24 * 60 * 60 * 1000) : null

      let status = 'confirmed'
      if (isPast) status = random(['completed', 'completed', 'completed', 'cancelled'])
      else status = random(['scheduled', 'confirmed', 'confirmed', 'confirmed'])

      const eventData: any = {
        tenant_id: dataSourceTenantId,
        opportunity_id: opp.id,
        account_id: opp.account_id,
        contact_id: opp.contact_id,
        title: opp.name,
        event_type: random(eventTypes),
        start_date: startDate.toISOString(),
        end_date: endDate ? endDate.toISOString() : null,
        location: `${random(['Grand Ballroom', 'Convention Center', 'Hotel Ballroom', 'Outdoor Venue', 'Private Estate', 'Corporate Office', 'Community Center'])} - ${random(cities).city}`,
        status,
        description: opp.description,
        payment_status: random(['Unpaid', 'Deposit Paid', 'Paid in Full', 'Refunded']),
        created_at: opp.created_at
      }

      eventsData.push(eventData)
    }

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .insert(eventsData)
      .select()

    if (eventsError) throw eventsError
    log.debug('Created ${events?.length} events')

    // STEP 6: Create Invoices (from events, 20 max)
    log.debug('Creating invoices...')
    const invoicesToCreate = Math.min(20, events?.length || 0)
    const invoiceStatuses = [
      ...Array(8).fill('paid'),
      ...Array(6).fill('sent'),
      ...Array(4).fill('overdue'),
      ...Array(2).fill('cancelled')
    ]

    const invoicesData = []
    for (let i = 0; i < invoicesToCreate; i++) {
      const event = events![i]
      const status = random(invoiceStatuses)
      const issueDate = new Date(event.created_at)
      const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000)

      // Generate realistic amounts
      const subtotal = Math.floor(Math.random() * 8000 + 2000) // $2k-$10k
      const taxAmount = Math.floor(subtotal * 0.08) // 8% tax
      const totalAmount = subtotal + taxAmount

      const invoiceData: any = {
        tenant_id: dataSourceTenantId,
        event_id: event.id,
        opportunity_id: event.opportunity_id,
        account_id: event.account_id,
        invoice_number: `INV-${String(10000 + i).padStart(6, '0')}`,
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status,
        notes: `Invoice for ${event.title}`,
        created_at: issueDate.toISOString()
      }

      invoicesData.push(invoiceData)
    }

    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .insert(invoicesData)
      .select()

    if (invoicesError) throw invoicesError
    log.debug('Created ${invoices?.length} invoices')

    // STEP 7: Create Quotes (from open opportunities, 12 max)
    log.debug('Creating quotes...')
    const openOpportunities = opportunities?.filter(o => isOpenStage(o.stage)) || []
    const quotesToCreate = Math.min(12, openOpportunities.length)
    const quoteStatuses = [
      ...Array(5).fill('accepted'),
      ...Array(5).fill('sent'),
      ...Array(2).fill('declined')
    ]

    const quotesData = []
    for (let i = 0; i < quotesToCreate; i++) {
      const opp = openOpportunities[i]
      const status = random(quoteStatuses)
      const issueDate = new Date(opp.created_at)
      const validUntil = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000)

      // Generate realistic amounts
      const subtotal = opp.amount || Math.floor(Math.random() * 8000 + 2000)
      const taxRate = 0.08 // 8%
      const taxAmount = Math.floor(subtotal * taxRate)
      const totalAmount = subtotal + taxAmount

      quotesData.push({
        tenant_id: dataSourceTenantId,
        opportunity_id: opp.id,
        account_id: opp.account_id,
        contact_id: opp.contact_id,
        quote_number: `QUO-${String(20000 + i).padStart(6, '0')}`,
        title: opp.name,
        issue_date: issueDate.toISOString().split('T')[0],
        valid_until: validUntil.toISOString().split('T')[0],
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status,
        notes: `Quote for ${opp.name}`,
        created_at: issueDate.toISOString()
      })
    }

    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .insert(quotesData)
      .select()

    if (quotesError) throw quotesError
    log.debug('Created ${quotes?.length} quotes')

    // Return summary
    return NextResponse.json({
      success: true,
      summary: {
        leads: leads?.length || 0,
        accounts: accounts?.length || 0,
        contacts: contacts?.length || 0,
        opportunities: opportunities?.length || 0,
        events: events?.length || 0,
        invoices: invoices?.length || 0,
        quotes: quotes?.length || 0,
        total: (leads?.length || 0) + (accounts?.length || 0) + (contacts?.length || 0) +
               (opportunities?.length || 0) + (events?.length || 0) + (invoices?.length || 0) + (quotes?.length || 0)
      },
      message: 'Seed data created successfully! 🎉'
    })

  } catch (error: any) {
    log.error({ error }, 'Seed data error')
    return NextResponse.json({
      error: error.message || 'Failed to create seed data',
      details: error
    }, { status: 500 })
  }
}

// DELETE endpoint to clean up all seed data (optional, for testing)
export async function DELETE() {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    // Delete in reverse order to respect foreign key constraints
    await supabase.from('quotes').delete().eq('tenant_id', dataSourceTenantId)
    await supabase.from('invoices').delete().eq('tenant_id', dataSourceTenantId)
    await supabase.from('events').delete().eq('tenant_id', dataSourceTenantId)
    await supabase.from('opportunities').delete().eq('tenant_id', dataSourceTenantId)
    await supabase.from('contacts').delete().eq('tenant_id', dataSourceTenantId)
    await supabase.from('accounts').delete().eq('tenant_id', dataSourceTenantId)
    await supabase.from('leads').delete().eq('tenant_id', dataSourceTenantId)

    return NextResponse.json({
      success: true,
      message: 'All data deleted successfully'
    })

  } catch (error: any) {
    log.error({ error }, 'Delete error')
    return NextResponse.json({
      error: error.message || 'Failed to delete data'
    }, { status: 500 })
  }
}
