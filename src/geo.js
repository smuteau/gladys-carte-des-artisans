// -----------------------------------------------------------------------------
// Calculs de distance, sans service extérieur : la position de la maison ne
// quitte jamais le serveur Gladys.
// -----------------------------------------------------------------------------

const RAYON_TERRE_KM = 6371;
const rad = (degres) => (degres * Math.PI) / 180;

/** Distance à vol d'oiseau entre deux points { lat, lon }, en km. */
export function distanceKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Distance du point au rectangle [latMin, lonMin, latMax, lonMax] (0 s'il est dedans). */
export function distanceEmprise(point, [latMin, lonMin, latMax, lonMax]) {
  const proche = {
    lat: Math.min(Math.max(point.lat, latMin), latMax),
    lon: Math.min(Math.max(point.lon, lonMin), lonMax),
  };
  return distanceKm(point, proche);
}

/** « 850 m », « 2,4 km », « 12 km » */
export function formaterDistance(km) {
  if (km < 1) return `${Math.max(100, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}
