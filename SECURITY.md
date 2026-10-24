# TrustVault Security Architecture & Implementation Guide

## 1. Authentication Model

TrustVault implements zero-trust server-side authentication:
- **Password Hashing**: Argon2id via `@node-rs/argon2` adhering to OWASP guidelines:
  - Algorithm: Argon2id
  - Memory Cost: 19 MiB (`19456` KB)
  - Iterations (Time Cost): `2`
  - Parallelism: `1`
  - Salt: Cryptographically random 16 bytes generated per password.
- **Server-Side Session Management**:
  - High-entropy session identifiers: 32 bytes (256 bits) from `crypto.randomBytes(32)`.
  - Database token storage: SHA-256 hash of raw session token (`tokenHash = SHA256(rawToken)`). Raw tokens are never stored in the database.
  - Cookies: Delivered via `HttpOnly`, `SameSite=Strict`, and `Secure` (in production) cookies named `trustvault_session`.
  - Rolling Expiration & Idle Timeout: Absolute expiration set to 8 hours (`SESSION_TTL_HOURS`), idle timeout set to 60 minutes (`IDLE_TIMEOUT_MINUTES`).
  - Account Deactivation Enforcement: Every protected request verifies `user.status === 'ACTIVE'`. Deactivation immediately deletes all active sessions from the database.

---

## 2. Authorization Model: Separation of RBAC and DAC

TrustVault strictly decouples **Role-Based Access Control (RBAC)** from **Document-Level Access Control (DAC)**:

```
                  ┌───────────────────────────────┐
                  │      Authenticated Request    │
                  └───────────────┬───────────────┘
                                  ▼
                    ┌───────────────────────────┐
                    │  RBAC Layer (Role Check)  │
                    │   - ADMIN: Gov/Audit      │
                    │   - OWNER: Upload/Manage  │
                    │   - VIEWER: Read grants   │
                    └─────────────┬─────────────┘
                                  ▼
                    ┌───────────────────────────┐
                    │  DAC Layer (Object Check) │
                    │   1. Is caller OWNER?     │
                    │   2. Is caller ADMIN?     │
                    │      (Deny file download  │
                    │       unless grant held)  │
                    │   3. Active grant in DB?  │
                    │      (READ vs EDIT)       │
                    └─────────────┬─────────────┘
                                  ▼
                    ┌───────────────────────────┐
                    │ Authorized Operation +    │
                    │ Tamper-Evident Audit Event│
                    └───────────────────────────┘
```

### Administrative Content Access Boundary
An administrator account does **not** automatically possess permission to download or read confidential document contents simply by having the `ADMIN` role. If an administrator attempts to download a private document without holding an explicit, active `DocumentPermission` grant, the backend denies the request with HTTP 403 and records an `ACCESS_DENIED` security audit event.

---

## 3. Private File Storage Architecture

- **Isolation**: Files are stored in a private directory configured via `STORAGE_DIR` (outside the web root). This directory is never mounted as an Express static asset directory.
- **Generated Storage Identifiers**: Physical files are named using cryptographically random UUID v4 strings (`storageKey`), preventing path traversal attacks and preventing predictability.
- **MIME & Magic-Byte Verification**:
  - The browser-supplied `Content-Type` header is distrusted.
  - The server reads the initial bytes of the file buffer to match exact binary signatures (magic bytes) for PDF (`%PDF`), PNG (`\x89PNG`), JPEG (`\xff\xd8\xff`), and ZIP/DOCX/XLSX (`PK\x03\x04`).
  - Executable headers (Windows PE/MZ `0x4D 0x5A`, Linux ELF `\x7fELF`, Mach-O, and Shebang `#!`) are explicitly rejected even if masquerading as `.pdf` or `.png`.
- **Authenticated Download Proxy**:
  - Downloads route through `/api/documents/:id/download`.
  - Content is served with `X-Content-Type-Options: nosniff` and `Content-Disposition: attachment; filename="sanitized"`.
  - Fail-closed: Audit logging commits before file bytes are streamed. If authorization fails, zero file bytes are emitted.

---

## 4. Immediate Revocation Semantics

TrustVault achieves immediate revocation without caching stale decisions:
1. Revocation sets `revokedAt = NOW()` inside an atomic database transaction.
2. Every subsequent protected request directly evaluates the current database state (`WHERE documentId = ? AND userId = ? AND revokedAt IS NULL`).
3. TrustVault does not issue long-lived signed download URLs.
4. **Physical Reality Limitation**: As documented in the security model, revocation terminates all subsequent platform access immediately; it cannot remotely redact a file that a user already downloaded or extracted outside the platform prior to revocation.

---

## 5. Tamper-Evident Audit Trail & Cryptographic Chaining

All security-relevant actions are committed to an append-only cryptographic ledger:
- **Genesis Block**: Deterministic initial seed hash `0000000000000000000000000000000000000000000000000000000000000000`.
- **Hash Principle**:
  $$\text{current\_hash} = \text{SHA256}(\text{canonical\_event\_data} + \text{previous\_hash})$$
- **Deterministic Canonicalization**:
  To prevent hashing discrepancies due to JSON key ordering, keys are strictly lexicographically sorted prior to serialization:
  `actionType`, `actorUserId`, `correlationId`, `documentId`, `id`, `metadataJson`, `outcome`, `previousHash`, `targetUserId`, `timestamp`.
- **Verification Engine**:
  `AuditService.verifyChain()` sequentially recalculates hashes across the chain. Any altered metadata, deleted event, or inserted event breaks the cryptographic continuity and is flagged with the exact sequence number and event ID.
- **Important Trust Limitation**:
  A hash chain stored in the same database is tamper-evident, but is not independently immutable against an adversary with root database write privileges who can rewrite the table and recompute all hashes. To mitigate this residual risk, TrustVault provides `api.admin.createCheckpoint()`, which generates a signed HMAC-SHA256 checkpoint suitable for periodic replication to separately controlled immutable external storage.

---

## 6. Secret Management & Production Hardening

- Secrets (`SESSION_SECRET`, `DATABASE_URL`) are read strictly from environment variables.
- Stack traces and internal error payloads are suppressed in production mode (`NODE_ENV=production`).
- Rate limiting enforces a maximum of 5 failed login attempts per 15-minute window per IP.
- Generic failure responses prevent user enumeration.

---

## 7. Incident Response Considerations

1. **Compromised Account**:
   - Administrator navigates to Admin Console -> Users -> Deactivate.
   - All active sessions for the user are immediately purged from database.
2. **Audit Discrepancy Alert**:
   - Run `GET /api/admin/audit/verify`.
   - If `isValid: false`, inspect `brokenAtEventId` and `brokenSequence`. Compare against external HMAC signed checkpoints to identify the exact tampering window.
