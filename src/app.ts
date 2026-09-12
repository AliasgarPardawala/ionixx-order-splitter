import express, { Express, Request, Response } from 'express';
import { orderRoutes } from './routes/orderRoutes';
import { portfolioRoutes } from './routes/portfolioRoutes';
import { requestTimer } from './middleware/requestTimer';
import { errorHandler } from './middleware/errorHandler';
import { config } from './config';

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(requestTimer);

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/api/v1/config', (_req: Request, res: Response) => {
    res.status(200).json({
      quantityDecimalPlaces: config.quantityDecimalPlaces,
      defaultStockPrice: config.defaultStockPrice,
      marketOpenUtc: config.marketOpenUtc,
      marketCloseUtc: config.marketCloseUtc,
    });
  });

  app.use('/api/v1/portfolios', portfolioRoutes);
  app.use('/api/v1/orders', orderRoutes);

  app.use(errorHandler);

  return app;
}
