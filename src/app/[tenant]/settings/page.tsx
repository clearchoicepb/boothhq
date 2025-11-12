'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
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
  CreditCard,
  Mail,
  BarChart3,
  FileType,
  Plus,
  CheckCircle2,
  Sparkles,
  Trash2,
  Folder,
  Tag
} from 'lucide-react';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  href: string;
  category: 'crm' | 'operations' | 'system' | 'integrations';
}

const settingsSections: SettingsSection[] = [
  // CRM Module Settings
  {
    id: 'accounts',
    title: 'Accounts',
    description: 'Customize account types, fields, and display options',
    icon: Building2,
    href: '/accounts',
    category: 'crm'
  },
  {
    id: 'contacts',
    title: 'Contacts',
    description: 'Manage contact fields, relationships, and contact preferences',
    icon: Users,
    href: '/contacts',
    category: 'crm'
  },
  {
    id: 'leads',
    title: 'Leads',
    description: 'Configure lead sources, stages, and qualification criteria',
    icon: UserPlus,
    href: '/leads',
    category: 'crm'
  },
  {
    id: 'opportunities',
    title: 'Opportunities',
    description: 'Set up sales stages, probability settings, and pipeline views',
    icon: Target,
    href: '/opportunities',
    category: 'crm'
  },
  {
    id: 'users',
    title: 'Users',
    description: 'Manage user accounts, roles, and permissions',
    icon: UserCheck,
    href: '/users',
    category: 'crm'
  },
  {
    id: 'roles',
    title: 'Roles',
    description: 'Configure job-category based roles and granular permissions',
    icon: Shield,
    href: '/roles',
    category: 'system'
  },
  
  // Operations Module Settings
  {
    id: 'events',
    title: 'Events',
    description: 'Configure event types, templates, and scheduling preferences',
    icon: Calendar,
    href: '/events',
    category: 'operations'
  },
  {
    id: 'core-tasks',
    title: 'Core Event Tasks',
    description: 'Customize checklist tasks for event readiness tracking',
    icon: CheckCircle2,
    href: '/core-tasks',
    category: 'operations'
  },
  {
    id: 'task-templates',
    title: 'Task Templates',
    description: 'Create reusable task templates for quick task creation',
    icon: CheckCircle2,
    href: '/task-templates',
    category: 'operations'
  },
  {
    id: 'event-categories',
    title: 'Event Categories',
    description: 'Manage workflow categories (Social vs Corporate events)',
    icon: Folder,
    href: '/event-categories',
    category: 'operations'
  },
  {
    id: 'event-types',
    title: 'Event Types',
    description: 'Configure specific event types within categories',
    icon: Tag,
    href: '/event-types',
    category: 'operations'
  },
  {
    id: 'staff-roles',
    title: 'Staff Roles',
    description: 'Manage staff role categories for operations and event team members',
    icon: UserCheck,
    href: '/staff-roles',
    category: 'operations'
  },
  {
    id: 'inventory',
    title: 'Inventory',
    description: 'Manage equipment categories, maintenance schedules, and tracking',
    icon: Package,
    href: '/inventory',
    category: 'operations'
  },
  {
    id: 'invoices',
    title: 'Invoices',
    description: 'Customize invoice templates, payment terms, and billing settings',
    icon: FileText,
    href: '/invoices',
    category: 'operations'
  },
  
  // System Settings
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Customize colors, themes, and UI preferences',
    icon: Palette,
    href: '/appearance',
    category: 'system'
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Configure email alerts, reminders, and notification preferences',
    icon: Bell,
    href: '/notifications',
    category: 'system'
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Manage user permissions, data access, and security settings',
    icon: Shield,
    href: '/security',
    category: 'system'
  },
  {
    id: 'data',
    title: 'Data Management',
    description: 'Import/export data, backup settings, and data retention policies',
    icon: Database,
    href: '/data',
    category: 'system'
  },
  
  // Integrations Settings
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Connect with external services and configure API settings (including Stripe payments)',
    icon: Globe,
    href: '/integrations',
    category: 'integrations'
  },
  {
    id: 'email',
    title: 'Email Services',
    description: 'Set up Gmail, SMTP, and email marketing integrations',
    icon: Mail,
    href: '/email',
    category: 'integrations'
  },
  {
    id: 'analytics',
    title: 'Analytics & Reports',
    description: 'Configure reporting dashboards and analytics integrations',
    icon: BarChart3,
    href: '/analytics',
    category: 'integrations'
  },
  {
    id: 'templates',
    title: 'Templates',
    description: 'Create and manage email, SMS, and contract templates',
    icon: FileType,
    href: '/templates',
    category: 'system'
  },
  {
    id: 'packages',
    title: 'Packages',
    description: 'Manage service packages and pricing for quotes',
    icon: Package,
    href: '/packages',
    category: 'operations'
  },
  {
    id: 'add-ons',
    title: 'Add-ons',
    description: 'Manage add-on items and services for quotes',
    icon: Plus,
    href: '/add-ons',
    category: 'operations'
  }
];

const categoryLabels = {
  crm: 'CRM Settings',
  operations: 'Operations',
  system: 'System',
  integrations: 'Integrations'
};

const categoryColors = {
  crm: 'border-blue-200 bg-blue-50',
  operations: 'border-green-200 bg-green-50',
  system: 'border-purple-200 bg-purple-50',
  integrations: 'border-orange-200 bg-orange-50'
};

