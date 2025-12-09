'use client'

import type { LogisticsPackagesProps } from '@/types/logistics'

/**
 * LogisticsPackages Component
 *
 * Displays packages and custom items in a 2-column layout.
 */
export function LogisticsPackages({
  packages,
  customItems
}: LogisticsPackagesProps) {
  return (
    <section className="pb-6 border-b border-gray-300">
      <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">
        Client Package & Items
      </h3>

      <div className="pl-4">
        {/* Packages and Custom Items in 2-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {/* Packages Column */}
          <div>
            <span className="text-sm font-bold text-gray-900 uppercase block mb-2">
              Booth Type & Packages
            </span>
            {packages && packages.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 pl-4">
                {packages.map(pkg => (
                  <li key={pkg.id} className="text-sm text-gray-900">
                    {pkg.name}{' '}
                    <span className="text-xs text-gray-600">({pkg.type})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic pl-4">No packages selected</p>
            )}
          </div>

          {/* Custom Items Column */}
          <div>
            <span className="text-sm font-bold text-gray-900 uppercase block mb-2">
              Add-Ons & Custom Items
            </span>
            {customItems && customItems.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 pl-4">
                {customItems.map(item => (
                  <li key={item.id} className="text-sm text-gray-900">
                    {item.item_name}{' '}
                    <span className="text-xs text-gray-600 capitalize">
                      ({item.item_type})
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic pl-4">
                No add-ons or custom items
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
