type ReverseGeocodeResult = {
  display_name?: string
}

const cache = new Map<string, { address: string | null; expiresAt: number }>()

export async function reverseGeocodeOpenStreetMap(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  // Four decimal places is roughly an 11 m cache area and avoids repeat lookups.
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.address

  const apiKey = process.env.LOCATIONIQ_API_KEY
  if (!apiKey) return null

  try {
    const query = new URLSearchParams({
      key: apiKey,
      lat: String(lat),
      lon: String(lng),
      format: 'json',
      addressdetails: '1',
      'accept-language': 'en',
    })
    const response = await fetch(
      `https://us1.locationiq.com/v1/reverse?${query}`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!response.ok) throw new Error(`LocationIQ returned ${response.status}`)
    const result = (await response.json()) as ReverseGeocodeResult
    const address = result.display_name?.trim() || null
    cache.set(cacheKey, { address, expiresAt: Date.now() + 24 * 60 * 60 * 1000 })
    return address
  } catch {
    cache.set(cacheKey, { address: null, expiresAt: Date.now() + 5 * 60 * 1000 })
    return null
  }
}
