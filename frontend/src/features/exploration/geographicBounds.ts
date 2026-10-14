export interface GeographicBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface GeographicPoint {
  longitude: number;
  latitude: number;
}

export const INITIAL_SEARCH_BOUNDS: GeographicBounds = {
  west: -125,
  south: 24,
  east: -66,
  north: 50,
};

const EARTH_RADIUS_MILES = 3958.8;

export function getRadiusBounds(
  center: GeographicPoint,
  radiusMiles: number,
): GeographicBounds {
  const latitudeDelta = radiusMiles / 69;
  const longitudeScale = Math.max(
    0.1,
    Math.cos((center.latitude * Math.PI) / 180),
  );
  const longitudeDelta = radiusMiles / (69 * longitudeScale);

  return {
    west: Math.max(-180, center.longitude - longitudeDelta),
    south: Math.max(-90, center.latitude - latitudeDelta),
    east: Math.min(180, center.longitude + longitudeDelta),
    north: Math.min(90, center.latitude + latitudeDelta),
  };
}

export function getDistanceMiles(
  first: GeographicPoint,
  second: GeographicPoint,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(haversine));
}
