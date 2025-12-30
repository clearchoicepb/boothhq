import Stripe from 'stripe'
import { createLogger } from '@/lib/logger'

const log = createLogger('lib')

// Global fallback Stripe instance (uses env var if no tenant key provided)
// This is only used as a fallback - prefer getTenantStripe() for tenant-specific instances
let globalStripe: Stripe | null = null

if (process.env.STRIPE_SECRET_KEY) {
  globalStripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
    typescript: true,
  })
}

export const stripe = globalStripe

/**
 * Get a Stripe instance for a specific tenant using their configured keys
 * Falls back to global env var if tenant doesn't have Stripe configured
 */
export function getTenantStripe(tenantSecretKey?: string): Stripe {
  if (tenantSecretKey) {
    return new Stripe(tenantSecretKey, {
      apiVersion: '2025-08-27.basil',
      typescript: true,
    })
  }

  if (!globalStripe) {
    throw new Error('Stripe is not configured. Please add Stripe keys in Settings > Payments or set STRIPE_SECRET_KEY environment variable.')
  }

  return globalStripe
}

/**
 * Fetch tenant Stripe configuration from settings
 * Returns both secret and publishable keys for the tenant
 */
export async function getTenantStripeConfig(supabase: any, tenantId: string): Promise<{
  secretKey?: string
  publishableKey?: string
}> {
  try {
    // Check all possible locations for Stripe settings:
    // 1. Integrations page (current): integrations.thirdPartyIntegrations.stripe.* (preferred)
    // 2. Legacy Integrations page: thirdPartyIntegrations.stripe.*
    // 3. Payment Gateways page: stripe.* (legacy, for backwards compatibility)
    const { data: settings, error } = await supabase
      .from('tenant_settings')
      .select('setting_key, setting_value')
      .eq('tenant_id', tenantId)
      .in('setting_key', [
        'integrations.thirdPartyIntegrations.stripe.secretKey',
        'integrations.thirdPartyIntegrations.stripe.publishableKey',
        'thirdPartyIntegrations.stripe.secretKey',
        'thirdPartyIntegrations.stripe.publishableKey',
        'stripe.secretKey',
        'stripe.publishableKey'
      ])

    if (error) {
      log.error({ error }, 'Error fetching Stripe settings')
      // Fall back to environment variables
      return {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      }
    }

    const config: { secretKey?: string; publishableKey?: string } = {}

    // Priority order for keys (first match wins):
    // 1. integrations.thirdPartyIntegrations.stripe.* (current UI path)
    // 2. thirdPartyIntegrations.stripe.* (legacy)
    // 3. stripe.* (oldest legacy)
    const secretKeyPriority = [
      'integrations.thirdPartyIntegrations.stripe.secretKey',
      'thirdPartyIntegrations.stripe.secretKey',
      'stripe.secretKey'
    ]
    const publishableKeyPriority = [
      'integrations.thirdPartyIntegrations.stripe.publishableKey',
      'thirdPartyIntegrations.stripe.publishableKey',
      'stripe.publishableKey'
    ]

    // Create a map of setting_key -> value for easy lookup
    const settingsMap = new Map<string, string>()
    settings?.forEach((setting: any) => {
      // Handle JSONB values - they might be strings wrapped in quotes
      let value = setting.setting_value

      // If it's a string (from JSONB), use it directly
      // If it's an object with a string property, extract it
      if (typeof value === 'string') {
        // value is already a string
      } else if (value && typeof value === 'object' && typeof value.value === 'string') {
        value = value.value
      }

      if (value) {
        settingsMap.set(setting.setting_key, value)
      }
    })

    // Find secret key using priority order
    for (const key of secretKeyPriority) {
      const value = settingsMap.get(key)
      if (value) {
        config.secretKey = value
        break
      }
    }

    // Find publishable key using priority order
    for (const key of publishableKeyPriority) {
      const value = settingsMap.get(key)
      if (value) {
        config.publishableKey = value
        break
      }
    }

    // Fallback to environment variables if not found in settings
    if (!config.secretKey && process.env.STRIPE_SECRET_KEY) {
      log.debug('Using fallback secret key from environment')
      config.secretKey = process.env.STRIPE_SECRET_KEY
    }
    if (!config.publishableKey && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      log.debug('Using fallback publishable key from environment')
      config.publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    }

    return config
  } catch (error) {
    log.error({ error }, 'Exception in getTenantStripeConfig')
    // Return environment variables as ultimate fallback
    return {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    }
  }
}

export const formatAmountForStripe = (amount: number, currency: string): number => {
  const numberFormat = new Intl.NumberFormat(['en-US'], {
    style: 'currency',
    currency: currency,
    currencyDisplay: 'symbol',
  })
  const parts = numberFormat.formatToParts(amount)
  let zeroDecimalCurrency = true
  for (const part of parts) {
    if (part.type === 'decimal') {
      zeroDecimalCurrency = false
    }
  }
  return zeroDecimalCurrency ? amount : Math.round(amount * 100)
}

export const formatAmountFromStripe = (amount: number, currency: string): number => {
  const numberFormat = new Intl.NumberFormat(['en-US'], {
    style: 'currency',
    currency: currency,
    currencyDisplay: 'symbol',
  })
  const parts = numberFormat.formatToParts(100)
  let zeroDecimalCurrency = true
  for (const part of parts) {
    if (part.type === 'decimal') {
      zeroDecimalCurrency = false
    }
  }
  return zeroDecimalCurrency ? amount : amount / 100
}






