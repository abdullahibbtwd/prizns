import { useState } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import type { JournalLang } from '@/components/concept-3/JournalShell'
import { ListingDateInput } from '@/components/concept-3/ListingDateInput'
import { JournalSelect } from '@/components/ui/JournalSelect'
import type { JournalSelectOption } from '@/components/ui/JournalSelect'
import {
  DEFAULT_LISTING_SORT,
  PUBLIC_LISTING_SORTS,
  type PublicListingSort,
} from '@/lib/listing-filters'
import { cn } from '@/lib/utils'

export type ListingFilterField = {
  value: string
  options: JournalSelectOption[]
  onChange: (value: string) => void
}

export type ListingDateRangeField = {
  from: string
  to: string
  onChange: (patch: { dateFrom?: string; dateTo?: string }) => void
}

export type ListingSortField = {
  value: PublicListingSort
  onChange: (value: PublicListingSort) => void
}

export function ListingFilters({
  lang,
  location,
  series,
  dateRange,
  sort,
}: {
  lang: JournalLang
  /** Optional — Places map companion only. No topic filters. */
  location?: ListingFilterField
  series?: ListingFilterField
  dateRange?: ListingDateRangeField
  sort?: ListingSortField
}) {
  const [open, setOpen] = useState(false)
  const allLabel = lang === 'bg' ? 'Всички' : 'All'
  const sortLabels: Record<PublicListingSort, string> = {
    newest: lang === 'bg' ? 'Най-нови' : 'Newest',
    oldest: lang === 'bg' ? 'Най-стари' : 'Oldest',
    az: lang === 'bg' ? 'А → Я' : 'A → Z',
    za: lang === 'bg' ? 'Я → А' : 'Z → A',
  }

  const fields = [
    location
      ? {
          name: 'location',
          label: lang === 'bg' ? 'Място' : 'Location',
          field: location,
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

  if (fields.length === 0 && !sort && !dateRange) return null

  const activeCount =
    (dateRange?.from ? 1 : 0) +
    (dateRange?.to ? 1 : 0) +
    (location?.value ? 1 : 0) +
    (series?.value ? 1 : 0) +
    (sort && sort.value !== DEFAULT_LISTING_SORT ? 1 : 0)

  const toggleLabel =
    lang === 'bg' ? 'Филтър и подредба' : 'Filter & sort'

  return (
    <div className="mx-auto max-w-7xl px-6 pt-8 md:px-12">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-md border border-[#EAE6DF] bg-white px-4 py-3 text-left transition-colors hover:border-[#0C2686]/30 md:hidden"
        aria-expanded={open}
        aria-controls="listing-filters-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="inline-flex items-center gap-2 font-sans text-[11px] uppercase tracking-[0.2em] text-[#1A1A1A]">
          <SlidersHorizontal className="size-3.5 text-[#0C2686]" />
          {toggleLabel}
          {activeCount > 0 ? (
            <span className="rounded-full bg-[#0C2686] px-1.5 py-0.5 font-sans text-[10px] tracking-normal text-white">
              {activeCount}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-[#1A1A1A]/50 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      <div
        id="listing-filters-panel"
        className={cn(
          'mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4',
          open ? 'grid' : 'hidden',
          'md:mt-0 md:grid',
        )}
      >
        {dateRange ? (
          <>
            <div className="min-w-0">
              <p className="mb-1.5 font-sans text-[11px] uppercase tracking-[0.2em] text-[#1A1A1A]/45">
                {lang === 'bg' ? 'От дата' : 'From date'}
              </p>
              <ListingDateInput
                lang={lang}
                name="dateFrom"
                label={lang === 'bg' ? 'От дата' : 'From date'}
                value={dateRange.from}
                max={dateRange.to || undefined}
                onChange={(value) => dateRange.onChange({ dateFrom: value })}
              />
            </div>
            <div className="min-w-0">
              <p className="mb-1.5 font-sans text-[11px] uppercase tracking-[0.2em] text-[#1A1A1A]/45">
                {lang === 'bg' ? 'До дата' : 'To date'}
              </p>
              <ListingDateInput
                lang={lang}
                name="dateTo"
                label={lang === 'bg' ? 'До дата' : 'To date'}
                value={dateRange.to}
                min={dateRange.from || undefined}
                onChange={(value) => dateRange.onChange({ dateTo: value })}
              />
            </div>
          </>
        ) : null}

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

        {sort ? (
          <div className="min-w-0">
            <p className="mb-1.5 font-sans text-[11px] uppercase tracking-[0.2em] text-[#1A1A1A]/45">
              {lang === 'bg' ? 'Подредба' : 'Sort'}
            </p>
            <JournalSelect
              name="sort"
              variant="boxed"
              label={lang === 'bg' ? 'Подредба' : 'Sort'}
              placeholder={sortLabels[DEFAULT_LISTING_SORT]}
              value={sort.value}
              options={PUBLIC_LISTING_SORTS.map((value) => ({
                value,
                label: sortLabels[value],
              }))}
              onChange={(value) => sort.onChange(parseSortValue(value))}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function parseSortValue(value: string): PublicListingSort {
  if (value === 'oldest') return 'oldest'
  if (value === 'az') return 'az'
  if (value === 'za') return 'za'
  return DEFAULT_LISTING_SORT
}
