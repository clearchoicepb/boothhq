'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { TopNav } from './top-nav'
import { Menu, X, LifeBuoy } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import { useRouter, useParams } from 'next/navigation'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter()
  const params = useParams()
  const tenantSubdomain = params?.tenant as string
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
    <>
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

      {/* Floating Report Issue Button */}
      {tenantSubdomain && (
        <button
          onClick={() => router.push(`/${tenantSubdomain}/tickets/new`)}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 z-50 group"
          title="Report an Issue"
        >
          <LifeBuoy className="h-6 w-6" />
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Report Issue
          </span>
        </button>
      )}

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#363636',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  )
}
