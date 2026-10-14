import type { GeographicBounds, GeographicPoint } from './geographicBounds';

export type GeographicSearchMode = 'viewport' | 'radius';
export type TaxonomicRank =
  | 'all'
  | 'species'
  | 'genus'
  | 'family'
  | 'order'
  | 'class'
  | 'phylum';
export type AgeFilterMode = 'fade' | 'strict';

export interface AgeFilter {
  enabled: boolean;
  youngerMa: number;
  olderMa: number;
  mode: AgeFilterMode;
  fadeMarginMa: number;
}

export interface ExplorationSearch {
  bounds: GeographicBounds;
  geographicMode: GeographicSearchMode;
  radiusCenter: GeographicPoint;
  radiusMiles: number;
  age: AgeFilter;
  taxonName: string;
  taxonRank: TaxonomicRank;
}

export const DEFAULT_AGE_FILTER: AgeFilter = {
  enabled: false,
  youngerMa: 66,
  olderMa: 145,
  mode: 'fade',
  fadeMarginMa: 10,
};
