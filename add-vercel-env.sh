#!/bin/bash

# Add environment variables to Vercel
# Run this script to quickly add all required environment variables

echo "🔧 Adding environment variables to Vercel..."

# Supabase Configuration
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add DATABASE_URL production

# NextAuth Configuration
vercel env add NEXTAUTH_URL production
vercel env add NEXTAUTH_SECRET production

# Stripe Configuration
vercel env add STRIPE_SECRET_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production

# Company Information
vercel env add COMPANY_NAME production
vercel env add COMPANY_ADDRESS production
vercel env add COMPANY_PHONE production

echo "✅ Environment variables added!"
echo "🚀 Now redeploy your application:"
echo "   vercel --prod"
