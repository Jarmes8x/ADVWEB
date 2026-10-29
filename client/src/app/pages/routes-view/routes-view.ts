import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import * as L from 'leaflet';
import { RoutePlanApi } from '../../services/api/route-plan-api';
import { OutOfRangeOrder, RouteOptimizationResult, RiderRoute } from '../../model/route-plan';
import { APP_ICONS, escapeHtml, iconSvg } from '../../shared/icons';
import { MAX_DELIVERY_RADIUS_KM } from '../../shared/delivery-area';

@Component({
  selector: 'app-routes-view',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './routes-view.html',
  styleUrl: './routes-view.css',
})
export class RoutesView implements OnInit, AfterViewInit, OnDestroy {
  planResult!: RouteOptimizationResult;
  selectedRiderId: number | null = null;
  private calculationSeed = 0;
  readonly icons = APP_ICONS;
  readonly maxRadiusKm = MAX_DELIVERY_RADIUS_KM;
  recalculating = false;

  private map?: L.Map;
  private routeLayers = L.layerGroup();
  private markerLayers = L.layerGroup();

  private routePlanApi = inject(RoutePlanApi);

  private roadPathCache = new Map<string, [number, number][]>();
  private roadQueue: Promise<unknown> = Promise.resolve();

  get outOfRangeOrders(): OutOfRangeOrder[] {
    return this.planResult?.summary?.outOfRangeOrders ?? [];
  }

  get routeCount(): number {
    return this.planResult?.routes?.length ?? 0;
  }

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

    if (this.planResult) {
      this.renderMap();
      this.fitAllRoutes();
    }
  }

  async loadCurrentPlan() {
    this.planResult = await this.routePlanApi.getCurrentRoutePlan();
    this.renderMap();
    this.fitAllRoutes();
  }

  private fitAllRoutes() {
    if (!this.map || !this.planResult) return;
    const points = this.planResult.routes.flatMap(r => r.waypoints.map(w => [w.lat, w.lng] as [number, number]));
    if (points.length > 1) {
      this.map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }

  async recalculateRoutes() {
    this.calculationSeed += 1;
    this.recalculating = true;
    try {
      this.planResult = await this.routePlanApi.recalculateRoutes(this.calculationSeed);
      this.selectedRiderId = null;
      this.renderMap();
      this.fitAllRoutes();
    } finally {
      this.recalculating = false;
    }
  }

  private renderMap() {
    if (!this.map || !this.planResult) return;

    this.routeLayers.clearLayers();
    this.markerLayers.clearLayers();

    const shop = this.planResult.shopLocation;
    const shopIcon = L.divIcon({
      html: iconSvg(APP_ICONS.store, 19, '#fff'),
      className: 'custom-shop-marker',
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
    L.marker([shop.lat, shop.lng], { icon: shopIcon })
      .addTo(this.markerLayers)
      .bindPopup(`<div class="map-popup-title">${escapeHtml(shop.name)}</div><div class="map-popup-row">${iconSvg(APP_ICONS.clock, 13)} จุดเริ่มต้นออกส่ง 11:30 น.</div>`);

    this.planResult.routes.forEach(route => {
      const isSelected = this.selectedRiderId === null || this.selectedRiderId === route.riderId;
      const opacity = isSelected ? 0.9 : 0.2;
      const weight = isSelected ? (this.selectedRiderId === route.riderId ? 6 : 4) : 2;

      const latlngs: [number, number][] = route.waypoints.map(wp => [wp.lat, wp.lng]);
      const roadKey = this.roadKey(latlngs);
      const cachedRoad = this.roadPathCache.get(roadKey);

      const polyline = L.polyline(cachedRoad ?? latlngs, {
        color: route.color,
        weight,
        opacity,
        dashArray: isSelected ? undefined : '5, 5'
      });

      polyline.bindPopup(`
        <div class="map-popup-title" style="color:${route.color};">${escapeHtml(route.riderName)}</div>
        <div class="map-popup-row">${iconSvg(APP_ICONS.package, 13)} ${route.totalBoxes} กล่อง</div>
        <div class="map-popup-row">${iconSvg(APP_ICONS.route, 13)} ${route.totalDistanceKm} กม.</div>
        <div class="map-popup-row">${iconSvg(APP_ICONS.clock, 13)} ส่งเสร็จ ${route.estimatedFinishTime} น.</div>
        <div class="map-popup-row">${iconSvg(APP_ICONS.wallet, 13)} กำไร <b>${route.netProfit} ฿</b></div>
      `);

      polyline.on('click', () => {
        this.highlightRider(route);
      });

      this.routeLayers.addLayer(polyline);
      if (!cachedRoad && latlngs.length > 1) {
        this.fetchRoadPath(latlngs).then(path => {
          if (path) polyline.setLatLngs(path);
        });
      }

      route.waypoints.forEach(wp => {
        if (wp.type === 'delivery') {
          const customIcon = L.divIcon({
            html: `<div class="custom-rider-marker" style="background:${route.color};width:26px;height:26px;">${wp.stepNumber}</div>`,
            className: 'marker-reset',
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          });

          const m = L.marker([wp.lat, wp.lng], { icon: customIcon });
          m.bindPopup(`
            <div class="map-popup-title">จุดที่ ${wp.stepNumber} · ${escapeHtml(wp.customerName)}</div>
            <div class="map-popup-row">${iconSvg(APP_ICONS.package, 13)} ${wp.boxCount} กล่อง</div>
            <div class="map-popup-row">${iconSvg(APP_ICONS.clock, 13)} ถึงประมาณ <b>${wp.estimatedArrival} น.</b></div>
            <div class="map-popup-row">${iconSvg(APP_ICONS.mapPin, 13)} ${escapeHtml(wp.customerAddress)}</div>
            <div class="map-popup-row">${iconSvg(APP_ICONS.bike, 13)} ${escapeHtml(route.riderName)}</div>
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

    if (this.selectedRiderId && this.map) {
      const bounds = L.latLngBounds(route.waypoints.map(w => [w.lat, w.lng]));
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  resetMapView() {
    this.selectedRiderId = null;
    this.renderMap();
    this.fitAllRoutes();
  }

  private roadKey(points: [number, number][]): string {
    return points.map(([lat, lng]) => `${lat},${lng}`).join(';');
  }

  private fetchRoadPath(points: [number, number][]): Promise<[number, number][] | null> {
    const key = this.roadKey(points);
    const job = this.roadQueue.then(async () => {
      const cached = this.roadPathCache.get(key);
      if (cached) return cached;

      const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes?.length) return null;
        const path = (data.routes[0].geometry.coordinates as [number, number][]).map(
          ([lng, lat]) => [lat, lng] as [number, number],
        );
        this.roadPathCache.set(key, path);
        return path;
      } catch {
        return null;
      }
    });
    this.roadQueue = job;
    return job;
  }
}
