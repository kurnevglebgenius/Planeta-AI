# Tasks

## 0. Phase 0 — Specification and Architecture

- [x] 0.1 Inspect the repository and OpenSpec configuration and verify the project is greenfield with the `spec-driven` schema active
- [x] 0.2 Define capabilities, system boundaries, domain model, security approach, delivery phases, risks, and deferrals and verify all OpenSpec artifacts pass strict validation

## 1. Phase 1 — Approval and Security Decisions

- [ ] 1.1 Record the approved GrillMe decisions in concise ADRs, including email/password identities, OWNER+SELLER role union, salon scope, company-controlled EU-oriented environment policy, MFA, and protected bootstrap inputs; verify no real identity is committed
- [ ] 1.2 Create a concise threat model for authentication, privileged keys, RLS bypass, mobile bearer tokens, file access, and administrator recovery and verify every high-risk threat has an owner and mitigation
- [ ] 1.3 Define development-only seed identities and prohibit shared/production credentials in seed files, then verify repository secret scanning reports no credential material

## 2. Phase 1 — Repository and Contract Foundation

- [ ] 2.1 Scaffold only the approved monorepo directories for `apps/web`, `services/api`, `packages/api-client`, `supabase`, `contracts`, and `docs`, then verify each workspace can be discovered without adding future-module code
- [ ] 2.2 Configure minimal pinned Next.js/TypeScript and FastAPI/Python toolchains with format, lint, type-check, and test commands and verify all empty-foundation checks pass from a clean install
- [ ] 2.3 Add validated server/client environment configuration and safe `.env.example` files and verify the web build cannot import server-only variables or secrets
- [ ] 2.4 Establish the `/v1` API envelope, correlation IDs, stable errors, health/readiness endpoints, and OpenAPI export and verify API contract tests cover representative 401, 403, 404, 409, 422, and 429 responses
- [ ] 2.5 Generate the TypeScript API client from FastAPI OpenAPI and add a drift check that verifies CI fails when the generated contract is stale
- [ ] 2.6 Add CI jobs for web, API, database migration, contract, and secret checks and verify a clean branch runs every required check without production credentials

## 3. Phase 1 — Identity, Roles, and RLS

- [ ] 3.1 Create Supabase SQL migrations for `profiles`, roles, salons, workshops, and assignment tables with immutable identity references and verify a clean database rebuild succeeds
- [ ] 3.2 Disable public sign-up in environment configuration and implement the sign-in/session shell without a registration route, then verify an anonymous visitor cannot initiate self-registration
- [ ] 3.3 Implement JWT verification with issuer, audience, expiry, JWKS rotation, active-profile checks, and OWNER MFA-assurance enforcement in FastAPI and hardened command boundaries; verify invalid, expired, disabled, insufficient-assurance OWNER, and valid principals in API/database tests
- [ ] 3.4 Add default-deny grants, reusable authorization helpers, and RLS policies for OWNER+SELLER, cross-salon SELLER fixtures, workshop-scoped PRODUCTION, disabled, and anonymous principals; verify the complete policy matrix, including no protected Realtime payload for disabled principals, in database tests
- [ ] 3.5 Implement the documented one-time initial OWNER bootstrap with no committed password so effective OWNER authority is granted only after MFA enrollment/verification; verify a fresh development environment can create exactly one attributed owner safely and cannot exercise OWNER commands before MFA
- [ ] 3.6 Implement OWNER-only user invitation/creation, role/location assignment, disable, deactivation, and re-enable commands with atomic audit events and one trusted backend/database active-OWNER continuity guard; verify non-owner and disabled-user attempts fail and that disable, deactivation, OWNER-role removal, and every supported membership mutation cannot remove the last active OWNER
- [ ] 3.7 Add owner workforce administration and role-aware navigation screens and verify browser tests show only permitted capabilities for each role
- [ ] 3.8 Run a Phase 1 security review covering service-role isolation, direct database access, immediate API/file/Realtime disable behavior, CORS/host rules, and secret exposure; verify all critical/high findings are resolved before Phase 2

## 4. Phase 2 — Draft Order Vertical Slice

