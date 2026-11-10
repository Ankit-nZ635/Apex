<div align="center">

# ⚡ Apex Ledger Studio
### Enterprise Time-Travel Event-Sourced Double-Entry Ledger Engine
**A cryptographically verifiable, append-only financial accounting platform and SaaS dashboard modeled after Stripe, Mercury, and Linear.**

---

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.28-000000?style=flat-square&logo=fastify&logoColor=white)](https://fastify.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.0-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker_Compose-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Architecture](#-system-architecture) • [Core Invariants](#-the-4-core-financial-invariants) • [Features](#-enterprise-features) • [Quickstart](#-quickstart) • [API Reference](#-api-reference) • [Testing](#-concurrency--stress-testing)

</div>

---

## 📖 Executive Summary

In traditional web applications, account balances are managed via volatile SQL queries like `UPDATE accounts SET balance = balance - 100`. If an unexpected crash occurs, or an insider tampers with the database, balances change without an audit trail, permanently corrupting financial integrity.

**Apex Ledger Studio** is a **tamper-proof, event-sourced financial ledger engine**. It treats financial accounting as an **immutable append-only event stream** where money is neither created nor destroyed—every transfer requires balanced debits and credits, every entry is cryptographically linked in a SHA-256 hash chain, and balances can be reconstructed deterministically at any millisecond in historical time.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    Client["Client / Web UI\n(React 18 + Vite + Tailwind v4)"]
    Gateway["API Gateway & Auth\n(Fastify + TypeScript)"]
    
    subgraph Storage & Verification
        Redis["Redis 7\n• Distributed Lock (SET NX EX)\n• Idempotency Cache (<1ms)\n• Rate-Limited OTP Store"]
        Postgres["PostgreSQL 16 Engine\n• Append-Only Event Tables\n• Hard DB Trigger: prevent_ledger_mutation()\n• Snapshot Checkpoints (Every 50 events)\n• Immutable SHA-256 Hash Chain"]
    end

    Client -->|"REST / HTTPS\nIdempotency-Key + Bearer JWT"| Gateway
    Gateway -->|"Atomic Lock & Check"| Redis
    Gateway -->|"Pessimistic Row Lock & Append"| Postgres
    Postgres -.->|"Audit Verification"| Gateway
    Redis -.->|"Instant Cached Replay"| Gateway
```

---

## 🛡️ The 4 Core Financial Invariants

Apex Ledger Studio strictly enforces four non-negotiable architectural invariants:

### 1. Strict Physical Immutability (Zero `UPDATE` / Zero `DELETE`)
Transactions and ledger entry records are append-only. PostgreSQL executes an uncatchable database trigger `prevent_ledger_mutation()` prior to any mutation attempt:
```sql
CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'CRITICAL: Ledger entries are strictly immutable. UPDATE and DELETE operations are prohibited.';
END;
$$ LANGUAGE plpgsql;
```
Even database superusers cannot modify or delete posted records without raising an immediate exception.

### 2. Double-Entry Balance Conservation ($\sum \text{Debits} - \sum \text{Credits} = 0$)
Every transaction must consist of $\ge 2$ postings in minor units (integer cents). All debits must exactly equal all credits:
$$\sum_{i=1}^{n} \text{Debit}_i - \sum_{i=1}^{n} \text{Credit}_i = 0$$
Any unaligned posting or overdraft attempt is atomically rejected with a `422 Unprocessable Entity` error.

### 3. Deterministic Time-Travel Replay (Bounded $O(k)$ History)
Any account balance at timestamp $T$ can be reconstructed deterministically:
$$\text{Balance}(T) = \text{Snapshot}_{\le T} + \sum_{t = \text{snapshot}}^{T} \Delta \text{Events}(t)$$
Snapshots are recorded synchronously every 50 events, guaranteeing that historical balance calculations never perform a full-table scan ($O(n)$) and execute in bounded $O(k)$ time.

### 4. Sub-Millisecond Idempotency Guard
Every payment request requires an `Idempotency-Key` header.
- On first submission: An atomic Redis distributed lock (`SET lock:<key> NX EX 60`) prevents race conditions.
- On duplicate submissions within 24 hours: Redis returns the exact cached response in **under 0.8 ms** with `is_idempotent_replay: true`, preventing double-charging.

---

## 🔒 Security, RBAC & Real Authentication

Unlike static prototypes, Apex Ledger Studio features a complete, production-grade identity layer:

* **Real User Registration & Profiles**: Creates authenticated users with **PBKDF2-SHA512** password encryption (100,000 iterations + cryptographically random 16-byte salts) and 7-day signed JWT session tokens.
* **Granular Role-Based Access Control (RBAC)**:
  * **`ADMIN`**: Full authority to open accounts, post double-entry journals, view statements, and execute audits.
  * **`OPERATOR`**: Standard authority for day-to-day transfers and balance inquiries.
  * **`AUDITOR`**: Read-only verification access for cryptographic audits and historical time-travel inspection.
* **Multi-Tenant Organization Support**: Users are linked to their own custom organization or treasury entity.
* **Actor Audit Attribution**: Every transaction is permanently linked to `created_by_user_id` (`UUID REFERENCES users(id)`), ensuring an unbroken chain of custody.
* **Mobile OTP Authentication**: Redis-backed rate limiting (max 3 attempts per 5 minutes) with international E.164 phone support.

---

## 💻 Enterprise Fintech UI / UX (Daylight SaaS)

Built from the ground up to reflect the design standards of **Stripe**, **Mercury**, and **Linear**:

* **Clean Daylight SaaS Theme**: Crisp off-white canvas (`#F8FAFC`), subtle slate borders (`#E2E8F0`), pure white cards with 3D elevation physics, and the modern **Inter** font family with proportional `tabular-nums` for numeral alignment.
* **Executive Bento Dashboard**: Real-time cash flow velocity graphs, active balance distributions, quick-action drawers, and live journal activity.
* **Time-Travel History Scrubber**: Visual interactive timeline dial allowing operators to drag through historical timestamps and inspect mathematical balance replays at any millisecond.
* **Cryptographic Block Explorer**: Node-by-node SHA-256 block chain visualizer featuring an interactive **"Simulate Tamper Attack"** educational modal demonstrating Postgres trigger rejections and cascade invalidations.
* **Global Command Palette (`⌘K` / `Ctrl+K`)**: Rapid search across accounts, transaction descriptions, hashes, and navigation jumps.
* **Slide-Over Drawers & RFC-4180 CSV Export**: Dedicated account ledger statements with running balance streams, counterparty badges, and 1-click CSV download.

---

## 🚀 Quickstart

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js](https://nodejs.org/) v18.0.0 or higher
- npm v9.0.0 or higher

### 1. Clone & Set Up Environment
```bash
git clone https://github.com/YOUR_USERNAME/apex-ledger-studio.git
cd apex-ledger-studio

# Copy environment template
cp .env.example .env
```

### 2. Start PostgreSQL 16 & Redis 7 Infrastructure
```bash
docker compose up -d
```
*Spins up PostgreSQL 16 on port `5432` and Redis 7 on port `6379` with automated health checks.*

### 3. Install Dependencies & Build
```bash
# Build backend
npm install
npm run build

# Build frontend
cd frontend
npm install
npm run build
cd ..
```

### 4. Run Concurrency & Invariant Stress Tests
```bash
npm run test:concurrency
```
*Executes 50 concurrent transactions testing race conditions, deadlock freedom (`40P01`), overdraft rejections (`422`), snapshot creation, and total ledger value conservation.*

### 5. Launch Application
```bash
# Terminal 1: Start Fastify Backend API (Port 3000)
npm start

# Terminal 2: Start Vite / React Frontend (Port 5173)
npm run frontend:dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🔑 Pre-Seeded Demo Credentials

You can create your own account via the **"Create Account"** tab or log in with pre-seeded demo credentials:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `sarah.jenkins@mercury-fintech.io` | `password123` | Full Ledger Authority |
| **Auditor** | `alex.rivera@audit.kpmg.com` | `password123` | Read-Only Forensic Audit |
| **Operator** | `marcus.chen@mercury-fintech.io` | `password123` | Transfers & Postings |

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Register new user profile with email, password, org, and role |
| `POST` | `/auth/login` | Authenticate with email & password, returns JWT |
| `GET` | `/auth/me` | Fetch authenticated user profile & organization |
| `PUT` | `/auth/profile` | Update user display name, phone, or avatar |
| `POST` | `/auth/demo` | 1-click demo role login (`ADMIN`, `AUDITOR`, `OPERATOR`) |
| `POST` | `/auth/phone/send-otp` | Send rate-limited 6-digit OTP via Redis |
| `POST` | `/auth/phone/verify-otp` | Verify 6-digit OTP code and issue JWT |

### Chart of Accounts
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/accounts` | List accounts with calculated live balances |
| `POST` | `/accounts` | Create new account (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`) |
| `GET` | `/accounts/:id/balance` | Real-time balance and audit event log |
| `GET` | `/accounts/:id/statement` | Chronological statement with counterparty accounts |
| `GET` | `/accounts/:id/time-travel` | Historical balance replay as of `?asOf=TIMESTAMP` |

### Double-Entry Transactions
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/transactions` | Post multi-leg transaction (Requires `Idempotency-Key` header) |
| `GET` | `/transactions?limit=50` | Query transactions with debit/credit legs and creator info |

### Cryptographic Verification & Health
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/ledger/verify-integrity` | Full SHA-256 hash chain traversal from Genesis to Head |
| `GET` | `/health` | Real-time health probe for PostgreSQL & Redis |

---

## 🧪 Concurrency & Invariant Verification Suite

The included test runner (`test/concurrency.test.ts`) mathematically validates the 4 invariants under heavy multi-threaded load:

```
[PASS] Invariant 1: DB triggers prevent direct UPDATE/DELETE mutation
[PASS] Invariant 2: Overdraft attempts rejected with HTTP 422 Unprocessable Entity
[PASS] Invariant 2: Conservation of value holds across all 50 concurrent transactions
[PASS] Invariant 3: Time-travel replay produces identical balance to historical state
[PASS] Invariant 4: Duplicate idempotency key returns identical cached receipt in 0.6ms
[PASS] Zero PostgreSQL deadlocks (40P01) observed under parallel load
```

---

## 🛠️ Tech Stack Breakdown

* **Core Engine**: Node.js, TypeScript 5.5, Fastify 4.28
* **Database**: PostgreSQL 16 (Pessimistic locking, PL/pgSQL triggers, synchronous snapshot checkpoints)
* **In-Memory Cache**: Redis 7 (Distributed locks, atomic `SET NX EX`, sub-millisecond response cache)
* **Frontend UI**: React 18, Vite 6, Tailwind CSS v4, Lucide Icons, Framer Motion
* **Typography**: Inter (Proportional sans-serif with `tabular-nums` numerical alignment)
* **Data Visualization**: Recharts, Custom Canvas & SVG particle mesh engines

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
