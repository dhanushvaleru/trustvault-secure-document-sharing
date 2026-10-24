# TrustVault Comprehensive Threat Model (THREATS.md)

This threat model documents real attack vectors, operational impact, implemented mitigations, corresponding source code / tests, remaining limitations, and accepted residual risk.

---

### 1. Broken Object-Level Authorization (BOLA / IDOR)
- **Attack Scenario**: Attacker modifies a document UUID in `GET /api/documents/:id` or `GET /api/documents/:id/download` to access another owner's confidential document.
- **Impact**: Unauthorized exposure of confidential document contents or metadata.
- **Mitigation Implemented**: Every protected document endpoint evaluates `requireDocumentAccess` middleware. The middleware queries database state to verify that the authenticated caller is either the document owner or possesses an active, unrevoked `DocumentPermission` grant. Unshared documents return HTTP 404.
- **Relevant Code / Test**: `server/src/middleware/document-access.middleware.ts`, `server/tests/security/document-authorization.test.ts` (`Changing a document ID in request (IDOR) does not bypass authorization`).
- **Remaining Limitation**: None within application boundaries.
- **Accepted Risk**: No. Fully mitigated.

---

### 2. Privilege Escalation via Mass Assignment
- **Attack Scenario**: Attacker submits `role: "ADMIN"` or `ownerId: "..."` in user registration or document upload payloads.
- **Impact**: Attacker gains administrative capabilities or forges document ownership.
- **Mitigation Implemented**: Strict input validation using Zod (`registerSchema`, `createDocumentMetadataSchema`). Registration schemas do not accept a `role` field (defaults strictly to `OWNER`), and upload controllers derive `ownerId` solely from `req.user.id` extracted from the server-validated session.
- **Relevant Code / Test**: `server/src/validation/index.ts`, `server/tests/security/auth-and-roles.test.ts` (`Registration prevents privilege escalation (cannot register as ADMIN)`).
- **Remaining Limitation**: Initial seed or manual DB admin assignment required.
- **Accepted Risk**: No. Fully mitigated.

---

### 3. Permission Revocation Races & Stale Decision Caching
- **Attack Scenario**: A user downloads documents using cached authorization decisions or long-lived pre-signed URLs after the owner revoked access.
- **Impact**: Ex-employees or revoked vendors continue retrieving confidential data.
- **Mitigation Implemented**: Decisions are evaluated in real time directly against the database on every request (`revokedAt IS NULL`). No long-lived signed download URLs are generated; all downloads stream through the authenticated backend proxy.
- **Relevant Code / Test**: `server/src/controllers/permission.controller.ts`, `server/tests/security/permissions-and-revocation.test.ts` (`IMMEDIATE REVOCATION: Revoking access instantly terminates read and download access`).
- **Remaining Limitation**: Revocation cannot claw back files already downloaded to an external device prior to revocation.
- **Accepted Risk**: Yes. Physical data retention outside the platform cannot be revoked cryptographically.

---

### 4. Session Theft & Hijacking
- **Attack Scenario**: Attacker intercepts or reads session credentials via XSS or network sniffing.
- **Impact**: Complete impersonation of victim user.
- **Mitigation Implemented**: Session tokens are 256-bit cryptographically random strings delivered via `HttpOnly`, `SameSite=Strict`, and `Secure` cookies. Raw tokens are never stored in the database (stored as SHA-256 hashes). Cookies are inaccessible to JavaScript `document.cookie`.
- **Relevant Code / Test**: `server/src/services/auth.service.ts`, `server/src/controllers/auth.controller.ts`.
- **Remaining Limitation**: Man-in-the-middle on plaintext HTTP if deployed without reverse proxy TLS.
- **Accepted Risk**: Acceptable in local dev; mitigated by requiring HTTPS reverse proxy in production.

---

