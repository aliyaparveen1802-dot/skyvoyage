import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { generalRateLimit } from './middleware/rateLimits.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import flightRoutes from './routes/flights.js';
import airportsRoutes from './routes/airports.js';
import bookingRoutes from './routes/bookings.js';
import guideRoutes from './routes/airport.js';
import aiRoutes from './routes/ai.js';
import trackingRoutes from './routes/tracking.js';
import notificationRoutes from './routes/notifications.js';
import savedFlightRoutes from './routes/savedFlights.js';
import devRoutes from './routes/dev.js';

export function createApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1);
  app.use(
    helmet({
      // 'unsafe-inline' is required for the SPA deep-link restore script in index.html;
      // this API serves JSON only otherwise, so the directive has no further effect.
      contentSecurityPolicy: {
        directives: { scriptSrc: ["'self'", "'unsafe-inline'"] },
      },
    }),
  );
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(generalRateLimit);

  app.use('/api/auth', authRoutes);
  app.use('/api/flights', flightRoutes);
  app.use('/api/airports', airportsRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/airport', guideRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/tracking', trackingRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/saved-flights', savedFlightRoutes);
  app.use('/api/dev', devRoutes);

  // Serve the built client when present (production hosts like Render run the
  // whole app from one service). Local dev uses the Vite server instead.
  const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));
  if (fs.existsSync(path.join(clientDist, 'index.html'))) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
