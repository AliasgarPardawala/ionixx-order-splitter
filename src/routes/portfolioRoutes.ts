import { Router } from 'express';
import { createPortfolio, getPortfolio, listPortfolios } from '../controllers/portfolioController';

export const portfolioRoutes = Router();

portfolioRoutes.post('/', createPortfolio);
portfolioRoutes.get('/', listPortfolios);
portfolioRoutes.get('/:portfolioId', getPortfolio);
