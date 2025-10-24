import { useState } from 'react'
import { OpportunityPipelineCard } from './opportunity-pipeline-card'
import { OpportunityPreviewModal } from './opportunity-preview-modal'
import type { OpportunityWithRelations } from '@/hooks/useOpportunitiesData'
import type { TenantUser } from '@/lib/users'

interface OpportunityPipelineViewProps {
  opportunities: OpportunityWithRelations[]
  settings: any
  tenantSubdomain: string
  tenantUsers: TenantUser[]
  draggedOpportunityId: string | null
  dragOverStage: string | null
  onDragOver: (e: React.DragEvent, stageId: string) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, stageId: string) => void
  onDragStart: (e: React.DragEvent, opportunity: OpportunityWithRelations) => void
  onDragEnd: () => void
  onOpportunityClick: (opportunityId: string) => void
}

/**
 * Pipeline view showing opportunities organized by stage
 * Drag-and-drop columns for each stage with opportunity cards
 * 
 * @param props - Pipeline data and drag handlers
 * @returns Pipeline grid component
 */
export function OpportunityPipelineView({
  opportunities,
  settings,
  tenantSubdomain,
  tenantUsers,
  draggedOpportunityId,
  dragOverStage,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  onOpportunityClick
}: OpportunityPipelineViewProps) {
  const [previewOpportunity, setPreviewOpportunity] = useState<string | null>(null)
  
  const stages = settings.opportunities?.stages || [
    { id: 'prospecting', name: 'Prospecting', enabled: true },
    { id: 'qualification', name: 'Qualification', enabled: true },
    { id: 'proposal', name: 'Proposal', enabled: true },
    { id: 'negotiation', name: 'Negotiation', enabled: true },
    { id: 'closed_won', name: 'Closed Won', enabled: true },
    { id: 'closed_lost', name: 'Closed Lost', enabled: true }
  ]

  const activeStages = stages.filter((stage: any) => 
    stage.enabled !== false && !['closed_won', 'closed_lost'].includes(stage.id || stage)
  )

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {/* Pipeline Stages - Exclude closed stages */}
          {activeStages.map((stage: any) => {
            const stageId = stage.id || stage
            const stageName = stage.name || stage
            const stageOpportunities = opportunities.filter(opp => opp.stage === stageId)
            const stageValue = stageOpportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0)
            
            return (
              <div 
                key={stageId} 
                className={`bg-gray-50 rounded-lg p-4 transition-colors duration-200 ${
                  dragOverStage === stageId ? 'bg-blue-100 border-2 border-blue-300 border-dashed' : ''
                }`}
                onDragOver={(e) => onDragOver(e, stageId)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, stageId)}
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {stageName}
                    </h3>
                    {settings.opportunities?.autoCalculateProbability && (
                      <p className="text-xs text-gray-500">
                        {(() => {
                          const stageSettings = settings.opportunities.stages?.find((s: any) => s.id === stageId)
                          return stageSettings ? `${stageSettings.probability}% probability` : ''
                        })()}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {stageOpportunities.length}
                  </span>
                </div>
                
                {/* Stage Value */}
                <div className="text-xs text-gray-600 mb-4">
                  ${stageValue.toLocaleString()}
                </div>
                
                {/* Opportunity Cards */}
                <div className="space-y-3 min-h-[50px]">
                  {stageOpportunities.length === 0 && (
                    <div className="text-center text-gray-400 text-xs py-4 border-2 border-dashed border-gray-200 rounded-lg">
                      {dragOverStage === stageId ? 'Drop here' : 'No opportunities'}
                    </div>
                  )}
                  {stageOpportunities.map((opportunity) => (
                    <OpportunityPipelineCard
                      key={opportunity.id}
                      opportunity={opportunity}
                      tenantSubdomain={tenantSubdomain}
                      tenantUsers={tenantUsers}
                      settings={settings}
                      isDragged={draggedOpportunityId === opportunity.id}
                      onDragStart={(e) => onDragStart(e, opportunity)}
                      onDragEnd={onDragEnd}
                      onClick={() => setPreviewOpportunity(opportunity.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Opportunity Preview Modal */}
      {previewOpportunity && (
        <OpportunityPreviewModal
          isOpen={!!previewOpportunity}
          onClose={() => setPreviewOpportunity(null)}
          opportunityId={previewOpportunity}
          tenantSubdomain={tenantSubdomain}
          settings={settings}
        />
      )}
    </div>
  )
}

