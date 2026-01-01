'use client'

import { PostEventGalleryCard } from './post-event/PostEventGalleryCard'
import { PostEventRecapDeckCard } from './post-event/PostEventRecapDeckCard'
import { StaffRecapsCard } from './post-event/StaffRecapsCard'

interface EventPostEventTabProps {
  eventId: string
  eventTitle: string
  photoGalleryUrl: string | null
  btsGalleryUrl: string | null
  recapDeckPath: string | null
  recapDeckUploadedAt: string | null
  recapDeckUploadedBy: string | null
  onEventUpdate: () => Promise<void>
  canEdit: boolean
}

/**
 * Post Event Tab
 *
 * Contains 4 deliverables:
 * 1. Photo Gallery URL
 * 2. Behind the Scenes Gallery URL
 * 3. Post Event Recap Deck (PDF upload)
 * 4. Staff Event Recaps (forms sent to staff)
 */
export function EventPostEventTab({
  eventId,
  eventTitle,
  photoGalleryUrl,
  btsGalleryUrl,
  recapDeckPath,
  recapDeckUploadedAt,
  recapDeckUploadedBy,
  onEventUpdate,
  canEdit,
}: EventPostEventTabProps) {
  return (
    <div className="space-y-6">
      {/* Photo Gallery */}
      <PostEventGalleryCard
        eventId={eventId}
        title="Photo Gallery"
        description="External link to client photo gallery (e.g., SmugMug, Google Photos)"
        icon="camera"
        fieldName="photo_gallery_url"
        currentUrl={photoGalleryUrl}
        onUpdate={onEventUpdate}
        canEdit={canEdit}
      />

      {/* Behind the Scenes Gallery */}
      <PostEventGalleryCard
        eventId={eventId}
        title="Behind the Scenes Gallery"
        description="External link to behind-the-scenes photo gallery"
        icon="video"
        fieldName="bts_gallery_url"
        currentUrl={btsGalleryUrl}
        onUpdate={onEventUpdate}
        canEdit={canEdit}
      />

      {/* Recap Deck */}
      <PostEventRecapDeckCard
        eventId={eventId}
        recapDeckPath={recapDeckPath}
        recapDeckUploadedAt={recapDeckUploadedAt}
        recapDeckUploadedBy={recapDeckUploadedBy}
        onUpdate={onEventUpdate}
        canEdit={canEdit}
      />

      {/* Staff Recaps */}
      <StaffRecapsCard
        eventId={eventId}
        eventTitle={eventTitle}
        canEdit={canEdit}
      />
    </div>
  )
}

export default EventPostEventTab
