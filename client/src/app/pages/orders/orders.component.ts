import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Customer, Order } from '../../models/types';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  customers: Customer[] = [];

  isModalOpen = false;
  editMode = false;
  editingOrderId?: number;
  selectedCustomerId: number | null = null;
  formBoxCount: number = 1;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadOrders();
    this.loadCustomers();
  }

  get totalBoxes(): number {
    return this.orders.reduce((sum, o) => sum + o.boxCount, 0);
  }

  get totalRevenue(): number {
    return this.totalBoxes * 65;
  }

  get totalFoodCost(): number {
    return this.totalBoxes * 40;
  }

  loadOrders() {
    this.api.getOrders().subscribe(data => {
      this.orders = data;
    });
  }

  loadCustomers() {
    this.api.getCustomers().subscribe(data => {
      this.customers = data;
    });
  }

  getBoxBadgeClass(boxes: number): string {
    if (boxes === 1) return 'badge-info';
    if (boxes === 2) return 'badge-warning';
    return 'badge-danger';
  }

  openAddModal() {
    this.editMode = false;
    this.selectedCustomerId = this.customers.length > 0 ? this.customers[0].id! : null;
    this.formBoxCount = 1;
    this.isModalOpen = true;
  }

  openEditModal(order: Order) {
    this.editMode = true;
    this.editingOrderId = order.id;
    this.selectedCustomerId = order.customerId;
    this.formBoxCount = order.boxCount;
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingOrderId = undefined;
  }

  saveOrder() {
    if (this.editMode && this.editingOrderId) {
      this.api.updateOrder(this.editingOrderId, {
        boxCount: this.formBoxCount,
        customerId: this.selectedCustomerId || undefined
      }).subscribe(() => {
        this.closeModal();
        this.loadOrders();
      });
    } else if (this.selectedCustomerId) {
      this.api.createOrder({
        customerId: this.selectedCustomerId,
        boxCount: this.formBoxCount
      }).subscribe(() => {
        this.closeModal();
        this.loadOrders();
      });
    }
  }

  deleteOrder(order: Order) {
    if (order.id && confirm(`ต้องการลบออเดอร์ ${order.orderNumber} หรือไม่?`)) {
      this.api.deleteOrder(order.id).subscribe(() => {
        this.loadOrders();
      });
    }
  }

  simulateOrders(count?: number) {
    this.api.simulateOrders(count).subscribe(() => {
      this.loadOrders();
    });
  }

  clearAllOrders() {
    if (confirm('คุณต้องการล้างออเดอร์ทั้งหมดหรือไม่?')) {
      this.api.clearOrders().subscribe(() => {
        this.loadOrders();
      });
    }
  }
}
