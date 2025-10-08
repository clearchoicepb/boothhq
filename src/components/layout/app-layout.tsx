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
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen ml-64">
          {/* Top Navigation */}
          <TopNav />

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <div className="px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SettingsProvider>
  )
}
