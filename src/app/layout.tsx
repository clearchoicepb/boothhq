import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from '@/components/session-provider'
import { TenantProvider } from '@/lib/tenant-context'
import { SettingsProvider } from '@/lib/settings-context'
import { ErrorBoundary } from '@/components/error-boundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Photo Booth CRM',
  description: 'Comprehensive photo booth rental management platform',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <SessionProvider>
            <TenantProvider>
              <SettingsProvider>
                <div className="min-h-screen bg-gray-50">
                  {children}
                </div>
              </SettingsProvider>
            </TenantProvider>
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
