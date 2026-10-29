export const ZONES = ['ขามเรียง', 'ท่าขอนยาง', 'หน้าป้าย'] as const;
export type Zone = typeof ZONES[number];

export function isZone(value: unknown): value is Zone {
  return typeof value === 'string' && (ZONES as readonly string[]).includes(value);
}

const ZONE_CENTERS: Record<Zone, { lat: number; lng: number }> = {
  'ท่าขอนยาง': { lat: 16.2360, lng: 103.2635 },
  'ขามเรียง': { lat: 16.2525, lng: 103.2375 },
  'หน้าป้าย': { lat: 16.2455, lng: 103.2580 }
};

export function inferZone(lat: number, lng: number, address = ''): Zone {
  if (address.includes('ท่าขอนยาง')) return 'ท่าขอนยาง';
  if (address.includes('หน้าป้าย') || address.includes('หน้ามอ') || address.includes('หน้า ม.')) return 'หน้าป้าย';
  if (address.includes('ขามเรียง')) return 'ขามเรียง';

  let nearest: Zone = 'ขามเรียง';
  let best = Infinity;
  for (const zone of ZONES) {
    const c = ZONE_CENTERS[zone];
    const d = (lat - c.lat) ** 2 + (lng - c.lng) ** 2;
    if (d < best) {
      best = d;
      nearest = zone;
    }
  }
  return nearest;
}
