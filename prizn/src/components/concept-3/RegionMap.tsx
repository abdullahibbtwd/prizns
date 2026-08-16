import { useQuery } from '@tanstack/react-query'
import { listPlacesMap } from '@/lib/tags-api'
import { PlacesMap } from '@/components/concept-3/PlacesMap'

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
      <PlacesMap
        pins={pins}
        selectedSlug={selectedSlug}
        onSelect={onSelect}
      />
    </div>
  )
}

