# Spec Delta

## Purpose

Defines operational and service-boundary guarantees for secure APIs, isolated environments, controlled schema evolution, secrets, observability, backups, and recovery.

## ADDED Requirements

### Requirement: Trusted mutation boundary
Privileged business mutations, upload-session issuance and exchange, AI provider calls, authenticated sensitive-file access, workforce administration, and audit retrieval SHALL execute through trusted server-side boundaries. Client applications SHALL NOT possess service-role database credentials or provider secrets.

#### Scenario: Client creates a confirmed order
- **WHEN** a browser requests order confirmation
- **THEN** a protected server operation verifies the caller, validates the state transition, applies the mutation and required audit event transactionally, and returns an authorized response

### Requirement: Versioned and consistent API behavior
Business APIs SHALL be versioned, validate structured input and output, return stable machine-readable error codes, propagate correlation identifiers, and support idempotency keys for retry-sensitive commands.

#### Scenario: Retry-sensitive request is repeated
- **WHEN** a client repeats the same confirmation, upload finalization, or extraction retry command with the same idempotency key
- **THEN** the system returns the original outcome or an equivalent current result without duplicating the business action

#### Scenario: Validation fails
- **WHEN** a request contains invalid fields
- **THEN** the API returns a non-success response with a stable error code, field details where safe, and a correlation identifier

### Requirement: Environment isolation
Development and production SHALL use separate Supabase projects, storage buckets, secrets, provider credentials or quotas, and application configuration. Production customer data SHALL NOT be copied into development except through an explicitly approved anonymization process.

#### Scenario: Developer runs the local stack
- **WHEN** a developer starts or tests Planeta AI outside production
- **THEN** the application resolves only non-production services and credentials by default

### Requirement: Controlled migrations
Database schema, row-level policies, database functions, storage policies, and reference-data changes SHALL be represented as ordered, reviewable migrations. Production migrations SHALL be tested against a production-like schema and applied by a controlled deployment identity rather than interactively by browser users.

#### Scenario: New policy is deployed
- **WHEN** a release changes a table or RLS policy
- **THEN** the same reviewed migration is applied to development before production and its result is verified

### Requirement: Secrets and log hygiene
Server secrets SHALL be stored in environment-specific secret management and SHALL never be committed to the repository or returned to clients. Operational logs SHALL use structured metadata and SHALL exclude reusable secrets and unnecessary customer content.

#### Scenario: Repository is scanned
- **WHEN** committed source and configuration are inspected
- **THEN** production API keys, service-role credentials, bearer tokens, and private signing material are absent

### Requirement: Backup and restore readiness
Production data and private file metadata SHALL be covered by documented backup and retention controls appropriate to the selected Supabase plan, and original form objects SHALL have an explicit durability and recovery strategy. A restore procedure SHALL be rehearsed before the system is treated as the sole authoritative order record.

#### Scenario: Restore rehearsal occurs
- **WHEN** operators execute the documented recovery exercise in a non-production environment
- **THEN** database records, order-to-file associations, and a representative set of original objects can be restored and integrity-checked

### Requirement: Operational visibility
The trusted services SHALL emit privacy-safe structured logs, metrics, and correlated error events for authentication failures, API failures, upload sessions, extraction jobs, background processing, realtime delivery, and database operations.

#### Scenario: Extraction remains pending
- **WHEN** an extraction job exceeds its expected processing time
- **THEN** operators can identify the affected attempt and correlation identifier without inspecting raw customer content in routine logs

### Requirement: Availability does not bypass authorization
Failure, retry, cache, realtime, or recovery paths SHALL preserve the same authorization and privacy constraints as normal requests. A degraded dependency SHALL fail closed for protected access while allowing safe manual order entry where possible.

#### Scenario: Realtime is unavailable
- **WHEN** realtime delivery is interrupted
- **THEN** authorized clients can refresh through normal protected reads and no broader data access is granted as a fallback

### Requirement: Immediate active-principal revocation boundary
Trusted API and sensitive-file access SHALL check current active-profile state on every request; a previously issued workforce JWT alone SHALL never authorize access after disable. Sensitive originals SHALL be served through an authenticated, re-authorized file gateway rather than a bearer download URL whose validity cannot be revoked early. Realtime SHALL carry only generic invalidation signals without protected row, identity, or business data; protected content SHALL require a fresh authorized API read. Scoped mobile upload credentials remain separate short-lived document-set capabilities and SHALL not grant workforce data access.

#### Scenario: Disabled user reuses existing credentials
- **WHEN** a disabled workforce user reuses an existing API session, requests a sensitive original, or remains connected to Realtime
- **THEN** API and file access are denied immediately, and Realtime reveals no protected data while subsequent authorized reads fail

### Requirement: Confidential company-data security baseline
Production infrastructure SHALL be company-controlled. Database and Storage SHALL be private by default. The system SHALL use least privilege, defense in depth, individual accounts, RLS, backend authorization, server-side secrets, short-lived authorized file access, session revocation, audit, protected transmission/storage, and privacy-safe logging. Production PII and secrets SHALL not appear in repositories, development seeds, client bundles, public buckets, or routine logs. Development and production SHALL remain isolated.

#### Scenario: Production readiness review
- **WHEN** production authorization is considered
- **THEN** a security review and applicable personal-data protection review must be approved