- [ ] 4.1 Add migrations for order counters, minimal canonical customers and immutable snapshots, orders, restricted item-level commercial data/OTHER charges, immutable payment events, order items, idempotency records, and initial audit events and verify clean bootstrap plus constraints
- [ ] 4.2 Implement concurrency-safe `PS-YYYY-NNNN` allocation with non-reuse and verify parallel creation and year-boundary database tests
- [ ] 4.3 Implement scoped order create, list, detail, and draft-update APIs with optimistic concurrency and role-specific DTOs and verify salon separation and stale-version conflicts
- [ ] 4.3a Implement a dedicated privacy-safe exact-normalized-phone lookup that returns only minimal customer identity for explicit selection; verify SELLER cannot use partial/name/list lookup or retrieve cross-salon order history, finance, or other customer data
- [ ] 4.4 Implement the responsive seller draft editor with separate reorderable items, order/customer/financial sections, autosave conflict handling, and manual-entry operation and verify component and browser tests
- [ ] 4.5 Add audit coverage for order creation and important draft/financial changes with redacted payload rules and verify failed audit persistence rolls back protected mutations

## 5. Phase 2 — Private Originals and Mobile QR Upload

- [ ] 5.1 Add migrations and policies for `upload_sessions`, `order_files`, and private original/derived Storage namespaces and verify anonymous, cross-salon, overwrite, and direct-list attempts are denied
- [ ] 5.2 Implement 256-bit QR token generation, hashed persistence, expiry, revocation, atomic single claim, and derived claim credentials and verify replay, race, expiry, and constant-time validation tests
- [ ] 5.3 Implement upload-intent and finalization APIs with server-selected paths, size/type/content checks, checksum, idempotency, orphan handling, immutable metadata, and auditing and verify security integration tests
- [ ] 5.4 Build the minimal mobile upload page that consumes a URL-fragment token, clears it from history, avoids third-party scripts, captures/uploads supported files, and handles retry/expiry and verify on representative phone/tablet browsers
- [ ] 5.5 Add desktop QR creation/revoke/regenerate controls and authorized original-file access through the authenticated file gateway; verify disabled and unauthorized workforce file requests fail immediately
- [ ] 5.6 Run upload abuse tests for MIME spoofing, oversized content, arbitrary object keys, concurrent finalization, token leakage, and rate limiting and verify all critical paths fail closed

## 6. Phase 2 — AI Extraction and Human Review

- [ ] 6.1 Review representative anonymized real forms with business users, version the initial candidate envelope and required review fields, and verify the documented schema preserves multiple items, unknown fields, provenance, and uncertainty without claiming finality
- [ ] 6.2 Add migrations for leased extraction jobs, immutable extraction attempts, and field review decisions and verify job-claim concurrency, retry limits, and RLS policies
- [ ] 6.3 Implement the worker lease/retry/dead-letter loop and an OpenAI adapter behind a mockable interface and verify deterministic success, timeout, invalid-output, retry, and duplicate-job tests without live provider calls
- [ ] 6.4 Implement the configured server-side model request, structured-output validation, privacy-safe telemetry, and attempt metadata capture and verify the browser bundle/API responses contain no OpenAI credential
- [ ] 6.5 Implement extraction result/retry/review APIs that retain suggestions and reviewed values separately and verify AI failure never blocks manual draft completion
- [ ] 6.6 Build the seller review UI with original-image access, field provenance/uncertainty, separate item candidates, accept/edit/reject actions, and clear unreviewed warnings and verify browser tests cannot confirm silently from raw AI output
- [ ] 6.7 Run the versioned anonymized evaluation set, document coverage and dangerous-error results, and verify release thresholds are approved before enabling live extraction in production

## 7. Phase 2 — Confirmation, Revisions, and End-to-End Order Flow

