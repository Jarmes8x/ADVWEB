import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerApi } from '../../services/api/customer-api';
import { Customer } from '../../model/customer';
import * as L from 'leaflet';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.html',
  styleUrl: './customers.css'
})
export class Customers implements OnInit, AfterViewInit, OnDestroy {
  customers: Customer[] = [];
  searchTerm: string = '';
  selectedCustomer: Customer | null = null;
  
  isModalOpen = false;
  editMode = false;
  formCustomer: Customer = {
    name: '',
    phone: '',
    address: '',
    lat: 16.2465,
    lng: 103.2505
  };

  private map?: L.Map;
  private markersLayer = L.layerGroup();
  private tempMarker?: L.Marker;

  private customerApi = inject(CustomerApi);

  ngOnInit() {
    this.loadCustomers();
  }

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  get filteredCustomers(): Customer[] {
    if (!this.searchTerm.trim()) return this.customers;
    const term = this.searchTerm.toLowerCase();
    return this.customers.filter(c => 
      c.name.toLowerCase().includes(term) || c.phone.includes(term) || c.address.toLowerCase().includes(term)
    );
  }

  async loadCustomers() {
    this.customers = await this.customerApi.getCustomers();
    this.renderCustomerMarkers();
  }

  private initMap() {
    this.map = L.map('customer-map').setView([16.2465, 103.2505], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.markersLayer.addTo(this.map);

    // Shop Marker
    const shopIcon = L.divIcon({
      html: '🏠',
      className: 'custom-shop-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    L.marker([16.2465, 103.2505], { icon: shopIcon })
      .addTo(this.map)
      .bindPopup('<b>ร้านข้าวกล่องเดลิเวอรี่</b><br>จุดเริ่มต้นส่ง 11:30 น.');

    // Map click listener for adding/updating coordinates
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.isModalOpen) {
        this.formCustomer.lat = Number(e.latlng.lat.toFixed(6));
        this.formCustomer.lng = Number(e.latlng.lng.toFixed(6));
        this.updateTempMarker(e.latlng.lat, e.latlng.lng);
      }
    });

    this.renderCustomerMarkers();
  }

  private renderCustomerMarkers() {
    if (!this.map) return;
    this.markersLayer.clearLayers();

    this.customers.forEach(c => {
      const marker = L.circleMarker([c.lat, c.lng], {
        radius: 8,
        fillColor: '#f97316',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
      });

      marker.bindPopup(`
        <b>${c.name}</b><br>
        📞 ${c.phone}<br>
        📍 ${c.address}
      `);

      marker.on('click', () => {
        this.selectedCustomer = c;
      });

      this.markersLayer.addLayer(marker);
    });
  }

  focusOnMap(c: Customer) {
    this.selectedCustomer = c;
    if (this.map) {
      this.map.flyTo([c.lat, c.lng], 16, { duration: 1 });
    }
  }

  openAddModal() {
    this.editMode = false;
    this.formCustomer = {
      name: '',
      phone: '',
      address: '',
      lat: 16.2465,
      lng: 103.2505
    };
    this.isModalOpen = true;
    this.updateTempMarker(this.formCustomer.lat, this.formCustomer.lng);
  }

  editCustomer(c: Customer) {
    this.editMode = true;
    this.formCustomer = { ...c };
    this.isModalOpen = true;
    this.updateTempMarker(c.lat, c.lng);
  }

  private updateTempMarker(lat: number, lng: number) {
    if (!this.map) return;
    if (this.tempMarker) {
      this.tempMarker.setLatLng([lat, lng]);
    } else {
      this.tempMarker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
      this.tempMarker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        this.formCustomer.lat = Number(pos.lat.toFixed(6));
        this.formCustomer.lng = Number(pos.lng.toFixed(6));
      });
    }
  }

  closeModal() {
    this.isModalOpen = false;
    if (this.tempMarker && this.map) {
      this.map.removeLayer(this.tempMarker);
      this.tempMarker = undefined;
    }
  }

  async saveCustomer() {
    if (this.editMode && this.formCustomer.id) {
      await this.customerApi.updateCustomer(this.formCustomer.id, this.formCustomer);
    } else {
      await this.customerApi.createCustomer(this.formCustomer);
    }
    this.closeModal();
    await this.loadCustomers();
  }

  async deleteCustomer(c: Customer) {
    if (c.id && confirm(`ต้องการลบลูกค้า "${c.name}" หรือไม่?`)) {
      await this.customerApi.deleteCustomer(c.id);
      await this.loadCustomers();
    }
  }
}
