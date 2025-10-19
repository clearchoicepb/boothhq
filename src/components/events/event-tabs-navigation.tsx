import { 
  FileText,
  DollarSign,
  Activity,
  Paperclip,
  ListTodo,
  Palette,
  Truck,
  MessageSquare,
  User,
  Package
} from 'lucide-react'

interface EventTabsNavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

/**
 * Tab navigation for event detail page
 */
export function EventTabsNavigation({ activeTab, onTabChange }: EventTabsNavigationProps) {
  const tabs = [
    { value: "overview", label: "Overview", icon: FileText },
    { value: "invoices", label: "Invoices", icon: DollarSign },
    { value: "activity", label: "Activity", icon: Activity },
    { value: "files", label: "Files", icon: Paperclip },
    { value: "tasks", label: "Tasks", icon: ListTodo },
    { value: "design", label: "Design", icon: Palette },
    { value: "logistics", label: "Logistics", icon: Truck },
    { value: "communications", label: "Communications", icon: MessageSquare },
    { value: "staffing", label: "Staffing", icon: User },
    { value: "equipment", label: "Equipment", icon: Package },
    { value: "details", label: "Scope/Details", icon: FileText },
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
          </button>
        )
      })}
    </div>
  )
}

