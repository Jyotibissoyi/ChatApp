import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import chatRoutes from './routes/chatRoutes';
import { errorHandler } from './middlewares/errorHandler';

export function createApp(): Application {
  const app: Application = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Chat API routes
  app.use('/', chatRoutes);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
