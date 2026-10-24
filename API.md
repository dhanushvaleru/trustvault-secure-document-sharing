# TrustVault REST API Reference

TrustVault exposes a fully authenticated RESTful API with strict separation between Role-Based Access Control (RBAC) and Document-Level Access Control (DAC). All sensitive actions record tamper-evident cryptographic audit events.

---

## Global Headers & Authentication

| Header | Description | Required |
| :--- | :--- | :--- |
| `Cookie` | `trustvault_session=<token>` (HttpOnly, Secure, SameSite=Strict) | Required for protected endpoints |
| `Authorization` | `Bearer <token>` (Alternative for headless API clients) | Optional if cookie is present |
| `X-Correlation-ID` | Unique request tracking UUID. Echoed in response header. | Optional (generated automatically if omitted) |

---

## Authentication Endpoints

### 1. `POST /api/auth/register`
Creates a new user account with default `OWNER` role (allowing document uploads).

- **Authentication**: None
- **Required Role**: None
- **Document Permission**: N/A
- **Request Body**:
  ```json
  {
    "name": "Alice Smith",
    "email": "alice@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Registration successful. Please log in.",
    "user": {
      "id": "c1f7a0b3-6c8a-4c8d-8a5e-123456789abc",
      "name": "Alice Smith",
      "email": "alice@example.com",
      "role": "OWNER",
      "status": "ACTIVE",
      "createdAt": "2026-10-23T18:00:00.000Z"
    }
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Payload validation failed (e.g. password < 10 characters or missing symbols).
  - `403 Forbidden`: Self-registration is disabled (`REGISTRATION_ENABLED=false`).
  - `409 Conflict`: Account already exists (generic error prevents enumeration).
- **Audit Behavior**: Records `AUTH_REGISTER` audit event with `SUCCESS` or `DENIED`.

---

### 2. `POST /api/auth/login`
Authenticates credentials against Argon2id hash, initializes server-side session, and issues `trustvault_session` cookie.

- **Authentication**: None
- **Required Role**: None
- **Document Permission**: N/A
- **Request Body**:
  ```json
  {
    "email": "alice@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Login successful",
    "user": {
      "id": "c1f7a0b3-6c8a-4c8d-8a5e-123456789abc",
      "name": "Alice Smith",
      "email": "alice@example.com",
      "role": "OWNER",
      "status": "ACTIVE"
    },
    "expiresAt": "2026-10-24T02:00:00.000Z",
    "token": "a1b2c3d4..."
  }
  ```
- **Error Codes**:
  - `401 Unauthorized`: Generic `"Invalid email or password"` (prevents email enumeration).
  - `403 Forbidden`: Account is deactivated.
  - `429 Too Many Requests`: Exceeded 5 failed attempts within 15-minute window.
- **Audit Behavior**: Records `AUTH_LOGIN` on success; records `AUTH_LOGIN_FAILED` on failure with client IP and reason.

---

### 3. `POST /api/auth/logout`
Destroys server-side session in database and clears the session cookie.

- **Authentication**: Required
- **Audit Behavior**: Records `AUTH_LOGOUT`.

---

### 4. `GET /api/auth/me`
Retrieves currently authenticated user profile and validated role.

- **Authentication**: Required
- **Response (200 OK)**: `{ "user": { "id": "...", "name": "...", "email": "...", "role": "OWNER", "status": "ACTIVE" } }`

---

### 5. `GET /api/auth/demo-accounts`
Returns demonstration login presets if `DEMO_ACCOUNTS_ENABLED=true`.

---

## Document Endpoints

### 6. `GET /api/documents`
Lists documents authorized for the caller with server-side filtering and pagination.

- **Authentication**: Required
- **Required Role**: Any (`ADMIN`, `OWNER`, `VIEWER`)
- **Authorization Filtering (Server-Enforced)**:
  - `ADMIN`: Returns system-wide documents (metadata only).
  - `OWNER`: Returns owned documents + documents explicitly shared with caller.
  - `VIEWER`: Returns ONLY documents with active, unrevoked grants.
- **Query Parameters**:
  - `page`: Integer (default 1)
  - `limit`: Integer (default 10)
  - `search`: Filter title (server-side, never discloses unauthorized matches)
  - `category`: `FINANCIAL` | `LEGAL` | `HR` | `TECHNICAL` | `GENERAL`
  - `sortBy`: `createdAt` | `title` | `fileSize` | `category`
  - `sortOrder`: `asc` | `desc`
- **Response (200 OK)**:
  ```json
  {
    "documents": [
      {
        "id": "uuid",
        "title": "Q3 Financial Report",
        "category": "FINANCIAL",
        "originalFilename": "Q3-Report.pdf",
        "fileSize": 1048576,
        "mimeType": "application/pdf",
        "checksumSha256": "3a7b...",
        "owner": { "id": "...", "name": "Alice", "email": "alice@demo" },
        "effectivePermission": "OWNER",
        "activeSharesCount": 2,
        "createdAt": "2026-10-23T18:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
  }
  ```

---

### 7. `POST /api/documents`
Uploads a document to private storage with magic-byte validation and hash computation.

- **Authentication**: Required
- **Required Role**: `OWNER` or `ADMIN`
- **Content-Type**: `multipart/form-data`
  - `file`: Binary file (PDF, PNG, JPG, DOCX, XLSX, TXT, CSV, JSON <= 10MB)
  - `title`: String (1-150 chars)
  - `description`: String (optional)
  - `category`: `FINANCIAL` | `LEGAL` | `HR` | `TECHNICAL` | `GENERAL`
- **Response (201 Created)**: Returns created document metadata.
- **Error Codes**:
  - `400 Bad Request`: Disallowed extension, signature mismatch, executable detected, or 0-byte file.
  - `413 Payload Too Large`: Exceeds 10MB.
- **Audit Behavior**: Transactionally records `DOC_UPLOAD` event with checksum.

---

### 8. `GET /api/documents/:id`
Retrieves document metadata.

- **Authentication**: Required
- **Document Permission**: Owner, Active `READ` / `EDIT` grant, or `ADMIN`
- **Response (200 OK)**: Document metadata and caller's `effectivePermission`.
- **Error Codes**: `404 Not Found` (avoids disclosing whether inaccessible documents exist).
- **Audit Behavior**: Records `DOC_READ_METADATA`.

---

### 9. `PATCH /api/documents/:id`
Updates document metadata (title, description, category).

- **Authentication**: Required
- **Document Permission**: Document `OWNER` or active `EDIT` grant.
- **Error Codes**:
  - `403 Forbidden`: User has `READ`-only access.
  - `404 Not Found`: Inaccessible document.
- **Audit Behavior**: Records `DOC_UPDATE`.

---

### 10. `DELETE /api/documents/:id`
Deletes a document. Safely removes physical storage file while preserving audit trail.

- **Authentication**: Required
- **Document Permission**: Document `OWNER` exclusively.
- **Error Codes**: `403 Forbidden` if non-owner attempts deletion.
- **Audit Behavior**: Records `DOC_DELETE`.

---

### 11. `GET /api/documents/:id/download`
Dedicated authenticated file download endpoint.

- **Authentication**: Required
- **Document Permission**: Document `OWNER` or active `READ`/`EDIT` grant.
- **ADMIN Rule**: Administrators CANNOT download document contents without an explicit `DocumentPermission` grant.
- **Response Headers**:
  - `Content-Disposition: attachment; filename="sanitizedFilename"`
  - `Content-Type: <verifiedMimeType>`
  - `X-Content-Type-Options: nosniff`
  - `Cache-Control: no-store, no-cache, must-revalidate, private`
- **Error Codes**:
  - `403 Forbidden`: Administrator attempted download without explicit grant.
  - `404 Not Found`: Inaccessible or nonexistent document.
- **Audit Behavior**: Records `DOC_DOWNLOAD` before streaming file bytes.

---

## Permission Management Endpoints

### 12. `GET /api/documents/:id/permissions`
Lists all active and revoked grants for a document.

- **Authentication**: Required
- **Document Permission**: Document `OWNER` exclusively.
- **Response (200 OK)**: Array of permissions with user details and timestamps.

---

### 13. `POST /api/documents/:id/permissions`
Grants `READ` or `EDIT` permission to a registered user.

- **Authentication**: Required
- **Document Permission**: Document `OWNER` exclusively.
- **Request Body**:
  ```json
  {
    "userId": "b2f6c1e9-4a3d-4c8d-8a5e-123456789abc",
    "permissionLevel": "READ"
  }
  ```
- **Error Codes**:
  - `400 Bad Request`: Cannot grant access to self or inactive user.
  - `404 Not Found`: Target user does not exist.
- **Audit Behavior**: Records `PERM_GRANT`.

---

### 14. `PATCH /api/documents/:id/permissions/:userId`
Updates permission level (e.g. `READ` -> `EDIT`).

- **Authentication**: Required
- **Document Permission**: Document `OWNER` exclusively.
- **Audit Behavior**: Records `PERM_UPDATE`.

---

### 15. `DELETE /api/documents/:id/permissions/:userId`
Revokes access immediately by setting `revokedAt = NOW()`.

- **Authentication**: Required
- **Document Permission**: Document `OWNER` exclusively.
- **Semantics**: Immediate effect. Subsequent download or read requests are rejected on next database check.
- **Audit Behavior**: Records `PERM_REVOKE`.

---

## Administrative Endpoints

All administrative endpoints require `Role = ADMIN`.

### 16. `GET /api/admin/dashboard`
Returns system metrics: total users, active users, total documents, downloads, grants, revocations, denied attempts, and recent audit events.

---

### 17. `GET /api/admin/users`
Lists all registered users, roles, statuses, and document counts.

---

### 18. `PATCH /api/admin/users/:id/status`
Toggles user status (`ACTIVE` <-> `DEACTIVATED`).
- Deactivation immediately terminates all active sessions for the user.
- Disallows admin self-deactivation.
- Records `ADMIN_USER_STATUS_CHANGE`.

---

### 19. `GET /api/admin/audit`
Search and filter system audit trail with server-side pagination, date range, action type, and outcome filters.

---

### 20. `GET /api/admin/audit/verify`
Performs cryptographic SHA-256 hash chain verification across all historical audit records. Returns validity status, sequence number, and diagnostics if tampered.

---

### 21. `POST /api/admin/audit/checkpoint`
Generates a signed HMAC-SHA256 external checkpoint summary suitable for archiving to separate cold storage.
