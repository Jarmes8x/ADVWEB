import { calculateDistanceKm } from './route-optimizer';

/**
 * ระยะทางตามถนนจริง (OSRM Table API)
 *
 * ส่งพิกัดทุกจุดไปถาม OSRM ครั้งเดียว ได้ตาราง matrix[จาก][ไป] เป็นกิโลเมตร
 * ถ้า OSRM ใช้ไม่ได้ (เน็ตหลุด / ตอบช้า / บางคู่หาเส้นทางไม่เจอ)
 * จะใช้ระยะเส้นตรง (Haversine) แทน ระบบจึงไม่พัง
 *
 * ตั้งค่าใน .env (ไม่ตั้งก็ได้):
 *   ROAD_DISTANCE=off   ปิด ใช้เส้นตรงอย่างเดียว (เทสต์ตั้งค่านี้ให้อัตโนมัติ)
 *   OSRM_URL=...        เปลี่ยนเซิร์ฟเวอร์ OSRM (ค่าเริ่มต้น = เซิร์ฟเวอร์สาธิตฟรี)
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export type DistanceSource = 'road' | 'straight';

export interface DistanceMatrixResult {
  matrix: number[][]; // กิโลเมตร, matrix[from][to] (ไป-กลับอาจไม่เท่ากันเพราะถนนวันเวย์)
  source: DistanceSource; // 'road' = ได้จาก OSRM ครบทุกคู่
}

const DEFAULT_OSRM_URL = 'https://router.project-osrm.org';
const TIMEOUT_MS = 8000;
const MAX_POINTS = 100; // เซิร์ฟเวอร์สาธิตรับได้ราว 100 จุดต่อครั้ง
const MAX_CACHE = 50;

// พิกัดชุดเดิม = ตารางเดิม ไม่ต้องถาม OSRM ซ้ำ
const cache = new Map<string, number[][]>();

/** ตารางระยะเส้นตรง (ใช้เป็นตัวสำรอง) */
export function straightLineMatrix(points: LatLng[]): number[][] {
  return points.map((a) => points.map((b) => calculateDistanceKm(a.lat, a.lng, b.lat, b.lng)));
}

export async function getRoadDistanceMatrix(points: LatLng[]): Promise<DistanceMatrixResult> {
  const fallback = (): DistanceMatrixResult => ({ matrix: straightLineMatrix(points), source: 'straight' });

  if (process.env.ROAD_DISTANCE === 'off') return fallback();
  if (points.length < 2 || points.length > MAX_POINTS) return fallback();

  // ⚠️ OSRM ต้องการ lng,lat (กลับด้านกับที่อื่นในระบบ)
  const coords = points.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
  const cached = cache.get(coords);
  if (cached) return { matrix: cached, source: 'road' };

  const baseUrl = (process.env.OSRM_URL || DEFAULT_OSRM_URL).replace(/\/+$/, '');
  const url = `${baseUrl}/table/v1/driving/${coords}?annotations=distance`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const data = (await res.json()) as { code?: string; distances?: (number | null)[][] };
    if (data.code !== 'Ok' || !Array.isArray(data.distances) || data.distances.length !== points.length) {
      throw new Error(`OSRM response code ${data.code}`);
    }

    let complete = true;
    const matrix = points.map((from, i) =>
      points.map((to, j) => {
        if (i === j) return 0;
        const meters = data.distances![i]?.[j];
        if (typeof meters !== 'number' || !Number.isFinite(meters)) {
          // คู่นี้หาเส้นทางไม่ได้ ใช้เส้นตรงแทนเฉพาะคู่นี้
          complete = false;
          return calculateDistanceKm(from.lat, from.lng, to.lat, to.lng);
        }
        return Number((meters / 1000).toFixed(2)); // ⚠️ OSRM ตอบเป็นเมตร
      })
    );

    if (complete) {
      if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
      cache.set(coords, matrix);
    }
    return { matrix, source: complete ? 'road' : 'straight' };
  } catch (err) {
    console.warn('[road-distance] ใช้ระยะเส้นตรงแทน:', (err as Error).message);
    return fallback();
  }
}
