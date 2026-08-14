import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import authRouter, { errorHandler } from './auth/routes.js';
import gameRouter, { startStaleSessionSweep } from './game/routes.js';
import usersRouter from './users/routes.js';
import leaderboardRouter from './leaderboard/routes.js';

const app = express();

app.use(helmet());

const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
  }),
);

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(authRouter);
app.use(usersRouter);
app.use(leaderboardRouter);
app.use(gameRouter);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);

  // Start periodic sweep for abandoned/stale game sessions
  startStaleSessionSweep();
  console.log('Stale session sweep started (60s interval)');
});

export default app;