### 5. Cross-Site Request Forgery (CSRF)
- **Attack Scenario**: Malicious website tricks an authenticated user's browser into issuing unauthorized POST/DELETE requests to TrustVault.
- **Impact**: Unauthorized file upload, permission grant, or deletion.
- **Mitigation Implemented**: Session cookies use `SameSite=Strict` preventing the browser from attaching cookies on cross-origin requests. API requests reject non-JSON payloads and require custom headers (`X-Correlation-ID`).
- **Relevant Code / Test**: `server/src/controllers/auth.controller.ts` (`sameSite: "strict"`).
- **Remaining Limitation**: Legacy browsers lacking `SameSite` cookie support.
- **Accepted Risk**: Accepted; modern browser standard support is >99%.

---

### 6. Cross-Site Scripting (XSS)
- **Attack Scenario**: Attacker uploads document with malicious script in title, description, or filename.
- **Impact**: Script execution in victim's browser.
- **Mitigation Implemented**: React automatically HTML-escapes all rendered text. Backend sanitizes original filenames, and downloads set `X-Content-Type-Options: nosniff` and `Content-Disposition: attachment`.
- **Relevant Code / Test**: `server/src/controllers/document.controller.ts`, `client/src/components/DocumentTable.tsx`.
- **Remaining Limitation**: None.
- **Accepted Risk**: No. Fully mitigated.

---

### 7. SQL Injection
- **Attack Scenario**: Attacker inputs SQL syntax into search or filter queries (`' OR 1=1 --`).
- **Impact**: Database compromise or data exfiltration.
- **Mitigation Implemented**: Prisma ORM uses parameterized queries for all database operations. Raw SQL queries are entirely avoided.
- **Relevant Code / Test**: `server/src/controllers/document.controller.ts` (`prisma.document.findMany`).
- **Remaining Limitation**: None.
- **Accepted Risk**: No. Fully mitigated.

---

### 8. Path Traversal
- **Attack Scenario**: Attacker names an uploaded file `../../../../etc/passwd` to overwrite or read system files.
- **Impact**: Host filesystem compromise.
- **Mitigation Implemented**: Files are never stored using user-supplied filenames. Storage identifiers are random UUID v4 strings (`storageKey`). `LocalStorageAdapter` enforces path resolution checking `resolved.startsWith(baseDir)` and rejects path traversal characters.
- **Relevant Code / Test**: `server/src/services/storage.service.ts`, `server/tests/security/upload-validation.test.ts` (`Sanitizes path traversal characters in filenames and generates unguessable UUID storage keys`).
- **Remaining Limitation**: None.
- **Accepted Risk**: No. Fully mitigated.

---

### 9. Malicious File Uploads & Disguised Executables
- **Attack Scenario**: Attacker renames a Windows `.exe` or shell script to `invoice.pdf` to bypass extension filters.
- **Impact**: Malware distribution or server execution.
- **Mitigation Implemented**: Strict binary magic-byte inspection verifying `%PDF`, `\x89PNG`, JPEG, and ZIP headers. Binary executable headers (MZ, ELF, Mach-O, Shebang `#!`) are explicitly rejected regardless of extension.
- **Relevant Code / Test**: `server/src/services/storage.service.ts`, `server/tests/security/upload-validation.test.ts` (`Rejects disguised executable files (MZ header masquerading as .pdf)`).
- **Remaining Limitation**: Zero-day exploit embedded in valid PDF data without an anti-virus scanner.
- **Accepted Risk**: Yes. Antivirus/ClamAV integration can be integrated as an asynchronous worker.

---

### 10. Oversized Files and Resource Exhaustion
- **Attack Scenario**: Attacker floods upload endpoints with gigabyte-sized files.
- **Impact**: Disk space depletion, server crash, Denial of Service.
- **Mitigation Implemented**: Multer middleware enforces `fileSize: 10485760` (10MB maximum limit). Express JSON body parser is restricted to 1MB.
- **Relevant Code / Test**: `server/src/routes/document.routes.ts`, `server/tests/security/upload-validation.test.ts` (`Rejects uploads exceeding maximum permitted file size`).
- **Remaining Limitation**: High volume of distinct 10MB uploads could exhaust disk.
- **Accepted Risk**: Acceptable; production deployments monitor storage volume utilization and apply per-user quotas.

---

