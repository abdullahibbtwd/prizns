import type { JournalLang } from '@/components/concept-3/JournalShell'
import { JournalSelect } from '@/components/ui/JournalSelect'
import type { JournalSelectOption } from '@/components/ui/JournalSelect'
import type { LandingKey } from '@/lib/category-section'
import { landingCategoryChoices } from '@/lib/category-tree'
import { usePublicCategories } from '@/lib/public-content'

export type ListingFilterField = {
  value: string
  options: JournalSelectOption[]
  onChange: (value: string) => void
}

export function ListingFilters({
  lang,
  location,
  topic,
  series,
  category,
}: {
  lang: JournalLang
  location?: ListingFilterField
  topic?: ListingFilterField
  series?: ListingFilterField
  category?: ListingFilterField
}) {
  const allLabel = lang === 'bg' ? 'Всички' : 'All'
  const fields = [
    category
      ? {
          name: 'category',
          label: lang === 'bg' ? 'Категория' : 'Category',
          field: category,
        }
      : null,
    location
      ? {
          name: 'location',
          label: lang === 'bg' ? 'Място' : 'Location',
          field: location,
        }
      : null,
    topic
      ? {
          name: 'topic',
          label: lang === 'bg' ? 'Тема' : 'Topic',
          field: topic,
        }
      : null,
    series
      ? {
          name: 'series',
          label: lang === 'bg' ? 'Поредица' : 'Series',
          field: series,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item))

  if (fields.length === 0) return null

  return (
    <div className="mx-auto max-w-7xl px-6 pt-8 md:px-12">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((item) => (
          <div key={item.name} className="min-w-0">
            <p className="mb-1.5 font-sans text-[11px] uppercase tracking-[0.2em] text-[#1A1A1A]/45">
              {item.label}
            </p>
            <JournalSelect
              name={item.name}
              variant="boxed"
              label={item.label}
              placeholder={allLabel}
              value={item.field.value}
              options={[
                { value: '', label: allLabel },
                ...item.field.options,
              ]}
              onChange={item.field.onChange}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function LandingCategoryFilters({
  lang,
  landing,
  category,
  onChange,
}: {
  lang: JournalLang
  landing: LandingKey
  category: string
  onChange: (value: string) => void
}) {
  const { data } = usePublicCategories()
  const options = landingCategoryChoices(data ?? [], landing, lang)
  if (options.length === 0) return null
  return (
    <ListingFilters
      lang={lang}
      category={{
        value: category,
        options: options.map((item) => ({
          value: item.slug,
          label: item.label,
        })),
        onChange,
      }}
    />
  )
}
