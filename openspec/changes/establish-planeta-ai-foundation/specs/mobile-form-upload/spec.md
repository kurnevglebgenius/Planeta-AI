# Spec Delta

## Purpose

Defines a secure, app-free mobile capture flow that attaches immutable original order-form files to one authorized draft without exposing general business access.

## ADDED Requirements

### Requirement: Scoped upload-session issuance
An authorized user with edit access to a DRAFT order SHALL be able to create a QR upload session scoped to that order. The QR bearer secret SHALL be cryptographically random, stored only in hashed form server-side, expire within 15 minutes by default, and grant no access beyond the upload flow.

#### Scenario: Seller requests a QR code
- **WHEN** an authorized seller requests a mobile upload session for a permitted DRAFT order
- **THEN** the system returns a QR destination containing a new short-lived bearer secret bound to that order

#### Scenario: Session requested for a confirmed order
- **WHEN** a user requests a normal draft upload session for an order that is no longer DRAFT
- **THEN** the system rejects the request without creating a bearer secret

### Requirement: Single-use QR claim
The QR bearer secret SHALL be accepted for only one successful claim. Claiming SHALL produce an ephemeral upload capability bound to the same order and device flow so that upload retries do not require making the original bearer secret reusable.

#### Scenario: Valid token is claimed
- **WHEN** a mobile browser presents an unexpired, unclaimed token
- **THEN** the system atomically marks the token claimed and grants only the scoped, short-lived ability to upload and finalize files for that draft

#### Scenario: Token is replayed
- **WHEN** any browser presents a token that is expired, revoked, already claimed, or already consumed
- **THEN** the system denies the claim without revealing order or customer details

### Requirement: Constrained mobile upload
The mobile page SHALL work in a standard phone or tablet browser without an installed app. It SHALL accept only configured file types and sizes, rate-limit abuse, and prevent the upload capability from choosing an arbitrary storage path or order identifier.

#### Scenario: Seller uploads a supported photo
- **WHEN** the claimed mobile session uploads a supported image within the configured size limit
- **THEN** the file is placed only at the server-selected private object location for the bound order and can be finalized

#### Scenario: Unsupported or oversized payload
- **WHEN** the mobile session uploads a disallowed type, mismatched content, or oversized file
- **THEN** the system rejects finalization, records a security-relevant event, and does not associate the object with the order

### Requirement: Immutable original preservation
After successful finalization, the system SHALL persist file metadata and a checksum, associate immutable originals with the order revision, and prevent overwrite in place. A DRAFT technical rescan MAY discard prior unconfirmed bytes and derived AI results while retaining a minimal audit event; originals supporting CONFIRMED revisions remain immutable.

#### Scenario: Upload is finalized
- **WHEN** a scoped upload completes and passes server-side validation
- **THEN** the system creates one order-file record containing the private object reference, checksum, media metadata, uploader context, and timestamp, then marks the session consumed

#### Scenario: Existing original is replaced
- **WHEN** a user supplies a clearer image after an original has been finalized
- **THEN** the system stores it as another versioned order file and retains access to the previous original

### Requirement: Controlled original access
Original form files SHALL reside in private storage. Every workforce view or download SHALL require current authorization through an authenticated file gateway that re-checks active-profile state; bearer download URLs for sensitive originals SHALL NOT be issued. Permanent public URLs SHALL NOT be issued.

#### Scenario: Authorized production user opens a form
- **WHEN** a PRODUCTION user requests an original form for a confirmed production order
- **THEN** the system grants short-lived access to that specific file without exposing unrelated order data

#### Scenario: Unauthorized principal requests an original
- **WHEN** a disabled or otherwise unauthorized workforce principal requests an original
- **THEN** the file gateway denies access and requires a fresh current authorization check

### Requirement: Multi-file document-set sessions
One active session SHALL be permitted for a DRAFT or pending amendment and MAY upload multiple temporary files before explicit finalization. A new session SHALL revoke the prior active session. The bearer expires within 15 minutes before one claim; the scoped upload credential expires 15 minutes after claim and accesses only its document set.

#### Scenario: New QR replaces active QR
- **WHEN** an authorized user requests a new QR while one is active
- **THEN** the system revokes the prior session before issuing the new one
