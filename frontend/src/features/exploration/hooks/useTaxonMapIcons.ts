import { useEffect, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';

import type { FossilOccurrence } from '../fossilTypes';
import { loadRemoteTaxonIcon } from '../utils/markerIcons';
import { resolveTaxonIcon } from '../../../services/phyloPic/taxonIconResolver';
import { getTaxonMapIconId } from '../../../services/phyloPic/mapIconId';

type VisibleOccurrence = {
  occurrence: FossilOccurrence;
  opacity: number;
};

/**
 * Resolves PhyloPic images and registers them with MapLibre.
 *
 * The returned map associates occurrence IDs with registered MapLibre
 * image IDs. Occurrences without a remote icon continue to use the
 * existing fallback behavior in the map layers.
 */
export function useTaxonMapIcons(
  map: MapLibreMap | null,
  visibleOccurrences: VisibleOccurrence[],
): Map<string, string> {
  const [taxonIconIds, setTaxonIconIds] = useState<Map<string, string>>(
    () => new Map(),
  );

  useEffect(() => {
    if (!map) {
      setTaxonIconIds(new Map());
      return;
    }

    // Capture the non-null map for use in asynchronous callbacks.
    const activeMap = map;
    let cancelled = false;

    async function loadTaxonIcons() {
      const nextIcons = new Map<string, string>();

      // Resolve each distinct scientific name only once per effect run.
      const uniqueTaxa = new Map<string, FossilOccurrence>();

      for (const { occurrence } of visibleOccurrences) {
        const name = occurrence.scientificName?.trim();

        if (!name) continue;

        const normalizedName = name.toLocaleLowerCase();

        if (!uniqueTaxa.has(normalizedName)) {
          uniqueTaxa.set(normalizedName, occurrence);
        }
      }

      // Resolve different taxa concurrently.
      const resolvedTaxa = await Promise.all(
        [...uniqueTaxa.entries()].map(
          async ([normalizedName, occurrence]) => {
            const name = occurrence.scientificName.trim();

            try {
              const result = await resolveTaxonIcon(occurrence);

              // Only register remotely resolved PhyloPic images here.
              if (result.source !== 'phylopic') {
                return [normalizedName, null] as const;
              }

              // The map icon ID is shared by occurrences of the same taxon.
              const imageId = getTaxonMapIconId(name);

              const loaded = await loadRemoteTaxonIcon(
                activeMap,
                imageId,
                result.imageUrl,
              );

              return [
                normalizedName,
                loaded ? imageId : null,
              ] as const;
            } catch (error) {
              console.warn(
                `Could not resolve a map icon for "${name}".`,
                error,
              );

              return [normalizedName, null] as const;
            }
          },
        ),
      );

      // Ignore results if this effect has been cleaned up.
      if (cancelled) return;

      const iconIdByTaxon = new Map<string, string>();

      for (const [normalizedName, imageId] of resolvedTaxa) {
        if (imageId) {
          iconIdByTaxon.set(normalizedName, imageId);
        }
      }

      // Map taxon-level results back to individual occurrences.
      for (const { occurrence } of visibleOccurrences) {
        const normalizedName =
          occurrence.scientificName?.trim().toLocaleLowerCase();

        if (!normalizedName) continue;

        const imageId = iconIdByTaxon.get(normalizedName);

        if (imageId) {
          nextIcons.set(occurrence.id, imageId);
        }
      }

      if (!cancelled) {
        setTaxonIconIds(nextIcons);
      }
    }

    void loadTaxonIcons();

    return () => {
      cancelled = true;
    };
  }, [map, visibleOccurrences]);

  return taxonIconIds;
}