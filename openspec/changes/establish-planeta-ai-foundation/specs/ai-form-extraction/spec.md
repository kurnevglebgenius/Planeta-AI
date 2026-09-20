# Spec Delta

## Purpose

Defines traceable, failure-tolerant AI extraction of order-form images into versioned suggestions that remain subordinate to explicit human review and confirmation.

## ADDED Requirements

### Requirement: Server-side asynchronous extraction
The system SHALL initiate AI extraction from a finalized order-form file through a server-controlled asynchronous job. Browser clients SHALL NOT receive provider credentials or call the model provider as the trusted extraction path.

#### Scenario: Original form is finalized
- **WHEN** an eligible original form is finalized for a DRAFT order
- **THEN** the system creates or reuses an idempotent extraction job and allows the seller to continue without waiting for model completion

#### Scenario: Browser inspects the upload page
- **WHEN** a user loads the web or mobile client
- **THEN** no OpenAI API key or equivalent server secret is delivered to the browser

### Requirement: Versioned extraction envelope
Each extraction attempt SHALL retain the source file, provider/model identifier, prompt version, extraction-schema version, status, timestamps, and structured result or sanitized failure metadata. The result SHALL support an array of separate item candidates and an extension area for unrecognized fields so the exact business schema can be refined after real forms are reviewed.

#### Scenario: Form has two item sections
- **WHEN** the model detects two distinct curtains or products on one form
- **THEN** the structured result contains two separately reviewable item candidates linked to the same source file

#### Scenario: Form contains an unknown handwritten field
- **WHEN** the extractor cannot map a visible field into the current candidate schema
- **THEN** it preserves the raw label/value or uncertainty in a reviewable unmapped-field collection instead of discarding it silently

### Requirement: Provenance and uncertainty
For each extracted candidate value where the model can provide it, the system SHALL retain source evidence such as page, region or text reference and an uncertainty indicator. Missing or uncertain values SHALL be shown as requiring review and SHALL NOT be fabricated as authoritative facts.

#### Scenario: Handwriting is ambiguous
- **WHEN** a handwritten dimension cannot be read confidently
- **THEN** the result flags that field for review, preserves available source evidence, and does not substitute an unmarked guess into confirmed data

### Requirement: Human review and correction
Authorized sellers and owners SHALL be able to accept, edit, reject, or manually replace extraction suggestions in the draft review experience. The system SHALL preserve both the original suggestion and the reviewed value for traceability.

#### Scenario: Seller accepts selected suggestions
- **WHEN** a seller accepts some candidates and corrects others
- **THEN** the draft reflects the reviewed values while the extraction attempt and per-field review decisions remain attributable

### Requirement: Failure-tolerant manual path
AI extraction failure SHALL NOT block manual order completion. Retrying SHALL be explicit, idempotent per attempt request, and bounded to avoid duplicate charges or uncontrolled provider calls.

#### Scenario: Provider call fails
- **WHEN** an extraction attempt times out or returns an invalid result
- **THEN** the system marks that attempt failed with safe diagnostic information, offers an authorized retry, and keeps the draft manually editable

#### Scenario: Duplicate retry request arrives
- **WHEN** the same retry command is received more than once
- **THEN** the system creates at most one additional extraction attempt for that idempotency key

### Requirement: Review safety and attempt budget
Batch acceptance SHALL be available only on a review screen that shows originals and warnings; warned candidates require individual accept, edit, or reject decisions. A document set SHALL allow one initial attempt, one transient automatic retry, and one explicit authorized retry.

#### Scenario: Warning is present
- **WHEN** a candidate has uncertainty or warning metadata
- **THEN** batch acceptance excludes it and requires an individual review decision

### Requirement: Sensitive-data handling
The extraction path SHALL send only required order-form content and necessary instructions to the configured provider, SHALL keep credentials server-side, and SHALL exclude raw customer content and provider secrets from routine application logs.

#### Scenario: Extraction request is logged
- **WHEN** the platform records operational telemetry for a model call
- **THEN** the log contains correlation, timing, model, token-usage, and outcome metadata without full form images, bearer tokens, API keys, or unredacted customer fields
