# Spec Delta

## Purpose

Defines durable attribution of important business and security changes so authorized reviewers can determine who or what changed which record and when.

## ADDED Requirements

### Requirement: Important actions are audited
The system SHALL create an audit event for order creation, confirmation, cancellation, amendment and important field changes; price and payment changes; production transitions; original-file association; upload-session security events; and workforce account, role, scope, or status changes.

#### Scenario: Price is amended
- **WHEN** an authorized user changes a confirmed price through the permitted amendment flow
- **THEN** the system records the actor, target, action, timestamp, reason, request correlation, and appropriate before-and-after values

#### Scenario: System creates an extraction attempt
- **WHEN** a background process creates or completes an extraction attempt
- **THEN** the system records a system-attributed event linked to the order, file, attempt, and correlation identifier

### Requirement: Atomic and append-only recording
An audit event required for a business mutation SHALL commit in the same database transaction as that mutation. Application roles SHALL NOT be able to update or delete existing audit events.

#### Scenario: Audit insert fails
- **WHEN** a required audit event cannot be persisted during a protected mutation
- **THEN** the business mutation is rolled back rather than becoming unaudited

#### Scenario: User attempts to edit history
- **WHEN** any normal application principal attempts to update or delete an audit event
- **THEN** the database denies the operation

### Requirement: Actor and source attribution
Audit events SHALL distinguish workforce actors, scoped upload sessions, background/system actors, and external-provider outcomes. Events SHALL include actor identity when available, action, entity type and identifier, occurred time, source, request correlation, and relevant organizational scope.

#### Scenario: Mobile token finalizes a file
- **WHEN** a claimed mobile upload session finalizes an original file
- **THEN** the event attributes the action to the scoped session and also links the workforce user who issued that session

### Requirement: Sensitive audit payloads
Audit payloads SHALL minimize personal data and SHALL NOT store passwords, authentication tokens, upload bearer secrets, API keys, full binary files, or other reusable credentials. Fields designated sensitive SHALL be redacted or represented by safe change metadata.

#### Scenario: Account credential action is audited
- **WHEN** an account reset or authentication administration event occurs
- **THEN** the audit record describes the action and affected account without recording credential material

### Requirement: Authorized audit retrieval
OWNER users SHALL be able to search and filter audit history by time, actor, action, entity, order, and salon. Other roles SHALL receive no unrestricted company-wide audit access, although they may see limited activity history explicitly exposed on records they can access.

#### Scenario: Owner investigates an order
- **WHEN** an OWNER requests audit history for an order identifier
- **THEN** the system returns the ordered relevant events and revision references subject to retention rules

#### Scenario: Seller requests global audit history
- **WHEN** a SELLER requests unrestricted audit history
- **THEN** the system denies the request

### Requirement: Expanded immutable business attribution
The audit trail SHALL attribute immutable payment events and OWNER corrections, customer/contact changes, document-set finalization, DRAFT technical-rescan discard metadata, QR revocation, amendments, cancellation/rework requests, revision acknowledgement, cancellation acknowledgement, account disable/restore, and security-relevant authorization events. Audit payloads SHALL remain privacy-minimized and SHALL not retain discarded original bytes, reusable credentials, or raw sensitive form content.

#### Scenario: Draft rescan replaces an unconfirmed document set
- **WHEN** an authorized user discards a DRAFT technical rescan before confirmation
- **THEN** the audit trail records actor, time, action, and safe metadata without retaining the discarded image or extraction payload
