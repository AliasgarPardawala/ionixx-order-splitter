import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('GET /api/v1/orders (empty store)', () => {
  it('returns an empty list before any orders exist', async () => {
    const res = await request(app).get('/api/v1/orders');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });
});

describe('POST /api/v1/orders', () => {
  it('splits a BUY order with an inline portfolio using the fixed default price', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({
        orderType: 'BUY',
        amount: 100,
        portfolio: { positions: [{ symbol: 'AAPL', weight: 1 }] },
      });

    expect(res.status).toBe(201);
    expect(res.body.allocations).toEqual([
      { symbol: 'AAPL', weight: 1, amount: 100, price: 100, quantity: 1 },
    ]);
    expect(['PENDING_EXECUTION', 'EXECUTED']).toContain(res.body.status);
    expect(typeof res.body.executionAt).toBe('number');
    expect(typeof res.body.createdAt).toBe('number');
  });

  it('splits a SELL order the same way as BUY', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({
        orderType: 'SELL',
        amount: 50,
        portfolio: { positions: [{ symbol: 'TSLA', weight: 1 }] },
      });

    expect(res.status).toBe(201);
    expect(res.body.orderType).toBe('SELL');
  });

  it('uses a partner-supplied price override', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({
        orderType: 'BUY',
        amount: 100,
        portfolio: {
          positions: [
            { symbol: 'AAPL', weight: 0.6 },
            { symbol: 'TSLA', weight: 0.4, price: 245.32 },
          ],
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.allocations[0].price).toBe(100);
    expect(res.body.allocations[1].price).toBe(245.32);
  });

  it('splits an order against a registered portfolio via portfolioId', async () => {
    const portfolioRes = await request(app)
      .post('/api/v1/portfolios')
      .send({ positions: [{ symbol: 'MSFT', weight: 1 }] });

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .send({ orderType: 'BUY', amount: 200, portfolioId: portfolioRes.body.portfolioId });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.portfolioId).toBe(portfolioRes.body.portfolioId);
    expect(orderRes.body.allocations[0]).toMatchObject({ symbol: 'MSFT', amount: 200 });
  });

  it('rejects a missing orderType', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({ amount: 100, portfolio: { positions: [{ symbol: 'AAPL', weight: 1 }] } });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid orderType', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({ orderType: 'HOLD', amount: 100, portfolio: { positions: [{ symbol: 'AAPL', weight: 1 }] } });
    expect(res.status).toBe(400);
  });

  it('rejects a non-positive amount', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({ orderType: 'BUY', amount: 0, portfolio: { positions: [{ symbol: 'AAPL', weight: 1 }] } });
    expect(res.status).toBe(400);
  });

  it('rejects weights that do not sum to 1.0', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({ orderType: 'BUY', amount: 100, portfolio: { positions: [{ symbol: 'AAPL', weight: 0.5 }] } });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate symbols in an inline portfolio', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({
        orderType: 'BUY',
        amount: 100,
        portfolio: {
          positions: [
            { symbol: 'AAPL', weight: 0.5 },
            { symbol: 'AAPL', weight: 0.5 },
          ],
        },
      });
    expect(res.status).toBe(400);
  });

  it('rejects an empty positions array', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({ orderType: 'BUY', amount: 100, portfolio: { positions: [] } });
    expect(res.status).toBe(400);
  });

  it('rejects both portfolio and portfolioId given together', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({
        orderType: 'BUY',
        amount: 100,
        portfolio: { positions: [{ symbol: 'AAPL', weight: 1 }] },
        portfolioId: 'some-id',
      });
    expect(res.status).toBe(400);
  });

  it('rejects neither portfolio nor portfolioId given', async () => {
    const res = await request(app).post('/api/v1/orders').send({ orderType: 'BUY', amount: 100 });
    expect(res.status).toBe(400);
  });

  it('returns 404 for a non-existent portfolioId', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send({ orderType: 'BUY', amount: 100, portfolioId: 'does-not-exist' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/orders', () => {
  it('returns 404 for an unknown orderId', async () => {
    const res = await request(app).get('/api/v1/orders/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('filters by symbol and orderType, and paginates', async () => {
    const listRes = await request(app).get('/api/v1/orders').query({ symbol: 'AAPL' });
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.every((o: { allocations: { symbol: string }[] }) =>
      o.allocations.some((a) => a.symbol === 'AAPL'),
    )).toBe(true);

    const sellRes = await request(app).get('/api/v1/orders').query({ orderType: 'SELL' });
    expect(sellRes.body.data.every((o: { orderType: string }) => o.orderType === 'SELL')).toBe(true);

    const pagedRes = await request(app).get('/api/v1/orders').query({ page: 1, limit: 1 });
    expect(pagedRes.body.data).toHaveLength(1);
  });
});

describe('response timing', () => {
  it('logs a timing line for each request', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    await request(app).get('/health');
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^GET \/health \d+ \d+\.\d+ms$/));
    logSpy.mockRestore();
  });
});
