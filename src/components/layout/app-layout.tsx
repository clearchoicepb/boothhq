'use client'

import { Sidebar } from './sidebar'
import { TopNav } from './top-nav'
import { SettingsProvider } from '@/lib/settings-context'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SettingsProvider>
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar - Fixed positioning */}
        <Sidebar />
        
        {/* Main Content Area - Accounts for sidebar width */}
        <div className="flex-1 ml-64 flex flex-col min-h-screen">
          {/* Top Navigation - Sticky positioning */}
          <TopNav />
          
          {/* Page Content - Scrollable area */}
          <main className="flex-1 overflow-auto">
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SettingsProvider>
  )
}
