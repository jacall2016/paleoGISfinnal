/** A fossil occurrence normalized for use in the application. */
export interface FossilOccurrence {
  id: string;
  scientificName: string;
  longitude: number;
  latitude: number;
  earlyInterval: string | null;
  lateInterval: string | null;
  olderAgeMa: number | null;
  youngerAgeMa: number | null;
  collectionName: string | null;
  taxonRank: string | null;
  phylum: string | null;
  className: string | null;
  orderName: string | null;
  family: string | null;
  genus: string | null;
  species: string | null;
  kingdom: string | null;
}

/** Fields requested from the PBDB readable vocabulary. */
export interface PbdbOccurrenceRecord {
  occurrence_no?: string | number;
  identified_name?: string;
  accepted_name?: string;
  accepted_rank?: string;
  early_interval?: string;
  late_interval?: string;
  max_ma?: string | number;
  min_ma?: string | number;
  lng?: string | number;
  lat?: string | number;
  collection_name?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
  kingdom?: string;
}

export interface PbdbResponse {
  records?: PbdbOccurrenceRecord[];
  warnings?: string[];
  count?: number;
  records_returned?: number;
}
