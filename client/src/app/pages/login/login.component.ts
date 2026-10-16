import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
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
