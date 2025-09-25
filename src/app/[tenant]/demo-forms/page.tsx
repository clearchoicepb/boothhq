'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { EntityForm, ContactForm, AccountForm, EventForm } from '@/components/forms'
import { Plus, Users, Building, Calendar } from 'lucide-react'

export default function DemoFormsPage() {
  const [activeForm, setActiveForm] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>(null)

  const handleFormSubmit = async (data: any) => {
    console.log('Form submitted:', data)
    setFormData(data)
    setActiveForm(null)
    // In a real app, you'd save this data
  }

  const demoButtons = [
    {
      id: 'contacts',
      label: 'Contact Form',
      icon: Users,
      description: 'Polymorphic contact form with validation'
    },
    {
      id: 'accounts', 
      label: 'Account Form',
      icon: Building,
      description: 'Polymorphic account form with sections'
    },
    {
      id: 'events',
      label: 'Event Form', 
      icon: Calendar,
      description: 'Polymorphic event form with relationships'
    }
  ]

  return (
    <AppLayout>
      <div className="space-y-8 max-w-4xl mx-auto py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🚀 Polymorphic Forms Demo
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            See how one polymorphic form system replaces 5 separate form components
          </p>
        </div>

        {/* Demo Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {demoButtons.map((button) => {
            const Icon = button.icon
            return (
              <div key={button.id} className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="w-12 h-12 bg-[#347dc4] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {button.label}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {button.description}
                </p>
                <Button
                  onClick={() => setActiveForm(button.id)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Try {button.label}
                </Button>
              </div>
            )
          })}
        </div>

        {/* Polymorphic Form Usage Examples */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            💡 Polymorphic Form Benefits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Before (5 Separate Forms)</h3>
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                <div className="text-red-800 font-mono">
                  ContactForm.tsx (339 lines)<br/>
                  AccountForm.tsx (405 lines)<br/>
                  EventForm.tsx (395 lines)<br/>
                  InvoiceForm.tsx (418 lines)<br/>
                  OpportunityForm.tsx (277 lines)<br/>
                  <strong>Total: 1,834 lines</strong>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">After (1 Polymorphic System)</h3>
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                <div className="text-green-800 font-mono">
                  BaseForm.tsx (347 lines)<br/>
                  EntityForm.tsx (25 lines)<br/>
                  Configs (200 lines)<br/>
                  <strong>Total: 572 lines</strong><br/>
                  <strong className="text-green-600">69% reduction!</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Code Example */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            🔧 Usage Example
          </h2>
          <pre className="text-green-400 text-sm overflow-x-auto">
            <code>{`// Before: 5 separate form components
<ContactForm contact={contact} onSubmit={handleSubmit} />
<AccountForm account={account} onSubmit={handleSubmit} />
<EventForm event={event} onSubmit={handleSubmit} />

// After: 1 polymorphic form system
<EntityForm entity="contacts" data={contact} onSubmit={handleSubmit} />
<EntityForm entity="accounts" data={account} onSubmit={handleSubmit} />
<EntityForm entity="events" data={event} onSubmit={handleSubmit} />

// Or use the typed wrappers
<ContactForm contact={contact} onSubmit={handleSubmit} />
<AccountForm account={account} onSubmit={handleSubmit} />
<EventForm event={event} onSubmit={handleSubmit} />`}</code>
          </pre>
        </div>

        {/* Form Results */}
        {formData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">
              ✅ Form Submitted Successfully!
            </h2>
            <pre className="text-blue-800 text-sm overflow-x-auto">
              <code>{JSON.stringify(formData, null, 2)}</code>
            </pre>
          </div>
        )}

        {/* Polymorphic Forms */}
        <EntityForm
          entity="contacts"
          isOpen={activeForm === 'contacts'}
          onClose={() => setActiveForm(null)}
          onSubmit={handleFormSubmit}
          title="Demo Contact Form"
        />

        <EntityForm
          entity="accounts"
          isOpen={activeForm === 'accounts'}
          onClose={() => setActiveForm(null)}
          onSubmit={handleFormSubmit}
          title="Demo Account Form"
        />

        <EntityForm
          entity="events"
          isOpen={activeForm === 'events'}
          onClose={() => setActiveForm(null)}
          onSubmit={handleFormSubmit}
          title="Demo Event Form"
        />
      </div>
    </AppLayout>
  )
}
