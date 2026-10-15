
import {
  findPhyloPicImage,
  type PhyloPicImage,
} from './phyloPicService';

interface CacheEntry {
  value: PhyloPicImage | null;
  expiresAt: number;
}

const SUCCESS_TTL_MS = 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 30 * 60 * 1000;

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<PhyloPicImage | null>>();

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function getCachedPhyloPicImage(
  scientificName: string,
): Promise<PhyloPicImage | null> {
  const key = normalizeName(scientificName);

  if (!key) return Promise.resolve(null);

  const cached = cache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.value);
  }

  if (cached) cache.delete(key);

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = findPhyloPicImage(scientificName)
    .then((value) => {
      cache.set(key, {
        value,
        expiresAt: Date.now() +
          (value ? SUCCESS_TTL_MS : MISS_TTL_MS),
      });

      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}

export function clearTaxonIconCache(): void {
  cache.clear();
}

export function getTaxonIconCacheSize(): number {
  return cache.size;
}
