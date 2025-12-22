'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Settings as SettingsIcon,
  Users,
  UserCheck,
  UserPlus,
  Target,
  Calendar,
  Package,
  FileText,
  Building2,
  Palette,
  Bell,
  Shield,
  Database,
  Globe,
  Mail,
  BarChart3,
  FileType,
  Plus,
  CheckCircle2,
  Folder,
  Tag,
  Search,
  ChevronRight,
  ChevronDown,
  Zap,
  Boxes,
  DollarSign
} from 'lucide-react';

interface SettingsItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  href: string;
  status?: 'configured' | 'new' | 'unconfigured';
}

interface SettingsCategory {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  items: SettingsItem[];
  color: string;
}

const settingsStructure: SettingsCategory[] = [
  {
    id: 'crm',
    label: 'CRM & Sales',
    icon: Target,
    color: 'blue',
    items: [
      {
        id: 'leads',
        title: 'Leads',
        description: 'Lead sources, stages, and qualification',
        icon: UserPlus,
        href: '/leads',
      },
      {
        id: 'opportunities',
        title: 'Opportunities',
        description: 'Sales stages and pipeline management',
        icon: Target,
        href: '/opportunities',
      },
      {
        id: 'accounts',
        title: 'Accounts',
        description: 'Account types and custom fields',
        icon: Building2,
        href: '/accounts',
      },
      {
        id: 'contacts',
        title: 'Contacts',
        description: 'Contact management and relationships',
        icon: Users,
        href: '/contacts',
      },
    ]
  },
  {
    id: 'events',
    label: 'Events & Operations',
    icon: Calendar,
    color: 'green',
    items: [
      {
        id: 'event-categories',
        title: 'Event Categories',
        description: 'Social vs Corporate workflow categories',
        icon: Folder,
        href: '/event-categories',
      },
      {
        id: 'event-types',
        title: 'Event Types',
        description: 'Specific event types (Weddings, etc.)',
        icon: Tag,
        href: '/event-types',
      },
      {
        id: 'packages',
        title: 'Packages',
        description: 'Service packages and pricing',
        icon: Package,
        href: '/packages',
      },
      {
        id: 'add-ons',
        title: 'Add-ons',
        description: 'Additional services and items',
        icon: Plus,
        href: '/add-ons',
      },
      {
        id: 'task-templates',
        title: 'Task Templates',
        description: 'Reusable task templates',
        icon: CheckCircle2,
        href: '/task-templates',
      },
      {
        id: 'staff-roles',
        title: 'Staff Roles',
        description: 'Operations and event team roles',
        icon: UserCheck,
        href: '/staff-roles',
      },
    ]
  },
  {
    id: 'automation',
    label: 'Automation',
    icon: Zap,
    color: 'yellow',
    items: [
      {
        id: 'workflows',
        title: 'Workflows',
        description: 'Automated task creation and assignment',
        icon: Zap,
        href: '/workflows',
        status: 'new'
      },
    ]
  },
  {
    id: 'templates',
    label: 'Templates & Documents',
    icon: FileType,
    color: 'indigo',
    items: [
      {
        id: 'templates',
        title: 'Templates',
        description: 'Email, SMS, and contract templates',
        icon: Mail,
        href: '/templates',
      },
      {
        id: 'event-forms',
        title: 'Event Forms',
        description: 'Client questionnaires and information gathering forms',
        icon: FileText,
        href: '/event-forms',
      },
    ]
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: DollarSign,
    color: 'emerald',
    items: [
      {
        id: 'invoices',
        title: 'Invoice Settings',
        description: 'Invoice templates and payment terms',
        icon: FileText,
        href: '/invoices',
      },
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    color: 'orange',
    items: [
      {
        id: 'inventory',
        title: 'Equipment & Inventory',
        description: 'Equipment categories and tracking',
        icon: Package,
        href: '/inventory',
      },
    ]
  },
  {
    id: 'system',
    label: 'System Settings',
    icon: SettingsIcon,
    color: 'gray',
    items: [
      {
        id: 'users',
        title: 'Users',
        description: 'User accounts and team management',
        icon: UserCheck,
        href: '/users',
      },
      {
        id: 'roles',
        title: 'Roles & Permissions',
        description: 'Access control and permissions',
        icon: Shield,
        href: '/roles',
      },
      {
        id: 'appearance',
        title: 'Appearance',
        description: 'Branding, colors, and themes',
        icon: Palette,
        href: '/appearance',
      },
      {
        id: 'notifications',
        title: 'Notifications',
        description: 'Email alerts and reminders',
        icon: Bell,
        href: '/notifications',
      },
      {
        id: 'security',
        title: 'Security',
        description: 'Security settings and policies',
        icon: Shield,
        href: '/security',
      },
      {
        id: 'data',
        title: 'Data Management',
        description: 'Import, export, and backups',
        icon: Database,
        href: '/data',
      },
    ]
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Globe,
    color: 'pink',
    items: [
      {
        id: 'integrations',
        title: 'Integrations Hub',
        description: 'Connect external services',
        icon: Globe,
        href: '/integrations',
      },
      {
        id: 'email',
        title: 'Email Services',
        description: 'Gmail, SMTP, and email settings',
        icon: Mail,
        href: '/email',
      },
      {
        id: 'analytics',
        title: 'Analytics & Reports',
        description: 'Reporting and analytics integrations',
        icon: BarChart3,
        href: '/analytics',
      },
    ]
  },
];

const colorClasses = {
  blue: 'text-blue-600 bg-blue-50 border-blue-200',
  green: 'text-green-600 bg-green-50 border-green-200',
  purple: 'text-purple-600 bg-purple-50 border-purple-200',
  yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  indigo: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  orange: 'text-orange-600 bg-orange-50 border-orange-200',
  gray: 'text-gray-600 bg-gray-50 border-gray-200',
  pink: 'text-pink-600 bg-pink-50 border-pink-200',
};

export default function SettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['crm', 'events']);

  // Auto-expand all categories if search is active
  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedCategories(settingsStructure.map(cat => cat.id));
    }
  }, [searchQuery]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Filter settings based on search
  const filteredStructure = useMemo(() => {
    if (!searchQuery.trim()) return settingsStructure;

    const query = searchQuery.toLowerCase();
    return settingsStructure
      .map(category => ({
        ...category,
        items: category.items.filter(
          item =>
            item.title.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query)
        ),
      }))
      .filter(category => category.items.length > 0);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <SettingsIcon className="h-8 w-8 mr-3 text-[#347dc4]" />
                Settings
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Configure your system preferences and manage settings
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4] transition-all"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Settings Categories */}
        <div className="space-y-6">
          {filteredStructure.map((category) => {
            const CategoryIcon = category.icon;
            const isExpanded = expandedCategories.includes(category.id);
            const colorClass = colorClasses[category.color as keyof typeof colorClasses] || colorClasses.gray;

            return (
              <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 border ${colorClass}`}>
                      <CategoryIcon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-lg font-semibold text-gray-900">{category.label}</h2>
                      <p className="text-xs text-gray-500">{category.items.length} settings</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {/* Category Items */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                      {category.items.map((item, index) => {
                        const ItemIcon = item.icon;
                        return (
                          <Link
                            key={item.id}
                            href={`/${tenantSubdomain}/settings${item.href}`}
                            className="group p-4 hover:bg-gray-50 transition-colors relative"
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mt-0.5">
                                <ItemIcon className="h-5 w-5 text-gray-400 group-hover:text-[#347dc4] transition-colors" />
                              </div>
                              <div className="ml-3 flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-sm font-medium text-gray-900 group-hover:text-[#347dc4] transition-colors">
                                    {item.title}
                                  </h3>
                                  {item.status === 'new' && (
                                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                      New
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                  {item.description}
                                </p>
                                <div className="mt-2">
                                  <span className="inline-flex items-center text-xs font-medium text-[#347dc4] opacity-0 group-hover:opacity-100 transition-opacity">
                                    Configure
                                    <ChevronRight className="h-3 w-3 ml-1" />
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* No Results */}
        {filteredStructure.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No settings found</h3>
            <p className="text-sm text-gray-500">
              Try a different search term
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
