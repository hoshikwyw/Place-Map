'use client'

import { removeCategoryIcon, uploadCategoryIcon } from '@/actions/categories'
import { IconUpload } from '@/components/icon-upload'

export function CategoryIconUpload(props: {
  id: number
  slug: string
  icon: string | null
  iconImage: string | null
  endpoint: string | null
}) {
  return (
    <IconUpload
      {...props}
      upload={uploadCategoryIcon}
      remove={removeCategoryIcon}
      fallbackEmoji="📍"
      description={{
        withImage: 'Shown on the website and in the app instead of the emoji.',
        withoutImage: 'Optional. Without one, the emoji is used everywhere.',
      }}
    />
  )
}
