import http from 'http';
import { app } from './app';

// ใช้ PORT ตัวพิมพ์ใหญ่ตามมาตรฐาน (บริการโฮสติ้งจะส่งค่ามาให้)
const port = process.env.PORT || 3000;

// บน Vercel ไม่ต้อง listen เอง (ใช้ app ที่ export จาก app.ts)
if (!process.env.VERCEL) {
  const server = http.createServer(app);
  server
    .listen(port, () => {
      console.log(`🚀 Smart Rider Backend running on http://localhost:${port}`);
    })
    .on('error', (error) => {
      console.error(error);
    });
}

export default app;
