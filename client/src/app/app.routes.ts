import { Routes } from '@angular/router';
import { RoutesViewComponent } from './pages/routes-view/routes-view.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { CustomersComponent } from './pages/customers/customers.component';
import { RiderPortalComponent } from './pages/rider-portal/rider-portal.component';
import { LoginComponent } from './pages/login/login.component';
import { roleGuard, loginPageGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [loginPageGuard], title: 'เข้าสู่ระบบ' },
  { path: 'routes', component: RoutesViewComponent, canActivate: [roleGuard('admin')], title: 'จัดเส้นทางและแบ่งงานไรเดอร์' },
  { path: 'orders', component: OrdersComponent, canActivate: [roleGuard('admin')], title: 'จัดการออเดอร์มื้อเที่ยง' },
  { path: 'customers', component: CustomersComponent, canActivate: [roleGuard('admin')], title: 'จัดการข้อมูลลูกค้า' },
  { path: 'rider', component: RiderPortalComponent, canActivate: [roleGuard('admin', 'rider')], title: 'หน้าจอสำหรับไรเดอร์' },
  { path: '**', redirectTo: 'login' }
];
