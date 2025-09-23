'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface Tenant {
  id: string
  name: string
  subdomain: string
  domain: string | null
  plan: string
  status: string
}

interface User {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
}

interface TenantContextType {
  tenant: Tenant | null
  currentUser: User | null
  loading: boolean
  refreshTenant: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshTenant = async () => {
    // No need to fetch - we have all the data in the session
    if (session?.user) {
      setTenant({
        id: session.user.tenantId,
        name: session.user.tenantName,
        subdomain: session.user.tenantSubdomain,
        domain: null,
        plan: 'professional',
        status: 'active'
      })
      
      setCurrentUser({
        id: session.user.id,
        email: session.user.email,
        first_name: session.user.name?.split(' ')[0] || null,
        last_name: session.user.name?.split(' ').slice(1).join(' ') || null,
        role: session.user.role
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    if (status === 'loading') return
    
    if (status === 'authenticated' && session?.user) {
      refreshTenant()
    } else if (status === 'unauthenticated') {
      setLoading(false)
    } else {
      // If status is neither loading nor authenticated, wait a bit more
      setTimeout(() => {
        if (session?.user) {
          refreshTenant()
        } else {
          setLoading(false)
        }
      }, 1000)
    }
  }, [status, session])

  return (
    <TenantContext.Provider value={{
      tenant,
      currentUser,
      loading,
      refreshTenant
    }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}
