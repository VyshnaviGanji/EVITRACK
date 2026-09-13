# Requirements Document

## Introduction

Evitrack is a blockchain-based forensic evidence management system designed for law enforcement agencies. The system enables police officers to upload digital evidence files, generate cryptographic hashes, and store those hashes immutably on the Ethereum blockchain. This creates a tamper-evident chain of custody that allows officers to verify whether evidence has been modified after collection. The system provides authentication, evidence management, verification capabilities, and comprehensive activity logging.

## Glossary

- **Officer**: A verified law enforcement officer registered in the system with a valid Police ID
- **Evidence**: A digital file uploaded to the system for forensic preservation
- **Evidence_Hash**: A SHA-256 cryptographic hash generated from an Evidence file
- **Blockchain**: The Ethereum blockchain network used for immutable hash storage
- **Transaction_ID**: A unique identifier returned by the Blockchain after storing an Evidence_Hash
- **Registry**: A database containing valid Police IDs for officer verification
- **Authentication_Token**: A JWT token issued to an Officer after successful login
- **Verification**: The process of comparing a current Evidence_Hash with the Blockchain-stored hash
- **Activity_Log**: A record of all system actions performed by Officers
- **Dashboard**: The main interface displaying system statistics and navigation
- **Tampering**: Any modification to Evidence detected through hash mismatch

## Requirements

### Requirement 1: Officer Registration

**User Story:** As a law enforcement officer, I want to register with my Police ID, so that I can access the evidence management system.

#### Acceptance Criteria

1. WHEN an Officer submits registration with a Police ID, THE System SHALL verify the Police ID against the Registry
2. IF the Police ID is not found in the Registry, THEN THE System SHALL reject the registration and return an error message
3. WHEN the Police ID is valid, THE System SHALL create an Officer account with the provided credentials
4. THE System SHALL require a unique username for each Officer account
5. THE System SHALL require a password meeting minimum security standards (at least 8 characters, containing uppercase, lowercase, and numbers)
6. IF an Officer attempts to register with an existing username, THEN THE System SHALL reject the registration and return an error message

### Requirement 2: Officer Authentication

**User Story:** As an Officer, I want to log in securely, so that I can access my evidence management functions.

#### Acceptance Criteria

1. WHEN an Officer submits valid credentials, THE System SHALL generate an Authentication_Token
2. THE Authentication_Token SHALL expire after 24 hours of issuance
3. IF an Officer submits invalid credentials, THEN THE System SHALL reject the login and return an error message
4. THE System SHALL require the Authentication_Token for all protected endpoints
5. IF an Authentication_Token is expired or invalid, THEN THE System SHALL reject the request and return an authentication error

### Requirement 3: Evidence Upload

**User Story:** As an Officer, I want to upload digital evidence files, so that I can preserve them with blockchain verification.

#### Acceptance Criteria

1. WHEN an Officer uploads an Evidence file, THE System SHALL store the file on the server filesystem
2. WHEN an Evidence file is stored, THE System SHALL generate an Evidence_Hash using SHA-256 algorithm
3. WHEN an Evidence_Hash is generated, THE System SHALL store the hash on the Blockchain
4. WHEN the Blockchain storage succeeds, THE System SHALL receive and store the Transaction_ID
5. THE System SHALL store Evidence metadata including filename, upload timestamp, Officer ID, file size, and Transaction_ID in the database
6. IF the Blockchain storage fails, THEN THE System SHALL delete the uploaded file and return an error message
7. THE System SHALL support common evidence file formats including images, videos, documents, and audio files
8. THE System SHALL limit individual Evidence file size to 500MB

### Requirement 4: Evidence Hash Generation

**User Story:** As a system administrator, I want evidence hashes to be cryptographically secure, so that tampering can be reliably detected.

#### Acceptance Criteria

1. THE System SHALL use the SHA-256 algorithm for all Evidence_Hash generation
2. WHEN generating an Evidence_Hash, THE System SHALL process the complete file contents
3. THE Evidence_Hash SHALL be a 64-character hexadecimal string
4. FOR ALL Evidence files, generating the hash twice from the same file SHALL produce identical Evidence_Hash values (idempotence property)

### Requirement 5: Blockchain Integration

**User Story:** As an Officer, I want evidence hashes stored on the blockchain, so that they cannot be tampered with or deleted.

#### Acceptance Criteria

1. WHEN an Evidence_Hash is ready for storage, THE System SHALL submit it to the Blockchain via smart contract
2. THE System SHALL wait for Blockchain transaction confirmation before completing the upload
3. WHEN the Blockchain transaction is confirmed, THE System SHALL receive a Transaction_ID
4. THE System SHALL store the Transaction_ID with the Evidence metadata
5. IF the Blockchain transaction fails after 3 retry attempts, THEN THE System SHALL return an error and rollback the Evidence upload
6. THE System SHALL connect to the Ethereum mainnet or configured test network

### Requirement 6: Evidence Listing

**User Story:** As an Officer, I want to view all evidence I have uploaded, so that I can manage and track my cases.

#### Acceptance Criteria

1. WHEN an Officer requests the evidence list, THE System SHALL return all Evidence records uploaded by that Officer
2. THE System SHALL display Evidence metadata including filename, upload date, file size, and Transaction_ID
3. THE System SHALL sort Evidence records by upload date in descending order (newest first)
4. THE System SHALL support pagination with 20 Evidence records per page
5. WHERE an Officer has administrative privileges, THE System SHALL display Evidence from all Officers

### Requirement 7: Evidence Verification

**User Story:** As an Officer, I want to verify evidence integrity, so that I can confirm whether files have been tampered with.

#### Acceptance Criteria

