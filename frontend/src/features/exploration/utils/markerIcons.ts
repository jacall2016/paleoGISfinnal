
import type { Map as MapLibreMap } from 'maplibre-gl';

import {
  loadDefaultFossilIcon,
  registerDefaultFossilFallback,
} from './fallbackMarkerIcon';

export { DEFAULT_FOSSIL_ICON } from './fallbackMarkerIcon';

/**
 * Register the default paw-print icon synchronously.
 *
 * Call this as soon as the map style is ready, before enabling
 * the occurrence symbol layer.
 */
export function registerMarkerIcons(map: MapLibreMap): void {
  registerDefaultFossilFallback(map);
}

/**
 * Load the preferred default SVG asynchronously.
 *
 * The fallback paw is already registered, so occurrences can
 * display it while the SVG is loading.
 */
export async function loadMarkerIcons(
  map: MapLibreMap,
): Promise<void> {
  await loadDefaultFossilIcon(map);
}

/**
 * Load a PhyloPic SVG and register it as a MapLibre image.
 *
 * Returns true if the image is registered or was already present.
 * Returns false if fetching, decoding, or registration fails.
 */
export async function loadRemoteTaxonIcon(
  map: MapLibreMap,
  imageId: string,
  imageUrl: string,
  pixelSize = 64,
): Promise<boolean> {
  if (map.hasImage(imageId)) {
    return true;
  }

  let objectUrl: string | undefined;

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(
        `PhyloPic request failed: HTTP ${response.status}`,
      );
    }

    const svgText = await response.text();

    if (!/<svg(?:\s|>)/i.test(svgText)) {
      throw new Error(
        'The PhyloPic response does not contain an SVG document.',
      );
    }

    const blob = new Blob([svgText], {
      type: 'image/svg+xml;charset=utf-8',
    });

    objectUrl = URL.createObjectURL(blob);

    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => {
        reject(new Error('The PhyloPic SVG could not be decoded.'));
      };
      image.src = objectUrl!;
    });

    const canvas = document.createElement('canvas');

    canvas.width = pixelSize;
    canvas.height = pixelSize;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas rendering is unavailable.');
    }

    const sourceWidth = image.naturalWidth || pixelSize;
    const sourceHeight = image.naturalHeight || pixelSize;

    const scale = Math.min(
      pixelSize / sourceWidth,
      pixelSize / sourceHeight,
    );

    const width = sourceWidth * scale;
    const height = sourceHeight * scale;

    context.drawImage(
      image,
      (pixelSize - width) / 2,
      (pixelSize - height) / 2,
      width,
      height,
    );

    // Another request may have registered the same image ID
    // while this image was being fetched and decoded.
    if (!map.hasImage(imageId)) {
      map.addImage(
        imageId,
        context.getImageData(0, 0, pixelSize, pixelSize),
        { pixelRatio: 2 },
      );
    }

    return map.hasImage(imageId);
  } catch (error) {
    console.warn(
      `Unable to load PhyloPic icon "${imageId}".`,
      error,
    );

    return false;
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