### 11. Insecure Direct File URLs
- **Attack Scenario**: Attacker guesses static storage path (`/storage/uuid.pdf`).
- **Impact**: Complete bypass of authentication and audit logs.
- **Mitigation Implemented**: Private storage folder is never exposed as an Express static asset directory. Files can only be accessed through `/api/documents/:id/download`, which enforces authentication, authorization, and audit logging.
- **Relevant Code / Test**: `server/src/app.ts`, `server/src/controllers/document.controller.ts`.
- **Remaining Limitation**: None.
- **Accepted Risk**: No. Fully mitigated.

---

### 12. Metadata Leakage in Search & 404 Responses
- **Attack Scenario**: Attacker searches for documents or queries IDs to deduce file titles or owner names.
- **Impact**: Information disclosure.
- **Mitigation Implemented**: Document search applies server-side authorization filters prior to query execution. Non-permitted documents return consistent HTTP 404 without leaking document existence or ownership.
- **Relevant Code / Test**: `server/src/controllers/document.controller.ts`, `server/tests/security/document-authorization.test.ts` (`Search results do not disclose unauthorized document metadata`).
- **Remaining Limitation**: None.
- **Accepted Risk**: No. Fully mitigated.

---

### 13. Audit Log Tampering
- **Attack Scenario**: An insider with database update access alters an audit record to conceal unauthorized access.
- **Impact**: Invalidation of compliance trail and non-repudiation failure.
- **Mitigation Implemented**: Cryptographic SHA-256 hash chaining: $H_i = \text{SHA256}(\text{CanonicalData}_i + H_{i-1})$. Modifying or deleting any historical record breaks hash continuity. `AuditService.verifyChain()` automatically detects the tampering.
- **Relevant Code / Test**: `server/src/services/audit.service.ts`, `server/tests/security/audit-chain-integrity.test.ts` (`Cryptographic verification detects DELIBERATE TAMPERING of an audit record`).
- **Remaining Limitation**: A root attacker with full write access to the database could rewrite all audit rows and recompute the entire hash chain from the altered point forward.
- **Accepted Risk**: Yes. Mitigated via `api.admin.createCheckpoint()` exporting signed HMAC checkpoints to external immutable storage.

---

### 14. Audit Omission (Fail-Closed Enforcement)
- **Attack Scenario**: An attacker induces an error in the audit table to perform an action without an audit log being written.
- **Impact**: Unaudited document access or permissions grant.
- **Mitigation Implemented**: Operations and their corresponding audit events execute within atomic database transactions (`prisma.$transaction`). If audit writing fails, the entire transaction rolls back.
- **Relevant Code / Test**: `server/src/controllers/document.controller.ts`, `server/src/controllers/permission.controller.ts`.
- **Remaining Limitation**: Read/download audit events are logged immediately prior to streaming file bytes.
- **Accepted Risk**: No. Fail-closed policy enforced.

---

### 15. Unauthorized Administrator Access to Document Contents
- **Attack Scenario**: An administrator uses their privileged role to snoop on confidential financial or HR files.
- **Impact**: Breach of confidentiality.
- **Mitigation Implemented**: Separation of RBAC and DAC. `requireDocumentAccess` explicitly prohibits administrators from downloading document contents unless an explicit `DocumentPermission` grant is assigned. Unauthorized attempts return HTTP 403 and log `ACCESS_DENIED`.
- **Relevant Code / Test**: `server/src/middleware/document-access.middleware.ts`, `server/tests/security/document-authorization.test.ts` (`Administrator cannot read document contents merely by having ADMIN role`).
- **Remaining Limitation**: None within application logic.
- **Accepted Risk**: No. Strictly enforced.

---

### 16. Account Deactivation and Stale Sessions
- **Attack Scenario**: A terminated employee continues accessing documents using an existing valid session token.
- **Impact**: Post-termination unauthorized data access.
- **Mitigation Implemented**: Authentication middleware checks `user.status === 'ACTIVE'` on every request. Deactivating a user immediately deletes all active sessions from the `Session` table.
- **Relevant Code / Test**: `server/src/controllers/admin.controller.ts`, `server/tests/security/auth-and-roles.test.ts` (`Deactivated user cannot continue using an existing session`).
- **Remaining Limitation**: None.
- **Accepted Risk**: No. Fully mitigated.