1. WHEN an Officer requests Verification for an Evidence file, THE System SHALL generate a new Evidence_Hash from the current file
2. WHEN the new Evidence_Hash is generated, THE System SHALL retrieve the original Evidence_Hash from the Blockchain using the Transaction_ID
3. THE System SHALL compare the new Evidence_Hash with the Blockchain-stored hash
4. IF the hashes match, THEN THE System SHALL return a verification success status indicating the Evidence is authentic
5. IF the hashes do not match, THEN THE System SHALL return a verification failure status indicating Tampering has occurred
6. THE System SHALL log all Verification attempts in the Activity_Log
7. IF the Blockchain retrieval fails, THEN THE System SHALL return an error message and not complete the Verification

### Requirement 8: Tampering Detection

**User Story:** As an Officer, I want to be alerted when evidence has been tampered with, so that I can take appropriate action.

#### Acceptance Criteria

1. WHEN Verification detects a hash mismatch, THE System SHALL flag the Evidence as tampered
2. THE System SHALL display a clear warning message indicating Tampering was detected
3. THE System SHALL record the Tampering detection event in the Activity_Log with timestamp and Officer ID
4. THE System SHALL display both the original Evidence_Hash and the current hash for comparison
5. THE System SHALL prevent deletion of Evidence flagged as tampered

### Requirement 9: Activity Logging

**User Story:** As a system administrator, I want all system actions logged, so that I can audit system usage and investigate issues.

#### Acceptance Criteria

1. WHEN an Officer logs in, THE System SHALL create an Activity_Log entry
2. WHEN an Officer uploads Evidence, THE System SHALL create an Activity_Log entry with Evidence ID and filename
3. WHEN an Officer performs Verification, THE System SHALL create an Activity_Log entry with Verification result
4. WHEN Tampering is detected, THE System SHALL create an Activity_Log entry with tampered Evidence ID
5. THE Activity_Log SHALL include timestamp, Officer ID, action type, and relevant details for each entry
6. THE System SHALL retain Activity_Log entries for a minimum of 7 years
7. WHERE an Officer has administrative privileges, THE System SHALL allow viewing Activity_Log entries from all Officers

### Requirement 10: Dashboard Statistics

**User Story:** As an Officer, I want to see system statistics on my dashboard, so that I can quickly understand my evidence management status.

#### Acceptance Criteria

1. WHEN an Officer accesses the Dashboard, THE System SHALL display the total count of Evidence uploaded by that Officer
2. THE Dashboard SHALL display the count of Evidence verified in the last 30 days
3. THE Dashboard SHALL display the count of Evidence flagged as tampered
4. THE Dashboard SHALL display the Officer's recent Activity_Log entries (last 10 actions)
5. WHERE an Officer has administrative privileges, THE Dashboard SHALL display system-wide statistics for all Officers

### Requirement 11: Evidence Retrieval

**User Story:** As an Officer, I want to download evidence files, so that I can use them for investigations and court proceedings.

#### Acceptance Criteria

1. WHEN an Officer requests to download Evidence, THE System SHALL verify the Officer has permission to access that Evidence
2. WHEN permission is verified, THE System SHALL serve the Evidence file for download
3. THE System SHALL log the download action in the Activity_Log
4. THE System SHALL preserve the original filename when serving the Evidence file
5. IF an Officer attempts to download Evidence uploaded by another Officer without administrative privileges, THEN THE System SHALL reject the request

### Requirement 12: Blockchain Transaction Tracking

**User Story:** As an Officer, I want to view blockchain transaction details, so that I can verify the immutability of evidence hashes.

#### Acceptance Criteria

1. WHEN an Officer views Evidence details, THE System SHALL display the Transaction_ID
2. THE System SHALL provide a link to view the transaction on a Blockchain explorer
3. WHEN an Officer clicks the explorer link, THE System SHALL open the Blockchain explorer showing the transaction details
4. THE System SHALL display the block number where the Evidence_Hash was stored
5. THE System SHALL display the timestamp when the Blockchain transaction was confirmed

### Requirement 13: Evidence Search

**User Story:** As an Officer, I want to search for evidence, so that I can quickly find specific files.

#### Acceptance Criteria

1. WHEN an Officer enters a search query, THE System SHALL search Evidence records by filename
2. THE System SHALL search Evidence records by case number if provided in metadata
3. THE System SHALL search Evidence records by upload date range
4. THE System SHALL return only Evidence records that the Officer has permission to view
5. THE System SHALL display search results in the same format as the Evidence listing

### Requirement 14: Session Management

**User Story:** As an Officer, I want my session to be secure, so that unauthorized users cannot access my account.

#### Acceptance Criteria

1. WHEN an Officer logs out, THE System SHALL invalidate the Authentication_Token
2. WHILE an Officer is inactive for 30 minutes, THE System SHALL automatically log out the Officer
3. THE System SHALL require re-authentication after automatic logout
4. THE System SHALL allow only one active session per Officer account
5. WHEN an Officer logs in from a new location, THE System SHALL invalidate any existing Authentication_Token for that Officer

### Requirement 15: Error Handling and Recovery

**User Story:** As an Officer, I want clear error messages when operations fail, so that I can understand what went wrong and how to proceed.

#### Acceptance Criteria

1. IF the Blockchain connection fails, THEN THE System SHALL return a descriptive error message and suggest retry
2. IF file upload fails due to size limits, THEN THE System SHALL return an error message indicating the maximum allowed size
3. IF database operations fail, THEN THE System SHALL return a generic error message and log detailed error information
4. IF Evidence_Hash generation fails, THEN THE System SHALL delete the uploaded file and return an error message
5. THE System SHALL log all errors with timestamp, error type, and stack trace for debugging
6. THE System SHALL return appropriate HTTP status codes for all error conditions (400 for client errors, 500 for server errors)
