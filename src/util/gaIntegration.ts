export interface GaProperty {
  accountId: string
  propertyId: string
  displayName: string
}

export interface GaPropertyResponse {
  properties: GaProperty[]
  projectIds: string[]
}

export const GA_PROPERTY_CACHE_KEY = "ga-property-cache"

export interface GaPropertyCacheEntry {
  timestamp: number
  properties: GaProperty[]
}

export function readGaCache(): GaPropertyCacheEntry | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(GA_PROPERTY_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GaPropertyCacheEntry
    if (!parsed?.properties || !Array.isArray(parsed.properties)) return null
    return parsed
  } catch (err) {
    console.warn("Failed to parse GA property cache", err)
    return null
  }
}

export function writeGaCache(entry: GaPropertyCacheEntry) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(GA_PROPERTY_CACHE_KEY, JSON.stringify(entry))
  } catch (err) {
    console.warn("Failed to persist GA property cache", err)
  }
}

export function clearGaCache() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(GA_PROPERTY_CACHE_KEY)
}

export const GA_CACHE_TTL = 1000 * 60 * 15 // 15 minutes

export const hasValidGaCache = (entry: GaPropertyCacheEntry | null) => {
  if (!entry) return false
  return Date.now() - entry.timestamp < GA_CACHE_TTL
}
