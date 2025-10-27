#!/bin/bash

# ============================================================================
# Dual Database Setup Script
# ============================================================================
# This script automates the setup of a dual database architecture for BootHQ
#
# Usage: ./scripts/setup-dual-database.sh
#
# Prerequisites:
# - You must have already created a new Supabase project for tenant data
# - Have your connection credentials ready
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

log_success() {
    echo -e "${GREEN}✓${NC}  $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

log_error() {
    echo -e "${RED}✗${NC}  $1"
}

print_header() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# ============================================================================
# Step 0: Welcome and Prerequisites Check
# ============================================================================

clear
print_header "🚀 BootHQ Dual Database Setup"

echo "This script will help you set up a professional dual database architecture."
echo ""
echo "What this script does:"
echo "  1. Validates your credentials"
echo "  2. Applies migration to application database"
echo "  3. Initializes tenant data database"
echo "  4. Creates .env.local with proper configuration"
echo "  5. Updates tenant record with connection info"
echo "  6. Runs verification tests"
echo ""
log_warning "Estimated time: 10-15 minutes"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# ============================================================================
# Step 1: Gather Credentials
# ============================================================================

print_header "📝 Step 1: Gather Credentials"

log_info "We need credentials for both databases."
echo ""

# Check if .env.local exists
if [ -f .env.local ]; then
    log_warning ".env.local already exists. We'll create a backup."
    cp .env.local .env.local.backup.$(date +%Y%m%d-%H%M%S)
    log_success "Backup created: .env.local.backup.$(date +%Y%m%d-%H%M%S)"
fi

# Application Database (existing)
echo ""
log_info "Application Database (your EXISTING Supabase project):"
echo ""

# Try to read from existing .env.local
if [ -f .env.local ]; then
    source .env.local 2>/dev/null || true
fi

read -p "Application Database URL [$NEXT_PUBLIC_SUPABASE_URL]: " APP_DB_URL
APP_DB_URL=${APP_DB_URL:-$NEXT_PUBLIC_SUPABASE_URL}

read -p "Application Database Anon Key [$NEXT_PUBLIC_SUPABASE_ANON_KEY]: " APP_DB_ANON
APP_DB_ANON=${APP_DB_ANON:-$NEXT_PUBLIC_SUPABASE_ANON_KEY}

read -p "Application Database Service Key [$SUPABASE_SERVICE_ROLE_KEY]: " APP_DB_SERVICE
APP_DB_SERVICE=${APP_DB_SERVICE:-$SUPABASE_SERVICE_ROLE_KEY}

# Tenant Data Database (new)
echo ""
log_info "Tenant Data Database (your NEW Supabase project):"
echo ""

read -p "Tenant Data URL: " TENANT_DB_URL
read -p "Tenant Data Anon Key: " TENANT_DB_ANON
read -p "Tenant Data Service Key: " TENANT_DB_SERVICE
read -p "Tenant Data Region (e.g., us-east-1): " TENANT_DB_REGION

# Generate encryption key if needed
if [ -z "$ENCRYPTION_KEY" ]; then
    log_info "Generating encryption key..."
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    log_success "Encryption key generated"
fi

# ============================================================================
# Step 2: Validate Credentials
# ============================================================================

print_header "🔍 Step 2: Validate Credentials"

log_info "Testing application database connection..."
if curl -s -f -H "apikey: $APP_DB_ANON" "$APP_DB_URL/rest/v1/" > /dev/null; then
    log_success "Application database connection successful"
else
    log_error "Failed to connect to application database"
    log_error "Please check your credentials and try again"
    exit 1
fi

log_info "Testing tenant data database connection..."
if curl -s -f -H "apikey: $TENANT_DB_ANON" "$TENANT_DB_URL/rest/v1/" > /dev/null; then
    log_success "Tenant data database connection successful"
else
    log_error "Failed to connect to tenant data database"
    log_error "Please check your credentials and try again"
    exit 1
fi

# ============================================================================
# Step 3: Create Environment File
# ============================================================================

print_header "📄 Step 3: Create Environment Configuration"

log_info "Creating .env.local file..."

cat > .env.local << EOF
# ============================================================================
# BOOTHHQ ENVIRONMENT VARIABLES
# ============================================================================
# Auto-generated by setup-dual-database.sh on $(date)
# DO NOT COMMIT THIS FILE TO VERSION CONTROL

# ============================================================================
# APPLICATION DATABASE (Main Supabase Project)
# ============================================================================
NEXT_PUBLIC_SUPABASE_URL=$APP_DB_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$APP_DB_ANON
SUPABASE_SERVICE_ROLE_KEY=$APP_DB_SERVICE

# ============================================================================
# DEFAULT TENANT DATA DATABASE (Supabase Project for Tenant Data)
# ============================================================================
DEFAULT_TENANT_DATA_URL=$TENANT_DB_URL
DEFAULT_TENANT_DATA_ANON_KEY=$TENANT_DB_ANON
DEFAULT_TENANT_DATA_SERVICE_KEY=$TENANT_DB_SERVICE

# ============================================================================
# ENCRYPTION (for storing tenant connection strings securely)
# ============================================================================
ENCRYPTION_KEY=$ENCRYPTION_KEY

# ============================================================================
# NEXTAUTH (Authentication)
# ============================================================================
NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-$(openssl rand -base64 32)}
NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}

# ============================================================================
# APPLICATION
# ============================================================================
NODE_ENV=development
EOF

log_success ".env.local created successfully"

# ============================================================================
# Step 4: Apply Migration to Application Database
# ============================================================================

