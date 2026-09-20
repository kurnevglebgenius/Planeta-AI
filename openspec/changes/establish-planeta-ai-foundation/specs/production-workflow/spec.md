# Spec Delta

## Purpose

Defines the authorized production queue, initial manufacturing state machine, source-document visibility, and realtime status convergence for confirmed orders.

## ADDED Requirements

### Requirement: Confirmed-order admission
Only a successfully confirmed order SHALL enter the production queue. Production admission SHALL be idempotent and SHALL expose the latest confirmed production revision without exposing restricted commercial fields.

#### Scenario: Draft receives an upload
- **WHEN** a form is uploaded or extracted for a DRAFT order
- **THEN** no production queue record is created

#### Scenario: Order is confirmed
- **WHEN** order confirmation commits successfully
- **THEN** exactly one NEW production record linked to the confirmed order and revision becomes visible to authorized production users

### Requirement: Production data projection
PRODUCTION users SHALL be able to view the order identifier, deadline, original forms, production notes, separate order items, and required structured manufacturing data for confirmed orders. The production projection SHALL omit price, payment, broad customer, employee, finance, and owner-only information unless a field is explicitly classified as operationally required.

#### Scenario: Production opens a queue item
- **WHEN** an active PRODUCTION user opens an authorized confirmed order
- **THEN** the system returns its manufacturing projection and original-form access controls without returning restricted commercial data

### Requirement: Initial production state machine
The normal production sequence SHALL be `NEW -> IN_PROGRESS -> DONE`. Only PRODUCTION users assigned to the workshop SHALL execute normal forward transitions; OWNER may execute corrective transitions with a reason; invalid or stale transitions SHALL be rejected.

#### Scenario: Work starts
- **WHEN** an authorized production user changes a current NEW record to IN_PROGRESS
- **THEN** the system records the new state, actor, timestamp, and audit event atomically

#### Scenario: Invalid state skip
- **WHEN** a client attempts to change a NEW record directly to DONE
- **THEN** the system rejects the transition without changing production state

#### Scenario: Stale transition
- **WHEN** two users attempt transitions using the same previous version
- **THEN** only the first valid transition succeeds and the other receives a conflict with the current state

### Requirement: Controlled correction
A backward or exceptional production transition SHALL require OWNER authority and a non-empty reason. The system SHALL preserve transition history rather than overwriting it.

#### Scenario: Completed item must be reopened
- **WHEN** an OWNER moves a DONE record back to IN_PROGRESS with a reason
- **THEN** the system performs the corrective transition, retains both transition events, and audits the reason

### Requirement: Realtime convergence
Authorized seller, production, and owner clients SHALL receive timely change notifications for production state and production-relevant order revisions. Realtime events SHALL be treated as invalidation signals, and clients SHALL re-fetch through authorized reads rather than trusting event payloads as the source of truth.

#### Scenario: Production changes status
- **WHEN** a production state transition commits
- **THEN** subscribed authorized clients are notified and can retrieve the current authorized representation without a manual page refresh

#### Scenario: Unauthorized client subscribes
- **WHEN** a principal without access attempts to subscribe to an order or production record
- **THEN** no protected row data or useful change payload is disclosed

### Requirement: Acknowledgement and confidential projection
Production-relevant amendments during IN_PROGRESS SHALL require PRODUCTION acknowledgement bound to the exact current order revision before DONE. A subsequent production-relevant revision SHALL invalidate any prior acknowledgement for completion purposes. Cancellation during IN_PROGRESS SHALL require acknowledgement that work stopped; PRODUCTION may request rework but only OWNER may reopen DONE work. Production API, RLS, and Realtime SHALL never expose structured prices, discounts, payments, balances, salaries, KPI, or broad customer history.

#### Scenario: Production reads an order
- **WHEN** PRODUCTION opens an authorized queue item
- **THEN** it receives manufacturing data and permitted originals without structured commercial data

#### Scenario: Acknowledged revision is superseded
- **WHEN** PRODUCTION acknowledges revision 2 and an authorized production-relevant amendment creates revision 3
- **THEN** the system rejects transition to DONE until PRODUCTION acknowledges revision 3