---

### 17. Race Conditions in Permission Updates
- **Attack Scenario**: Simultaneous concurrent grant and revocation requests cause nondeterministic ACL states.
- **Impact**: Inconsistent permission state.
- **Mitigation Implemented**: Compound uniqueness constraint `@@unique([documentId, userId])` on `DocumentPermission`. All permission updates run in interactive database transactions.
- **Relevant Code / Test**: `server/prisma/schema.prisma`, `server/src/controllers/permission.controller.ts`.
- **Remaining Limitation**: None.
- **Accepted Risk**: No. Fully mitigated.

---

### 18. Database Compromise
- **Attack Scenario**: Database dump is leaked or exfiltrated.
- **Impact**: Exposure of password hashes, document metadata, and session tokens.
- **Mitigation Implemented**: Passwords protected with high-memory Argon2id. Sessions stored as SHA-256 hashes (raw tokens cannot be recovered). Actual document files reside in separate private storage, not in SQL columns.
- **Relevant Code / Test**: `server/src/services/auth.service.ts`.
- **Remaining Limitation**: Document titles and categories are stored in plaintext in the database.
- **Accepted Risk**: Yes; metadata encryption at rest is deferred to database volume-level encryption (LUKS / AWS EBS encryption).

---

### 19. Storage Volume Compromise
- **Attack Scenario**: Attacker accesses the private filesystem storage directory.
- **Impact**: Potential file content recovery.
- **Mitigation Implemented**: Files are stored with opaque UUID keys; no association to user IDs or titles is present in the storage directory without database mapping.
- **Remaining Limitation**: Unencrypted files at the filesystem layer.
- **Accepted Risk**: Yes; mitigated in production via filesystem-level AES-256 encryption or S3 bucket encryption.

---

### 20. Backup Exposure
- **Attack Scenario**: Unencrypted database backups are improperly shared or stored in public buckets.
- **Impact**: Full historical data breach.
- **Mitigation Implemented**: Documented requirement for encrypted backups and external signed audit checkpoints.
- **Remaining Limitation**: Operational discipline outside codebase.
- **Accepted Risk**: Accepted operational risk.

---

### 21. Secrets Accidentally Committed to Git
- **Attack Scenario**: Developer commits `.env` containing production secrets to source control.
- **Impact**: Total compromise of encryption keys and database credentials.
- **Mitigation Implemented**: `.env` and `storage/` are explicitly added to `.gitignore`. `.env.example` provides non-sensitive template values.
- **Relevant Code / Test**: `.gitignore`, `.env.example`.
- **Remaining Limitation**: None.
- **Accepted Risk**: No.

---

### 22. Denial of Service (DoS) via Login Brute-Force
- **Attack Scenario**: Attacker attempts credential stuffing against login endpoint.
- **Impact**: Server CPU exhaustion from Argon2id hashing and account lockout.
- **Mitigation Implemented**: In-memory IP rate limiter restricts login attempts to 5 failures per 15-minute window. Exceeding attempts triggers HTTP 429 and `AUTH_LOGIN_FAILED` audit logging.
- **Relevant Code / Test**: `server/src/controllers/auth.controller.ts`.
- **Remaining Limitation**: Distributed brute-force across a botnet requires network-level WAF / Cloudflare rate limiting.
- **Accepted Risk**: Accepted application-level mitigation.

---

### 23. Dependency Vulnerabilities
- **Attack Scenario**: Vulnerable third-party package allows remote code execution.
- **Impact**: Host compromise.
- **Mitigation Implemented**: Minimal dependency footprint. Up-to-date versions of Express, Prisma, Zod, and Vite.
- **Remaining Limitation**: Ongoing emergence of zero-day vulnerabilities in npm ecosystem.
- **Accepted Risk**: Accepted; mitigated via CI/CD `npm audit` scans.
