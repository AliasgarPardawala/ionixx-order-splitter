import express, { Express, Request, Response } from 'express';

/**
 * Express app skeleton.
 *
 * Routes/controllers/middleware for /api/v1/portfolios and /api/v1/orders
 * are added as those pieces land (see docs/PROJECT_PLAN.md §4).
 */
export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // TODO:
  //   app.use('/api/v1/portfolios', portfolioRoutes);
  //   app.use('/api/v1/orders', orderRoutes);
  //   app.use(errorHandler);

  return app;
}
