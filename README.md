# Order Splitter API — Robo-Advisor Model Portfolios

Backend API that a robo-advisor partner calls to split an order across
a model portfolio and to retrieve historic orders.

Stack: Node.js + TypeScript + Express + Zod + Jest/Supertest + decimal.js.
See `docs/PROJECT_PLAN.md` for the full design and `docs/Assignment-brief.pdf`
for the original brief. `ANSWERS.md` covers approach, assumptions, and a
path-to-production discussion.

## Setup

```bash
npm install
```

## Run

```bash
npm run dev     # ts-node-dev, auto-reload
npm run build   # compile to dist/
npm start       # run compiled dist/server.js
```

Server listens on `PORT` (default `3000`). Every request is logged to
console as `METHOD path STATUS duration_ms`.

## Test / Lint

```bash
npm test
npm run lint
```

## Configuration

Read once at boot from environment variables (`src/config/index.ts`):

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `QUANTITY_DECIMAL_PLACES` | `3` | Decimal places for share quantities |
| `DEFAULT_STOCK_PRICE` | `100` | Fixed price used when a position has no override |
| `MARKET_OPEN_UTC` | `13:30` | Market open, UTC 24h clock |
| `MARKET_CLOSE_UTC` | `20:00` | Market close, UTC 24h clock |
| `CORS_ORIGIN` | `*` | Allowed CORS origin (`*` or a single origin, e.g. `https://your-frontend.vercel.app`) |

## API

Base path: `/api/v1`.

### `GET /health`

`200 { "status": "ok" }`

### `GET /api/v1/config`

Read-only view of the active config above.

### `POST /api/v1/portfolios` — register a model portfolio

```bash
curl -X POST http://localhost:3000/api/v1/portfolios \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Balanced Growth",
    "positions": [
      { "symbol": "AAPL", "weight": 0.6 },
      { "symbol": "TSLA", "weight": 0.4, "price": 245.32 }
    ]
  }'
```

`201` with the stored portfolio (`portfolioId`, `createdAt`). `400` if
positions are empty, weights don't sum to `1.0` (within `0.005`), or symbols
repeat.

### `GET /api/v1/portfolios` / `GET /api/v1/portfolios/:portfolioId`

List (`?page`, `?limit`, default `1`/`20`, max `limit` `100`) or fetch one.
`404` if not found.

### `POST /api/v1/orders` — split & place an order

Inline portfolio:

```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "orderType": "BUY",
    "amount": 100,
    "portfolio": {
      "positions": [
        { "symbol": "AAPL", "weight": 0.6 },
        { "symbol": "TSLA", "weight": 0.4, "price": 245.32 }
      ]
    }
  }'
```

Registered portfolio:

```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H 'Content-Type: application/json' \
  -d '{ "orderType": "BUY", "amount": 100, "portfolioId": "<id>" }'
```

Exactly one of `portfolio` (inline) or `portfolioId` (registered) is
required. `201` with the order, its per-position `allocations`
(`amount`/`price`/`quantity`), and `status` (`PENDING_EXECUTION` or
`EXECUTED`, derived at read time from `executionAt`). `400` for invalid
payloads; `404` if `portfolioId` doesn't exist.

### `GET /api/v1/orders` — historic orders

Query params (all optional): `symbol`, `orderType` (`BUY`/`SELL`), `status`
(`PENDING_EXECUTION`/`EXECUTED`), `from`/`to` (epoch millis, filters on
`createdAt`), `page`, `limit`.

### `GET /api/v1/orders/:orderId`

`200` with the order, `404` if not found.

## Libraries and why

| Library | Why |
|---|---|
| Express | Minimal, ubiquitous web framework |
| Zod | Type-safe schema validation with inferred TS types and field-level errors |
| decimal.js | Native JS `*`/`/` on floats produces errors like `0.29 * 100 === 28.999999999999996`; all money/quantity math runs through `Decimal` and converts to `number` only at the response boundary |
| Jest + Supertest | Unit + HTTP integration testing |
| ESLint + Prettier | Baseline code quality/formatting |
