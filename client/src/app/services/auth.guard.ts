import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Role } from './auth.service';

// UI-only guard: the backend enforces the same rules on every request
export function roleGuard(...roles: Role[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.user();

    if (!user) {
      return router.createUrlTree(['/login']);
    }
    if (!roles.includes(user.role)) {
      return router.createUrlTree([auth.homeRoute()]);
    }
    return true;
  };
}

// Keep logged-in users off the login page
export const loginPageGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? inject(Router).createUrlTree([auth.homeRoute()]) : true;
};
