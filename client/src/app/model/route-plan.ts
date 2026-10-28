import { Zone } from './zone';
import { Order } from './order';

export interface RoutePoint {
  orderId?: number;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  lat: number;
  lng: number;
  boxCount?: number;
  type: 'shop' | 'delivery';
  stepNumber: number;
  distanceFromPrevKm: number;
  estimatedArrival: string;
}

export interface RiderRoute {
  riderId: number;
  riderName: string;
  riderPhone: string;
  color: string;
  zone: Zone;
  jobCode: string;
  totalBoxes: number;
  orderCount: number;
  orders: Order[];
  waypoints: RoutePoint[];
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
  estimatedFinishTime: string;
  baseDeliveryFee: number;
  distanceBoxFee: number;
  totalDeliveryCost: number;
  totalRevenue: number;
  totalFoodCost: number;
  netProfit: number;
  profitMarginPercent: number;
  isLate: boolean;
}

export interface ShopLocation {
  lat: number;
  lng: number;
  name: string;
}

export interface RouteOptimizationResult {
  routes: RiderRoute[];
  summary: {
    totalOrders: number;
    totalBoxes: number;
    assignedRidersCount: number;
    totalDistanceKm: number;
    totalDeliveryCost: number;
    totalRevenue: number;
    totalFoodCost: number;
    netProfit: number;
    profitMarginPercent: number;
    onTimeDeliveryRate: number;
    allOnTime: boolean;
    /** 'road' = ระยะตามถนนจริง (OSRM), 'straight' = ระยะเส้นตรง (สำรอง) */
    distanceSource?: 'road' | 'straight';
    /** ออเดอร์ที่บ้านอยู่นอกรัศมีจัดส่ง 3 กม. (ไม่ได้จัดให้ไรเดอร์) */
    outOfRangeOrders?: OutOfRangeOrder[];
  };
  shopLocation: ShopLocation;
}

/** ผลลัพธ์ของ GET /api/routes/rider/:jobCodeOrId */
export interface RiderRouteResponse {
  shopLocation: ShopLocation;
  route: RiderRoute;
}

/** ออเดอร์ที่ส่งไม่ได้เพราะบ้านลูกค้าอยู่ไกลจากร้านเกิน 3 กม. (วัดเส้นตรง) */
export interface OutOfRangeOrder {
  orderId?: number;
  orderNumber?: string;
  customerName?: string;
  distanceKm: number;
}
