import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoutePlanApi } from '../../services/api/route-plan-api';
import { RouteOptimizationResult, RiderRoute } from '../../model/route-plan';
import * as L from 'leaflet';

@Component({
  selector: 'app-routes-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './routes-view.html',
  styleUrl: './routes-view.css'
})
export class RoutesView implements OnInit, AfterViewInit, OnDestroy {
  planResult!: RouteOptimizationResult;
  selectedRiderId: number | null = null;
  private calculationSeed = 0;

  private map?: L.Map;
  private routeLayers = L.layerGroup();
  private markerLayers = L.layerGroup();

  private routePlanApi = inject(RoutePlanApi);

  ngOnInit() {
    this.loadCurrentPlan();
  }

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap() {
    this.map = L.map('routing-map').setView([16.2465, 103.2505], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.routeLayers.addTo(this.map);
    this.markerLayers.addTo(this.map);

    // Initial draw once plan is loaded
    if (this.planResult) {
      this.renderMap();
    }
  }

  async loadCurrentPlan() {
    this.planResult = await this.routePlanApi.getCurrentRoutePlan();
    this.renderMap();
  }

  async recalculateRoutes() {
    this.calculationSeed += 1;
    this.planResult = await this.routePlanApi.recalculateRoutes(this.calculationSeed);
    this.selectedRiderId = null;
    this.renderMap();
  }

  private renderMap() {
    if (!this.map || !this.planResult) return;

    this.routeLayers.clearLayers();
    this.markerLayers.clearLayers();

    // 1. Draw Shop marker
    const shop = this.planResult.shopLocation;
    const shopIcon = L.divIcon({
      html: '🏠',
      className: 'custom-shop-marker',
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
    L.marker([shop.lat, shop.lng], { icon: shopIcon })
      .addTo(this.markerLayers)
      .bindPopup(`<b>${shop.name}</b><br>จุดเริ่มต้นออกส่ง 11:30 น.`);

    // 2. Draw each rider route with distinct line and markers
    this.planResult.routes.forEach(route => {
      const isSelected = this.selectedRiderId === null || this.selectedRiderId === route.riderId;
      const opacity = isSelected ? 0.9 : 0.2;
      const weight = isSelected ? (this.selectedRiderId === route.riderId ? 6 : 4) : 2;

      const latlngs: [number, number][] = route.waypoints.map(wp => [wp.lat, wp.lng]);

      // Route line
      const polyline = L.polyline(latlngs, {
        color: route.color,
        weight,
        opacity,
        dashArray: isSelected ? undefined : '5, 5'
      });

      polyline.bindPopup(`
        <div style="font-family: inherit;">
          <b style="color:${route.color};">${route.riderName}</b><br>
          📦 กล่อง: ${route.totalBoxes} กล่อง<br>
          📍 ระยะทาง: ${route.totalDistanceKm} กม.<br>
          ⏱️ ถึงเสร็จ: ${route.estimatedFinishTime} น.<br>
          💵 กำไร: <b>${route.netProfit} ฿</b>
        </div>
      `);

      polyline.on('click', () => {
        this.highlightRider(route);
      });

      this.routeLayers.addLayer(polyline);

      // Customer delivery waypoints
      route.waypoints.forEach(wp => {
        if (wp.type === 'delivery') {
          const markerHtml = `
            <div style="
              background:${route.color};
              width:26px;
              height:26px;
              border-radius:50%;
              color:white;
              font-weight:700;
              display:flex;
              align-items:center;
              justify-content:center;
              border:2px solid white;
              box-shadow:0 2px 6px rgba(0,0,0,0.3);
              font-size:12px;
            ">${wp.stepNumber}</div>
          `;

          const customIcon = L.divIcon({
            html: markerHtml,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          });

          const m = L.marker([wp.lat, wp.lng], { icon: customIcon });
          m.bindPopup(`
            <div style="font-family: inherit;">
              <b>จุดส่งที่ ${wp.stepNumber}: ${wp.customerName}</b><br>
              🍱 จำนวน: ${wp.boxCount} กล่อง<br>
              ⏰ เวลาถึงโดยประมาณ: <b>${wp.estimatedArrival} น.</b><br>
              📍 ที่อยู่: ${wp.customerAddress}<br>
              🏍️ ผู้ส่ง: ${route.riderName}
            </div>
          `);

          m.on('click', () => {
            this.highlightRider(route);
          });

          this.markerLayers.addLayer(m);
        }
      });
    });
  }

  highlightRider(route: RiderRoute) {
    if (this.selectedRiderId === route.riderId) {
      this.selectedRiderId = null;
    } else {
      this.selectedRiderId = route.riderId;
    }
    this.renderMap();

    // Zoom slightly to the selected rider's points
    if (this.selectedRiderId && this.map) {
      const bounds = L.latLngBounds(route.waypoints.map(w => [w.lat, w.lng]));
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  resetMapView() {
    this.selectedRiderId = null;
    this.renderMap();
    if (this.map) {
      this.map.setView([16.2465, 103.2505], 14);
    }
  }
}
