
import { useEffect, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { FossilOccurrence } from '../fossilTypes';
import { resolveTaxonIcon } from '../../../services/phyloPic/taxonIconResolver';
import { getTaxonMapIconId } from '../../../services/phyloPic/mapIconId';
import { loadRemoteTaxonIcon } from '../utils/markerIcons';

type VisibleOccurrence = {
  occurrence: FossilOccurrence;
  opacity: number;
};

type IconResolution = string | null;

/**
 * Share PhyloPic lookups across hook rerenders and filter changes.
 * Successful icon IDs and failed lookups are cached so taxa without
 * images do not trigger repeated requests.
 */
const taxonIconCache = new Map<string, IconResolution>();
const taxonIconInFlight = new Map<string, Promise<IconResolution>>();

const MAX_CONCURRENT_TAXON_LOOKUPS = 3;

/**
 * Prevent broad searches from triggering hundreds of external requests.
 * Additional taxa can be loaded on a later search or filter change.
 */
const MAX_TAXA_PER_PASS = 40;

function normalizeTaxonName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

async function resolveOneTaxonIcon(
  map: MapLibreMap,
  occurrence: FossilOccurrence,
  taxonName: string,
): Promise<IconResolution> {
  const key = normalizeTaxonName(taxonName);

  if (taxonIconCache.has(key)) {
    return taxonIconCache.get(key) ?? null;
  }

  const existing = taxonIconInFlight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<IconResolution> => {
    try {
      const result = await resolveTaxonIcon(occurrence);

      if (result.source !== 'phylopic' || !result.imageUrl) {
        taxonIconCache.set(key, null);
        return null;
      }

      const iconId = getTaxonMapIconId(taxonName);
      const loaded = await loadRemoteTaxonIcon(
        map,
        iconId,
        result.imageUrl,
      );

      const resolved = loaded ? iconId : null;
      taxonIconCache.set(key, resolved);

      return resolved;
    } catch (error) {
      // Cache failures for this page session to prevent retry storms.
      taxonIconCache.set(key, null);

      console.warn(
        `Could not load a PhyloPic icon for "${taxonName}".`,
        error,
      );

      return null;
    } finally {
      taxonIconInFlight.delete(key);
    }
  })();

  taxonIconInFlight.set(key, promise);

  return promise;
}

export function useTaxonMapIcons(
  map: MapLibreMap | null,
  visibleOccurrences: VisibleOccurrence[],
): Map<string, string> {
  const [iconIds, setIconIds] = useState<Map<string, string>>(
    () => new Map(),
  );

  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    const activeMap = map;
    let cancelled = false;

    const uniqueTaxa = new Map<string, FossilOccurrence>();

    for (const { occurrence } of visibleOccurrences) {
      const name = occurrence.scientificName?.trim();

      if (!name) continue;

      const key = normalizeTaxonName(name);

      if (!uniqueTaxa.has(key)) {
        uniqueTaxa.set(key, occurrence);
      }

      if (uniqueTaxa.size >= MAX_TAXA_PER_PASS) break;
    }

    const work = [...uniqueTaxa.entries()];
    const nextIcons = new Map<string, string>();
    let nextIndex = 0;

    async function worker() {
      while (!cancelled && nextIndex < work.length) {
        const [key, occurrence] = work[nextIndex++];

        const name = occurrence.scientificName?.trim();
        if (!name) continue;

        const iconId = await resolveOneTaxonIcon(
            activeMap,
            occurrence,
            name,
        );

        if (cancelled) return;

        if (iconId) {
          nextIcons.set(key, iconId);
        }
      }
    }

    void Promise.all(
      Array.from(
        {
          length: Math.min(
            MAX_CONCURRENT_TAXON_LOOKUPS,
            work.length,
          ),
        },
        () => worker(),
      ),
    ).then(() => {
      if (cancelled) return;

      // Map taxon icon IDs to each matching occurrence ID.
      const byOccurrenceId = new Map<string, string>();

      for (const { occurrence } of visibleOccurrences) {
        const name = occurrence.scientificName?.trim();
        if (!name) continue;

        const iconId = nextIcons.get(normalizeTaxonName(name));

        if (iconId) {
          byOccurrenceId.set(occurrence.id, iconId);
        }
      }

      setIconIds(byOccurrenceId);
    });

    return () => {
      cancelled = true;
    };
  }, [map, visibleOccurrences]);

  return iconIds;
}
