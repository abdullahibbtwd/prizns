import { useEffect, useRef } from 'react'
import { Map, Marker, NavigationControl, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { PlacesMapPin } from '@/lib/tags-api'

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
    labels: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: 'satellite', type: 'raster', source: 'satellite' },
    { id: 'labels', type: 'raster', source: 'labels' },
  ],
}

const NW_CENTER: [number, number] = [23.5, 43.65]

export function PlacesMap({
  pins,
  selectedSlug,
  onSelect,
}: {
  pins: PlacesMapPin[]
  selectedSlug: string
  onSelect: (slug: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markersRef = useRef<Marker[]>([])
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    try {
      const map = new Map({
        container: containerRef.current,
        style: SATELLITE_STYLE,
        center: NW_CENTER,
        zoom: 7.4,
      })
      map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
      mapRef.current = map
    } catch {
      mapRef.current = null
    }
    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    for (const pin of pins) {
      const el = document.createElement('button')
      el.type = 'button'
      el.setAttribute('aria-label', pin.nameBg)
      el.className =
        pin.slug === selectedSlug
          ? 'size-4 rounded-full border-2 border-white bg-[#0C2686]'
          : 'size-3 rounded-full border-2 border-white bg-[#C45C26]'
      el.addEventListener('click', (event) => {
        event.stopPropagation()
        onSelectRef.current(pin.slug)
      })
      const marker = new Marker({ element: el })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map)
      markersRef.current.push(marker)
    }
  }, [pins, selectedSlug])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedSlug) return
    const pin = pins.find((item) => item.slug === selectedSlug)
    if (!pin) return
    map.flyTo({ center: [pin.lng, pin.lat], zoom: 9.5, duration: 700 })
  }, [pins, selectedSlug])

  if (pins.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="h-[320px] w-full overflow-hidden rounded-[16px] border border-[#EAE6DF] md:h-[420px]"
    />
  )
}
