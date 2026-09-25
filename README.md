# Planeta AI

Planeta AI is a private internal system for moving paper curtain orders from retail salons into a controlled production workflow. It replaces an error-prone paper handoff with auditable drafts, reviewed order data, protected originals, and a production queue—without allowing AI extraction to become authoritative data on its own.

## Current status

**Phase 0 completed. Phase 1 production foundation in progress.**

The approved planning source of truth is the OpenSpec change [`establish-planeta-ai-foundation`](openspec/changes/establish-planeta-ai-foundation/):

- [Proposal](openspec/changes/establish-planeta-ai-foundation/proposal.md)
- [Design](openspec/changes/establish-planeta-ai-foundation/design.md)
- [Tasks](openspec/changes/establish-planeta-ai-foundation/tasks.md)
- [Capability specifications](openspec/changes/establish-planeta-ai-foundation/specs/)

This README is an orientation guide. Where it differs in detail from OpenSpec, OpenSpec wins.

## Roles

- **OWNER** — company-wide administration, authorized order and production oversight, and audit access. OWNER actions require technically enforced MFA.
- **SELLER** — works with orders in explicitly assigned salons: drafts, review, confirmation, and permitted commercial actions.
- **PRODUCTION** — sees only the assigned workshop's production projection and advances normal manufacturing status. Structured commercial data is excluded.

An OWNER may also hold SELLER rights. Other workforce profiles do not combine SELLER and PRODUCTION roles.

## Architecture and planned stack

Planeta AI is planned as a modular monolith:

- **Web:** Next.js, React, TypeScript
- **Business API and worker:** Python, FastAPI
- **Platform:** Supabase Auth, PostgreSQL with RLS, private Storage, and Realtime invalidation
- **AI:** server-side OpenAI extraction jobs that produce versioned suggestions for human review

PostgreSQL is the business source of truth; private Storage holds original files; FastAPI owns trusted commands and role-specific API projections. The browser never owns authoritative business transitions or privileged secrets.

## Planned repository structure

The repository now includes the initial production foundation layout:

```text
apps/web/            Next.js application
services/api/        FastAPI API and worker
packages/api-client/ Generated TypeScript API client
supabase/            SQL migrations, RLS/Storage policies, database tests
contracts/           OpenAPI snapshots and fixtures
docs/                Architecture, operations, and ADRs
openspec/            Approved specifications and change history
```

## Security principles

- Private, workforce-only access; no public registration or shared accounts.
- Defense in depth: FastAPI authorization plus PostgreSQL RLS and least-privilege grants.
- OWNER MFA, active-account checks, and trusted-boundary protection for the last active OWNER.
- Immediate denial of new protected API and sensitive-file access after account disable.
- Private originals, scoped QR upload capabilities, and authenticated file access.
- AI output is suggestion-only; an authorized human explicitly confirms business data.
- Immutable revisions, payment events, production transitions, and privacy-minimized audit events.
- PRODUCTION receives a restricted projection without structured prices, discounts, payments, balances, or broad customer history.

## Environments

Development and production will be isolated: separate Supabase projects, Storage buckets, Auth users, secrets, provider credentials/quotas, and application configuration. Production customer data must not enter development except through an explicitly approved anonymization process.

Secrets, credentials, production PII, and production configuration do not belong in the repository, browser bundle, public storage, or routine logs.

## Roadmap

- **Phase 0:** OpenSpec and architecture — completed.
- **Phase 1:** security decisions, repository foundation, identity, RBAC, and RLS.
- **Phase 2:** draft orders, private originals/QR upload, AI-assisted human review, confirmation, revisions, and payments.
- **Phase 3:** restricted production workflow and Realtime convergence.
- **Phase 4:** separate future changes for CRM/customer workflows, employee records, dashboards, analytics, and exports.
- **Phase 5+:** separate future changes for payroll, finance ledgers, inventory, advanced analytics, and owner AI.

## Development setup

The current Phase 1 work includes Supabase email/password and OWNER TOTP sign-in, a role-aware web shell, an OWNER Employees screen connected to FastAPI, and workforce/access migrations with RLS, audit events, and last-OWNER protection. Order, customer, payment, production, QR, and AI business features remain for later phases. The isolated [Phase 1 UI prototype](prototypes/phase-1-ui/) remains mock-only.

Requirements: Node.js 20.9+ and Python 3.12+. Run `npm ci`, then `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:db` from the repository root. The database test applies the migration to in-memory PostgreSQL; a clean Supabase development migration and role-matrix test are still required before deployment. See [API setup](services/api/README.md) for Python install, checks, and local health-server launch. Environment examples contain no credentials; the foundation runs without any Supabase project.
