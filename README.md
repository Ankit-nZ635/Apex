# ⚡ Apex Ledger Studio (v2.0)
### Enterprise-Grade Time-Travel Event-Sourced Double-Entry Ledger Engine

A production-grade, minimal-overhead, high-throughput Double-Entry Ledger Engine and Enterprise SaaS platform built with **TypeScript**, **Fastify**, **PostgreSQL 16**, **Redis 7**, and **React 18 / Vite / Tailwind CSS** (modeled after Stripe, Mercury, and Linear).

---

## 🏛️ Core Architectural Invariants

| Invariant | Principle | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Invariant 1: Strict Immutability** | Zero `UPDATE` or `DELETE` queries on transaction or ledger tables. The ledger is physically append-only. | PostgreSQL `BEFORE UPDATE OR DELETE` triggers that raise an uncatchable exception (`prevent_ledger_mutation()`), paired with single-pass zero-update insert logic in TypeScript. |
| **Invariant 2: Double-Entry Balance** | Every transaction consists of $\ge 2$ postings where $\sum \text{debits} - \sum \text{credits} = 0$. Minor units only. | Strict mathematical summation checks, currency matching, and pessimistic row locking to prevent overdrafts (rejection with `422 Unprocessable Entity`). |
| **Invariant 3: Deterministic Time-Travel** | State as of timestamp $T$ deterministically reconstructs from the closest preceding snapshot plus delta replays. | Bounded $O(k)$ replay: snapshots recorded synchronously every 50 events; linear sequential replay strictly between snapshot sequence and target $T$. |
| **Invariant 4: Strict Idempotency** | Duplicate submissions of the same `Idempotency-Key` within 24 hours return the exact identical payload without side effects. | Redis atomic `SET NX EX 60` lock + 24-hour response cache (`EX 86400`) + database unique constraint fallback. Returns `is_idempotent_replay: true` in <1ms. |

---

## 🔒 Security, Authentication & Actor Audit Trail

1. **Multi-Method Authentication**:
   - **Google OAuth 2.0 (`POST /auth/google`)**: Enterprise SSO with token verification and instant one-click fallback for development.
   - **Phone + Redis-Backed OTP (`POST /auth/phone/send-otp` & `POST /auth/phone/verify-otp`)**:
     - International E.164 and country code support (`+91`, `+1`, `+44`, `+49`, `+65`, `+61`).
     - Redis-backed rate limiting (maximum 3 requests per 5 minutes per phone number).
     - 6-digit OTP with 300-second TTL.
     - Development-mode banner returning `dev_otp` for immediate one-click testing without external SMS provider setup.
   - **Instant Demo Roles (`POST /auth/demo`)**:
     - **Sarah Jenkins** (Role: `ADMIN` · Chief Financial Officer)
     - **Alex Rivera** (Role: `AUDITOR` · Forensic Lead)
     - **Marcus Chen** (Role: `OPERATOR` · Treasury Operations)

2. **Immutable Actor Audit Trail**:
   - Every double-entry transaction posting is immutably linked to `created_by_user_id` (`UUID REFERENCES users(id)`), recording the user's name, email, avatar, and role alongside the transaction payload.

---

## 💻 Enterprise Fintech UI/UX (Stripe / Mercury Aesthetic)

- **Collapsible Sidebar Navigation**:
  - `Overview`: Executive KPI Bento grid, cash flow velocity chart, distribution, and live journal feed.
  - `Chart of Accounts`: Live account cards with real-time balance calculations, slide-over modals for New Account and Transfer.
  - `Journal & Postings`: Full double-entry ledger stream with expandable debit/credit legs, copyable SHA-256 hashes, and creator badges.
  - `Time-Travel Replay`: Interactive historical timeline scrubber with clickable event pins and snapshot proof.
  - `Cryptographic Audit`: Linked block explorer with **"Simulate Tamper Test"** educational modal.
- **Top Command Bar & Command Palette (`Cmd+K` / `Ctrl+K`)**:
  - Global modal to search accounts, transactions, or trigger quick transfers and audits.
  - System telemetry pill: `ONLINE | PG:✓ RD:✓ | Latency: 4ms`.
  - User profile dropdown with role badge and workspace switcher.
- **Account Ledger Statement Drawer & CSV Export**:
  - Clicking any account card opens a slide-over statement showing chronological transactions, counterparty accounts, running balances, and snapshot checkpoint markers.
  - One-click RFC-4180 compliant **CSV Export** button.
- **Duplicate Idempotency Replay Demonstration**:
  - Toggle in the transaction drawer to re-send the same key and observe the `CACHED_IDEMPOTENT_REPLAY (0.4ms)` badge.

---

## 🚀 Quickstart

### 1. Start Infrastructure (PostgreSQL 16 & Redis 7)
```bash
docker compose up -d
```

### 2. Install Dependencies & Build
```bash
# Backend
npm install
npm run build

# Frontend
cd frontend
npm install
npm run build
cd ..
```

### 3. Run Concurrency & Stress Tests (50 Concurrent Transactions)
```bash
npm run test:concurrency
```
*Validates zero deadlocks (40P01), 422 overdraft rejection, idempotency cache replay, snapshot generation at 50 events, and total system value conservation.*

### 4. Start Server & Frontend Dashboard
```bash
# Terminal 1: Fastify Backend API (Port 3000)
npm start

# Terminal 2: Frontend Dashboard (Port 5173)
npm run frontend:dev
```
Open **`http://localhost:5173`** in your browser to experience the enterprise fintech workspace.

---

## 📡 API Reference

### Authentication
- `POST /auth/phone/send-otp` - Send 6-digit OTP to mobile number (rate-limited via Redis).
- `POST /auth/phone/verify-otp` - Verify code, upsert user, issue signed JWT.
- `POST /auth/google` - Enterprise Google SSO login with demo fallback.
- `POST /auth/demo` - Instant role sign-in (`ADMIN`, `AUDITOR`, `OPERATOR`).
- `GET /auth/me` - Current authenticated user details and organization info.

### Ledger & Accounts
- `GET /accounts` - List accounts with real-time calculated balances.
- `POST /accounts` - Create new chart of accounts entry.
- `GET /accounts/:id/statement` - Chronological ledger statement with running balances and counterparties.
- `GET /accounts/:id/balance` - Real-time balance and audit events.
- `GET /accounts/:id/time-travel?asOf=ISO_TIMESTAMP` - Deterministic historical replay.

### Transactions
- `POST /transactions` - Post double-entry transaction (`Idempotency-Key` header, optional `Authorization: Bearer <token>`).
- `GET /transactions?limit=50` - List transactions with expandable legs and creator audit profiles.

### Cryptographic Audit
- `GET /ledger/verify-integrity` - Traverse SHA-256 hash chain from Genesis to Head.
