import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrapper">
      <form class="login-card card" (ngSubmit)="submit()" novalidate>
        <div class="login-header">
          <span class="logo" aria-hidden="true">🍱</span>
          <h1>เข้าสู่ระบบ</h1>
          <p>สำหรับแอดมินร้านและไรเดอร์</p>
        </div>

        <div class="field">
          <label for="username">ชื่อผู้ใช้</label>
          <input
            id="username"
            name="username"
            type="text"
            autocomplete="username"
            [(ngModel)]="username"
            placeholder="เช่น admin หรือ rider01"
            required
          />
        </div>

        <div class="field">
          <label for="password">รหัสผ่าน</label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            [(ngModel)]="password"
            required
          />
        </div>

        <div *ngIf="errorMessage" class="error-banner" role="alert">
          ⚠️ {{ errorMessage }}
        </div>

        <button type="submit" class="btn btn-primary submit-btn" [disabled]="loading">
          {{ loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
        </button>

        <p class="hint">ไรเดอร์ใช้ชื่อผู้ใช้ rider01 - rider13 ตามเบอร์ของตัวเอง</p>
      </form>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 60vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login-card {
      width: 100%;
      max-width: 380px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 28px;
    }
    .login-header {
      text-align: center;
    }
    .logo {
      font-size: 36px;
    }
    .login-header h1 {
      font-size: 20px;
      margin: 8px 0 4px;
      color: #0f172a;
    }
    .login-header p {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .field label {
      font-size: 14px;
      font-weight: 600;
      color: #334155;
    }
    .field input {
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 15px;
    }
    .field input:focus {
      outline: 2px solid #ea580c;
      outline-offset: 1px;
    }
    .submit-btn {
      width: 100%;
      padding: 12px;
      font-size: 15px;
    }
    .error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 14px;
    }
    .hint {
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
      margin: 0;
    }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    if (!this.username.trim() || !this.password) {
      this.errorMessage = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
      return;
    }
    this.loading = true;
    this.errorMessage = '';

    this.auth.login(this.username.trim(), this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl(this.auth.homeRoute());
      },
      error: (err) => {
        this.loading = false;
        this.password = '';
        this.errorMessage = err.error?.error || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่';
      }
    });
  }
}
