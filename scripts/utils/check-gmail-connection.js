const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkConnection() {
  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('integration_type', 'gmail');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Gmail connections found:', data.length);
    data.forEach(conn => {
      console.log({
        user_id: conn.user_id,
        email: conn.settings?.email,
        is_connected: conn.is_connected,
        created_at: conn.created_at
      });
    });
  }
}

checkConnection().then(() => process.exit(0));
