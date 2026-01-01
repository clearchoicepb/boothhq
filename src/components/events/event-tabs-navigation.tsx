import {
  FileText,
  DollarSign,
  Activity,
  Paperclip,
  ClipboardList,
  MessageSquare,
  Info,
  PartyPopper
} from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface EventTab {
  value: string
  label: string
  icon: LucideIcon
  badge?: string
}

interface EventTabsNavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

/**
 * Tab navigation for event detail page
 * Updated to new 7-tab structure (reduced from 11 tabs)
 */
export function EventTabsNavigation({ activeTab, onTabChange }: EventTabsNavigationProps) {
  const tabs: EventTab[] = [
    { value: "overview", label: "Overview", icon: Info },
    { value: "planning", label: "Planning", icon: ClipboardList, badge: "New" },
    { value: "details", label: "Staffing", icon: FileText },
    { value: "financials", label: "Financials", icon: DollarSign },
    { value: "activity", label: "Activity", icon: Activity },
    { value: "communications", label: "Communications", icon: MessageSquare },
    { value: "files", label: "Files", icon: Paperclip },
    { value: "post-event", label: "Post Event", icon: PartyPopper },
  ]

  return (
    <div className="w-full justify-start bg-white border-b border-gray-200 rounded-none h-auto p-0 mb-6 flex flex-wrap">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.value
        return (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`flex items-center rounded-none border-b-2 border-l border-r border-transparent px-6 py-3 ${
              isActive
                ? 'border-l-[#347dc4] border-r-[#347dc4] border-b-[#347dc4] bg-transparent'
                : 'border-l-gray-300 border-r-gray-300 hover:bg-gray-50'
            }`}
          >
            <Icon className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">{tab.label}</span>
            <span className="md:hidden">{tab.label.split('/')[0]}</span>
            {tab.badge && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

