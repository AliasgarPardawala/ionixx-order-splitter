export type OrderType = 'BUY' | 'SELL';

// derived at read time from executionAt vs. the clock, never stored
export type OrderStatus = 'PENDING_EXECUTION' | 'EXECUTED';

export interface PortfolioPosition {
  symbol: string;
  weight: number;
  price?: number;
}

export interface Portfolio {
  portfolioId: string;
  name?: string;
  positions: PortfolioPosition[];
  createdAt: number;
}

export interface Allocation {
  symbol: string;
  weight: number;
  amount: number;
  price: number;
  quantity: number;
}

export interface Order {
  orderId: string;
  orderType: OrderType;
  totalAmount: number;
  portfolioId?: string;
  allocations: Allocation[];
  quantityDecimalPlaces: number;
  createdAt: number;
  executionAt: number;
}

export type OrderView = Order & { status: OrderStatus };

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}
