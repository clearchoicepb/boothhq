const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://djeeircaeqdvfgkczrwx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZWVpcmNhZXFkdmZna2N6cnd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDAxMTYxNiwiZXhwIjoyMDY5NTg3NjE2fQ.0LwVknWkncwTkvK7Jtp4zqmN7Lurrk8H8ZPvGerlVrw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixUserSchema() {
  try {
    console.log('🔧 Fixing user schema...')
    
    // Get a tenant ID
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id')
      .limit(1)
    
    if (!tenants || tenants.length === 0) {
      console.log('❌ No tenants found')
      return
    }
    
    const tenantId = tenants[0].id
    console.log('Using tenant ID:', tenantId)
    
    // Try to create a user with all the fields that should exist
    const userData = {
      email: 'admin@default.com',
      password_hash: 'password123',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      phone: '',
      is_active: true,
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      zip_code: '',
      job_title: '',
      department: '',
      employee_type: 'W2',
      pay_rate: 0,
      payroll_info: {},
      hire_date: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      tenant_id: tenantId
    }
    
    console.log('Creating user with data:', userData)
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single()
    
    if (createError) {
      console.error('❌ User creation failed:', createError)
      console.log('Error details:', {
        code: createError.code,
        message: createError.message,
        details: createError.details,
        hint: createError.hint
      })
      
      // Try with minimal fields to see what works
      console.log('\n🔄 Trying with minimal fields...')
      const minimalData = {
        email: 'admin@default.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        tenant_id: tenantId
      }
      
      const { data: minimalUser, error: minimalError } = await supabase
        .from('users')
        .insert(minimalData)
        .select()
        .single()
      
      if (minimalError) {
        console.error('❌ Minimal user creation also failed:', minimalError)
      } else {
        console.log('✅ Minimal user created successfully:', minimalUser)
        
        // Now try to update it with the missing fields
        console.log('\n🔄 Trying to update with additional fields...')
        const { error: updateError } = await supabase
          .from('users')
          .update({
            password_hash: 'password123',
            phone: '',
            is_active: true
          })
          .eq('id', minimalUser.id)
        
        if (updateError) {
          console.error('❌ Update failed:', updateError)
        } else {
          console.log('✅ User updated successfully')
        }
      }
    } else {
      console.log('✅ User created successfully:', newUser.email)
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

fixUserSchema()