- [ ] 7.1 Add immutable order revisions, production-job admission, and command-level audit database functions/constraints and verify a failed sub-step rolls back the entire confirmation transaction
- [ ] 7.2 Implement idempotent order confirmation with required-field validation, expected version, reviewer attribution, snapshot fingerprint, and exactly-one production admission and verify concurrent confirmation tests
- [ ] 7.2a Implement append-only PAYMENT, REFUND, and REVERSAL commands/APIs with role/state/salon authorization, immutable persistence, idempotency, audit events, and derived paid-total/balance/overpayment calculation; verify unauthorized or duplicate commands do not mutate history and no ledger or payment-correction workflow is introduced
- [ ] 7.3 Implement amendment, partial-item cancellation, cancellation, rework-request, and revision/cancellation acknowledgement commands with preserved revisions, reasons, production signaling, and permission checks; bind production acknowledgement to the exact current production-relevant revision and verify a superseding revision blocks DONE until re-acknowledged, while direct edits to confirmed orders are rejected
- [ ] 7.4 Add the final review/confirm UX with authoritative-versus-suggested distinctions and validation summaries and verify confirmation always requires a deliberate user action
- [ ] 7.5 Execute the Phase 2 end-to-end path from seller draft through QR upload, extraction/manual fallback, review, confirmation, immutable original retrieval, and audit inspection and verify the order enters production only after confirmation

## 8. Phase 3 — Production Workflow and Realtime

- [ ] 8.1 Create the restricted production projection and RLS/grants for confirmed assigned work, items, notes, and original forms and verify prices, payments, broad customer data, employees, and owner-only fields are absent
- [ ] 8.2 Implement production queue/detail APIs and versioned `NEW -> IN_PROGRESS -> DONE` transitions with immutable transition events and current-revision acknowledgement enforcement; verify invalid skips, stale updates, and DONE after superseded acknowledgement fail
- [ ] 8.3 Implement OWNER-only corrective transitions with mandatory reasons and verify PRODUCTION users cannot move backward or erase history
- [ ] 8.4 Build the responsive production queue/detail UI with original forms, separate items, deadlines, and allowed status controls and verify role-specific browser tests
- [ ] 8.5 Configure minimal RLS-filtered Realtime publication and client invalidation/refetch behavior and verify authorized clients converge while unauthorized subscriptions disclose nothing
- [ ] 8.6 Implement polling/manual-refresh fallback and verify order and production work continue correctly when Realtime is unavailable
- [ ] 8.7 Execute a multi-user end-to-end test across two salons, owner, seller, production, amendments, realtime updates, and corrective transitions and verify isolation, convergence, and complete audit attribution

## 9. MVP Operations, Audit, and Production Readiness

- [ ] 9.1 Implement OWNER audit search/filter APIs and UI with safe pagination/redaction and verify sellers and production cannot retrieve company-wide history
- [ ] 9.2 Add structured privacy-safe logs, metrics, correlation, job-age/error alerts, and security-event monitoring and verify representative failures are diagnosable without raw customer content or secrets
- [ ] 9.3 Document key rotation, user disable/recovery, break-glass owner access, incident response, upload cleanup, and deployment rollback and verify each runbook in a development exercise
- [ ] 9.4 Select and document production hosting, region, Supabase/backup tier, RPO/RTO, Storage recovery, and same-origin routing in reviewed ADRs and verify they satisfy the approved data-handling constraints
- [ ] 9.5 Rebuild a production-like environment from migrations, perform database and representative original-file restore drills, and verify checksums and order-to-file associations
- [ ] 9.6 Complete security/privacy review, dependency scan, RLS regression suite, load/concurrency smoke tests, and user acceptance testing and verify no unresolved critical/high issue remains
- [ ] 9.7 Provision isolated production resources, apply reviewed migrations, bootstrap the owner, and complete a reversible go-live checklist only after explicit production authorization; verify development credentials/data cannot access production

## 10. Phase 4 and Phase 5+ Boundaries

Phase 4 is not part of this implementation change. After the MVP is stable, create separate OpenSpec changes for canonical customer/CRM behavior, employee records beyond login profiles, owner dashboards, basic salon/order analytics, and Excel exports. Each must reuse the identity, location, order revision, audit, and API boundaries rather than expanding the MVP ad hoc.

Phase 5+ likewise requires separate OpenSpec changes for salaries/payroll, expenses and finance ledgers, warehouse/inventory, advanced analytics, and the owner AI assistant. Do not add schemas, dependencies, embeddings, vector databases, finance permissions, or speculative abstractions for those modules while applying this change.