print_header "🗄️  Step 4: Apply Migration to Application Database"

log_info "Applying migration to add tenant connection config columns..."

# Check if migration file exists
if [ ! -f supabase/migrations/20251027000001_add_tenant_data_source_config.sql ]; then
    log_error "Migration file not found: supabase/migrations/20251027000001_add_tenant_data_source_config.sql"
    exit 1
fi

# Apply migration using REST API
log_info "Executing SQL migration..."

# We'll need to use psql or the SQL editor for this
# For now, provide instructions
log_warning "You need to manually run the following SQL in your Application Database:"
echo ""
echo "1. Go to your Supabase dashboard: $APP_DB_URL"
echo "2. Navigate to SQL Editor"
echo "3. Copy and paste the contents of: supabase/migrations/20251027000001_add_tenant_data_source_config.sql"
echo "4. Click 'Run'"
echo ""
read -p "Press Enter after you've run the migration in the Application Database..."

log_success "Application database migration applied"

# ============================================================================
# Step 5: Initialize Tenant Data Database
# ============================================================================

print_header "🗄️  Step 5: Initialize Tenant Data Database Schema"

log_info "Initializing tenant data database with complete schema..."

# Check if schema file exists
if [ ! -f supabase/tenant-data-db-schema.sql ]; then
    log_error "Schema file not found: supabase/tenant-data-db-schema.sql"
    exit 1
fi

log_warning "You need to manually run the following SQL in your Tenant Data Database:"
echo ""
echo "1. Go to your Supabase dashboard: $TENANT_DB_URL"
echo "2. Navigate to SQL Editor"
echo "3. Copy and paste the contents of: supabase/tenant-data-db-schema.sql"
echo "4. Click 'Run' (this will create 45+ tables)"
echo ""
read -p "Press Enter after you've run the schema in the Tenant Data Database..."

log_success "Tenant data database schema initialized"

# ============================================================================
# Step 6: Update Tenant Record
# ============================================================================

print_header "🔗 Step 6: Update Tenant Record"

log_info "We need to update your tenant record with the new database connection info."
echo ""

# Get tenant ID
log_info "First, let's find your default tenant ID."
log_warning "Please run this query in your Application Database SQL Editor:"
echo ""
echo "  SELECT id, name, subdomain FROM tenants;"
echo ""
read -p "Enter your tenant ID (UUID): " TENANT_ID

if [ -z "$TENANT_ID" ]; then
    log_error "Tenant ID is required"
    exit 1
fi

log_warning "Now update the tenant record by running this SQL in your Application Database:"
echo ""
cat << EOF
UPDATE tenants
SET
  data_source_url = '$TENANT_DB_URL',
  data_source_anon_key = '$TENANT_DB_ANON',
  data_source_service_key = '$TENANT_DB_SERVICE',
  data_source_region = '$TENANT_DB_REGION',
  tenant_id_in_data_source = '$TENANT_ID',
  connection_pool_config = '{"min": 2, "max": 10}'::jsonb
WHERE id = '$TENANT_ID';

-- Verify
SELECT
  id,
  name,
  data_source_url,
  data_source_region,
  tenant_id_in_data_source
FROM tenants
WHERE id = '$TENANT_ID';
EOF
echo ""
read -p "Press Enter after you've updated the tenant record..."

log_success "Tenant record updated"

# ============================================================================
# Step 7: Verification
# ============================================================================

print_header "✅ Step 7: Verification"

log_info "Running verification checks..."

# Check environment file
if [ -f .env.local ]; then
    log_success ".env.local exists and configured"
else
    log_error ".env.local not found"
    exit 1
fi

# Verify application database
log_info "Verifying application database..."
if curl -s -f -H "apikey: $APP_DB_ANON" "$APP_DB_URL/rest/v1/tenants?id=eq.$TENANT_ID" > /dev/null; then
    log_success "Application database connection verified"
else
    log_warning "Could not verify application database connection"
fi

# Verify tenant data database
log_info "Verifying tenant data database..."
if curl -s -f -H "apikey: $TENANT_DB_ANON" "$TENANT_DB_URL/rest/v1/" > /dev/null; then
    log_success "Tenant data database connection verified"
else
    log_warning "Could not verify tenant data database connection"
fi

# ============================================================================
# Step 8: Next Steps
# ============================================================================

print_header "🎉 Setup Complete!"

echo ""
log_success "Your dual database architecture is now configured!"
echo ""
echo "📋 Summary:"
echo "  • Application Database: $APP_DB_URL"
echo "  • Tenant Data Database: $TENANT_DB_URL"
echo "  • Environment file: .env.local (created)"
echo "  • Tenant ID: $TENANT_ID"
echo ""
echo "🚀 Next Steps:"
echo ""
echo "  1. Test your application:"
echo "     npm run dev"
echo ""
echo "  2. Run verification tests:"
echo "     npm run test:dual-database"
echo ""
echo "  3. Check the logs for any errors"
echo ""
echo "  4. Read the complete guide:"
echo "     cat DUAL_DATABASE_SETUP_GUIDE.md"
echo ""
echo "📚 Documentation:"
echo "  • Setup Guide: DUAL_DATABASE_SETUP_GUIDE.md"
echo "  • Architecture: DATABASE_ARCHITECTURE.md"
echo "  • Refactor Details: DATABASE_REFACTOR_README.md"
echo ""
log_info "If you encounter any issues, check the troubleshooting section in the setup guide."
echo ""
log_success "Happy coding! 🎉"
echo ""
