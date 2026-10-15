
/**
 * Generate a predictable MapLibre sprite ID for a taxon.
 * Keep this separate from the image URL: multiple occurrences of
 * the same taxon should share one registered sprite.
 */
export function getTaxonMapIconId(scientificName: string): string {
  const normalized = scientificName
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `taxon-${normalized || 'unknown'}`;
}
