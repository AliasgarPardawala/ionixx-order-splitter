# Project Plan — Ionixx Backend Developer Technical Challenge

**Order Splitter API for Robo-Advisor Model Portfolios**
Stack: Node.js + TypeScript + Express + Zod + Jest/Supertest

---

## 1. Problem Recap

Build a backend API (POC) that a robo-advisor partner calls to:

1. **Split an order** — given a model portfolio (stocks + weights) and a total dollar amount (+ order type BUY/SELL), return per-stock dollar amount and share quantity, plus when the order will execute (markets open Mon–Fri).
2. **Return historic orders** that have been placed.

Constraints called out explicitly in the brief:
- Configurable decimal precision for share quantities (e.g. 3 today, 7 later) — must be a config value, not hardcoded.
- Stock price defaults to a fixed **$100**, but a partner-supplied market price for a stock **overrides** the fixed price.
- RESTful endpoints, with documented request/response shapes.
- Response time instrumented in milliseconds and visible in console.
- Design must flexibly support different portfolios and both order types.
- No persistence across restarts (in-memory only).

## 2. Decisions on Ambiguous Points (finalized, to also go in ANSWERS.md)

These were the ambiguous spots the brief intentionally leaves open. Each was discussed and resolved as follows — documented here so they're consistent across code, README, and ANSWERS.md:

1. **Weight format — fractions only (0–1).** Positions carry a `weight` in `[0, 1]`; all positions in a portfolio must sum to `1.0` within a small epsilon (e.g. `0.005`). No percentage (0–100) auto-detection — keeps validation unambiguous.

2. **Execution timing — market-hours aware, UTC only.** All timestamps are handled in UTC; no local-timezone conversion anywhere in the system. A configurable market window (`MARKET_OPEN_UTC` / `MARKET_CLOSE_UTC`, default `13:30`–`20:00` UTC, approximating NYSE 9:30–16:00 Eastern) determines eligibility. Rule: if the request lands within the window on a Mon–Fri, the order is eligible for same-day execution at that moment; otherwise `executionAt` rolls forward to the next Mon–Fri's market-open time (in UTC). This does **not** shift for daylight saving — called out explicitly in ANSWERS.md as a deliberate simplification (a real system would use a timezone-aware market calendar, e.g. `America/New_York` with DST + holiday rules).

3. **Rounding — largest-remainder method, computed in arbitrary-precision decimal.** To keep allocated dollars reconciling exactly to the input amount: round every position's dollar `amount` to cents normally, but for quantities, compute each position's "ideal" (unrounded) share quantity, round all positions down to the configured decimal places, then distribute the leftover fractional remainder (the sum of truncation losses) to the positions with the largest fractional remainders, one smallest-unit increment at a time, until the total again matches what the ideal (unrounded) total would be. This is the standard "largest remainder" apportionment method (same idea used for seat apportionment / vote-to-seat rounding), applied to quantity rounding instead of a naive independent round-per-position. **All of this arithmetic is done with `decimal.js` rather than native JS numbers** — native `*`/`/` on floats (IEEE-754 doubles) can produce results like `0.29 * 100 === 28.999999999999996`, which is exactly the kind of error that would corrupt a largest-remainder comparison or a cents-reconciliation check. Values are parsed into `Decimal` at the service boundary and converted back to `number` only when building the JSON response.

4. **Order status — two statuses, computed on read.** `PENDING_EXECUTION` until the current time (UTC) passes the order's stored `executionAt` timestamp, then `EXECUTED`. This transition is **computed at read time** (e.g., in the repository's get/list methods) by comparing `now` to `executionAt` — there is no background job/scheduler, since nothing survives a restart anyway and the brief never asks for an execution engine.

