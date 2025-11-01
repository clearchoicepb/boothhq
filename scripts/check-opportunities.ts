import { createClient } from '@supabase/supabase-js'

async function checkOpportunities() {
  // Connect to tenant data database
  const supabaseUrl = process.env.TENANT_DATA_SOURCE_URL || ''
  const supabaseKey = process.env.TENANT_DATA_SOURCE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing TENANT_DATA_SOURCE_URL or TENANT_DATA_SOURCE_ANON_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Get all opportunities with related data
  const { data: opportunities, error } = await supabase
    .from('opportunities')
    .select(`
      id,
      name,
      stage,
      status,
      owner_id,
      tenant_id,
      created_at,
      accounts!opportunities_account_id_fkey(name),
      contacts!opportunities_contact_id_fkey(first_name, last_name),
      leads!opportunities_lead_id_fkey(first_name, last_name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching opportunities:', error)
    process.exit(1)
  }

  console.log(`\nFound ${opportunities?.length || 0} opportunities:\n`)

  opportunities?.forEach((opp: any) => {
    const contactName = opp.contacts ?
      `${opp.contacts.first_name} ${opp.contacts.last_name}`.trim() : null
    const leadName = opp.leads ?
      `${opp.leads.first_name} ${opp.leads.last_name}`.trim() : null
    const accountName = opp.accounts?.name

    console.log(`ID: ${opp.id}`)
    console.log(`  Name: ${opp.name}`)
    console.log(`  Account: ${accountName || 'N/A'}`)
    console.log(`  Contact: ${contactName || 'N/A'}`)
    console.log(`  Lead: ${leadName || 'N/A'}`)
    console.log(`  Stage: ${opp.stage || 'N/A'}`)
    console.log(`  Status: ${opp.status || 'N/A'}`)
    console.log(`  Owner ID: ${opp.owner_id || 'unassigned'}`)
    console.log(`  Tenant ID: ${opp.tenant_id}`)
    console.log(`  Created: ${opp.created_at}`)
    console.log('')
  })

  // Look specifically for "Natalee Carter"
  const nataleeOpps = opportunities?.filter((opp: any) => {
    const name = opp.name?.toLowerCase() || ''
    const contactName = opp.contacts ?
      `${opp.contacts.first_name} ${opp.contacts.last_name}`.toLowerCase().trim() : ''
    const leadName = opp.leads ?
      `${opp.leads.first_name} ${opp.leads.last_name}`.toLowerCase().trim() : ''
    const accountName = opp.accounts?.name?.toLowerCase() || ''

    return name.includes('natalee') || name.includes('carter') ||
           contactName.includes('natalee') || contactName.includes('carter') ||
           leadName.includes('natalee') || leadName.includes('carter') ||
           accountName.includes('natalee') || accountName.includes('carter')
  })

  if (nataleeOpps && nataleeOpps.length > 0) {
    console.log(`\n=== Found ${nataleeOpps.length} opportunity/ies matching "Natalee Carter" ===\n`)
    nataleeOpps.forEach((opp: any) => {
      console.log(JSON.stringify(opp, null, 2))
    })
  } else {
    console.log('\n=== No opportunities found matching "Natalee Carter" ===')
  }
}

checkOpportunities()
