# Spec Delta

## Purpose

Defines private workforce identity, owner-controlled account administration, role and salon scoping, and defense-in-depth authorization for all company data.

## ADDED Requirements

### Requirement: Workforce-only account enrollment
The system SHALL have no public self-registration path. Only an active OWNER SHALL be able to create or invite a workforce account and assign its initial access scope.

#### Scenario: Anonymous visitor looks for registration
- **WHEN** an unauthenticated visitor accesses the application
- **THEN** the system offers sign-in and upload-session entry points only and exposes no public account-registration action

#### Scenario: Owner provisions a user
- **WHEN** an active OWNER creates or invites a workforce user with an allowed role and salon assignment
- **THEN** the system creates the pending or active workforce profile and records an audit event

#### Scenario: Non-owner attempts provisioning
- **WHEN** a SELLER or PRODUCTION user attempts to create, invite, or change another workforce account
- **THEN** the system denies the operation without changing account data

### Requirement: Role and organizational scope
The system SHALL authorize workforce users by explicit role assignments and, where applicable, salon assignments. The initial roles SHALL be OWNER, SELLER, and PRODUCTION; OWNER SHALL have company-wide access, SELLER SHALL access all orders in explicitly assigned salons, and PRODUCTION SHALL be restricted to confirmed production data in assigned workshops.

#### Scenario: Seller accesses a permitted order
- **WHEN** an active SELLER requests an order assigned to that seller or to a salon in the seller's permitted scope
- **THEN** the system returns only the order data allowed to the SELLER role

#### Scenario: Seller accesses an out-of-scope order
- **WHEN** an active SELLER requests an order outside the seller's permitted scope
- **THEN** the system behaves as though the record is unavailable and does not disclose its contents

#### Scenario: Production accesses commercial data
- **WHEN** a PRODUCTION user requests sensitive price, payment, finance, employee, or owner-only fields
- **THEN** the system denies or omits those fields even when the user can access the related production order

### Requirement: Defense-in-depth authorization
Every protected business operation SHALL require a valid authenticated principal and SHALL be checked both at the application boundary and by database row-level policies. Possession of a client-side route or identifier SHALL NOT grant access.

#### Scenario: API request with a valid token but insufficient role
- **WHEN** a signed-in user calls a protected endpoint for which the user's role or scope is insufficient
- **THEN** the API rejects the operation and the database policy prevents direct access to the protected rows

#### Scenario: Browser attempts direct database access
- **WHEN** a browser client queries a Supabase-exposed table directly
- **THEN** row-level security returns only rows and columns made available by an explicit policy for that principal

### Requirement: Account disabling and session enforcement
An OWNER SHALL be able to disable a workforce user. A disabled user SHALL be prevented from starting new sessions and SHALL immediately fail every new protected API and sensitive-file authorization check even if a previously issued session token has not yet expired. Protected Realtime reads SHALL not disclose row, identity, or business payload after disable; existing subscriptions may receive only non-sensitive generic invalidation signals until they terminate or reauthenticate.

#### Scenario: Owner disables an active user
- **WHEN** an OWNER disables a workforce account
- **THEN** subsequent protected API and sensitive-file requests from that account are denied, protected Realtime data is not disclosed, and the disable action is audited

### Requirement: Authentication evolution and verified OWNER MFA
The identity design SHALL preserve workforce identifiers and business ownership records when stronger sign-in controls evolve. MFA SHALL be technically enforced for every OWNER-authorized operation: a password-only or otherwise insufficient-assurance session SHALL NOT receive OWNER authority at the API, trusted database-command, or file-access boundary.

#### Scenario: OWNER session lacks MFA assurance
- **WHEN** a profile assigned OWNER presents a session without the required MFA assurance
- **THEN** the system denies OWNER-authorized operations without relying on hidden UI controls

### Requirement: Role composition, MFA, and owner continuity
An active profile MAY hold OWNER and SELLER concurrently with unioned permissions; OWNER authority SHALL remain effective in the single interface. Other profiles SHALL hold exactly one of SELLER or PRODUCTION. MFA SHALL be required for OWNER. The trusted backend/database authorization boundary SHALL reject disable, deactivation, OWNER-role removal, or any other supported role/membership mutation that would leave zero active OWNER profiles.

#### Scenario: Director creates a sale
- **WHEN** a profile with OWNER and SELLER creates an order
- **THEN** the order attributes that personal profile as seller without reducing OWNER authority

#### Scenario: Last owner is disabled
- **WHEN** an operation would disable the last active OWNER
- **THEN** the system rejects it

#### Scenario: Last owner role is removed or deactivated
- **WHEN** an operation would remove OWNER authority from, or deactivate, the last active OWNER
- **THEN** the trusted backend/database boundary rejects the operation without changing membership or account state
