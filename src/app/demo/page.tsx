'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Search, Edit, Trash2, Plus, DollarSign, Calendar, Users, Building2, Target } from 'lucide-react'

// Mock data for demonstration
const mockAccounts = [
  { id: '1', name: 'Acme Corp', industry: 'Technology', status: 'active' },
  { id: '2', name: 'Global Solutions', industry: 'Consulting', status: 'active' },
  { id: '3', name: 'TechStart Inc', industry: 'Software', status: 'inactive' },
]

const mockContacts = [
  { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@acme.com', phone: '+1-555-0123', job_title: 'CEO', status: 'active', accounts: { name: 'Acme Corp' } },
  { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane@global.com', phone: '+1-555-0124', job_title: 'CTO', status: 'active', accounts: { name: 'Global Solutions' } },
  { id: '3', first_name: 'Bob', last_name: 'Johnson', email: 'bob@techstart.com', phone: '+1-555-0125', job_title: 'VP Sales', status: 'active', accounts: { name: 'TechStart Inc' } },
]

const mockOpportunities = [
  { id: '1', name: 'Enterprise Software License', stage: 'proposal', amount: 50000, probability: 75, expected_close_date: '2024-02-15', accounts: { name: 'Acme Corp' }, contacts: { first_name: 'John', last_name: 'Doe' } },
  { id: '2', name: 'Consulting Services', stage: 'negotiation', amount: 25000, probability: 60, expected_close_date: '2024-01-30', accounts: { name: 'Global Solutions' }, contacts: { first_name: 'Jane', last_name: 'Smith' } },
  { id: '3', name: 'SaaS Subscription', stage: 'qualification', amount: 12000, probability: 40, expected_close_date: '2024-03-01', accounts: { name: 'TechStart Inc' }, contacts: { first_name: 'Bob', last_name: 'Johnson' } },
]

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStageColor = (stage: string) => {
    const colors = {
      'prospecting': 'bg-blue-100 text-blue-800',
      'qualification': 'bg-yellow-100 text-yellow-800',
      'proposal': 'bg-purple-100 text-purple-800',
      'negotiation': 'bg-orange-100 text-orange-800',
      'closed_won': 'bg-green-100 text-green-800',
      'closed_lost': 'bg-red-100 text-red-800'
    }
    return colors[stage as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">CRM App - Demo</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    activeTab === 'dashboard' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    activeTab === 'contacts' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Contacts
                </button>
                <button
                  onClick={() => setActiveTab('opportunities')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    activeTab === 'opportunities' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Opportunities
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900">Accounts</h3>
                  <p className="text-3xl font-bold text-blue-600">{mockAccounts.length}</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-900">Contacts</h3>
                  <p className="text-3xl font-bold text-green-600">{mockContacts.length}</p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-900">Opportunities</h3>
                  <p className="text-3xl font-bold text-purple-600">{mockOpportunities.length}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Accounts</h3>
                <div className="space-y-3">
                  {mockAccounts.slice(0, 3).map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-gray-900">{account.name}</p>
                        <p className="text-sm text-gray-500">{account.industry}</p>
                      </div>
                      <span className="text-xs text-gray-400">{account.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Contacts</h3>
                <div className="space-y-3">
                  {mockContacts.slice(0, 3).map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-gray-900">
                          {contact.first_name} {contact.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{contact.job_title}</p>
                      </div>
                      <span className="text-xs text-gray-400">{contact.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Opportunities</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Probability</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mockOpportunities.map((opportunity) => (
                      <tr key={opportunity.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {opportunity.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {opportunity.stage}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(opportunity.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {opportunity.probability}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </div>

            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <Button variant="outline">Search</Button>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mockContacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {contact.first_name} {contact.last_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <a href={`mailto:${contact.email}`} className="text-blue-600 hover:text-blue-800">
                              {contact.email}
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <a href={`tel:${contact.phone}`} className="text-blue-600 hover:text-blue-800">
                              {contact.phone}
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {contact.accounts?.name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {contact.job_title || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            contact.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {contact.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'opportunities' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Opportunity
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Total Pipeline</h3>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(87000)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Active Opportunities</h3>
                <p className="text-2xl font-bold text-gray-900">3</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Won Opportunities</h3>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-sm font-medium text-gray-500">Avg Probability</h3>
                <p className="text-2xl font-bold text-gray-900">58%</p>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search opportunities..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <Button variant="outline">Search</Button>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opportunity Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimated Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Probability</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Close</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mockOpportunities.map((opportunity) => (
                      <tr key={opportunity.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {opportunity.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {opportunity.contacts ? 
                              `${opportunity.contacts.first_name} ${opportunity.contacts.last_name}` : 
                              'N/A'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {opportunity.accounts?.name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStageColor(opportunity.stage)}`}>
                            {opportunity.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 flex items-center">
                            <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                            {formatCurrency(opportunity.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {opportunity.probability}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 flex items-center">
                            <Calendar className="w-4 h-4 mr-1 text-blue-600" />
                            {formatDate(opportunity.expected_close_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
