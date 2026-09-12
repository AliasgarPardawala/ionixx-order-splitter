import { randomUUID } from 'crypto';
import { Order, OrderView, PortfolioPosition } from '../domain/types';
import { CreateOrderInput, ListOrdersQuery } from '../validation/orderSchemas';
import { orderRepository, OrderRepository, OrderFilter } from '../repositories/orderRepository';
import { portfolioService, PortfolioService } from './portfolioService';
import { splitOrder } from './orderSplitterService';
import { computeExecutionAt } from './executionScheduleService';
import { Clock, systemClock } from '../utils/clock';
import { config } from '../config';
import { NotFoundError } from '../domain/errors';

export class OrderService {
  constructor(
    private readonly repo: OrderRepository = orderRepository,
    private readonly portfolios: PortfolioService = portfolioService,
    private readonly clock: Clock = systemClock,
  ) {}

  create(input: CreateOrderInput): OrderView {
    let positions: PortfolioPosition[];
    let portfolioId: string | undefined;

    if (input.portfolioId) {
      const portfolio = this.portfolios.getById(input.portfolioId);
      positions = portfolio.positions;
      portfolioId = portfolio.portfolioId;
    } else {
      // superRefine on the schema guarantees `portfolio` is present here.
      positions = input.portfolio!.positions;
    }

    const allocations = splitOrder(input.amount, positions, config.quantityDecimalPlaces);

    const order: Order = {
      orderId: randomUUID(),
      orderType: input.orderType,
      totalAmount: input.amount,
      portfolioId,
      allocations,
      quantityDecimalPlaces: config.quantityDecimalPlaces,
      createdAt: this.clock.now(),
      executionAt: computeExecutionAt(this.clock),
    };

    return this.repo.save(order);
  }

  getById(orderId: string): OrderView {
    const order = this.repo.findById(orderId);
    if (!order) {
      throw new NotFoundError(`Order not found: ${orderId}`);
    }
    return order;
  }

  list(query: ListOrdersQuery) {
    const filter: OrderFilter = {
      symbol: query.symbol,
      orderType: query.orderType,
      status: query.status,
      from: query.from,
      to: query.to,
    };
    return this.repo.list(filter, query.page, query.limit);
  }
}

export const orderService = new OrderService();
