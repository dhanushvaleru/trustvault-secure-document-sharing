# TrustVault: Secure Document Sharing Platform with Tamper-Evident Audit Logging

TrustVault is a production-oriented, security-first document management and sharing platform engineered to guarantee that only explicitly authorized users can access documents and that all sensitive actions are recorded in a cryptographically verifiable, tamper-evident audit trail.

---

## Key Features

- **Decoupled RBAC and DAC**: Three discrete roles (`ADMIN`, `OWNER`, `VIEWER`) separated from document access control (`OWNER`, `EDIT`, `READ`). Administrators never receive automatic access to confidential document contents without an explicit grant.
- **Immediate Revocation**: Access grants revoked by document owners take effect immediately across all subsequent requests without relying on stale client caches or long-lived signed download URLs.
- **Private File Storage**: Files are stored in an isolated directory with unguessable UUID storage keys. Never exposed as a public static directory.
- **Strict File Validation**: Binary magic-byte signatures verify true media types (PDF, PNG, JPEG, DOCX, XLSX, TXT, CSV, JSON) and reject disguised executable headers (MZ/PE, ELF, Mach-O, Shebang).
- **Tamper-Evident Audit Trail**: Append-only cryptographic ledger using SHA-256 hash chaining:
  $$H_i = \text{SHA256}(\text{CanonicalEvent}_i + H_{i-1})$$
  Includes a built-in verification engine that detects altered metadata, missing records, or sequence gaps.
- **Enterprise Security Controls**: Argon2id password hashing, server-side session management with SHA-256 hashed token storage, `HttpOnly` / `SameSite=Strict` / `Secure` cookies, IP rate limiting, and zero-knowledge 404 responses.
- **Automated Security Test Suite**: 31 Vitest integration tests covering cross-user access, immediate revocation, IDOR resistance, upload validation, audit tampering detection, and mutation resistance.

---

## Technology Stack

### Backend
- **Runtime**: Node.js (v20+ / v24)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (Production) / SQLite (Zero-dependency local testing)
- **ORM**: Prisma ORM with migrations and seed scripts
- **Authentication**: Argon2id via `@node-rs/argon2`, server-side sessions
- **Validation**: Zod schema validation
- **Testing**: Vitest & Supertest

### Frontend
- **Framework**: React 18 with TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS (Deep navy / slate enterprise palette)
- **Icons**: Lucide React
- **Routing**: React Router v7

### Infrastructure & Deployment
- **Containerization**: Docker multi-stage build & Docker Compose
- **Database Container**: PostgreSQL 16 Alpine with health check probes
- **Reverse Proxy Support**: Configured for HTTPS terminating reverse proxy (Nginx, Caddy, AWS ALB)

---

## Repository Structure

```
Trust Vault Project/
├── client/                     # Vite + React 18 + Tailwind CSS frontend
│   ├── src/
│   │   ├── api/client.ts       # Authenticated API client (HttpOnly credentials)
│   │   ├── components/         # Tables, Modals, Navbar, Sidebar
│   │   ├── context/            # AuthContext (server-side session sync)
│   │   └── pages/              # Landing, Auth, Dashboard, Admin Console
│   └── vite.config.ts
├── server/                     # Node.js + Express + TypeScript backend
│   ├── prisma/
│   │   ├── schema.prisma       # Active Prisma schema (SQLite dev / test)
│   │   ├── schema.postgresql.prisma # PostgreSQL production schema
│   │   └── seed.ts             # Deterministic seed script (Admin, Owner, Viewer)
│   ├── src/
│   │   ├── controllers/        # Auth, Documents, Permissions, Admin
│   │   ├── middleware/         # Auth, RBAC, DAC, Validation, Rate Limit
│   │   ├── services/           # Storage, Audit Hash Chain, Argon2id Crypto
│   │   └── app.ts              # Express application setup
│   └── tests/
│       ├── helpers/            # Test harness and session fixtures
│       └── security/           # 31 security integration test specs
├── storage/                    # Private local filesystem document storage
├── Dockerfile                  # Production container definition
├── docker-compose.yml          # Full-stack orchestration (PostgreSQL + App)
├── README.md                   # System documentation & quickstart
├── THREATS.md                  # Comprehensive threat model covering 23 vectors
├── PROMPTS.md                  # Verifiable AI development session log
├── API.md                      # Full REST API documentation
└── SECURITY.md                 # Security architecture, revocation & audit rules
```

---

## Installation & Setup

### Prerequisites
- Node.js (v20.x or v24.x)
- npm (v10+ or v11+)

