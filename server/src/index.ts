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

// Database readiness gate.
// The promise always resolves (never rejects), so a failed init can never
// become an unhandled rejection. On failure the promise resets so the next
// request retries initialization (e.g. after transient DB unavailability).
let initPromise: Promise<boolean> | null = null;

function ensureDb(): Promise<boolean> {
  if (!initPromise) {
    initPromise = initDatabase()
      .then(() => true)
      .catch((err) => {
        console.error('Failed to initialize database:', err.message);
        initPromise = null;
        return false;
      });
  }
  return initPromise;
}

app.use((req, res, next) => {
  ensureDb().then((ok) => {
    if (!ok) {
      return res.status(503).json({ error: 'Database initialization failed' });
    }
    next();
  });
});

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
  ensureDb()
    .then((ok) => {
      if (!ok) {
        process.exit(1);
      }
      app.listen(PORT, () => {
        console.log(`🚀 Smart Rider Backend running on http://localhost:${PORT}`);
      });
    })
    .catch(() => process.exit(1));
}

export default app;
