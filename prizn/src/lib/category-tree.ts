import type { JournalSelectOption } from '@/components/ui/JournalSelect'
import type { CmsCategory } from '@/lib/categories-api'
import { HIDDEN_CMS_CATEGORY_SLUGS } from '@/lib/category-section'

export type CategoryChoice = {
  id: string
  slug: string
  label: string
  parentId: string | null
  indent: boolean
}

function categoryName(category: CmsCategory, lang: 'bg' | 'en') {
  if (lang === 'bg') return category.nameBg
  return category.nameEn || category.name || category.nameBg
}

function sortByName(a: CmsCategory, b: CmsCategory, lang: 'bg' | 'en') {
  return categoryName(a, lang).localeCompare(categoryName(b, lang), lang)
}

export function visibleCmsCategories(categories: CmsCategory[]) {
  return categories.filter((row) => !HIDDEN_CMS_CATEGORY_SLUGS.has(row.slug))
}

export function categoryTreeChoices(
  categories: CmsCategory[],
  lang: 'bg' | 'en',
): CategoryChoice[] {
  return visibleCmsCategories(categories)
    .filter((row) => !row.parentId)
    .slice()
    .sort((a, b) => sortByName(a, b, lang))
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      label: categoryName(row, lang),
      parentId: null,
      indent: false,
    }))
}

export function categorySelectOptions(
  categories: CmsCategory[],
  lang: 'bg' | 'en',
  valueKey: 'id' | 'slug' = 'id',
): JournalSelectOption[] {
  return categoryTreeChoices(categories, lang).map((item) => ({
    value: valueKey === 'slug' ? item.slug : item.id,
    label: item.label,
    indent: item.indent,
  }))
}

export function primaryCategoryId(
  categoryIds: string[] | undefined,
  categories: CmsCategory[],
) {
  if (!categoryIds?.length) return ''
  const rows = categoryIds
    .map((id) => categories.find((row) => row.id === id))
    .filter((row): row is CmsCategory => Boolean(row))
  const root = rows.find((row) => !row.parentId)
  return (root ?? rows[0])?.id ?? categoryIds[0] ?? ''
}

export function slugsForCategory(category: CmsCategory | undefined) {
  if (!category) return []
  return [category.slug]
}
