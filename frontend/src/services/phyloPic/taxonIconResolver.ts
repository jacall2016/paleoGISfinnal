import type { FossilOccurrence } from '../../features/exploration/fossilTypes';
import { getCachedPhyloPicImage } from './taxonIconCache';
import defaultFossilSvgUrl from '../../assets/icons/default-fossil.svg';
export type TaxonIconMatch =
  | 'name-match'
  | 'genus-match'
  | 'family-match'
  | 'order-match'
  | 'class-match'
  | 'phylum-match'
  | 'missing';

export interface ResolvedTaxonIcon {
  imageUrl: string;
  taxonName: string;
  match: TaxonIconMatch;
  source: 'phylopic' | 'local';
}

const DEFAULT_ICON_URL = defaultFossilSvgUrl;

interface TaxonCandidate {
  name: string;
  match: Exclude<TaxonIconMatch, 'missing'>;
}

function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

function getTaxonCandidates(
  occurrence: FossilOccurrence,
): TaxonCandidate[] {
  const candidates: TaxonCandidate[] = [
    {
      name: occurrence.scientificName,
      match: 'name-match',
    },
  ];

  const broaderCandidates: Array<{
    name: string | null;
    match: TaxonCandidate['match'];
  }> = [
    { name: occurrence.genus, match: 'genus-match' },
    { name: occurrence.family, match: 'family-match' },
    { name: occurrence.orderName, match: 'order-match' },
    { name: occurrence.className, match: 'class-match' },
    { name: occurrence.phylum, match: 'phylum-match' },
  ];

  const seen = new Set(
    candidates.map((candidate) => normalizeName(candidate.name)),
  );

  for (const candidate of broaderCandidates) {
    const name = candidate.name?.trim();

    if (!name) continue;

    const normalized = normalizeName(name);

    if (seen.has(normalized)) continue;

    seen.add(normalized);
    candidates.push({
      name,
      match: candidate.match,
    });
  }

  return candidates;
}

function missingIcon(
  taxonName: string,
): ResolvedTaxonIcon {
  return {
    imageUrl: DEFAULT_ICON_URL,
    taxonName,
    match: 'missing',
    source: 'local',
  };
}

export async function resolveTaxonIcon(
  occurrence: FossilOccurrence,
): Promise<ResolvedTaxonIcon> {
  const scientificName = occurrence.scientificName.trim();

  if (
    !scientificName ||
    scientificName.toLocaleLowerCase() === 'unidentified fossil'
  ) {
    return missingIcon('Unknown fossil');
  }

  const candidates = getTaxonCandidates(occurrence);

  for (const candidate of candidates) {
    try {
      const image = await getCachedPhyloPicImage(candidate.name);

      if (!image) continue;

      // Never accept a result whose returned taxon name does not
      // match the taxon we asked PhyloPic to resolve.
      if (
        normalizeName(image.taxonName) !==
        normalizeName(candidate.name)
      ) {
        continue;
      }

      return {
        imageUrl: image.imageUrl,
        taxonName: image.taxonName,
        match: candidate.match,
        source: 'phylopic',
      };
    } catch (error) {
      // A failed lookup at one taxonomic level should not prevent
      // us from trying the next broader level.
      console.warn(
        `PhyloPic lookup failed for "${candidate.name}".`,
        error,
      );
    }
  }

  return missingIcon(scientificName);
}