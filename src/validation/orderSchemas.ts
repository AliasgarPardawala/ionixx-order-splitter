import { z } from 'zod';
import { portfolioPositionSchema } from './portfolioSchemas';
import { config } from '../config';

const inlinePortfolioSchema = z.object({
  positions: z.array(portfolioPositionSchema).min(1),
});

export const createOrderSchema = z
  .object({
    orderType: z.enum(['BUY', 'SELL']),
    amount: z.number().positive(),
    portfolio: inlinePortfolioSchema.optional(),
    portfolioId: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    const hasInline = data.portfolio !== undefined;
    const hasRef = data.portfolioId !== undefined;

    if (hasInline === hasRef) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Exactly one of `portfolio` (inline) or `portfolioId` (registered) is required',
        path: hasInline ? ['portfolioId'] : ['portfolio'],
      });
      return;
    }

    if (hasInline && data.portfolio) {
      const symbols = data.portfolio.positions.map((p) => p.symbol);
      const duplicates = symbols.filter((s, i) => symbols.indexOf(s) !== i);
      if (duplicates.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate symbols in portfolio: ${[...new Set(duplicates)].join(', ')}`,
          path: ['portfolio', 'positions'],
        });
      }

      const weightSum = data.portfolio.positions.reduce((acc, p) => acc + p.weight, 0);
      if (Math.abs(weightSum - 1) > config.weightSumEpsilon) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Position weights must sum to 1.0 (got ${weightSum})`,
          path: ['portfolio', 'positions'],
        });
      }
    }
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const listOrdersQuerySchema = z.object({
  symbol: z.string().min(1).optional(),
  orderType: z.enum(['BUY', 'SELL']).optional(),
  status: z.enum(['PENDING_EXECUTION', 'EXECUTED']).optional(),
  from: z.coerce.number().optional(),
  to: z.coerce.number().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

export const orderIdParamSchema = z.object({
  orderId: z.string().min(1),
});