### 1. Clone & Install Dependencies
```bash
# Install dependencies across all npm workspaces
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `server/.env`:
```bash
# Linux/macOS
cp .env.example server/.env

# Windows PowerShell
Copy-Item .env.example server/.env
```

Review environment defaults in `server/.env`:
```env
DATABASE_URL="file:./dev.db"
PORT=5000
NODE_ENV="development"
SESSION_SECRET="trustvault-development-secret-key-32-chars-minimum-entropy"
COOKIE_SECURE="false"
STORAGE_DIR="../storage"
REGISTRATION_ENABLED="true"
DEMO_ACCOUNTS_ENABLED="true"
SESSION_TTL_HOURS="8"
IDLE_TIMEOUT_MINUTES="60"
MAX_FILE_SIZE_BYTES="10485760"
```

### 3. Initialize Database & Push Schema
```bash
npm run prisma:push --workspace=server
```

### 4. Seed Demonstration Dataset
```bash
npm run db:seed --workspace=server
```

---

## Running Locally

### Development Mode (Concurrent Frontend & Backend)
Start the backend server on `http://localhost:5000`:
```bash
npm run dev --workspace=server
```
In a second terminal, start the Vite frontend on `http://localhost:3000`:
```bash
npm run dev --workspace=client
```
Open your browser at `http://localhost:3000`.

---

## Running Automated Security Tests

The test suite runs 31 integration security tests directly against the Express application and test database:
```bash
npm run test --workspace=server
```

### Mutation-Resistance Verification
To verify that the test suite fails when a critical authorization check is removed:
1. Temporarily comment out the active permission check in `server/src/middleware/document-access.middleware.ts` (`if (!activeGrant) { ... }`).
2. Run `npm run test --workspace=server`.
3. Observe that tests fail immediately with `MUTATION RESISTANCE: Unauthorized download fails and returns 0 file bytes`.
4. Restore the check and rerun tests to confirm 100% pass rate.

---

## Demonstration Accounts

When `DEMO_ACCOUNTS_ENABLED=true`, three pre-seeded demonstration accounts are available with password `Password123!`:

| Role | Email | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@trustvault.demo` | `Password123!` | Access to Admin Console, user deactivation, system audit logs, and one-click hash chain verifier. **Cannot** download confidential document contents without explicit grant. |
| **OWNER** | `owner@trustvault.demo` | `Password123!` | Full control over owned documents, file uploads, granting `READ`/`EDIT` permissions to registered users, and immediate revocation. |
| **VIEWER** | `viewer@trustvault.demo` | `Password123!` | Access exclusively to explicitly shared documents (`READ` or `EDIT`). Cannot manage permissions or view unshared files. |

The login page features 1-click auto-fill buttons for instant testing of all three roles.

---

## Production Deployment with Docker Compose

To deploy TrustVault in production with PostgreSQL:

```bash
# Build and start PostgreSQL + TrustVault app containers
docker-compose up -d --build
```

Health check verification:
```bash
curl -f http://localhost:5000/api/health
```

---

## Cryptographic Hash Chain Verification Utility

To verify the audit log's cryptographic integrity via the command line or API:
```bash
# Authenticate as Administrator and query verification endpoint
curl -X GET http://localhost:5000/api/admin/audit/verify \
  -H "Cookie: trustvault_session=<admin_token>"
```
Example Output:
```json
{
  "verification": {
    "isValid": true,
    "totalEvents": 48,
    "verifiedAt": "2026-10-23T21:30:00.000Z",
    "latestHash": "c4a3c0859c27e758db78ceca0746f0b66da916cde318b3972b074a7e8d1165ef"
  }
}
```

---

## Known Limitations & Security Trade-offs

1. **Client-Side Retention Post-Revocation**: While revocation terminates all future server-side downloads immediately upon transaction commit, it cannot remotely erase or redact physical file copies that an authorized user already downloaded to their local filesystem prior to revocation.
2. **Database Superuser Audit Rewriting**: A cryptographic hash chain stored in the application database is tamper-evident, but is not independently immutable against a privileged adversary with root SQL access who rewrites rows and recalculates the SHA-256 hashes. To mitigate this residual risk, TrustVault provides `api.admin.createCheckpoint()`, which exports signed HMAC-SHA256 checkpoints suitable for scheduled replication to external WORM (Write Once, Read Many) cold storage.
3. **Malware Scanning**: File validation enforces magic-byte signature matching and executable header rejection. Deep virus scanning requires external ClamAV daemon integration in high-risk environments.
