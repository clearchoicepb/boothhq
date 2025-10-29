#!/usr/bin/env node

/**
 * Check Event Dates in Tenant DB
 * 
 * Diagnoses why events might not be showing in the list view
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const TENANT_ID = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

const tenantDb = createClient(
  process.env.DEFAULT_TENANT_DATA_URL,
  process.env.DEFAULT_TENANT_DATA_SERVICE_KEY
);

function box(title) {
  const width = 80;
  console.log('\n' + '═'.repeat(width));
  console.log(title);
  console.log('═'.repeat(width));
}

function formatDate(dateString) {
  if (!dateString) return 'No date';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    weekday: 'short'
  });
}

function getDaysFromToday(dateString) {
  if (!dateString) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const eventDate = new Date(dateString);
  eventDate.setHours(0, 0, 0, 0);
  
  const diffTime = eventDate.getTime() - today.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

function getDateStatus(dateString) {
  const days = getDaysFromToday(dateString);
  
  if (days === null) return '⚪ No Date';
  if (days < 0) return `🔴 Past (${Math.abs(days)} days ago)`;
  if (days === 0) return '🟢 Today';
  if (days <= 7) return `🟡 This Week (in ${days} days)`;
  return `🔵 Future (in ${days} days)`;
}

async function main() {
  box('EVENT DATES DIAGNOSTIC');
  
  console.log('\n📅 Today:', formatDate(new Date().toISOString()));
  console.log(`🔍 Tenant ID: ${TENANT_ID}\n`);

  // Fetch all events from Tenant DB
  const { data: events, error } = await tenantDb
    .from('events')
    .select('id, title, start_date, end_date, status, event_type, created_at')
    .eq('tenant_id', TENANT_ID)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('❌ Error fetching events:', error.message);
    return;
  }

  if (!events || events.length === 0) {
    console.log('⚠️  No events found in Tenant DB');
    return;
  }

  box(`FOUND ${events.length} EVENTS`);

  // Categorize events
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pastEvents = [];
  const todayEvents = [];
  const upcomingEvents = [];
  const noDateEvents = [];

  events.forEach(event => {
    if (!event.start_date) {
      noDateEvents.push(event);
    } else {
      const eventDate = new Date(event.start_date);
      eventDate.setHours(0, 0, 0, 0);
      
      if (eventDate < today) {
        pastEvents.push(event);
      } else if (eventDate.getTime() === today.getTime()) {
        todayEvents.push(event);
      } else {
        upcomingEvents.push(event);
      }
    }
  });

  // Display summary
  console.log('\n📊 Event Summary:');
  console.log(`   🔴 Past Events: ${pastEvents.length}`);
  console.log(`   🟢 Today's Events: ${todayEvents.length}`);
  console.log(`   🔵 Upcoming Events: ${upcomingEvents.length}`);
  console.log(`   ⚪ No Date: ${noDateEvents.length}`);

  // Display all events
  box('ALL EVENTS (by date)');
  
  console.log('');
  events.forEach((event, idx) => {
    const days = getDaysFromToday(event.start_date);
    const status = getDateStatus(event.start_date);
    
    console.log(`${idx + 1}. ${event.title || 'Untitled'}`);
    console.log(`   ${status}`);
    console.log(`   Start: ${formatDate(event.start_date)}`);
    if (event.end_date) {
      console.log(`   End: ${formatDate(event.end_date)}`);
    }
    console.log(`   Status: ${event.status || 'unknown'}`);
    console.log(`   Type: ${event.event_type || 'unknown'}`);
    console.log(`   Created: ${formatDate(event.created_at)}`);
    console.log(`   ID: ${event.id.substring(0, 8)}...`);
    console.log('');
  });

  // Explain the filter issue
  box('EVENTS LIST PAGE DEFAULT FILTER ANALYSIS');
  
  console.log('\n🔍 The events list page defaults to "upcoming" filter');
  console.log('   This filter shows only events where start_date >= today\n');
  
  if (upcomingEvents.length === 0 && todayEvents.length === 0) {
    console.log('❌ ISSUE FOUND: All events are in the past!');
    console.log('   This is why the events list shows 0 events.');
    console.log('\n💡 Solutions:');
    console.log('   1. Change the filter to "All" or "Past" to see the events');
    console.log('   2. Update the event dates to future dates');
    console.log('   3. Change the default filter from "upcoming" to "all"');
  } else {
    console.log('✅ You have future/today events that should be visible');
    console.log(`   Expected to see: ${upcomingEvents.length + todayEvents.length} event(s)`);
    console.log('\n   If you still see 0 events, the issue might be:');
    console.log('   - Browser cache (try hard refresh: Cmd+Shift+R)');
    console.log('   - React Query cache (check browser dev tools)');
    console.log('   - Status filter (make sure it\'s set to "all")');
  }

  // Check status filter compatibility
  box('STATUS FILTER CHECK');
  
  const statusCounts = events.reduce((acc, event) => {
    const status = event.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  console.log('\n📊 Events by Status:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count} event(s)`);
  });

  console.log('\n💡 Available status filters in the UI:');
  console.log('   - all, scheduled, confirmed, in_progress, completed, cancelled, postponed');
  
  const nonStandardStatuses = Object.keys(statusCounts).filter(
    status => !['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'postponed'].includes(status)
  );

  if (nonStandardStatuses.length > 0) {
    console.log(`\n⚠️  Found non-standard statuses: ${nonStandardStatuses.join(', ')}`);
    console.log('   These might not match the filter dropdown options');
  }

  console.log('\n');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  console.error(err);
  process.exit(1);
});

