import type { TFunction } from 'i18next'
import type { ContactCategory } from '@/lib/contact-api'

const CATEGORY_KEYS: Record<ContactCategory, string> = {
  BUSINESS: 'cms.contactDesk.catBusiness',
  STORY_TIP: 'cms.contactDesk.catStoryTip',
  SPAM: 'cms.contactDesk.catSpam',
  GENERAL: 'cms.contactDesk.catGeneral',
  UNKNOWN: 'cms.contactDesk.catUnknown',
}

export function contactCategoryLabel(
  category: ContactCategory,
  t: TFunction,
): string {
  return t(CATEGORY_KEYS[category])
}
