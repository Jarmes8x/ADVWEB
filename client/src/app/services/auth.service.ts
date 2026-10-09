import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export type Role = 'admin' | 'rider';

export interface AuthUser {
  userId: number;
  username: string;
  role: Role;
  riderId: number | null;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = '/api/auth';
  private userSignal = signal<AuthUser | null>(this.loadUser());

  readonly user = this.userSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.userSignal() !== null);
  readonly isAdmin = computed(() => this.userSignal()?.role === 'admin');

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, { username, password }).pipe(
      tap(res => {
        // sessionStorage: token is cleared when the browser tab is closed
        sessionStorage.setItem(TOKEN_KEY, res.token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this.userSignal.set(res.user);
      })
    );
  }

  logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  // Landing page after login depends on the role
  homeRoute(): string {
    return this.isAdmin() ? '/routes' : '/rider';
  }

  private loadUser(): AuthUser | null {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) as AuthUser : null;
    } catch {
      return null;
    }
  }
}
