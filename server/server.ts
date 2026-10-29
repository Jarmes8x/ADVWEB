import { app, ensureDb } from './app';

const PORT = process.env.PORT || 3000;

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
