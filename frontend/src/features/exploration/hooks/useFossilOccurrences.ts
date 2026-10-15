
import { useEffect, useRef, useState } from 'react';

import type { FossilOccurrence } from '../fossilTypes';
import type { ExplorationSearch } from '../filterTypes';
import { fetchFossilOccurrences } from '../../../services/pbdb/pbdbService';

interface FossilOccurrenceState {
  occurrences: FossilOccurrence[];
  loading: boolean;
  error: string | null;
  truncated: boolean;
}

const SEARCH_DEBOUNCE_MS = 350;

export function useFossilOccurrences(
  search: ExplorationSearch,
): FossilOccurrenceState {
  const [occurrences, setOccurrences] = useState<FossilOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  // A ref avoids restarting the effect just because the first batch arrived.
  const hasLoadedOnce = useRef(false);

  const { west, south, east, north } = search.bounds;
  const { enabled, youngerMa, olderMa, mode, fadeMarginMa } = search.age;
  const { longitude, latitude } = search.radiusCenter;

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    // Start the initial request immediately; debounce subsequent searches.
    const delay = hasLoadedOnce.current ? SEARCH_DEBOUNCE_MS : 0;

    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await fetchFossilOccurrences(
          search,
          controller.signal,
          (progress) => {
            if (controller.signal.aborted) return;

            // Publish each PBDB page as soon as it arrives.
            setOccurrences(progress.occurrences);
            setTruncated(progress.truncated);

            if (progress.occurrences.length > 0) {
              hasLoadedOnce.current = true;
            }
          },
        );

        if (controller.signal.aborted) return;

        setOccurrences(result.occurrences);
        setTruncated(result.truncated);
        hasLoadedOnce.current = true;
      } catch (cause) {
        if (controller.signal.aborted) return;

        setError(
          cause instanceof Error
            ? cause.message
            : 'Unable to load fossil occurrences.',
        );

        // Keep existing or partially loaded occurrences visible on failure.
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    west,
    south,
    east,
    north,
    search.geographicMode,
    search.radiusMiles,
    longitude,
    latitude,
    enabled,
    youngerMa,
    olderMa,
    mode,
    fadeMarginMa,
    search.taxonName,
    search.taxonRank,
  ]);

  return { occurrences, loading, error, truncated };
}
