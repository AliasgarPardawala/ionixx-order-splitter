import { Request, Response, NextFunction } from 'express';
import { createPortfolioSchema, listPortfoliosQuerySchema, portfolioIdParamSchema } from '../validation/portfolioSchemas';
import { portfolioService } from '../services/portfolioService';

export function createPortfolio(req: Request, res: Response, next: NextFunction): void {
  try {
    const input = createPortfolioSchema.parse(req.body);
    const portfolio = portfolioService.register(input);
    res.status(201).json(portfolio);
  } catch (err) {
    next(err);
  }
}

export function getPortfolio(req: Request, res: Response, next: NextFunction): void {
  try {
    const { portfolioId } = portfolioIdParamSchema.parse(req.params);
    const portfolio = portfolioService.getById(portfolioId);
    res.status(200).json(portfolio);
  } catch (err) {
    next(err);
  }
}

export function listPortfolios(req: Request, res: Response, next: NextFunction): void {
  try {
    const query = listPortfoliosQuerySchema.parse(req.query);
    const { data, total } = portfolioService.list(query.page, query.limit);
    res.status(200).json({ data, pagination: { page: query.page, limit: query.limit, total } });
  } catch (err) {
    next(err);
  }
}
