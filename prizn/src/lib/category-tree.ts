import type { JournalSelectOption } from '@/components/ui/JournalSelect'
import type { CmsCategory } from '@/lib/categories-api'
import {
  CATEGORY_SLUG_TO_SECTION,
  HIDDEN_CMS_CATEGORY_SLUGS,
  LANDING_CATEGORY,
  type LandingKey,
} from '@/lib/category-section'
import type { ArticleSection } from '@/lib/cms-types'

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
  const visible = visibleCmsCategories(categories)
  const parents = visible
    .filter((row) => !row.parentId)
    .slice()
    .sort((a, b) => sortByName(a, b, lang))
  const childrenOf = new Map<string, CmsCategory[]>()
  for (const row of visible) {
    if (!row.parentId) continue
    const list = childrenOf.get(row.parentId) ?? []
    list.push(row)
    childrenOf.set(row.parentId, list)
  }
  for (const list of childrenOf.values()) {
    list.sort((a, b) => sortByName(a, b, lang))
  }

  const choices: CategoryChoice[] = []
  for (const parent of parents) {
    choices.push({
      id: parent.id,
      slug: parent.slug,
      label: categoryName(parent, lang),
      parentId: null,
      indent: false,
    })
    for (const child of childrenOf.get(parent.id) ?? []) {
      choices.push({
        id: child.id,
        slug: child.slug,
        label: categoryName(child, lang),
        parentId: parent.id,
        indent: true,
      })
    }
  }
  return choices
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

function landingSection(landing: LandingKey): ArticleSection | 'stories' {
  return LANDING_CATEGORY[landing].section
}

function slugMatchesLanding(slug: string, landing: LandingKey) {
  const mapped = CATEGORY_SLUG_TO_SECTION[slug]
  if (!mapped) return true
  const section = landingSection(landing)
  if (section === 'stories') {
    return mapped === 'human-stories' || mapped === 'featured'
  }
  return mapped === section
}

export function landingCategoryChoices(
  categories: CmsCategory[],
  landing: LandingKey,
  lang: 'bg' | 'en',
): CategoryChoice[] {
  const spec = LANDING_CATEGORY[landing]
  const visible = visibleCmsCategories(categories)
  const pillar = visible.find((row) => row.slug === spec.pillar)
  const extra = (spec.extra ?? [])
    .map((slug) => visible.find((row) => row.slug === slug))
    .filter((row): row is CmsCategory => Boolean(row))

  const children = visible
    .filter((row) => pillar && row.parentId === pillar.id)
    .filter((row) => slugMatchesLanding(row.slug, landing))
    .sort((a, b) => sortByName(a, b, lang))

  const extras = extra
    .filter((row) => slugMatchesLanding(row.slug, landing))
    .sort((a, b) => sortByName(a, b, lang))

  return [...children, ...extras].map((row) => ({
    id: row.id,
    slug: row.slug,
    label: categoryName(row, lang),
    parentId: row.parentId,
    indent: false,
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
  const child = rows.find((row) => row.parentId)
  return (child ?? rows[0])?.id ?? categoryIds[0] ?? ''
}

export function slugsForCategory(
  category: CmsCategory | undefined,
  categories: CmsCategory[],
) {
  if (!category) return []
  const parent = category.parentId
    ? categories.find((row) => row.id === category.parentId)
    : undefined
  return [category.slug, parent?.slug]
}
