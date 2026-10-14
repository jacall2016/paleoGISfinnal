import type { Feature, FeatureCollection, Point } from 'geojson';

import type { FossilOccurrence } from '../fossilTypes';
import type { ExplorationSearch } from '../filterTypes';

import { getTaxonIcon, getTaxonomicColor } from '../markerAppearance';

export type FossilFeatureProperties = {
  occurrenceId: string;
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
 * Build map features from the records that pass the current age
 * visibility calculation.
 *
 * Keep one feature per occurrence. MapLibre handles spatial clustering;
 * the popup can separately group the underlying records.
 */
export function createOccurrenceGeoJson(
  visibleOccurrences: VisibleOccurrence[],
  search: ExplorationSearch,
): FossilFeatureCollection {
  const features: FossilFeature[] = [];

  for (const { occurrence, opacity } of visibleOccurrences) {
    if (
      !Number.isFinite(occurrence.longitude) ||
      !Number.isFinite(occurrence.latitude)
    ) {
      continue;
    }

    features.push({
      type: 'Feature',
      id: occurrence.id,
      geometry: {
        type: 'Point',
        coordinates: [
          occurrence.longitude,
          occurrence.latitude,
        ],
      },
      properties: {
        occurrenceId: occurrence.id,
        scientificName: occurrence.scientificName,
        color: getTaxonomicColor(
          occurrence,
          search.taxonRank,
          search.taxonName,
        ),
        icon: getTaxonIcon(occurrence),
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