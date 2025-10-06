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
      <div className="flex min-h-screen bg-white">
        {/* Sidebar - Responsive positioning */}
        <Sidebar />
        
        {/* Main Content Area - Responsive margin */}
        <div className="main-content-responsive flex-1 flex flex-col min-h-screen">
          {/* Top Navigation - Sticky positioning */}
          <TopNav />
          
          {/* Page Content - Scrollable area with responsive padding */}
          <main className="flex-1 overflow-auto">
            <div className="responsive-padding">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SettingsProvider>
  )
}
