
import type { Map as MapLibreMap } from 'maplibre-gl';

export const DEFAULT_FOSSIL_ICON = 'default-fossil';

const DEFAULT_ICON_SIZE = 64;
const DEFAULT_ICON_URL =
  `${import.meta.env.BASE_URL}icons/default-fossil.svg`;

/**
 * Draw a paw-print icon on a transparent canvas.
 *
 * This provides a reliable fallback when the default SVG is
 * still loading or cannot be loaded.
 */
function createFallbackPawIcon(): ImageData {
  const size = DEFAULT_ICON_SIZE;
  const canvas = document.createElement('canvas');

  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create fallback icon canvas.');
  }

  context.clearRect(0, 0, size, size);
  context.fillStyle = '#f4f1e8';

  const toes = [
    { x: 19, y: 22, rx: 6, ry: 8, rotation: -0.45 },
    { x: 31, y: 15, rx: 6, ry: 8, rotation: -0.15 },
    { x: 43, y: 17, rx: 6, ry: 8, rotation: 0.2 },
    { x: 52, y: 27, rx: 5, ry: 7, rotation: 0.55 },
  ];

  for (const toe of toes) {
    context.beginPath();
    context.ellipse(
      toe.x,
      toe.y,
      toe.rx,
      toe.ry,
      toe.rotation,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  context.beginPath();
  context.moveTo(13, 48);
  context.bezierCurveTo(13, 39, 22, 32, 29, 35);
  context.bezierCurveTo(34, 37, 37, 37, 42, 35);
  context.bezierCurveTo(49, 33, 56, 40, 55, 48);
  context.bezierCurveTo(54, 56, 45, 59, 34, 58);
  context.bezierCurveTo(23, 59, 14, 56, 13, 48);
  context.fill();

  return context.getImageData(0, 0, size, size);
}

/**
 * Register the paw-print fallback synchronously.
 *
 * Call this after the MapLibre style has loaded and before
 * enabling the occurrence symbol layer.
 */
export function registerDefaultFossilFallback(
  map: MapLibreMap,
): void {
  if (map.hasImage(DEFAULT_FOSSIL_ICON)) {
    return;
  }

  map.addImage(
    DEFAULT_FOSSIL_ICON,
    createFallbackPawIcon(),
    { pixelRatio: 2 },
  );
}

/**
 * Load the preferred default SVG in the background.
 *
 * The paw-print fallback is registered first, so an SVG loading
 * failure will not leave the default icon unavailable.
 */
export async function loadDefaultFossilIcon(
  map: MapLibreMap,
): Promise<void> {
  // Ensure the fallback exists before starting asynchronous work.
  registerDefaultFossilFallback(map);

  let objectUrl: string | undefined;

  try {
    const response = await fetch(DEFAULT_ICON_URL);

    if (!response.ok) {
      throw new Error(
        `Default fossil icon request failed: HTTP ${response.status}`,
      );
    }

    const svgText = await response.text();

    if (!/<svg(?:\s|>)/i.test(svgText)) {
      throw new Error(
        'The default fossil icon response is not an SVG document.',
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
        reject(
          new Error('The default fossil SVG could not be decoded.'),
        );
      };
      image.src = objectUrl!;
    });

    const size = DEFAULT_ICON_SIZE;
    const canvas = document.createElement('canvas');

    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas rendering is unavailable.');
    }

    const sourceWidth = image.naturalWidth || size;
    const sourceHeight = image.naturalHeight || size;

    const scale = Math.min(
      size / sourceWidth,
      size / sourceHeight,
    );

    const width = sourceWidth * scale;
    const height = sourceHeight * scale;

    context.drawImage(
      image,
      (size - width) / 2,
      (size - height) / 2,
      width,
      height,
    );

    // Replace the paw with the SVG without changing the image ID.
    if (map.hasImage(DEFAULT_FOSSIL_ICON)) {
      map.updateImage(
        DEFAULT_FOSSIL_ICON,
        context.getImageData(0, 0, size, size),
      );
    }
  } catch (error) {
    // The paw is already registered, so no additional fallback
    // registration is necessary.
    console.warn(
      'Default fossil SVG unavailable; retaining the drawn paw-print fallback.',
      error,
    );
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
