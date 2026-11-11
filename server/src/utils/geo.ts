export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toCartesian(p: LatLng): [number, number, number] {
  const lat = (p.lat * Math.PI) / 180;
  const lng = (p.lng * Math.PI) / 180;
  return [Math.cos(lat) * Math.cos(lng), Math.cos(lat) * Math.sin(lng), Math.sin(lat)];
}

function toLatLng(v: [number, number, number]): LatLng {
  const [x, y, z] = v;
  const lat = (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI;
  const lng = (Math.atan2(y, x) * 180) / Math.PI;
  return { lat: Math.round(lat * 10000) / 10000, lng: Math.round(lng * 10000) / 10000 };
}

export function greatCirclePath(from: LatLng, to: LatLng, points = 24): LatLng[] {
  if (points < 2) return [from, to];
  const v1 = toCartesian(from);
  const v2 = toCartesian(to);
  const dot = Math.max(-1, Math.min(1, v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]));
  const omega = Math.acos(dot);
  const path: LatLng[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    if (omega < 1e-9) {
      path.push(toLatLng(v1));
      continue;
    }
    const s1 = Math.sin((1 - t) * omega) / Math.sin(omega);
    const s2 = Math.sin(t * omega) / Math.sin(omega);
    const v: [number, number, number] = [
      s1 * v1[0] + s2 * v2[0],
      s1 * v1[1] + s2 * v2[1],
      s1 * v1[2] + s2 * v2[2],
    ];
    path.push(toLatLng(v));
  }
  return path;
}

export function interpolateAlongPath(path: LatLng[], progress: number): LatLng | null {
  if (path.length === 0) return null;
  if (path.length === 1) return path[0];
  const clamped = Math.max(0, Math.min(1, progress));
  const scaled = clamped * (path.length - 1);
  const index = Math.min(path.length - 2, Math.floor(scaled));
  const t = scaled - index;
  const a = path[index];
  const b = path[index + 1];
  return {
    lat: Math.round((a.lat + (b.lat - a.lat) * t) * 10000) / 10000,
    lng: Math.round((a.lng + (b.lng - a.lng) * t) * 10000) / 10000,
  };
}
