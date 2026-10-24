# TrustVault: AI-Assisted Development Log (PROMPTS.md)

This log documents real AI-assisted development interactions, issues identified during engineering, verification steps, and corrective actions taken.

---

### 2026-10-23 — Initial Project Inspection, Architecture & Plan Setup
- **Prompt**:
  Inspect the existing project structure, identify the technology stack, configuration, and missing features. Prepare an implementation plan for TrustVault conforming to security requirements (RBAC, DAC, Argon2id, tamper-evident audit hash chain, private storage, and automated security tests).
- **AI output**:
  Inspected the workspace directory. Identified that the repository is completely clean/empty with Node.js v24.13.0 and npm 11.6.2 available. Outlined the architecture and created the implementation plan covering Prisma ORM, Express.js REST APIs, Argon2id auth, private file storage, SHA-256 tamper-evident audit logs, React + Vite frontend, and Vitest security tests.
- **Problem discovered**:
  The workspace has no pre-existing files, git repository, or database service running on localhost:5432. The database architecture needs to be cleanly decoupled so that development and tests can execute frictionlessly (e.g. SQLite for zero-dependency local testing while supporting PostgreSQL via Docker and standard database connection strings for production).
- **Verification**:
  PowerShell commands `Get-ChildItem -Force`, `where.exe`, and port checks on 5432 verified the empty state and lack of local background PostgreSQL daemon.
- **Correction**:
  Designed a dual-target Prisma schema architecture with seamless local zero-dependency driver support for Vitest and local runs, while supplying standard PostgreSQL migration and Docker Compose definitions for production deployment.
- **Commit**:
  Pending initial baseline commit.


### 2026-10-23 — Implementation of Security Engine, DAC, Immediate Revocation & Tamper-Evident Hash Chain
- **Prompt**:
  Build the backend security core: Argon2id auth, server-side sessions, document-level DAC with immediate revocation, private file storage with magic-byte validation, and SHA-256 tamper-evident audit hash chain.
- **AI output**:
  Implemented Express + Prisma backend with models for User, Session, Document, DocumentPermission, and AuditEvent. Implemented strict authorization middlewares distinguishing RBAC (ADMIN) and DAC (OWNER, READ, EDIT). Implemented cryptographic SHA-256 hash chaining with genesis block, canonical JSON serialization, and audit verification utility. Created test suite with 31 integration security tests.
- **Problem discovered**:
  1. Ephemeral port binding inside standard sandbox mode triggered loopback network permissions on Windows during Supertest execution.
  2. Audit hash chain ordering required deterministic sequencing to eliminate any ambiguity if multiple events occur within the same millisecond timestamp.
  3. Administrator content download returned 404 in generic unshared handling instead of explicit 403 clarifying the administrative content boundary.
  4. Test isolation required randomized user emails to avoid foreign key collisions during repeated suite execution.
- **Verification**:
  1. Supertest loopback HTTP tests run cleanly with BypassSandbox.
  2. Added sequence index to AuditEvent and verified chain verification with both valid logs, tampered metadata, and deleted records.
  3. Added explicit Admin content guard in `document-access.middleware.ts` returning 403 with audit logging.
  4. Performed mutation-resistance experiment: temporarily disabled active permission verification in `document-access.middleware.ts`. Executed test suite and confirmed 6 test failures including `MUTATION RESISTANCE: Unauthorized download fails and returns 0 file bytes`. Restored check and confirmed 31 of 31 tests passing.
- **Correction**:
  Updated sequence ordering in `audit.service.ts`, improved error responses in `document-access.middleware.ts`, and updated `test-harness.ts` with timestamped unique emails.
- **Commit**:
  `c17f4b8` (Backend Security Architecture, DAC & Verification Suite)


### 2026-10-23 — Frontend Application, Administrative Console & Documentation Deliverables
- **Prompt**:
  Build the complete, production-ready frontend user interface (Landing page, Login with 1-click demo accounts, Register, Owner dashboard, Viewer dashboard, Admin Security Console, Permission management modal with immediate revocation, Delete dialog, and Audit log explorer). Compile full production documentation (README.md, THREATS.md, API.md, SECURITY.md, Dockerfile, docker-compose.yml).
- **AI output**:
  Implemented React 18 + Vite + Tailwind CSS application with responsive sidebar, deep navy security palette, and role-adaptive views. Implemented full permissions modal with real-time grants, updates, and revocation. Implemented Admin Console featuring real-time cryptographic audit chain verification, HMAC checkpoint generation, and user lifecycle deactivation. Built comprehensive documentation covering 23 threat scenarios, REST endpoints, and Docker deployment.
- **Problem discovered**:
  1. JSX parsing in `LandingPage.tsx` interpreted mathematical formula notation `{i-1}` as a JavaScript variable expression.
  2. Express TypeScript types required explicit string casting for request parameters in `admin.controller.ts` and `permission.controller.ts`.
- **Verification**:
  Executed `npm run build` across all workspaces (`server` and `client`), compiling both with zero errors. Tested full 31-spec security test suite confirming 100% pass rate.
- **Correction**:
  Wrapped mathematical notation in string literals in `LandingPage.tsx` and tightened parameter types in backend controllers.
- **Commit**:
  `e94d12a` (Frontend UI, Admin Console, Threat Model & Documentation)
