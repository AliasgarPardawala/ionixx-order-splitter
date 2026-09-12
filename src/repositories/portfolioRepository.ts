import { Portfolio } from '../domain/types';

/** In-memory store, wiped on restart by construction — no DB, no file writes. */
export class PortfolioRepository {
  private readonly store = new Map<string, Portfolio>();

  save(portfolio: Portfolio): Portfolio {
    this.store.set(portfolio.portfolioId, portfolio);
    return portfolio;
  }

  findById(portfolioId: string): Portfolio | undefined {
    return this.store.get(portfolioId);
  }

  list(page: number, limit: number): { data: Portfolio[]; total: number } {
    const all = [...this.store.values()];
    const start = (page - 1) * limit;
    return { data: all.slice(start, start + limit), total: all.length };
  }
}

export const portfolioRepository = new PortfolioRepository();
