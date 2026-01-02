'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { MergeRecordsModal, FieldConfig } from '@/components/merge/MergeRecordsModal'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Users,
  Building,
  Search,
  Loader2,
  GitMerge,
  AlertTriangle
} from 'lucide-react'

interface DuplicatePair {
  id1: string
  id2: string
  name1: string
  name2: string
  email1: string | null
  email2: string | null
  phone1: string | null
  phone2: string | null
  match_score: number
  match_reasons: string[]
}

// Field configurations for the merge modal
const contactFieldConfigs: FieldConfig[] = [
  { key: 'first_name', label: 'First Name', type: 'text' },
  { key: 'last_name', label: 'Last Name', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'phone' },
  { key: 'job_title', label: 'Job Title', type: 'text' },
  { key: 'department', label: 'Department', type: 'text' },
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'state', label: 'State', type: 'text' },
  { key: 'postal_code', label: 'Postal Code', type: 'text' },
  { key: 'status', label: 'Status', type: 'select' }
]

const accountFieldConfigs: FieldConfig[] = [
  { key: 'name', label: 'Account Name', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'phone' },
  { key: 'website', label: 'Website', type: 'text' },
  { key: 'industry', label: 'Industry', type: 'text' },
  { key: 'billing_address_line_1', label: 'Billing Address', type: 'text' },
  { key: 'billing_city', label: 'Billing City', type: 'text' },
  { key: 'billing_state', label: 'Billing State', type: 'text' },
  { key: 'billing_zip_code', label: 'Billing ZIP', type: 'text' },
  { key: 'status', label: 'Status', type: 'select' }
]

