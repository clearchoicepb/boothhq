'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Building2, User, Globe } from 'lucide-react'
import { useFavicon } from '@/lib/use-favicon'

interface AccountAvatarProps {
  account: {
    id: string
    name?: string | null
    first_name?: string | null
    last_name?: string | null
    account_type: 'individual' | 'company'
    photo_url?: string | null
    website?: string | null
    business_url?: string | null
  }
  size?: 'sm' | 'md' | 'lg'
  showFavicon?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12'
}

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-6 w-6'
}

export function AccountAvatar({ 
  account, 
  size = 'md', 
  showFavicon = true,
  className = '' 
}: AccountAvatarProps) {
  const [imageError, setImageError] = useState(false)
  
  const websiteUrl = account.website || account.business_url
  const { faviconUrl, loading: faviconLoading } = useFavicon(
    showFavicon && !account.photo_url && !imageError && websiteUrl ? websiteUrl : null
  )

  const displayName = account.account_type === 'individual' 
    ? `${account.first_name || ''} ${account.last_name || ''}`.trim() || 'Account'
    : account.name || 'Account'

  // If we have a photo URL and no error, show the photo
  if (account.photo_url && !imageError) {
    return (
      <Image
        src={account.photo_url}
        alt={displayName}
        width={size === 'sm' ? 24 : size === 'md' ? 32 : 48}
        height={size === 'sm' ? 24 : size === 'md' ? 32 : 48}
        className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
        onError={() => setImageError(true)}
      />
    )
  }

  // If we have a favicon and no photo, show the favicon
  if (faviconUrl && !imageError) {
    return (
      <div className={`relative ${sizeClasses[size]} ${className}`}>
        <Image
          src={faviconUrl}
          alt={`${displayName} favicon`}
          width={size === 'sm' ? 24 : size === 'md' ? 32 : 48}
          height={size === 'sm' ? 24 : size === 'md' ? 32 : 48}
          className="rounded-full object-cover"
          onError={() => setImageError(true)}
        />
        <div className={`absolute -bottom-0.5 -right-0.5 ${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'} bg-blue-600 text-white rounded-full flex items-center justify-center`}>
          <Globe className={size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        </div>
      </div>
    )
  }

  // Fallback to icon
  return (
    <div className={`rounded-full bg-gray-200 flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      {faviconLoading ? (
        <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-6 w-6'}`}></div>
      ) : (
        account.account_type === 'company' ? (
          <Building2 className={`text-gray-500 ${iconSizes[size]}`} />
        ) : (
          <User className={`text-gray-500 ${iconSizes[size]}`} />
        )
      )}
    </div>
  )
}
