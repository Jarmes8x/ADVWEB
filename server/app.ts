import express from 'express';
import cors from 'cors';
import { initDatabase } from './dbconnect';
import { requireAuth, requireRole } from './jwtauth';
import { router as index } from './controller/index';
import { router as auth } from './controller/auth';
import { router as customers } from './controller/customers';
import { router as orders } from './controller/orders';
import { router as riders } from './controller/riders';
import { router as routes } from './controller/routes';

export const app = express();

// CORS: อนุญาตเฉพาะหน้าเว็บที่กำหนด (ตั้งค่า CORS_ORIGINS คั่นด้วย , บน Vercel)
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:4200')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
// แปลงข้อมูล JSON ใน Request Body
app.use(express.json({ limit: '100kb' }));

// สร้างตาราง + ข้อมูลตัวอย่าง (SQLite)
initDatabase();

// เส้นที่ไม่ต้องล็อกอิน
app.use('/', index);
app.use('/api/auth', auth);

// ทุกเส้นด้านล่างต้องมี JWT token
app.use('/api', requireAuth);

// เฉพาะ admin
app.use('/api/customers', requireRole('admin'), customers);
app.use('/api/orders', requireRole('admin'), orders);

// admin + rider (ตรวจสิทธิ์รายคนภายใน controller)
app.use('/api/riders', riders);
app.use('/api/routes', routes);

// Vercel ใช้ app ที่ export ออกไปเป็น serverless function
export default app;
