/** Nominatim viewbox: left, top, right, bottom (NW Bulgaria). */
export const NW_BG_VIEWBOX = '22.0,44.35,24.75,43.05';

const LAT_MIN = 43.0;
const LAT_MAX = 44.4;
const LNG_MIN = 22.0;
const LNG_MAX = 24.85;

export type GeoPoint = { lat: number; lng: number };

function inNorthwestBulgaria(lat: number, lng: number) {
  return lat >= LAT_MIN && lat <= LAT_MAX && lng >= LNG_MIN && lng <= LNG_MAX;
}

export async function geocodeNominatim(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GeoPoint | null> {
  const q = query.trim();
  if (!q) return null;

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', `${q}, Bulgaria`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'bg');
  url.searchParams.set('viewbox', NW_BG_VIEWBOX);
  url.searchParams.set('bounded', '1');
  url.searchParams.set('accept-language', 'bg');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetchImpl(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Prizni/1.0 (https://prizni.bg; editorial map)',
      },
    });
    if (!response.ok) return null;
    const rows = (await response.json()) as Array<{ lat?: string; lon?: string }>;
    const lat = Number(rows[0]?.lat);
    const lng = Number(rows[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (!inNorthwestBulgaria(lat, lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
