import { randomUUID } from 'crypto';
import { Portfolio } from '../domain/types';
import { CreatePortfolioInput } from '../validation/portfolioSchemas';
import { portfolioRepository, PortfolioRepository } from '../repositories/portfolioRepository';
import { NotFoundError } from '../domain/errors';
import { Clock, systemClock } from '../utils/clock';

export class PortfolioService {
  constructor(
    private readonly repo: PortfolioRepository = portfolioRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  register(input: CreatePortfolioInput): Portfolio {
    const portfolio: Portfolio = {
      portfolioId: randomUUID(),
      name: input.name,
      positions: input.positions,
      createdAt: this.clock.now(),
    };
    return this.repo.save(portfolio);
  }

  getById(portfolioId: string): Portfolio {
    const portfolio = this.repo.findById(portfolioId);
    if (!portfolio) {
      throw new NotFoundError(`Portfolio not found: ${portfolioId}`);
    }
    return portfolio;
  }

  list(page: number, limit: number) {
    return this.repo.list(page, limit);
  }
}

export const portfolioService = new PortfolioService();
