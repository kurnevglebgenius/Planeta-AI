# Proposal

## Why

Planeta AI needs a secure, auditable foundation for moving paper curtain orders from two retail salons into one production workflow without allowing AI output to become authoritative data silently. Defining the domain, trust boundaries, and phased delivery now prevents the first order workflow from hard-coding assumptions that would later block CRM, inventory, finance, analytics, and owner-facing AI capabilities.

## What Changes

- Define a private, owner-administered workforce identity model with no public registration, role-based permissions, account disabling, and database-enforced row-level access.
- Define the order aggregate, stable `PS-YYYY-NNNN` identifiers, separate order items, reviewable draft data, explicit seller confirmation, and controlled state transitions.
- Define a secure short-lived, preferably single-use QR upload flow for mobile capture of original paper forms without installing an app.
- Define private, durable storage and controlled access for original order-form images and their metadata.
- Define an asynchronous, versioned AI extraction workflow in which generated values retain provenance and confidence, remain editable suggestions, and require human confirmation before becoming authoritative order data.
- Define the initial production queue and `NEW -> IN_PROGRESS -> DONE` workflow, including realtime updates for authorized users.
- Define append-only audit events for important business and account actions, including before/after field changes where appropriate.
- Bring minimal canonical customers, item-level commercial breakdown, immutable payment events, and controlled production acknowledgements into the MVP rather than deferring them to a future CRM/finance change.
- Establish the confirmed GrillMe security baseline: technically enforced OWNER MFA, immediate trusted-boundary access revocation, company-controlled private-by-default infrastructure, defense in depth, EU core-data storage, and a production security/recovery gate.
- Define clear responsibilities and high-level contracts between the Next.js client, FastAPI business API, and Supabase platform services.
- Define repository boundaries, database migration ownership, testing layers, environment separation, backup expectations, delivery phases, deferred scope, risks, and open decisions.

## Capabilities

### New Capabilities

- `workforce-access-control`: Owner-managed workforce accounts, authentication, role and salon scoping, disabling, least privilege, and RLS-backed authorization.
- `order-management`: Draft creation, human-readable identifiers, customers and line items, AI-assisted review, explicit confirmation, authoritative data rules, and order lifecycle transitions.
- `mobile-form-upload`: Secure QR upload sessions, browser-based mobile uploads, private original-form storage, token consumption, and upload abuse controls.
- `ai-form-extraction`: Asynchronous image analysis, versioned flexible extraction results, source provenance, review/correction, failure handling, and the prohibition on silent promotion to business data.
- `production-workflow`: Visibility of confirmed orders, the initial production state machine, authorized status changes, and realtime convergence.
- `audit-trail`: Tamper-resistant recording and owner retrieval of important business, financial, production, and account changes.
- `platform-operations`: Service trust boundaries, protected API behavior, environment isolation, migration controls, secret handling, observability, backup, and restore expectations.

### Modified Capabilities

None. The repository contains no existing OpenSpec capability specifications.

## Impact

- Establishes the contracts for a future monorepo containing a Next.js web application, a Python/FastAPI service, Supabase migrations and policies, shared generated API types, and architecture/operations documentation.
- Introduces planned dependencies on Supabase Auth, PostgreSQL, Storage, Realtime, and the OpenAI API, but this change installs or configures none of them.
- Establishes security-sensitive interfaces for workforce administration, customers, orders, payment events, upload sessions, extraction jobs, production acknowledgements, files, and audit queries.
- Defers application implementation, deployment setup, vendor provisioning, and final extraction schema design until this proposal is reviewed and explicitly approved.
