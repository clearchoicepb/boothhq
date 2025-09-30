'use client'

import { useState, useEffect } from 'react'
import { Link, User, Building2, Target, Calendar, ArrowRight, Plus, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RelatedRecord {
  id: string
  type: 'lead' | 'contact' | 'account' | 'opportunity' | 'event'
  name: string
  subtitle?: string
  status?: string
  url: string
  relationship?: string
}

interface RelationshipManagerProps {
  recordId: string
  recordType: 'leads' | 'contacts' | 'accounts' | 'opportunities'
  tenantSubdomain: string
}

export function RelationshipManager({ recordId, recordType, tenantSubdomain }: RelationshipManagerProps) {
  const [relatedRecords, setRelatedRecords] = useState<RelatedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newRelationship, setNewRelationship] = useState({
    type: 'contact' as RelatedRecord['type'],
    targetId: '',
    relationship: 'related'
  })

  useEffect(() => {
    fetchRelatedRecords()
  }, [recordId, recordType])

  const fetchRelatedRecords = async () => {
    setLoading(true)
    try {
      // Fetch related records based on the current record type
      const relationships: RelatedRecord[] = []

      // For leads - find related contacts, accounts, and opportunities
      if (recordType === 'leads') {
        // This would typically come from a relationships API
        // For now, we'll create mock data
        relationships.push(
          {
            id: '1',
            type: 'contact',
            name: 'John Smith',
            subtitle: 'john@example.com',
            status: 'active',
            url: `/${tenantSubdomain}/contacts/1`,
            relationship: 'converted_to'
          },
          {
            id: '2',
            type: 'account',
            name: 'ABC Company',
            subtitle: 'Technology',
            status: 'active',
            url: `/${tenantSubdomain}/accounts/2`,
            relationship: 'belongs_to'
          }
        )
      }

      // For contacts - find related accounts, opportunities, and events
      if (recordType === 'contacts') {
        relationships.push(
          {
            id: '3',
            type: 'account',
            name: 'XYZ Corporation',
            subtitle: 'Finance',
            status: 'active',
            url: `/${tenantSubdomain}/accounts/3`,
            relationship: 'works_for'
          },
          {
            id: '4',
            type: 'opportunity',
            name: 'Software License Deal',
            subtitle: '$50,000',
            status: 'proposal',
            url: `/${tenantSubdomain}/opportunities/4`,
            relationship: 'involved_in'
          }
        )
      }

      // For accounts - find related contacts, opportunities, and events
      if (recordType === 'accounts') {
        relationships.push(
          {
            id: '5',
            type: 'contact',
            name: 'Jane Doe',
            subtitle: 'Sales Manager',
            status: 'active',
            url: `/${tenantSubdomain}/contacts/5`,
            relationship: 'contact_at'
          },
          {
            id: '6',
            type: 'opportunity',
            name: 'Enterprise Contract',
            subtitle: '$100,000',
            status: 'negotiation',
            url: `/${tenantSubdomain}/opportunities/6`,
            relationship: 'has_opportunity'
          }
        )
      }

      // For opportunities - find related accounts, contacts, and events
      if (recordType === 'opportunities') {
        relationships.push(
          {
            id: '7',
            type: 'account',
            name: 'Tech Solutions Inc',
            subtitle: 'Technology',
            status: 'active',
            url: `/${tenantSubdomain}/accounts/7`,
            relationship: 'for_account'
          },
          {
            id: '8',
            type: 'contact',
            name: 'Mike Johnson',
            subtitle: 'Decision Maker',
            status: 'active',
            url: `/${tenantSubdomain}/contacts/8`,
            relationship: 'decision_maker'
          },
          {
            id: '9',
            type: 'event',
            name: 'Product Demo',
            subtitle: '2024-01-15',
            status: 'scheduled',
            url: `/${tenantSubdomain}/events/9`,
            relationship: 'demo_for'
          }
        )
      }

      setRelatedRecords(relationships)
    } catch (error) {
      console.error('Error fetching related records:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lead':
        return User
      case 'contact':
        return User
      case 'account':
        return Building2
      case 'opportunity':
        return Target
      case 'event':
        return Calendar
      default:
        return User
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lead':
        return 'text-blue-600 bg-blue-100'
      case 'contact':
        return 'text-green-600 bg-green-100'
      case 'account':
        return 'text-orange-600 bg-orange-100'
      case 'opportunity':
        return 'text-purple-600 bg-purple-100'
      case 'event':
        return 'text-indigo-600 bg-indigo-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const getRelationshipLabel = (relationship: string) => {
    const labels: Record<string, string> = {
      'converted_to': 'Converted to',
      'belongs_to': 'Belongs to',
      'works_for': 'Works for',
      'involved_in': 'Involved in',
      'contact_at': 'Contact at',
      'has_opportunity': 'Has opportunity',
      'for_account': 'For account',
      'decision_maker': 'Decision maker',
      'demo_for': 'Demo for',
      'related': 'Related'
    }
    return labels[relationship] || relationship
  }

  const handleAddRelationship = () => {
    // This would typically make an API call to create the relationship
    setShowAddModal(false)
    setNewRelationship({
      type: 'contact',
      targetId: '',
      relationship: 'related'
    })
    // Refresh the relationships
    fetchRelatedRecords()
  }

  const handleRemoveRelationship = (relatedId: string) => {
    if (confirm('Are you sure you want to remove this relationship?')) {
      // This would typically make an API call to remove the relationship
      setRelatedRecords(prev => prev.filter(r => r.id !== relatedId))
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Related Records</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage relationships with other records
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Relationship
        </Button>
      </div>

      {/* Related Records List */}
      {relatedRecords.length > 0 ? (
        <div className="space-y-3">
          {relatedRecords.map((record) => {
            const IconComponent = getTypeIcon(record.type)
            return (
              <div key={`${record.type}-${record.id}`} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className={`flex-shrink-0 p-2 rounded-lg ${getTypeColor(record.type)}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{record.name}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(record.type)}`}>
                        {getTypeLabel(record.type)}
                      </span>
                    </div>
                    {record.subtitle && (
                      <p className="text-sm text-gray-600">{record.subtitle}</p>
                    )}
                    {record.relationship && (
                      <p className="text-xs text-gray-500 mt-1">
                        {getRelationshipLabel(record.relationship)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link href={record.url}>
                    <Button variant="outline" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveRelationship(record.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <Link className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Related Records</h3>
          <p className="text-gray-600 mb-4">
            Start by adding relationships to other records.
          </p>
        </div>
      )}

      {/* Add Relationship Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddModal(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Add Relationship
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Record Type
                    </label>
                    <select
                      value={newRelationship.type}
                      onChange={(e) => setNewRelationship({ ...newRelationship, type: e.target.value as RelatedRecord['type'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      aria-label="Record type"
                    >
                      <option value="contact">Contact</option>
                      <option value="account">Account</option>
                      <option value="opportunity">Opportunity</option>
                      <option value="event">Event</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Record ID
                    </label>
                    <input
                      type="text"
                      value={newRelationship.targetId}
                      onChange={(e) => setNewRelationship({ ...newRelationship, targetId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter record ID"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Relationship Type
                    </label>
                    <select
                      value={newRelationship.relationship}
                      onChange={(e) => setNewRelationship({ ...newRelationship, relationship: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      aria-label="Relationship type"
                    >
                      <option value="related">Related</option>
                      <option value="converted_to">Converted to</option>
                      <option value="belongs_to">Belongs to</option>
                      <option value="works_for">Works for</option>
                      <option value="involved_in">Involved in</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddRelationship}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Add Relationship
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
