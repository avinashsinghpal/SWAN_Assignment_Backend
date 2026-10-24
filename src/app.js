/**
 * app.js - Express application setup (separate from server.js so it's testable).
 *
 * All middleware, routes, and error handlers are wired here.
 * The HTTP server is created and started in server.js.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';

import { CLIENT_ORIGINS, IS_PRODUCTION } from './config/index.js';
import { swaggerSpec } from './config/swagger.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import leadRoutes from './routes/lead.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import userRoutes from './routes/user.routes.js';

const app = express();

// ── Security ────────────────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl)
      if (!origin || CLIENT_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true, // Required for cookie-based auth
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
  })
);

// Trust the first proxy in production (Render, Railway, etc.)
// Required for SameSite=None cookies and correct IP in rate limiting
if (IS_PRODUCTION) app.set('trust proxy', 1);

// ── Parsing ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ── NoSQL injection prevention ───────────────────────────────────────────────
// Strips keys that start with $ or contain . from req.body and req.query
app.use(mongoSanitize());

// ── Compression ──────────────────────────────────────────────────────────────
app.use(compression());

// ── Logging ──────────────────────────────────────────────────────────────────
if (!IS_PRODUCTION) {
  app.use(morgan('dev'));
} else {
  // Structured access log in production
  app.use(
    morgan('combined', {
      skip: (_req, res) => res.statusCode < 400,
    })
  );
}

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// ── API Documentation ─────────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/leads', leadRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/users', userRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
