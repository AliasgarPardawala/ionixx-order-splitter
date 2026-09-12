import { z } from 'zod';
import { config } from '../config';

export const portfolioPositionSchema = z.object({
  symbol: z.string().min(1),
  weight: z.number().min(0).max(1),
  price: z.number().positive().optional(),
});

export const createPortfolioSchema = z
  .object({
    name: z.string().min(1).optional(),
    positions: z.array(portfolioPositionSchema).min(1),
  })
  .superRefine((data, ctx) => {
    const symbols = data.positions.map((p) => p.symbol);
    const duplicates = symbols.filter((s, i) => symbols.indexOf(s) !== i);
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate symbols in portfolio: ${[...new Set(duplicates)].join(', ')}`,
        path: ['positions'],
      });
    }

    const weightSum = data.positions.reduce((acc, p) => acc + p.weight, 0);
    if (Math.abs(weightSum - 1) > config.weightSumEpsilon) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Position weights must sum to 1.0 (got ${weightSum})`,
        path: ['positions'],
      });
    }
  });

export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;

export const listPortfoliosQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListPortfoliosQuery = z.infer<typeof listPortfoliosQuerySchema>;

export const portfolioIdParamSchema = z.object({
  portfolioId: z.string().min(1),
});
