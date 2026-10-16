export interface Order {
  id?: number;
  orderNumber: string;
  customerId: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  lat?: number;
  lng?: number;
  boxCount: number;
  orderTime?: string;
  status?: 'pending' | 'assigned' | 'delivered';
  assignedRiderId?: number;
  deliverySequence?: number;
}
