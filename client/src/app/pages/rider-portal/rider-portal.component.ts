import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { RiderRoute, Rider } from '../../models/types';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-rider-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rider-portal.component.html',
  styleUrl: './rider-portal.component.css'
})
export class RiderPortalComponent implements OnInit {
  jobInput: string = '1';
  allRiders: Rider[] = [];
  currentRoute: RiderRoute | null = null;
  errorMessage: string = '';

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit() {
    const user = this.auth.user();
    if (user?.role === 'rider' && user.riderId) {
      // Riders are locked to their own job sheet
      this.jobInput = user.riderId.toString();
    } else {
      this.loadRiders();
    }
    this.searchJob();
  }

  loadRiders() {
    this.api.getRiders().subscribe(data => {
      this.allRiders = data;
    });
  }

  searchJob() {
    if (!this.jobInput.trim()) return;
    this.errorMessage = '';

    this.api.getRiderRoute(this.jobInput.trim()).subscribe({
      next: (res) => {
        this.currentRoute = res.route;
      },
      error: (err) => {
        this.currentRoute = null;
        this.errorMessage = err.error?.error || 'ไม่พบข้อมูลใบงานนี้ กรุณาตรวจสอบหมายเลขอีกครั้ง';
      }
    });
  }

  selectRider(riderId: number) {
    this.jobInput = riderId.toString();
    this.searchJob();
  }

  getGoogleMapsUrl(lat: number, lng: number): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
}
