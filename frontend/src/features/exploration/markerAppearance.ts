import type { FossilOccurrence } from './fossilTypes';
import type { TaxonomicRank } from './filterTypes';

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getHue(value: string): number {
  return hashString(value) % 360;
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = l - chroma / 2;
  let rgb: [number, number, number];
  if (hue < 60) rgb = [chroma, x, 0];
  else if (hue < 120) rgb = [x, chroma, 0];
  else if (hue < 180) rgb = [0, chroma, x];
  else if (hue < 240) rgb = [0, x, chroma];
  else if (hue < 300) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];
  return `#${rgb.map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, '0')).join('')}`;
}

function getSpeciesKey(occurrence: FossilOccurrence): string {
  return occurrence.species?.trim() || occurrence.scientificName;
}

function getGenusKey(occurrence: FossilOccurrence): string {
  return occurrence.genus?.trim() || occurrence.scientificName.split(/\s+/)[0];
}

/**
 * Marker colors are contextual to the current taxonomic search:
 * species search = one color; genus search = distinct species colors;
 * family and higher = a genus hue with species-level shade variations.
 */
export function getTaxonomicColor(
  occurrence: FossilOccurrence,
  rank: TaxonomicRank,
  searchedName: string,
): string {
  if (rank === 'species' && searchedName.trim()) return hslToHex(164, 35, 52);

  if (rank === 'genus') {
    const hue = getHue(getSpeciesKey(occurrence));
    const saturation = 52 + (hashString(`sat:${getSpeciesKey(occurrence)}`) % 30);
    return hslToHex(hue, saturation, 58);
  }

  const genusKey = getGenusKey(occurrence);
  const speciesKey = getSpeciesKey(occurrence);
  const hue = getHue(genusKey);
  const saturation = 42 + (hashString(`sat:${speciesKey}`) % 36);
  const lightness = 38 + (hashString(`light:${speciesKey}`) % 34);
  return hslToHex(hue, saturation, lightness);
}

/** Uses only broad taxonomic information supplied by PBDB; diet is not inferred. */
export function getTaxonIcon(occurrence: FossilOccurrence): string {
  const classification = [occurrence.kingdom, occurrence.phylum, occurrence.className]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/plantae|plant|tracheophyta|magnoliophyta/.test(classification)) return 'leaf';
  if (/actinopterygii|chondrichthyes|fish|sarcopterygii/.test(classification)) return 'fish';
  if (/mammalia/.test(classification)) return 'mammal';
  return 'fossil';
}
