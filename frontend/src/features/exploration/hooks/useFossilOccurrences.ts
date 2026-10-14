import { useEffect, useState } from 'react';

import type { FossilOccurrence } from '../fossilTypes';
import type { ExplorationSearch } from '../filterTypes';
import { fetchFossilOccurrences } from '../../../services/pbdb/pbdbService';

interface FossilOccurrenceState {
  occurrences: FossilOccurrence[];
  loading: boolean;
  error: string | null;
  truncated: boolean;
}

export function useFossilOccurrences(search: ExplorationSearch): FossilOccurrenceState {
  const [occurrences, setOccurrences] = useState<FossilOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  const { west, south, east, north } = search.bounds;
  const { enabled, youngerMa, olderMa, mode, fadeMarginMa } = search.age;
  const { longitude, latitude } = search.radiusCenter;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await fetchFossilOccurrences(search, controller.signal);
        if (!controller.signal.aborted) {
          setOccurrences(result.occurrences);
          setTruncated(result.truncated);
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : 'Unable to load fossil occurrences.');
        setOccurrences([]);
        setTruncated(false);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    west, south, east, north,
    search.geographicMode, search.radiusMiles, longitude, latitude,
    enabled, youngerMa, olderMa, mode, fadeMarginMa,
    search.taxonName, search.taxonRank,
  ]);

  return { occurrences, loading, error, truncated };
}