5. **Model portfolio identity — inline by default, plus an optional registry.** `POST /orders` still accepts a portfolio inline (matches the brief's example exactly). Additionally, a small portfolio registry (`POST /portfolios`, `GET /portfolios`, `GET /portfolios/:id`) lets a partner register a model portfolio once and reference it by `portfolioId` in later order requests — this is closer to how a real partner integration would work (the "model portfolio" is a stable, named thing they maintain, not something they retype every call) and demonstrates handling both an inline and a referenced input shape in the same endpoint (a nice example of the "flexible design" the brief asks for). `POST /orders` accepts **either** `portfolio` (inline) **or** `portfolioId` (registered), not both.

6. **Decimal-place config — env var only.** `QUANTITY_DECIMAL_PLACES` is read from the environment at boot with a documented default (e.g. `3`). Changing it means restarting the process — matches "internally configurable" literally, and avoids over-building a runtime-mutable config surface the brief doesn't ask for.

7. **Persistence — plain in-memory store.** A simple `Map`/array inside the process, wiped on restart by construction. No DB, no file writes, no abstraction layer beyond what's needed to keep controllers thin — explicitly required not to survive a restart, so simplicity wins here over building a swappable-repository seam that isn't otherwise needed.

## 3. Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Language/runtime | TypeScript + Node.js (LTS) | Required by the brief |
| Web framework | Express | Minimal, ubiquitous, easy to explain end-to-end in review |
| Validation | Zod | Type-safe schema validation, infers TS types from schemas, good error messages |
| Decimal arithmetic | `decimal.js` | Native JS `*`/`/` on floats (IEEE-754 doubles) produce errors like `0.29 * 100 === 28.999999999999996`; money/quantity math (splitting, largest-remainder apportionment) is done in `Decimal` and converted to `number` only at the response boundary |
| Testing | Jest + Supertest | Standard pairing for unit + HTTP integration tests |
| Linting/formatting | ESLint + Prettier | Baseline code quality signal |
| IDs | `crypto.randomUUID()` (built-in) | No extra dependency needed |
| Logging/timing | Small custom middleware | Brief only asks for ms timing in console — no need for a heavy logger (pino/winston optional stretch) |

## 4. Project Structure

```
ionixx-order-splitter/
├── src/
│   ├── app.ts                     # Express app wiring (middleware, routes)
│   ├── server.ts                  # entrypoint (listen)
│   ├── config/
│   │   └── index.ts                # env-driven config (PORT, QUANTITY_DECIMAL_PLACES, DEFAULT_STOCK_PRICE, MARKET_OPEN_UTC, MARKET_CLOSE_UTC)
│   ├── domain/
│   │   ├── types.ts                 # Portfolio, PortfolioPosition, Order, OrderType, Allocation, OrderStatus
│   │   └── errors.ts                # AppError, ValidationError, NotFoundError
│   ├── validation/
│   │   ├── orderSchemas.ts          # Zod schemas + inferred types for order request bodies/query
│   │   └── portfolioSchemas.ts      # Zod schemas for portfolio registry requests
│   ├── services/
│   │   ├── pricingService.ts        # resolves price per symbol (override vs fixed $100)
│   │   ├── orderSplitterService.ts  # allocation math + largest-remainder rounding
│   │   ├── executionScheduleService.ts # market-hours-aware next-execution-time logic (UTC)
│   │   ├── orderService.ts          # orchestrates split + persists + retrieves history + status derivation
│   │   └── portfolioService.ts      # registers/retrieves model portfolios
│   ├── repositories/
│   │   ├── orderRepository.ts       # in-memory store (Map<string, Order>)
│   │   └── portfolioRepository.ts   # in-memory store (Map<string, Portfolio>)
│   ├── controllers/
│   │   ├── orderController.ts       # HTTP handlers, thin — calls services
│   │   └── portfolioController.ts   # HTTP handlers for portfolio registry
│   ├── routes/
│   │   ├── orderRoutes.ts           # /api/v1/orders routes
│   │   └── portfolioRoutes.ts       # /api/v1/portfolios routes
│   ├── middleware/
│   │   ├── requestTimer.ts          # logs method, path, status, duration(ms)
│   │   └── errorHandler.ts          # centralized error -> HTTP status mapping
│   └── utils/
│       ├── rounding.ts              # decimal.js-based rounding + largest-remainder apportionment helpers
│       └── clock.ts                 # injectable "now" provider (testability for execution timing)
├── tests/
│   ├── unit/
│   │   ├── orderSplitterService.test.ts
│   │   ├── pricingService.test.ts
│   │   ├── executionScheduleService.test.ts
│   │   ├── rounding.test.ts
│   │   └── portfolioService.test.ts
│   └── integration/
│       ├── orders.api.test.ts
│       └── portfolios.api.test.ts
├── .eslintrc.cjs / .prettierrc
├── tsconfig.json
├── package.json
├── README.md
└── ANSWERS.md
```

## 5. API Design

Base path: `/api/v1`

### 5.1 `POST /api/v1/portfolios` — register a model portfolio (optional convenience)

**Request body:**
```json
{
  "name": "Balanced Growth",
  "positions": [
    { "symbol": "AAPL", "weight": 0.6 },
    { "symbol": "TSLA", "weight": 0.4, "price": 245.32 }
  ]
}
```
**Response `201 Created`:**
```json
{
  "portfolioId": "3f2a1c4e-...-...",
  "name": "Balanced Growth",
  "positions": [ { "symbol": "AAPL", "weight": 0.6 }, { "symbol": "TSLA", "weight": 0.4, "price": 245.32 } ],
  "createdAt": "2026-09-11T10:00:00.000Z"
}
```

### 5.2 `GET /api/v1/portfolios` / `GET /api/v1/portfolios/:portfolioId`

List (paginated) or fetch one registered portfolio. `404` if not found.

### 5.3 `POST /api/v1/orders` — split & place an order

**Request body (inline portfolio):**
```json
{
  "orderType": "BUY",
  "amount": 100,
  "portfolio": {
    "positions": [
      { "symbol": "AAPL", "weight": 0.6 },
      { "symbol": "TSLA", "weight": 0.4, "price": 245.32 }
    ]
  }
}
```
**Request body (registered portfolio):**
```json
{ "orderType": "BUY", "amount": 100, "portfolioId": "3f2a1c4e-...-..." }
```
- `orderType`: `"BUY" | "SELL"` (required)
- `amount`: positive number, total dollars to allocate (required)
- exactly one of `portfolio` (inline, `{ positions: [...] }`) or `portfolioId` (string, references a registered portfolio) is required
- `positions[].symbol`: string (required)
- `positions[].weight`: number in `[0, 1]`; all positions' weights must sum to `1.0` within epsilon
- `positions[].price`: optional number — overrides the fixed $100 default for that symbol only

**Response `201 Created`:**
```json
{
  "orderId": "b3b1e9f0-...-...",
  "orderType": "BUY",
  "status": "PENDING_EXECUTION",
  "totalAmount": 100,
  "createdAt": "2026-09-11T10:15:00.000Z",
  "executionAt": "2026-09-11T13:30:00.000Z",
  "quantityDecimalPlaces": 3,
  "allocations": [
    { "symbol": "AAPL", "weight": 0.6, "amount": 60, "price": 100, "quantity": 0.6 },
    { "symbol": "TSLA", "weight": 0.4, "amount": 40, "price": 245.32, "quantity": 0.163 }
  ]
}
```
`status` and `executionAt` are illustrative — `status` is derived at read time (see §2.4); `executionAt` is always a UTC ISO timestamp (see §2.2).

**Errors:** `400` for invalid payload (bad enum, non-positive amount, weights not summing to 1.0, empty positions, duplicate symbols, both/neither of `portfolio`/`portfolioId` supplied), `404` if `portfolioId` doesn't exist — all with a Zod-derived, field-level error body.

### 5.4 `GET /api/v1/orders` — historic orders

Query params (all optional): `symbol`, `orderType`, `status`, `from`, `to` (ISO dates), `page` (default 1), `limit` (default 20, max 100).

**Response `200 OK`:**
```json
{
  "data": [ { "orderId": "...", "...": "..." } ],
  "pagination": { "page": 1, "limit": 20, "total": 1 }
}
```

### 5.5 `GET /api/v1/orders/:orderId` — single order detail

`200` with the order object (status derived at read time), `404` if not found.

### 5.6 `GET /api/v1/config` (stretch, read-only)

Returns current `quantityDecimalPlaces`, `defaultStockPrice`, `marketOpenUtc`, `marketCloseUtc` so a partner/reviewer can see active config without reading source.

## 6. Core Logic Details

**Order splitting (`orderSplitterService`):**
1. Validate weights are each in `[0, 1]` and sum to `1.0` within epsilon (e.g. `0.005`).
2. For each position: `price = new Decimal(position.price ?? DEFAULT_STOCK_PRICE)` (100).
3. `amount = new Decimal(totalAmount).times(weight)`, rounded to cents; largest-remainder applied here too if cent-level reconciliation is needed across positions.
4. `idealQuantity = amount.dividedBy(price)` — kept as a full-precision `Decimal`, not yet rounded.
5. Apply **largest-remainder rounding** across all positions' `idealQuantity` values at `quantityDecimalPlaces`: truncate each to N decimals, sum the truncated values, compute the total remainder vs. the true (unrounded) total, then bump the positions with the largest fractional remainders up by one unit at the Nth decimal place, one at a time, until the remainder is exhausted. All comparisons and arithmetic here use `Decimal`, so remainder ordering and the reconciliation check aren't at risk of a native-float rounding artifact tipping the decision. Convert to `number` only when assembling the final `Allocation` object for the JSON response.

**Execution schedule (`executionScheduleService`):**
- Input: current UTC date/time (injectable clock via `utils/clock.ts` for testability).
- Config: `MARKET_OPEN_UTC` / `MARKET_CLOSE_UTC` (default `13:30` / `20:00`).
- If `now` (UTC) falls on Mon–Fri and within `[MARKET_OPEN_UTC, MARKET_CLOSE_UTC)` → `executionAt = now`.
- Otherwise → `executionAt` = the next Mon–Fri's `MARKET_OPEN_UTC` timestamp strictly after `now`.
- No DST adjustment and no holiday calendar — documented simplification (see §2.2).

**Rounding (`utils/rounding.ts`, built on `decimal.js`):**
- `roundTo(value: Decimal.Value, decimalPlaces: number): Decimal` — thin wrapper over `Decimal#toDecimalPlaces()`, replacing a hand-rolled scale-and-round helper (no longer needed once arithmetic is in `Decimal` throughout).
- `apportionLargestRemainder(idealValues: Decimal.Value[], decimalPlaces: number): Decimal[]` — the largest-remainder allocator described above, operating entirely in `Decimal` and unit-tested independently of the splitter service, including cases specifically crafted to trip up native-float arithmetic (e.g. values built from `0.1`, `0.2`, `0.29 * 100`-style inputs) to prove the fix.

**Pricing (`pricingService`):** trivial now (override-or-default) but isolated as its own service so it's the obvious seam for plugging in a real market-data provider later — worth calling out in ANSWERS.md's "path to production" question (live price fetching is intentionally deferred — see conversation notes, not part of this submission's scope).

## 7. Data Model (in-memory)

```ts
type OrderStatus = 'PENDING_EXECUTION' | 'EXECUTED'; // derived at read time, not stored as a mutable field

interface Allocation {
  symbol: string;
  weight: number;       // fraction, 0-1
  amount: number;       // dollars, rounded to cents
  price: number;        // resolved price used (override or default $100)
  quantity: number;     // rounded to quantityDecimalPlaces via largest-remainder apportionment
}

interface Order {
  orderId: string;
  orderType: 'BUY' | 'SELL';
  totalAmount: number;
  portfolioId?: string;      // set if a registered portfolio was referenced
  allocations: Allocation[];
  quantityDecimalPlaces: number;
  createdAt: string;   // ISO, UTC
  executionAt: string; // ISO, UTC — market-hours-aware timestamp (see §2.2)
  // status is NOT stored; computed as EXECUTED once now >= executionAt, else PENDING_EXECUTION
}

interface PortfolioPosition {
  symbol: string;
  weight: number;      // fraction, 0-1
  price?: number;       // optional override
}

interface Portfolio {
  portfolioId: string;
  name?: string;
  positions: PortfolioPosition[];
  createdAt: string; // ISO, UTC
}
```
Both stored in `Map<string, T>` inside their respective repositories, insertion-ordered, filtered/paginated in memory. `orderRepository`'s get/list methods derive `status` from `executionAt` vs the injected clock's `now()` before returning.

## 8. Cross-Cutting Concerns

- **Validation:** Zod schemas at the controller boundary; invalid input never reaches services. Weight fields constrained to `[0, 1]`; portfolio input validated as exactly-one-of inline/`portfolioId`.
- **Error handling:** typed `AppError` subclasses (`ValidationError` → 400, `NotFoundError` → 404) caught by a single Express error-handling middleware → consistent JSON error shape `{ "error": { "code", "message", "details?" } }`.
- **Timing instrumentation:** middleware wraps every request, logs e.g. `POST /api/v1/orders 201 4.82ms` to console using `process.hrtime.bigint()` for precision.
- **Config:** all tunables (`PORT`, `QUANTITY_DECIMAL_PLACES`, `DEFAULT_STOCK_PRICE`, `MARKET_OPEN_UTC`, `MARKET_CLOSE_UTC`) read once at boot from `process.env` with defaults, centralized in `config/index.ts` — nothing else reads `process.env` directly.
- **Clock:** all "current time" reads go through `utils/clock.ts` so tests can inject a fixed `now()` rather than depending on real wall-clock time (critical for testing execution-window and status-transition edge cases).

## 9. Testing Strategy

Unit tests (business logic, no HTTP):
- Splitter: correct amount/quantity math; weight-sum validation (`[0,1]`, sums to 1.0); price override vs default; largest-remainder rounding correctness (totals reconcile exactly) at multiple `quantityDecimalPlaces` configs (0, 3, 7); inputs specifically chosen to be classic native-float traps (e.g. `0.1 + 0.2`-style weights, `0.29 * 100`-style prices) to confirm `decimal.js` avoids the artifact.
- Execution schedule: within market window on a weekday → immediate; before open / after close on a weekday → next window; Sat/Sun → next Monday's open; exact boundary instants (`== open`, `== close`) with an injected fixed clock.
- Rounding/apportionment helper: decimal-precision edge cases; ties in remainder distribution; all-zero and single-position cases.
- Portfolio service: register/retrieve, weight validation reused from splitter's rules.

Integration tests (Supertest against the Express app):
- Happy path BUY and SELL with fixed price, both inline and registered-portfolio input.
- Happy path with a partner-supplied price override.
- 400s: missing fields, weights not summing to 1.0, non-positive amount, invalid `orderType`, duplicate symbols, empty positions array, both/neither `portfolio`/`portfolioId` given.
- `404` for a non-existent `portfolioId` and a non-existent `orderId`.
- Historic orders: empty store → empty list; after creating N orders → correct filtering by `symbol`/`orderType`/`status`/date range and pagination; status flips from `PENDING_EXECUTION` to `EXECUTED` once the injected clock passes `executionAt`.
- Response-time header/log presence (smoke-level, not asserting exact ms).

Target: meaningful coverage of edge cases per the brief's evaluation criteria, not a raw % target.

## 10. Deliverables Checklist

- [ ] Public GitHub repo, compiles clean (`npm run build`)
- [ ] `README.md`: setup/run instructions, curl/HTTP request examples for every endpoint, list of libraries + why
- [ ] `ANSWERS.md`: approach, assumptions, challenges, production-migration plan, LLM usage notes
- [ ] Passing test suite (`npm test`) with unit + integration coverage of edge cases
- [ ] Lint clean (`npm run lint`)

## 11. Implementation Phases

1. **Scaffold** — repo, TS config, ESLint/Prettier, Express skeleton, folder structure.
2. **Domain + config** — types, config module (incl. market-hours window), rounding + apportionment util, injectable clock.
3. **Core services** — pricing, splitter (with largest-remainder rounding), execution schedule (with unit tests as each lands).
4. **Persistence + history** — in-memory order + portfolio repositories, status derivation on read, list/filter/paginate logic.
5. **API layer** — portfolio routes/controllers, order routes/controllers, Zod validation, error-handling middleware, timing middleware.
6. **Integration tests** — full request/response coverage incl. edge cases, both inline and registered-portfolio flows.
7. **Docs** — README, ANSWERS.md, example requests (curl/HTTPie/Postman collection).
8. **Polish** — lint pass, final review against the deliverables checklist, push to public GitHub repo.