export default function SettingsPage() {
  const { tenant: tenantSubdomain } = useParams();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredSections = selectedCategory
    ? settingsSections.filter(section => section.category === selectedCategory)
    : settingsSections;

  const categories = Object.keys(categoryLabels) as Array<keyof typeof categoryLabels>;

  const handleGenerateSeedData = async () => {
    if (!confirm('⚠️ This will create 40-50 test records across all CRM entities (Leads, Accounts, Contacts, Opportunities, Events, Invoices, Quotes).\n\nThis operation cannot be undone automatically. Continue?')) {
      return;
    }

    setIsGenerating(true);
    const loadingToast = toast.loading('Generating seed data...');

    try {
      const response = await fetch('/api/seed-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'yes-create-test-data' })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Successfully created ${data.summary.total} records!\n` +
          `Leads: ${data.summary.leads}, Accounts: ${data.summary.accounts}, ` +
          `Contacts: ${data.summary.contacts}, Opportunities: ${data.summary.opportunities}, ` +
          `Events: ${data.summary.events}, Invoices: ${data.summary.invoices}, Quotes: ${data.summary.quotes}`,
          { duration: 6000 }
        );
      } else {
        toast.error(data.error || 'Failed to generate seed data');
      }
    } catch (error: any) {
      console.error('Seed data error:', error);
      toast.error('Failed to generate seed data: ' + error.message);
    } finally {
      toast.dismiss(loadingToast);
      setIsGenerating(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!confirm('🚨 WARNING: This will DELETE ALL DATA in your CRM!\n\nThis includes:\n- All Leads\n- All Accounts\n- All Contacts\n- All Opportunities\n- All Events\n- All Invoices\n- All Quotes\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?')) {
      return;
    }

    // Double confirmation
    if (!confirm('Last chance! Type YES in the next dialog to confirm deletion.')) {
      return;
    }

    const confirmation = prompt('Type "DELETE ALL" to confirm (case-sensitive):');
    if (confirmation !== 'DELETE ALL') {
      toast.error('Deletion cancelled - confirmation text did not match');
      return;
    }

    setIsDeleting(true);
    const loadingToast = toast.loading('Deleting all data...');

    try {
      const response = await fetch('/api/seed-data', {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('All data deleted successfully', { duration: 4000 });
      } else {
        toast.error(data.error || 'Failed to delete data');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete data: ' + error.message);
    } finally {
      toast.dismiss(loadingToast);
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                  <SettingsIcon className="h-6 w-6 mr-3 text-[#347dc4]" />
                  Settings
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Customize your CRM experience and manage system preferences
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Category Filter */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  selectedCategory === null
                    ? 'bg-[#347dc4] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Settings
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    selectedCategory === category
                      ? 'bg-[#347dc4] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {categoryLabels[category]}
                </button>
              ))}
            </div>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSections.map((section) => {
              const IconComponent = section.icon;
              return (
                <Link
                  key={section.id}
                  href={`/${tenantSubdomain}/settings${section.href}`}
                  className="group block"
                >
                  <div className={`border rounded-lg p-6 hover:shadow-md transition-all duration-150 cursor-pointer ${categoryColors[section.category]}`}>
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border">
                          <IconComponent className="h-5 w-5 text-[#347dc4]" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#347dc4] transition-colors duration-150">
                          {section.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {section.description}
                        </p>
                        <div className="mt-3">
                          <span className="inline-flex items-center text-xs font-medium text-[#347dc4]">
                            Configure →
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-12 border-t border-gray-200 pt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button className="flex items-center justify-center px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150">
                <Database className="h-4 w-4 mr-2 text-[#347dc4]" />
                <span className="text-sm font-medium">Export Data</span>
              </button>
              <button className="flex items-center justify-center px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150">
                <Database className="h-4 w-4 mr-2 text-[#347dc4]" />
                <span className="text-sm font-medium">Import Data</span>
              </button>
              <button className="flex items-center justify-center px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150">
                <Shield className="h-4 w-4 mr-2 text-[#347dc4]" />
                <span className="text-sm font-medium">Backup Settings</span>
              </button>
            </div>
          </div>

          {/* Developer Tools */}
          <div className="mt-12 border-t border-gray-200 pt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Developer Tools</h2>
            <p className="text-sm text-gray-600 mb-4">
              Tools for testing and development. Use with caution in production.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleGenerateSeedData}
                disabled={isGenerating}
                className="flex items-center justify-center px-4 py-3 border-2 border-green-200 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="h-4 w-4 mr-2 text-green-700" />
                <span className="text-sm font-medium text-green-900">
                  {isGenerating ? 'Generating...' : 'Generate Test Data'}
                </span>
              </button>
              <button
                onClick={handleDeleteAllData}
                disabled={isDeleting}
                className="flex items-center justify-center px-4 py-3 border-2 border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4 mr-2 text-red-700" />
                <span className="text-sm font-medium text-red-900">
                  {isDeleting ? 'Deleting...' : 'Delete All Data'}
                </span>
              </button>
            </div>
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>⚠️ Warning:</strong> Generate Test Data creates 40-50 realistic records across all entities (Leads, Accounts, Contacts, Opportunities, Events, Invoices, Quotes). Delete All Data removes everything permanently. Use these tools for development and testing only.
              </p>
            </div>
          </div>
        </div>
      </div>
  );
}





