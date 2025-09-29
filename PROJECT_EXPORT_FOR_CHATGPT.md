# Supabase CRM App - Project Export for ChatGPT/Claude

## 🚨 **CURRENT ISSUE**
Authentication is not working due to RLS (Row Level Security) policies blocking access to `tenants` and `users` tables during login.

## 📁 **Project Structure**
```
supabase-crm-app/
├── src/
│   ├── app/                    # Next.js 15 app router
│   ├── components/             # React components
│   ├── lib/                    # Utilities and configurations
│   └── types/                  # TypeScript types
├── supabase/
│   └── migrations/             # Database migrations
└── package.json               # Dependencies
```

## 🔧 **Key Files for Authentication Issue**

### 1. Authentication Configuration
**File**: `src/lib/auth.ts`
```typescript
// NextAuth configuration with CredentialsProvider
// Uses Supabase client to query tenants and users tables
// Currently failing due to RLS policies blocking access during login
```

### 2. Database Schema
**Current RLS Policies** (from your CSV):
- `tenants`: `tenant_isolation_tenants` - requires JWT with tenant_id
- `users`: `tenant_isolation_users` - requires JWT with tenant_id
- **Problem**: During login, no JWT exists, so policies block access

### 3. Migration Attempts
**Files created but not working**:
- `supabase/migrations/20250122000004_fix_auth_rls_policies.sql`
- `supabase/migrations/20250122000003_minimal_rls_fix.sql`
- `supabase/migrations/20250122000002_simplified_rls_fix.sql`

## 🎯 **Specific Problem**
1. **RLS policies** on `tenants` and `users` tables require `auth.jwt() ->> 'tenant_id'`
2. **During login**, no JWT exists yet, so policies block access
3. **Authentication fails** because Supabase client can't query these tables
4. **Error**: Likely "permission denied" or similar RLS-related error

## 🔍 **What We've Tried**
1. ✅ Created migrations to fix RLS policies
2. ✅ Attempted to allow access when `auth.jwt() IS NULL`
3. ✅ Tried disabling RLS temporarily
4. ❌ **None of the migrations have been successfully applied**

## 📊 **Current Database State**
- **Tables exist**: `tenants`, `users`, `accounts`, `contacts`, `leads`, `opportunities`, `events`
- **RLS enabled**: On all tables
- **Policies**: All require JWT with tenant_id
- **Default data**: May or may not exist

## 🚀 **What ChatGPT/Claude Needs to Do**
1. **Diagnose current RLS state** using the diagnostic script
2. **Create a working migration** that allows authentication
3. **Fix the RLS policies** to allow access during login
4. **Ensure default tenant/user data exists**

## 📋 **Diagnostic Script to Run First**
```sql
-- Run this in Supabase SQL Editor to see current state
SELECT 'RLS Status and Policies:' as info;
SELECT 
    t.tablename,
    t.rowsecurity as rls_enabled,
    p.policyname,
    p.cmd,
    p.qual
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public' 
AND t.tablename IN ('users', 'tenants')
ORDER BY t.tablename, p.policyname;

-- Test data access
SELECT 'Tenant count:' as test, COUNT(*) as result FROM tenants;
SELECT 'User count:' as test, COUNT(*) as result FROM users;
```

## 🔑 **Expected Login Credentials**
- **Email**: `admin@default.com`
- **Password**: `password123`
- **Company**: `default`

## 🌐 **Environment**
- **Local**: http://localhost:3001
- **Vercel**: Auto-deploys from GitHub
- **Supabase**: Backend database with RLS enabled

---

**Please help fix the RLS authentication issue so users can log in!**
