export function buildGoogleMapsCoordinateUrl(
  latitude: number,
  longitude: number
): string {
  const formattedCoords = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formattedCoords)}`;
}
