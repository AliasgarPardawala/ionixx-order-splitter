# Answers

## What was your approach (thought process) to tackling this project?

First pass was just reading the brief closely and listing down all the requirements and
noting where calls needs to be taken (rounding, status, portfolio identity),
I made an explicit call on each and wrote it down in the plan so code and docs would stay consistent.

Execution: An Express app with Zod validation at the controller, services hold the business logic,
in-memory repos for storage. 

Two important points:
1. Money math had to go through `decimal.js`, since native float math breaks the exact reconciliation the split requires,
2. "now" had to be an injectable clock everywhere instead of `new Date()`, or the execution-window and status logic 
wouldn't be testable.

## What assumptions did you make?

- Weights are fractions (0–1), must sum to ~1.0.
- Execution is market-hours aware, UTC only, no holiday list maintained. A real system
  would use a proper timezone-aware calendar.
- Rounding uses largest-remainder apportionment so allocated dollars/shares
  always reconcile exactly to the input, instead of drifting from
  independent per-position rounding.
- Portfolios can be sent inline or registered once and referenced by id.
- `QUANTITY_DECIMAL_PLACES` is an env var, changed by restarting.
- Storage is a plain in-memory `Map`, wiped on restart, per the brief.

## What challenges did you face when creating your solution?

Picking the rounding method. The simplest option was round each position's share independently.
One issue with this approach was that the rounded parts don't reliably sum back to the original amount,
and a API handling financial transactions can't be off by a few cents. Dumping the leftover remainder
onto one arbitrary position (say, the last one, or the largest) fixes the
reconciliation but unfairly concentrates all the rounding error there.
Largest-remainder apportionment does both: it guarantees the total reconciles
exactly, and spreads the leftover units across whichever positions were
closest to rounding up, so no one position absorbs the whole discrepancy.

Getting largest-remainder rounding right for both dollars and quantities in
one pass, including ties where multiple positions have equal remainders.

## Path to production

- **Auth**: API keys or OAuth2 client-credentials per partner.
- **Abuse prevention**: per-partner rate limiting, a request body size cap,
  and a sanity ceiling on order `amount` so a malformed or malicious request
  can't place an absurd order.
- **Real persistence**: Postgres with migrations instead of an in-memory Map,
  so orders survive a restart.
- **Real market data**: A live price feed instead of the fixed $100 default.
- **A real market calendar**: Timezone-aware (DST, exchange holidays) instead of the fixed UTC window.
- **Observability**: structured logging, correlation IDs, metrics/tracing instead of console timing.
- **Audit and monitoring**: an immutable audit log of every order (who,
  when, from where), and alerting on anomalous patterns.
- **Security**: secrets management, dependency scanning, HTTPS/mTLS between partner and API.
- **An actual execution engine/queue**: Right now this only computes an`executionAt` timestamp, it never executes anything.

## If you’ve used LLMs to solve the challenge, describe how and where you’ve used

Planned with Claude, discussed through the brief and resolved ambiguous decisions above, then built
it incrementally, one reviewed commit per piece.

