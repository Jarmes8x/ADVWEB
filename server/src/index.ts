import express from 'express';
import cors from 'cors';
import { initDatabase } from './database/connection';
import { customerRouter } from './routes/customers';
import { orderRouter } from './routes/orders';
import { riderRouter } from './routes/riders';
import { routingRouter } from './routes/routing';
import { authRouter } from './routes/auth';
import { requireAuth, requireRole } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3000;

// Only allow known frontends. Set CORS_ORIGINS as a comma-separated list on Vercel.
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:4200')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '100kb' }));

// Initialize SQLite database schema and seed
initDatabase();

// Public endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/auth', authRouter);

// Everything below requires a valid token
app.use('/api', requireAuth);

// Admin only
app.use('/api/customers', requireRole('admin'), customerRouter);
app.use('/api/orders', requireRole('admin'), orderRouter);

// Admin + rider (per-rider checks happen inside the routers)
app.use('/api/riders', riderRouter);
app.use('/api/routes', routingRouter);

// On Vercel the exported app is used as a serverless function, so only listen locally
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Smart Rider Backend running on http://localhost:${PORT}`);
  });
}

export default app;
