'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useTenant } from './tenant-context'

interface SettingsContextType {
  settings: Record<string, any>
  loading: boolean
  error: string | null
  updateSettings: (newSettings: Record<string, any>) => Promise<void>
  getSetting: (key: string, defaultValue?: any) => any
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const { tenant, loading: tenantLoading } = useTenant()
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = async () => {
    if (!tenant?.id) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/settings')
      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }
      
      const data = await response.json()
      setSettings(data.settings || {})
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch settings')
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (newSettings: Record<string, any>) => {
    if (!tenant?.id) return

    try {
      setError(null)
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: newSettings }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save settings')
      }
      
      // Update local state
      setSettings(newSettings)
    } catch (err) {
      console.error('Error updating settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
      throw err
    }
  }

  const getSetting = (key: string, defaultValue: any = null) => {
    const keys = key.split('.')
    let current = settings
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k]
      } else {
        return defaultValue
      }
    }
    
    return current !== undefined ? current : defaultValue
  }

  useEffect(() => {
    if (!tenantLoading && tenant?.id) {
      fetchSettings()
    }
  }, [tenant?.id, tenantLoading])

  const value: SettingsContextType = {
    settings,
    loading: loading || tenantLoading,
    error,
    updateSettings,
    getSetting,
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    // Return a default context instead of throwing an error
    return {
      settings: {},
      loading: false,
      error: null,
      updateSettings: async () => {},
      getSetting: (key: string, defaultValue: any = null) => defaultValue,
    }
  }
  return context
}

