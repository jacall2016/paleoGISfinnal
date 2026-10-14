import type { FossilOccurrence } from '../fossilTypes';

export interface OccurrenceGroup {
  key: string;
  scientificName: string;
  count: number;
  occurrences: FossilOccurrence[];
  youngestMa: number | null;
  oldestMa: number | null;
}

/**
 * Returns the youngest known age of an occurrence.
 * Smaller Ma values represent more recent geological ages.
 */
function getYoungestAge(
  occurrence: FossilOccurrence,
): number | null {
  const age = occurrence.youngerAgeMa;
  return typeof age === 'number' && Number.isFinite(age)
    ? age
    : null;
}

/**
 * Group occurrences by scientific name without discarding
 * any underlying occurrence records.
 */
export function groupOccurrences(
  occurrences: FossilOccurrence[],
): OccurrenceGroup[] {
  const groups = new Map<string, FossilOccurrence[]>();

  for (const occurrence of occurrences) {
    const scientificName =
      occurrence.scientificName?.trim() || 'Unknown organism';

    const key = scientificName.toLocaleLowerCase();
    const existing = groups.get(key);

    if (existing) {
      existing.push(occurrence);
    } else {
      groups.set(key, [occurrence]);
    }
  }

  return Array.from(groups.entries())
    .map(([key, records]) => {
      const knownYoungestAges = records
        .map(getYoungestAge)
        .filter((age): age is number => age !== null);

      const knownOldestAges = records
        .map((record) => record.olderAgeMa)
        .filter(
          (age): age is number =>
            typeof age === 'number' && Number.isFinite(age),
        );

      return {
        key,
        scientificName:
          records[0]?.scientificName?.trim() || 'Unknown organism',
        count: records.length,
        occurrences: [...records].sort((a, b) => {
          const ageA = getYoungestAge(a) ?? -1;
          const ageB = getYoungestAge(b) ?? -1;
          return ageB - ageA;
        }),
        youngestMa: knownYoungestAges.length
          ? Math.min(...knownYoungestAges)
          : null,
        oldestMa: knownOldestAges.length
          ? Math.max(...knownOldestAges)
          : null,
      };
    })
    .sort((a, b) => {
      // Put groups with known ages before groups without ages.
      if (a.youngestMa === null) return 1;
      if (b.youngestMa === null) return -1;

      // Newest to oldest.
      return a.youngestMa - b.youngestMa;
    });
}