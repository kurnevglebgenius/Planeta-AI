# Spec Delta

## Purpose

Defines the authoritative order aggregate from seller draft through confirmation, preserving separate items, stable identifiers, human review, revisions, and lifecycle integrity.

## ADDED Requirements

### Requirement: Draft order creation
An active OWNER or SELLER SHALL be able to create a draft order within an authorized salon. The system SHALL attribute the creator, salon, and creation time and SHALL make the draft available only to authorized users.

#### Scenario: Seller creates a draft
- **WHEN** an active SELLER creates an order for an allowed salon
- **THEN** the system creates a DRAFT order attributed to the seller and salon and records the creation in the audit trail

#### Scenario: Seller targets another salon
- **WHEN** a SELLER attempts to create a draft in an unauthorized salon
- **THEN** the system rejects the request without allocating an order

### Requirement: Stable human-readable identifier
Every created order SHALL receive one unique, immutable identifier in the form `PS-YYYY-NNNN`, where the year is the business year and the sequence is allocated safely under concurrent creation. An identifier SHALL NOT be reused after cancellation or archival.

#### Scenario: Concurrent draft creation
- **WHEN** two authorized users create drafts concurrently in the same business year
- **THEN** each order receives a different identifier matching `PS-YYYY-NNNN`

#### Scenario: Order is cancelled
- **WHEN** an order is cancelled or archived
- **THEN** its identifier remains permanently associated with that order and is not reassigned

### Requirement: Separate order items
An order SHALL contain one or more independently addressable order items before confirmation. Each item SHALL preserve its own description and available measurements, articles or SKUs, materials, quantities, notes, and other reviewed production attributes without flattening multiple curtains into one value.

#### Scenario: Form contains multiple curtains
- **WHEN** the seller reviews an order form containing multiple curtain or product entries
- **THEN** the seller can retain, edit, add, remove, and reorder those entries as separate order items before confirmation

### Requirement: Suggested and authoritative data are distinct
AI-extracted values SHALL be treated as suggestions with source provenance. They SHALL NOT replace authoritative order or customer values until an authorized user explicitly reviews and confirms the order.

#### Scenario: Extraction completes
- **WHEN** an extraction result is received for a draft
- **THEN** the system presents suggested values separately from authoritative confirmed data and does not place the order into production

#### Scenario: Seller corrects a suggestion
- **WHEN** a seller edits an extracted value during review
- **THEN** the corrected draft value is retained, the original suggestion remains traceable, and neither value is considered confirmed until explicit confirmation

### Requirement: Customer, commercial, and confirmation baseline
The MVP SHALL maintain company-wide customers with display name, one normalized primary phone, and optional Instagram; confirmed orders SHALL retain immutable snapshots. Exact-phone lookup SHALL expose only minimal customer data, never another salon's order history. Confirmation SHALL require customer display name, a phone, an active item, due date, valid commercial totals, and a current document set unless OWNER records a no-original exception.

#### Scenario: Seller finds a customer from another salon
- **WHEN** a SELLER searches an exact normalized phone
- **THEN** the system returns only the minimal identity required for explicit selection and discloses neither another salon's orders, history, finance, nor other customer records

#### Scenario: Seller attempts company-wide customer browsing
- **WHEN** a SELLER attempts a partial-phone, name, list, or other company-wide customer search
- **THEN** the system denies the request and does not disclose customer existence outside the seller's authorized salon records

### Requirement: Item pricing and immutable payment history
Each item SHALL retain fabric and sewing amounts and separate BYN discounts; orders MAY retain multiple labelled OTHER charges. Payment history SHALL be immutable PAYMENT, REFUND, and REVERSAL events with derived paid total and balance. SELLER MAY append PAYMENT only to non-cancelled, non-archived CONFIRMED orders in assigned salons; only OWNER may append REFUND or reasoned REVERSAL.

#### Scenario: Price reduction causes overpayment
- **WHEN** an amendment makes paid total exceed total price
- **THEN** the system exposes the overpayment and creates no automatic refund

#### Scenario: Unauthorized payment event is attempted
- **WHEN** a SELLER attempts REFUND or REVERSAL, or attempts PAYMENT on a cancelled, archived, or out-of-scope order
- **THEN** the system rejects the append without changing immutable payment history or derived totals

### Requirement: Explicit confirmation
Only an authorized OWNER or SELLER SHALL be able to confirm a DRAFT order. Confirmation SHALL validate required business and production fields, create an immutable numbered revision of the reviewed snapshot, record the confirming user and time, and make the order eligible for production atomically.

#### Scenario: Valid draft is confirmed
- **WHEN** an authorized user explicitly confirms a valid DRAFT order
- **THEN** the system stores the confirmed revision, changes the commercial lifecycle to CONFIRMED, creates exactly one production record in NEW state, and records an audit event in one transaction

#### Scenario: Incomplete draft is confirmed
- **WHEN** confirmation is attempted while required fields are missing or invalid
- **THEN** the system leaves the order in DRAFT and returns field-level validation errors

#### Scenario: Concurrent confirmation attempts
- **WHEN** two requests try to confirm the same draft revision
- **THEN** at most one confirmation succeeds and exactly one production record is created

### Requirement: Confirmed order amendments
Confirmed values SHALL NOT be editable through draft update operations. A permitted correction SHALL use an explicit amendment action that records a reason, creates a new order revision, preserves earlier revisions, and notifies production when production-relevant data changed.

#### Scenario: Direct edit of a confirmed order
- **WHEN** a client sends a normal draft update for a CONFIRMED order
- **THEN** the system rejects the update and instructs the client to use the controlled amendment flow

#### Scenario: Production-relevant amendment
- **WHEN** an authorized user confirms an amendment that changes measurements, item details, deadline, or production notes
- **THEN** the system creates a new revision, audits the before-and-after values and reason, and emits an authorized production update

### Requirement: Commercial lifecycle integrity
The initial commercial lifecycle SHALL distinguish DRAFT, CONFIRMED, CANCELLED, and ARCHIVED orders. Transitions SHALL be performed by explicit commands, authorized by role and scope, and protected by optimistic concurrency.

#### Scenario: Stale client submits a transition
- **WHEN** a client attempts a lifecycle change using an outdated order version
- **THEN** the system rejects the command as a conflict and returns the current version without overwriting newer work

#### Scenario: Order is cancelled
- **WHEN** an authorized user cancels an order with a reason
- **THEN** the system retains the order, files, revisions, and audit history while preventing further ordinary production progress

### Requirement: Amendment and cancellation controls
SELLER and OWNER SHALL amend confirmed orders while production is NEW; after IN_PROGRESS only OWNER may amend. Production-relevant amendments require PRODUCTION acknowledgement of the exact current order revision before DONE; a later production-relevant revision invalidates earlier acknowledgement for completion purposes. SELLER MAY cancel only through NEW; later cancellation is OWNER-only. CANCELLED orders SHALL not be reinstated and may be copied into a new linked DRAFT.

#### Scenario: Seller attempts late cancellation
- **WHEN** a SELLER cancels an IN_PROGRESS order
- **THEN** the system rejects the request
