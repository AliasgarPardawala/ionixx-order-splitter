import { splitOrder } from '../../src/services/orderSplitterService';

describe('splitOrder', () => {
  it('splits using the fixed default price when no override is given', () => {
    const allocations = splitOrder(100, [
      { symbol: 'AAPL', weight: 0.6 },
      { symbol: 'TSLA', weight: 0.4 },
    ], 3);

    expect(allocations[0]).toMatchObject({ symbol: 'AAPL', amount: 60, price: 100, quantity: 0.6 });
    expect(allocations[1]).toMatchObject({ symbol: 'TSLA', amount: 40, price: 100, quantity: 0.4 });
  });

  it('uses a partner-supplied price override for that symbol only', () => {
    const allocations = splitOrder(100, [
      { symbol: 'AAPL', weight: 0.6 },
      { symbol: 'TSLA', weight: 0.4, price: 245.32 },
    ], 3);

    expect(allocations[0].price).toBe(100);
    expect(allocations[1].price).toBe(245.32);
  });

  it('reconciles allocated dollars to the input total', () => {
    const allocations = splitOrder(100, [
      { symbol: 'A', weight: 0.3333 },
      { symbol: 'B', weight: 0.3333 },
      { symbol: 'C', weight: 0.3334 },
    ], 3);

    const totalAmount = allocations.reduce((acc, a) => acc + a.amount, 0);
    expect(totalAmount).toBeCloseTo(100, 2);
  });
});
