import { lazy, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listPlacesMap } from '@/lib/tags-api'

const PlacesMap = lazy(() =>
  import('@/components/concept-3/PlacesMap').then((m) => ({
    default: m.PlacesMap,
  })),
)

export function RegionMap({
  selectedSlug = '',
  onSelect,
  className,
}: {
  selectedSlug?: string
  onSelect: (slug: string) => void
  className?: string
}) {
  const mapQuery = useQuery({
    queryKey: ['places-map'],
    queryFn: listPlacesMap,
  })
  const pins = mapQuery.data ?? []
  if (pins.length === 0) return null

  return (
    <div className={className}>
      <Suspense
        fallback={
          <div
            className="aspect-[16/9] w-full animate-pulse rounded-[12px] bg-[#EAE6DF]"
            aria-hidden
          />
        }
      >
        <PlacesMap
          pins={pins}
          selectedSlug={selectedSlug}
          onSelect={onSelect}
        />
      </Suspense>
    </div>
  )
}
