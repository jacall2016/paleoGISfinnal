
import type { Feature, FeatureCollection, Point } from 'geojson';

import type { FossilOccurrence } from '../fossilTypes';
import type { ExplorationSearch } from '../filterTypes';

import { getTaxonomicColor } from '../markerAppearance';
import { DEFAULT_FOSSIL_ICON } from './fallbackMarkerIcon';

export type FossilFeatureProperties = {
  /** ID of the first occurrence at this exact location. */
  occurrenceId: string;

  /** IDs of every occurrence represented by this marker. */
  occurrenceIds: string[];

  /** Number of occurrences represented by this marker. */
  occurrenceCount: number;

  /** Taxonomic and visual properties of the first occurrence. */
  scientificName: string;
  color: string;
  icon: string;
  opacity: number;

  olderAgeMa: number | null;
  youngerAgeMa: number | null;
  earlyInterval: string | null;
  lateInterval: string | null;
  collectionName: string | null;
  genus: string | null;
  family: string | null;
};

export type FossilFeature = Feature<Point, FossilFeatureProperties>;

export type FossilFeatureCollection =
  FeatureCollection<Point, FossilFeatureProperties>;

export interface VisibleOccurrence {
  occurrence: FossilOccurrence;
  opacity: number;
}

/**
 * Group occurrences at exactly identical coordinates.
 *
 * Every marker uses the default paw-print icon until a registered
 * PhyloPic icon ID is supplied through iconByOccurrenceId.
 *
 * Each output feature represents one marker location, while its properties
 * retain the IDs and total count of all occurrences at that location.
 * MapLibre clusters sum occurrenceCount to preserve accurate totals.
 */
export function createOccurrenceGeoJson(
  visibleOccurrences: VisibleOccurrence[],
  search: ExplorationSearch,
  iconByOccurrenceId: ReadonlyMap<string, string> = new Map(),
): FossilFeatureCollection {
  const locations = new Map<
    string,
    {
      longitude: number;
      latitude: number;
      occurrences: VisibleOccurrence[];
    }
  >();

  for (const item of visibleOccurrences) {
    const { occurrence } = item;

    if (
      !Number.isFinite(occurrence.longitude) ||
      !Number.isFinite(occurrence.latitude)
    ) {
      continue;
    }

    // Exact coordinate matches only; nearby points remain separate.
    const locationKey =
      `${occurrence.longitude},${occurrence.latitude}`;

    let location = locations.get(locationKey);

    if (!location) {
      location = {
        longitude: occurrence.longitude,
        latitude: occurrence.latitude,
        occurrences: [],
      };

      locations.set(locationKey, location);
    }

    location.occurrences.push(item);
  }

  const features: FossilFeature[] = [];

  for (const location of locations.values()) {
    // Preserve input order: the first occurrence represents the marker.
    const representative = location.occurrences[0];
    const { occurrence, opacity } = representative;

    features.push({
      type: 'Feature',
      id: occurrence.id,
      geometry: {
        type: 'Point',
        coordinates: [
          location.longitude,
          location.latitude,
        ],
      },
      properties: {
        occurrenceId: occurrence.id,
        occurrenceIds: location.occurrences.map(
          ({ occurrence: item }) => item.id,
        ),
        occurrenceCount: location.occurrences.length,

        scientificName: occurrence.scientificName,
        color: getTaxonomicColor(
          occurrence,
          search.taxonRank,
          search.taxonName,
        ),

        // Only use a PhyloPic icon when the icon-loading system
        // has supplied an image ID for this occurrence.
        // Otherwise, use the registered paw-print fallback.
        icon:
          iconByOccurrenceId.get(occurrence.id) ??
          DEFAULT_FOSSIL_ICON,

        opacity,

        olderAgeMa: occurrence.olderAgeMa,
        youngerAgeMa: occurrence.youngerAgeMa,
        earlyInterval: occurrence.earlyInterval,
        lateInterval: occurrence.lateInterval,
        collectionName: occurrence.collectionName,
        genus: occurrence.genus,
        family: occurrence.family,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
