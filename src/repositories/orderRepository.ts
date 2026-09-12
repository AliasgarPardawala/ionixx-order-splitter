import { Order, OrderStatus, OrderType, OrderView } from '../domain/types';
import { Clock, systemClock } from '../utils/clock';

export interface OrderFilter {
  symbol?: string;
  orderType?: OrderType;
  status?: OrderStatus;
  from?: number;
  to?: number;
}

function deriveStatus(order: Order, now: number): OrderStatus {
  return now >= order.executionAt ? 'EXECUTED' : 'PENDING_EXECUTION';
}

function toView(order: Order, now: number): OrderView {
  return { ...order, status: deriveStatus(order, now) };
}

/**
 * In-memory store, wiped on restart by construction. `status` is never
 * stored — it's derived here at read time from `executionAt` vs. the
 * injected clock, since there is no background job/scheduler.
 */
export class OrderRepository {
  private readonly store = new Map<string, Order>();

  constructor(private readonly clock: Clock = systemClock) {}

  save(order: Order): OrderView {
    this.store.set(order.orderId, order);
    return toView(order, this.clock.now());
  }

  findById(orderId: string): OrderView | undefined {
    const order = this.store.get(orderId);
    return order ? toView(order, this.clock.now()) : undefined;
  }

  list(filter: OrderFilter, page: number, limit: number): { data: OrderView[]; total: number } {
    const now = this.clock.now();
    let all = [...this.store.values()].map((order) => toView(order, now));

    if (filter.symbol) {
      all = all.filter((o) => o.allocations.some((a) => a.symbol === filter.symbol));
    }
    if (filter.orderType) {
      all = all.filter((o) => o.orderType === filter.orderType);
    }
    if (filter.status) {
      all = all.filter((o) => o.status === filter.status);
    }
    if (filter.from !== undefined) {
      all = all.filter((o) => o.createdAt >= filter.from!);
    }
    if (filter.to !== undefined) {
      all = all.filter((o) => o.createdAt <= filter.to!);
    }

    const start = (page - 1) * limit;
    return { data: all.slice(start, start + limit), total: all.length };
  }
}

export const orderRepository = new OrderRepository();
