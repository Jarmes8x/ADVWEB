import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-layout">
      <!-- Top Navigation Bar -->
      <header class="top-nav">
        <div class="nav-container">
          <div class="brand">
            <span class="brand-icon">🍱</span>
            <div class="brand-text">
              <span class="brand-title">ข้าวกล่องเดลิเวอรี่ ม.มหาสารคาม</span>
              <span class="brand-subtitle">ระบบจัดเส้นทางและแบ่งงานไรเดอร์อัจฉริยะ (11:30 - 12:30 น.)</span>
            </div>
          </div>

          <!-- Navigation Links -->
          <nav class="nav-links" *ngIf="auth.user() as user">
            <ng-container *ngIf="auth.isAdmin()">
            <a routerLink="/routes" routerLinkActive="active" class="nav-item">
              <span class="icon">🗺️</span> จัดเส้นทาง & แผนที่
            </a>
            <a routerLink="/orders" routerLinkActive="active" class="nav-item">
              <span class="icon">📦</span> จัดการออเดอร์
            </a>
            <a routerLink="/customers" routerLinkActive="active" class="nav-item">
              <span class="icon">👥</span> จัดการลูกค้า
            </a>
            </ng-container>
            <a routerLink="/rider" routerLinkActive="active" class="nav-item rider-btn">
              <span class="icon">📱</span> {{ auth.isAdmin() ? 'หน้าจอไรเดอร์ (มือถือ)' : 'ใบงานของฉัน' }}
            </a>
            <span class="user-badge">👤 {{ user.username }}</span>
            <button type="button" class="nav-item logout-btn" (click)="auth.logout()">ออกจากระบบ</button>
          </nav>
        </div>
      </header>

      <!-- Main Content View -->
      <main class="main-body">
        <div class="content-wrapper">
          <router-outlet></router-outlet>
        </div>
      </main>

      <!-- Footer -->
      <footer class="app-footer">
        <p>
          ระบบจัดส่งด่วนมื้อเที่ยง • โมเดลไรเดอร์ประจำ Fixed 13 คน (รับสูงสุด 3 ออเดอร์/คน) • ส่งในรัศมี 3 กม.
        </p>
      </footer>
    </div>
  `,
  styles: [`
    .app-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
    }
    .top-nav {
      background: #ffffff;
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 500;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05);
    }
    .nav-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-icon {
      font-size: 28px;
    }
    .brand-text {
      display: flex;
      flex-direction: column;
    }
    .brand-title {
      font-weight: 700;
      font-size: 16px;
      color: #0f172a;
    }
    .brand-subtitle {
      font-size: 12px;
      color: #64748b;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      text-decoration: none;
      color: #475569;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }
    .nav-item:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .nav-item.active {
      background: #ffedd5;
      color: #ea580c;
      font-weight: 600;
    }
    .rider-btn {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .rider-btn:hover {
      background: #dcfce7;
      color: #15803d;
    }
    .rider-btn.active {
      background: #16a34a;
      color: white;
    }
    .user-badge {
      font-size: 13px;
      color: #475569;
      padding: 0 6px;
    }
    .logout-btn {
      border: 1px solid #e2e8f0;
      background: white;
      cursor: pointer;
      font-family: inherit;
    }
    .main-body {
      flex: 1;
      padding: 24px;
    }
    .content-wrapper {
      max-width: 1400px;
      margin: 0 auto;
    }
    .app-footer {
      border-top: 1px solid var(--border);
      padding: 14px 24px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      background: white;
    }
    @media (max-width: 768px) {
      .main-body {
        padding: 12px;
      }
      .nav-container {
        padding: 10px 14px;
      }
    }
  `]
})
export class AppComponent {
  title = 'ข้าวกล่องเดลิเวอรี่';

  constructor(public auth: AuthService) {}
}
