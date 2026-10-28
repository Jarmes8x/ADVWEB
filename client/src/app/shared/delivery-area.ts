/**
 * พื้นที่จัดส่ง: รัศมีเส้นตรง 3 กม. รอบร้าน
 * ⚠️ ค่าทั้งหมดต้องตรงกับ server (MAX_DELIVERY_RADIUS_KM ใน server/services/route-optimizer.ts
 *    และ SHOP_LOCATION ใน server/dbconnect.ts) หน้าเว็บเช็กไว้ก่อนเพื่อบอกผู้ใช้ทันที
 *    ส่วน backend เช็กซ้ำทุกครั้งที่บันทึก
 */
export const SHOP_LOCATION = { lat: 16.2465, lng: 103.2505 };
export const MAX_DELIVERY_RADIUS_KM = 3;

/** ระยะเส้นตรงจากร้าน (กม.) สูตร Haversine เดียวกับ server ปัดทศนิยม 2 ตำแหน่ง */
export function distanceFromShopKm(lat: number, lng: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat - SHOP_LOCATION.lat);
  const dLng = toRad(lng - SHOP_LOCATION.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(SHOP_LOCATION.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export function isWithinDeliveryArea(lat: number, lng: number): boolean {
  return distanceFromShopKm(lat, lng) <= MAX_DELIVERY_RADIUS_KM;
}
