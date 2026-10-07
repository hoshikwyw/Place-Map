'use client'

import { removeAmenityIcon, uploadAmenityIcon } from '@/actions/amenities'
import { IconUpload } from '@/components/icon-upload'

export function AmenityIconUpload(props: {
  id: number
  slug: string
  icon: string | null
  iconImage: string | null
  endpoint: string | null
}) {
  return (
    <IconUpload
      {...props}
      upload={uploadAmenityIcon}
      remove={removeAmenityIcon}
      fallbackEmoji="🏷"
      description={{
        withImage: 'Shown on the website instead of the emoji and the drawn icon.',
        withoutImage:
          'Optional. Without one, the website draws its own icon where it has one, and otherwise shows the emoji.',
      }}
    />
  )
}
