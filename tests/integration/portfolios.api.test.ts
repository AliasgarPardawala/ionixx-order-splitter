import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('POST /api/v1/portfolios', () => {
  it('registers a portfolio and can fetch it back by id', async () => {
    const createRes = await request(app)
      .post('/api/v1/portfolios')
      .send({
        name: 'Balanced Growth',
        positions: [
          { symbol: 'AAPL', weight: 0.6 },
          { symbol: 'TSLA', weight: 0.4, price: 245.32 },
        ],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.portfolioId).toBeDefined();
    expect(typeof createRes.body.createdAt).toBe('number');

    const getRes = await request(app).get(`/api/v1/portfolios/${createRes.body.portfolioId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body).toEqual(createRes.body);
  });

  it('rejects an empty positions array', async () => {
    const res = await request(app).post('/api/v1/portfolios').send({ positions: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects weights that do not sum to 1.0', async () => {
    const res = await request(app)
      .post('/api/v1/portfolios')
      .send({ positions: [{ symbol: 'AAPL', weight: 0.5 }] });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate symbols', async () => {
    const res = await request(app)
      .post('/api/v1/portfolios')
      .send({
        positions: [
          { symbol: 'AAPL', weight: 0.5 },
          { symbol: 'AAPL', weight: 0.5 },
        ],
      });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown portfolioId', async () => {
    const res = await request(app).get('/api/v1/portfolios/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('GET /api/v1/portfolios', () => {
  it('paginates registered portfolios', async () => {
    for (let i = 0; i < 3; i += 1) {
      await request(app)
        .post('/api/v1/portfolios')
        .send({ positions: [{ symbol: 'AAPL', weight: 1 }] });
    }

    const res = await request(app).get('/api/v1/portfolios').query({ page: 1, limit: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(3);
  });
});
