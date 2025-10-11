'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { TopNav } from './top-nav'
import { SettingsProvider } from '@/lib/settings-context'
import { Menu, X } from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileMenuOpen])

  return (
    <SettingsProvider>
      <div className="flex min-h-screen bg-white">
        {/* Desktop Sidebar - Hidden on mobile/tablet */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Mobile Drawer Overlay */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-50 lg:hidden overflow-y-auto">
              {/* Close button */}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>

              {/* Sidebar content in drawer */}
              <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
            </div>
          </>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
          {/* Top Navigation */}
          <TopNav
            leftContent={
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors -ml-2"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6 text-gray-700" />
              </button>
            }
          />

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
