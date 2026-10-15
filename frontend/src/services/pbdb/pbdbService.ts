
import type {
  FossilOccurrence,
  PbdbOccurrenceRecord,
  PbdbResponse,
} from '../../features/exploration/fossilTypes';
import type { GeographicBounds } from '../../features/exploration/geographicBounds';
import { getDistanceMiles } from '../../features/exploration/geographicBounds';
import type { ExplorationSearch } from '../../features/exploration/filterTypes';

const PBDB_ENDPOINT = 'https://paleobiodb.org/data1.2/occs/list.json';

// Smaller pages let the map begin populating with fewer records.
const RESULT_LIMIT = 100;
const MAX_PAGES = 3;

export interface FossilOccurrenceResult {
  occurrences: FossilOccurrence[];
  truncated: boolean;
}

export type FossilOccurrenceProgress = (
  result: FossilOccurrenceResult,
) => void;

function parseNumber(value: string | number | undefined): number | null {
  if (value === undefined || value === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseText(value: string | undefined): string | null {
  return value?.trim() || null;
}

function normalizeOccurrence(
  record: PbdbOccurrenceRecord,
): FossilOccurrence | null {
  const longitude = parseNumber(record.lng);
  const latitude = parseNumber(record.lat);

  if (
    longitude === null ||
    latitude === null ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }

  return {
    id: String(record.occurrence_no ?? ''),
    scientificName:
      record.accepted_name?.trim() ||
      record.identified_name?.trim() ||
      'Unidentified fossil',
    longitude,
    latitude,
    earlyInterval: parseText(record.early_interval),
    lateInterval: parseText(record.late_interval),
    olderAgeMa: parseNumber(record.max_ma),
    youngerAgeMa: parseNumber(record.min_ma),
    collectionName: parseText(record.collection_name),
    taxonRank: parseText(record.accepted_rank),
    phylum: parseText(record.phylum),
    className: parseText(record.class),
    orderName: parseText(record.order),
    family: parseText(record.family),
    genus: parseText(record.genus),
    species: parseText(record.species),
    kingdom: parseText(record.kingdom),
  };
}

function validateBounds(bounds: GeographicBounds): void {
  const values = [
    bounds.west,
    bounds.south,
    bounds.east,
    bounds.north,
  ];

  if (!values.every(Number.isFinite)) {
    throw new Error('Map search bounds must be valid numbers.');
  }

  if (
    bounds.west < -180 ||
    bounds.east > 180 ||
    bounds.south < -90 ||
    bounds.north > 90 ||
    bounds.west >= bounds.east ||
    bounds.south >= bounds.north
  ) {
    throw new Error('Map search bounds are invalid.');
  }
}

function addTaxonQuery(
  params: URLSearchParams,
  search: ExplorationSearch,
): void {
  const name = search.taxonName.trim();
  if (!name) return;

  if (search.taxonRank === 'species') {
    params.set('taxon_name', name);
  } else {
    params.set('base_name', name);
  }
}

function addAgeQuery(
  params: URLSearchParams,
  search: ExplorationSearch,
): void {
  if (!search.age.enabled) return;

  const margin =
    search.age.mode === 'fade' ? search.age.fadeMarginMa : 0;

  const younger =
    Math.max(
      0,
      Math.min(search.age.youngerMa, search.age.olderMa) - margin,
    );

  const older =
    Math.max(search.age.youngerMa, search.age.olderMa) + margin;

  params.set('min_ma', String(younger));
  params.set('max_ma', String(older));
}

function normalizeRecords(
  records: PbdbOccurrenceRecord[],
  search: ExplorationSearch,
): FossilOccurrence[] {
  const uniqueRecords = new Map<string, PbdbOccurrenceRecord>();

  for (const record of records) {
    const id = String(record.occurrence_no ?? '');

    if (id && !uniqueRecords.has(id)) {
      uniqueRecords.set(id, record);
    }
  }

  const normalized = Array.from(uniqueRecords.values())
    .map(normalizeOccurrence)
    .filter(
      (occurrence): occurrence is FossilOccurrence =>
        occurrence !== null && occurrence.id.length > 0,
    );

  if (search.geographicMode !== 'radius') {
    return normalized;
  }

  return normalized.filter((occurrence) =>
    getDistanceMiles(search.radiusCenter, {
      longitude: occurrence.longitude,
      latitude: occurrence.latitude,
    }) <= search.radiusMiles,
  );
}

export async function fetchFossilOccurrences(
  search: ExplorationSearch,
  signal?: AbortSignal,
  onProgress?: FossilOccurrenceProgress,
): Promise<FossilOccurrenceResult> {
  const bounds = search.bounds;
  validateBounds(bounds);

  const params = new URLSearchParams({
    lngmin: String(bounds.west),
    lngmax: String(bounds.east),
    latmin: String(bounds.south),
    latmax: String(bounds.north),
    vocab: 'pbdb',
    show: 'coords,loc,stratext,classext',
    limit: String(RESULT_LIMIT),
  });

  addTaxonQuery(params, search);
  addAgeQuery(params, search);

  const records: PbdbOccurrenceRecord[] = [];
  let truncated = false;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    if (signal?.aborted) {
      throw new DOMException('Request aborted.', 'AbortError');
    }

    const pageParams = new URLSearchParams(params);
    pageParams.set('offset', String(page * RESULT_LIMIT));

    const response = await fetch(
      `${PBDB_ENDPOINT}?${pageParams.toString()}`,
      { signal },
    );

    if (!response.ok) {
      throw new Error(
        `Paleobiology Database request failed (${response.status}).`,
      );
    }

    const data = (await response.json()) as PbdbResponse;

    if (!Array.isArray(data.records)) {
      throw new Error(
        'The Paleobiology Database returned an unexpected response.',
      );
    }

    records.push(...data.records);

    const hasMorePages = data.records.length === RESULT_LIMIT;

    // The result is truncated only if the final allowed page is full.
    truncated = page === MAX_PAGES - 1 && hasMorePages;

    // Send accumulated records to the hook immediately after each page.
    onProgress?.({
      occurrences: normalizeRecords(records, search),
      truncated,
    });

    if (!hasMorePages) {
      break;
    }
  }

  return {
    occurrences: normalizeRecords(records, search),
    truncated,
  };
}
