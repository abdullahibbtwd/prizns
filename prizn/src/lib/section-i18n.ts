import sectionI18n from '@/lib/section-i18n.json' with { type: 'json' }
import type { ArticleSection } from '@/lib/cms-types'

export type SectionLocale = 'bg' | 'en'

type SectionMeta = {
  label: { bg: string; en: string }
  publicLabel?: { bg: string; en: string }
  categoryBg: string
}

const sections = sectionI18n as Record<ArticleSection, SectionMeta>

function normalizeSection(section: string): ArticleSection {
  return (
    section === 'human_stories' ? 'human-stories' : section
  ) as ArticleSection
}

export function getSectionLabel(
  section: string,
  lang: SectionLocale = 'bg',
): string {
  const entry = sections[normalizeSection(section)]
  if (!entry) return section
  return entry.label[lang] ?? entry.label.bg
}

/** Public site label (e.g. Gallery vs CMS Media). */
export function getSectionPublicLabel(
  section: string,
  lang: SectionLocale = 'bg',
): string {
  const entry = sections[normalizeSection(section)]
  if (!entry) return section
  const labels = entry.publicLabel ?? entry.label
  return labels[lang] ?? labels.bg
}

export function getSectionCategoryBg(section: ArticleSection): string {
  return sections[section]?.categoryBg ?? 'Материал'
}

/** Flat maps for i18next `cms.sections.*` (CMS labels). */
export function sectionLabelsForLang(lang: SectionLocale): Record<string, string> {
  return Object.fromEntries(
    Object.entries(sections).map(([key, value]) => [key, value.label[lang]]),
  )
}
