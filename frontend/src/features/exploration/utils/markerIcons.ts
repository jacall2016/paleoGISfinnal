import type { Map as MapLibreMap } from 'maplibre-gl';

export const MARKER_ICON_NAMES = [
  'leaf',
  'fish',
  'mammal',
  'fossil',
] as const;

export type MarkerIconName = (typeof MARKER_ICON_NAMES)[number];

function createMarkerIcon(name: MarkerIconName): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error(
      'Canvas is unavailable for rendering fossil marker icons.',
    );
  }

  // Draw in 24 × 24 coordinates and export at 2× resolution.
  context.scale(2, 2);
  context.strokeStyle = '#ffffff';
  context.fillStyle = '#ffffff';
  context.lineWidth = 1.8;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  if (name === 'leaf') {
    context.beginPath();
    context.moveTo(4, 18);
    context.bezierCurveTo(4, 8, 11, 3, 20, 3);
    context.bezierCurveTo(20, 12, 15, 19, 7, 18);
    context.stroke();

    context.beginPath();
    context.moveTo(3.5, 21);
    context.quadraticCurveTo(9, 13, 17, 7);
    context.stroke();
  } else if (name === 'fish') {
    context.beginPath();
    context.moveTo(3, 12);
    context.quadraticCurveTo(9, 4, 16, 9);
    context.lineTo(21, 6);
    context.lineTo(21, 18);
    context.lineTo(16, 15);
    context.quadraticCurveTo(9, 20, 3, 12);
    context.stroke();

    context.beginPath();
    context.arc(8, 10, 0.8, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.moveTo(12, 8.5);
    context.lineTo(13.5, 12);
    context.lineTo(12, 15.5);
    context.stroke();
  } else if (name === 'mammal') {
    // Paw print: four toes and a central pad.
    const toes = [
      [6, 8, 1.7],
      [10, 5.5, 1.7],
      [15, 5.5, 1.7],
      [19, 8, 1.7],
    ] as const;

    for (const [x, y, radius] of toes) {
      context.beginPath();
      context.ellipse(
        x,
        y,
        radius,
        radius * 1.15,
        0,
        0,
        Math.PI * 2,
      );
      context.stroke();
    }

    context.beginPath();
    context.moveTo(6.5, 15);
    context.quadraticCurveTo(6.5, 11.5, 10, 12);
    context.quadraticCurveTo(12, 13, 12.5, 14);
    context.quadraticCurveTo(14, 12, 16.5, 12);
    context.quadraticCurveTo(20, 12, 19, 16);
    context.quadraticCurveTo(17, 21, 12, 19);
    context.quadraticCurveTo(8, 20, 6.5, 15);
    context.stroke();
  } else {
    // A simple fossil/bone mark.
    context.beginPath();
    context.moveTo(6, 5);
    context.bezierCurveTo(3, 2, 0.5, 6, 4, 9);
    context.lineTo(15, 20);
    context.bezierCurveTo(18, 23, 22, 20, 19, 17);
    context.lineTo(8, 6);
    context.bezierCurveTo(7, 4, 6, 4, 6, 5);
    context.stroke();

    context.beginPath();
    context.moveTo(8, 10);
    context.lineTo(11, 7);
    context.moveTo(13, 15);
    context.lineTo(16, 12);
    context.stroke();
  }

  return context.getImageData(
    0,
    0,
    canvas.width,
    canvas.height,
  );
}

/**
 * Register the marker sprites with a loaded MapLibre map.
 * Calling this more than once is safe.
 */
export function loadMarkerIcons(map: MapLibreMap): void {
  for (const name of MARKER_ICON_NAMES) {
    if (map.hasImage(name)) continue;

    try {
      map.addImage(name, createMarkerIcon(name), {
        pixelRatio: 2,
      });
    } catch (error) {
      // The marker circles can still render if a decorative icon fails.
      console.error(
        `Unable to register the "${name}" fossil marker icon.`,
        error,
      );
    }
  }
}