export default function DuplicatesPage() {
  const { tenant: tenantSubdomain } = useParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'contacts' | 'accounts'>('contacts')
  const [isLoading, setIsLoading] = useState(false)
  const [contactDuplicates, setContactDuplicates] = useState<DuplicatePair[]>([])
  const [accountDuplicates, setAccountDuplicates] = useState<DuplicatePair[]>([])
  const [selectedPair, setSelectedPair] = useState<{
    type: 'contact' | 'account'
    record1: Record<string, unknown>
    record2: Record<string, unknown>
    pair: DuplicatePair
  } | null>(null)

  // Scan for duplicates
  const scanForDuplicates = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/duplicates?type=all')
      if (!response.ok) {
        throw new Error('Failed to scan for duplicates')
      }

      const data = await response.json()

      // Transform contact duplicates
      setContactDuplicates(
        (data.contacts || []).map((c: Record<string, unknown>) => ({
          id1: c.contact_id_1,
          id2: c.contact_id_2,
          name1: c.contact_1_name,
          name2: c.contact_2_name,
          email1: c.contact_1_email,
          email2: c.contact_2_email,
          phone1: c.contact_1_phone,
          phone2: c.contact_2_phone,
          match_score: c.match_score,
          match_reasons: c.match_reasons || []
        }))
      )

      // Transform account duplicates
      setAccountDuplicates(
        (data.accounts || []).map((a: Record<string, unknown>) => ({
          id1: a.account_id_1,
          id2: a.account_id_2,
          name1: a.account_1_name,
          name2: a.account_2_name,
          email1: a.account_1_email,
          email2: a.account_2_email,
          phone1: a.account_1_phone,
          phone2: a.account_2_phone,
          match_score: a.match_score,
          match_reasons: a.match_reasons || []
        }))
      )

      toast.success(
        `Found ${data.contacts?.length || 0} contact duplicates and ${data.accounts?.length || 0} account duplicates`
      )
    } catch (error) {
      console.error('Scan error:', error)
      toast.error('Failed to scan for duplicates')
    } finally {
      setIsLoading(false)
    }
  }

  // Open merge modal for a pair
  const openMergeModal = async (pair: DuplicatePair, type: 'contact' | 'account') => {
    try {
      const endpoint = type === 'contact' ? 'contacts' : 'accounts'

      const [result1, result2] = await Promise.all([
        fetch(`/api/${endpoint}/${pair.id1}`).then(r => r.json()),
        fetch(`/api/${endpoint}/${pair.id2}`).then(r => r.json())
      ])

      if (result1 && result2) {
        setSelectedPair({
          type,
          record1: result1,
          record2: result2,
          pair
        })
      }
    } catch (error) {
      console.error('Error fetching records:', error)
      toast.error('Failed to load records for merging')
    }
  }

  // Handle merge completion
  const handleMerge = async (
    survivorId: string,
    victimId: string,
    mergedData: Record<string, unknown>
  ) => {
    if (!selectedPair) return

    const endpoint =
      selectedPair.type === 'contact' ? '/api/contacts/merge' : '/api/accounts/merge'

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        survivorId,
        victimId,
        mergedData
      })
    })

    const result = await response.json()

    if (result.success) {
      toast.success('Records merged successfully!')

      // Remove the merged pair from the list
      if (selectedPair.type === 'contact') {
        setContactDuplicates(prev =>
          prev.filter(p => !(p.id1 === victimId || p.id2 === victimId))
        )
      } else {
        setAccountDuplicates(prev =>
          prev.filter(p => !(p.id1 === victimId || p.id2 === victimId))
        )
      }

      // Navigate to merged record
      router.push(`/${tenantSubdomain}/${selectedPair.type}s/${survivorId}`)
    } else {
      toast.error(result.error || 'Failed to merge records')
      throw new Error(result.error)
    }
  }

  const DuplicateCard = ({
    pair,
    type
  }: {
    pair: DuplicatePair
    type: 'contact' | 'account'
  }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 grid grid-cols-2 gap-8">
          {/* Record 1 */}
          <div>
            <div className="font-medium text-gray-900">{pair.name1}</div>
            {pair.email1 && (
              <div className="text-sm text-gray-500">{pair.email1}</div>
            )}
            {pair.phone1 && (
              <div className="text-sm text-gray-500">{pair.phone1}</div>
            )}
          </div>
          {/* Record 2 */}
          <div>
            <div className="font-medium text-gray-900">{pair.name2}</div>
            {pair.email2 && (
              <div className="text-sm text-gray-500">{pair.email2}</div>
            )}
            {pair.phone2 && (
              <div className="text-sm text-gray-500">{pair.phone2}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 ml-4">
          <div className="text-right">
            <Badge
              variant={pair.match_score >= 0.8 ? 'destructive' : 'secondary'}
              className={
                pair.match_score >= 0.8 ? 'bg-red-100 text-red-800' : ''
              }
            >
              {Math.round(pair.match_score * 100)}% match
            </Badge>
            <div className="text-xs text-gray-500 mt-1">
              {pair.match_reasons.join(', ')}
            </div>
          </div>
          <Button size="sm" onClick={() => openMergeModal(pair, type)}>
            <GitMerge className="h-4 w-4 mr-1" />
            Merge
          </Button>
        </div>
      </div>
    </div>
  )

  const EmptyState = ({ type }: { type: 'contact' | 'account' }) => (
    <div className="bg-white border border-gray-200 rounded-lg py-12 text-center">
      {type === 'contact' ? (
        <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
      ) : (
        <Building className="h-12 w-12 mx-auto text-gray-300 mb-4" />
      )}
      <p className="text-gray-500">
        No duplicate {type}s found. Click "Scan for Duplicates" to check.
      </p>
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href={`/${tenantSubdomain}/settings`}
                className="flex items-center text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Settings
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                  <GitMerge className="h-6 w-6 mr-3 text-[#347dc4]" />
                  Duplicate Detection & Merge
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Find and merge duplicate contact and account records
                </p>
              </div>
            </div>
            <Button onClick={scanForDuplicates} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Scan for Duplicates
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">How it works:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>
                  Click "Scan for Duplicates" to find potential duplicate records
                </li>
                <li>
                  Review the matches and their similarity scores
                </li>
                <li>
                  Click "Merge" to combine two records, selecting which values to keep
                </li>
                <li>
                  All related data (events, invoices, etc.) will be transferred to the kept record
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('contacts')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'contacts'
                  ? 'border-[#347dc4] text-[#347dc4]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-4 w-4 inline-block mr-2" />
              Contacts
              {contactDuplicates.length > 0 && (
                <Badge variant="destructive" className="ml-2 bg-red-500">
                  {contactDuplicates.length}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'accounts'
                  ? 'border-[#347dc4] text-[#347dc4]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Building className="h-4 w-4 inline-block mr-2" />
              Accounts
              {accountDuplicates.length > 0 && (
                <Badge variant="destructive" className="ml-2 bg-red-500">
                  {accountDuplicates.length}
                </Badge>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'contacts' ? (
          contactDuplicates.length === 0 ? (
            <EmptyState type="contact" />
          ) : (
            contactDuplicates.map((pair, i) => (
              <DuplicateCard key={i} pair={pair} type="contact" />
            ))
          )
        ) : accountDuplicates.length === 0 ? (
          <EmptyState type="account" />
        ) : (
          accountDuplicates.map((pair, i) => (
            <DuplicateCard key={i} pair={pair} type="account" />
          ))
        )}
      </div>

      {/* Merge Modal */}
      {selectedPair && (
        <MergeRecordsModal
          isOpen={true}
          onClose={() => setSelectedPair(null)}
          entityType={selectedPair.type}
          record1={selectedPair.record1}
          record2={selectedPair.record2}
          record1Label={selectedPair.pair.name1}
          record2Label={selectedPair.pair.name2}
          fieldConfigs={
            selectedPair.type === 'contact'
              ? contactFieldConfigs
              : accountFieldConfigs
          }
          onMerge={handleMerge}
        />
      )}
    </div>
  )
}
