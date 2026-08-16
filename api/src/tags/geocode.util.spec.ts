import { geocodeNominatim } from './geocode.util';

describe('geocodeNominatim', () => {
  it('returns a point inside NW Bulgaria', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '43.99', lon: '22.87' }],
    });
    await expect(geocodeNominatim('Vidin', fetchImpl as never)).resolves.toEqual({
      lat: 43.99,
      lng: 22.87,
    });
    expect(fetchImpl).toHaveBeenCalled();
  });

  it('rejects points outside the region', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '42.7', lon: '23.32' }],
    });
    await expect(geocodeNominatim('Sofia', fetchImpl as never)).resolves.toBeNull();
  });

  it('returns null on HTTP failure', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false });
    await expect(geocodeNominatim('Lom', fetchImpl as never)).resolves.toBeNull();
  });
});
