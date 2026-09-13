# Design Document: Evitrack Evidence Management System

## Overview

Evitrack is a blockchain-based forensic evidence management system that provides tamper-evident chain of custody for digital evidence. The system combines traditional web application architecture with Ethereum blockchain integration to create an immutable audit trail for evidence integrity verification.

### System Goals

- Provide secure authentication and authorization for law enforcement officers
- Enable upload and storage of digital evidence files up to 500MB
- Generate cryptographic hashes (SHA-256) for all evidence files
- Store evidence hashes immutably on the Ethereum blockchain
- Enable verification of evidence integrity through hash comparison
- Detect and flag tampered evidence
- Maintain comprehensive activity logs for audit purposes
- Provide dashboard statistics and search capabilities

### Technology Stack

- **Backend**: Node.js with Express.js framework
- **Database**: MongoDB with Mongoose ODM
- **Blockchain**: Ethereum (mainnet or testnet) via Web3.js
- **Authentication**: JWT (JSON Web Tokens) with bcryptjs for password hashing
- **File Upload**: Multer middleware for multipart/form-data handling
- **Cryptography**: Node.js crypto module for SHA-256 hash generation
- **Smart Contract**: Solidity 0.8.0+ for immutable hash storage

## Architecture

### High-Level Architecture

The system follows a three-tier architecture with blockchain integration:

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│                    (Web Browser / API Client)                │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS/REST API
┌────────────────────────────▼────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Service │  │Evidence Mgmt │  │ Verification │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Activity Log  │  │  Dashboard   │  │    Search    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────┬───────────────────────────────┬────────────────┘
             │                               │
    ┌────────▼────────┐            ┌────────▼────────────┐
    │   MongoDB       │            │  Ethereum Network   │
    │   Database      │            │  (Smart Contract)   │
    │                 │            │                     │
    │ - Officers      │            │ - Evidence Hashes   │
    │ - Evidence      │            │ - Transaction IDs   │
    │ - Registry      │            │ - Block Numbers     │
    │ - Activity Logs │            │                     │
    └─────────────────┘            └─────────────────────┘
             │
    ┌────────▼────────┐
    │  File System    │
    │  (uploads/)     │
    │                 │
    │ - Evidence Files│
    └─────────────────┘
```

### Component Architecture

#### 1. API Layer (Express.js)
- **Authentication Routes** (`/api/auth`): Registration, login, logout
- **Evidence Routes** (`/api/evidence`): Upload, list, retrieve, verify, search
- **Registry Routes** (`/api/registry`): Police ID validation
- **Middleware**: JWT authentication, file upload handling, error handling

#### 2. Service Layer
- **Authentication Service**: Officer registration, login, token management
- **Evidence Service**: File processing, hash generation, blockchain storage
- **Verification Service**: Hash recalculation, blockchain retrieval, comparison
- **Activity Log Service**: Event recording and retrieval
- **Dashboard Service**: Statistics aggregation

#### 3. Data Layer
- **MongoDB Collections**: Officers, Evidence, Registry, ActivityLogs
- **File Storage**: Local filesystem (uploads directory)
- **Blockchain Storage**: Ethereum smart contract

#### 4. Blockchain Integration Layer
- **Web3.js Client**: Connection to Ethereum network
- **Smart Contract Interface**: Evidence hash storage and retrieval
- **Transaction Management**: Gas estimation, retry logic, confirmation waiting

## Components and Interfaces

### 1. Authentication Component

#### Officer Registration Flow
```
Client → POST /api/auth/register
  ↓
Validate Police ID against Registry
  ↓
Check username uniqueness
  ↓
Validate password requirements
  ↓
Hash password with bcryptjs (10 rounds)
  ↓
Create Officer document in MongoDB
  ↓
Return success response
```

#### Officer Login Flow
```
Client → POST /api/auth/login
  ↓
Find Officer by username/email
  ↓
Compare password with bcryptjs
  ↓
Generate JWT token (24-hour expiration)
  ↓
Log login activity
  ↓
Return token and officer data
```

#### Session Management
- JWT tokens expire after 24 hours
- Tokens include officer ID and issuance timestamp
- Middleware validates token on protected routes
- Automatic logout after 30 minutes of inactivity (client-side)
- Single active session per officer (invalidate previous tokens on new login)

### 2. Evidence Upload Component

#### Upload Pipeline
```
Client → POST /api/evidence/upload (multipart/form-data)
  ↓
Multer middleware processes file
  ↓
Validate file size (≤ 500MB)
  ↓
Validate file type (image/video/document/audio)
  ↓
Save file to uploads/ directory
  ↓
Generate SHA-256 hash from file contents
  ↓
Store hash on blockchain (with retry logic)
  ↓
Receive transaction ID and block number
  ↓
Save evidence metadata to MongoDB
  ↓
Log upload activity
  ↓
Return evidence record with transaction details
```

#### File Storage Structure
```
uploads/
  ├── {officerId}/
  │   ├── {caseId}/
  │   │   ├── {timestamp}_{originalFilename}
```

### 3. Hash Generation Component

#### SHA-256 Hash Generation
```javascript
const crypto = require('crypto');

function generateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}
```

Properties:
- Deterministic: Same file always produces same hash
- 64-character hexadecimal string output
- Processes entire file contents
- Stream-based for memory efficiency with large files

### 4. Blockchain Integration Component

#### Smart Contract Interface

**Contract Methods:**
- `storeEvidence(string hash, string caseId)`: Store evidence hash
- `getEvidence(string hash)`: Retrieve evidence metadata
- `verifyEvidence(string hash)`: Check if hash exists

**Transaction Flow:**
```
Generate hash → Create transaction → Sign with private key
  ↓
Submit to Ethereum network
  ↓
Wait for confirmation (3 blocks recommended)
  ↓
Retrieve transaction ID and block number
  ↓
Store in MongoDB for reference
```

**Retry Logic:**
- Maximum 3 retry attempts for failed transactions
- Exponential backoff: 2s, 4s, 8s
- Rollback file upload if all retries fail
- Log all blockchain errors for debugging

**Network Configuration:**
- Mainnet: Production evidence storage
- Testnet (Sepolia/Goerli): Development and testing
- Local (Ganache): Development environment
- Configurable via environment variables

### 5. Verification Component

#### Verification Flow
```
Client → POST /api/evidence/verify/:id
  ↓
Retrieve evidence record from MongoDB
  ↓
Read file from filesystem
  ↓
Generate current SHA-256 hash
  ↓
Retrieve original hash from blockchain using transaction ID
  ↓
Compare current hash with blockchain hash
  ↓
Update verification status (verified/tampered)
  ↓
Log verification activity
  ↓
Return verification result with both hashes
```

#### Verification States
- **Verified**: Current hash matches blockchain hash
- **Tampered**: Current hash differs from blockchain hash
- **Pending**: Not yet verified
- **Error**: Blockchain retrieval failed

### 6. Activity Logging Component

#### Log Entry Structure
```javascript
{
  officerId: ObjectId,
  officerName: String,
  action: String, // 'login', 'upload', 'verify', 'download', 'search'
  targetId: ObjectId, // Evidence ID if applicable
  targetName: String, // Evidence filename if applicable
  result: String, // 'success', 'failure', 'tampered'
  details: Object, // Additional context
  ipAddress: String,
  timestamp: Date
}
```

#### Logged Actions
- Officer login/logout
- Evidence upload (with filename and case ID)
- Evidence verification (with result)
- Evidence download
- Tampering detection
- Search queries
- Failed authentication attempts
- Blockchain transaction failures

#### Retention Policy
- Minimum 7-year retention for all logs
- Indexed by officer ID and timestamp
- Indexed by action type for filtering
- Immutable once created (no updates or deletes)

### 7. Dashboard Component

#### Statistics Aggregation

**Per-Officer Statistics:**
- Total evidence count uploaded by officer
- Evidence verified in last 30 days
- Evidence flagged as tampered
- Recent activity log entries (last 10)

**Admin Statistics (if applicable):**
- System-wide evidence count
- Total officers registered
- Total verifications performed
- System-wide tampering incidents

#### API Endpoints
- `GET /api/dashboard/stats`: Retrieve dashboard statistics
- `GET /api/dashboard/recent-activity`: Recent activity logs
- `GET /api/dashboard/tampered-evidence`: List of tampered evidence

### 8. Search Component

#### Search Capabilities
- **Filename search**: Partial match, case-insensitive
- **Case ID search**: Exact match
- **Date range search**: Upload date between start and end dates
- **Evidence type filter**: image, video, document, audio
- **Verification status filter**: pending, verified, tampered

#### Search Query Structure
```javascript
{
  filename: String, // Optional
  caseId: String, // Optional
  startDate: Date, // Optional
  endDate: Date, // Optional
  evidenceType: String, // Optional
  verificationStatus: String, // Optional
  page: Number, // Pagination
  limit: Number // Results per page (default 20)
}
```

#### Permission Enforcement
- Officers see only their own evidence
- Admin users see all evidence
- Search results respect permission boundaries

## Data Models

### Officer Collection

```javascript
{
  _id: ObjectId,
  name: String, // Required
  email: String, // Required, unique, indexed
  password: String, // Required, bcrypt hashed
  policeId: String, // Required, unique, indexed
  department: String, // Required
  station: String, // Optional
  phoneNumber: String, // Optional
  isAdmin: Boolean, // Default false
  createdAt: Date, // Auto-generated
  lastLogin: Date, // Updated on login
  sessionToken: String // Current active token (for single session)
}
```

**Indexes:**
- `email`: Unique index for login
- `policeId`: Unique index for registration validation
- `createdAt`: For sorting and analytics

**Validation:**
- Email: Valid email format
- Password: Minimum 8 characters, uppercase, lowercase, numbers
- Police ID: Must exist in Registry collection

### Evidence Collection

```javascript
{
  _id: ObjectId,
  caseId: String, // Required, indexed
  evidenceName: String, // Required, descriptive name
  evidenceType: String, // Required, enum: ['image', 'video', 'document', 'audio']
  description: String, // Optional, case context
  fileName: String, // Original filename
  filePath: String, // Required, server filesystem path
  fileSize: Number, // Bytes
  fileHash: String, // Required, SHA-256 hash (64 chars)
  transactionId: String, // Blockchain transaction hash
  blockNumber: Number, // Blockchain block number
  uploadedBy: ObjectId, // Required, ref: Officer
  uploadedByName: String, // Denormalized for performance
  verificationStatus: String, // enum: ['pending', 'verified', 'tampered']
  lastVerified: Date, // Last verification timestamp
  verificationCount: Number, // Total verifications performed
  isTampered: Boolean, // Flag for quick filtering
  createdAt: Date, // Auto-generated
  updatedAt: Date // Auto-updated
}
```

**Indexes:**
- `caseId`: For case-based queries
- `uploadedBy`: For officer-specific queries
- `verificationStatus`: For filtering
- `createdAt`: For sorting and date range queries
- `fileHash`: For hash-based lookups
- Compound index: `(uploadedBy, createdAt)` for officer timeline

**Validation:**
- File size: Maximum 500MB (524,288,000 bytes)
- Evidence type: Must be one of allowed types
- File hash: Must be 64-character hexadecimal string

### Registry Collection

```javascript
{
  _id: ObjectId,
  policeId: String, // Required, unique, indexed
  name: String, // Required, officer name
  station: String, // Required, police station
  department: String, // Optional
  rank: String, // Optional
  status: String, // enum: ['approved', 'pending', 'rejected'], default: 'approved'
  createdAt: Date, // Auto-generated
  updatedAt: Date // Auto-updated
}
```

**Indexes:**
- `policeId`: Unique index for validation
- `status`: For filtering approved officers

**Purpose:**
- Pre-approved list of valid police IDs
- Prevents unauthorized registrations
- Managed by system administrators

### ActivityLog Collection

```javascript
{
  _id: ObjectId,
  officerId: ObjectId, // Required, ref: Officer, indexed
  officerName: String, // Denormalized
  action: String, // Required, enum: ['login', 'logout', 'upload', 'verify', 'download', 'search', 'tamper_detected']
  targetId: ObjectId, // Optional, evidence ID if applicable
  targetName: String, // Optional, evidence filename
  result: String, // enum: ['success', 'failure', 'tampered']
  details: Object, // Additional context (flexible schema)
  ipAddress: String, // Client IP address
  userAgent: String, // Client user agent
  timestamp: Date, // Required, indexed, auto-generated
  retentionDate: Date // timestamp + 7 years
}
```

**Indexes:**
- `officerId`: For officer-specific logs
- `timestamp`: For chronological queries
- `action`: For filtering by action type
- Compound index: `(officerId, timestamp)` for officer timeline
- `retentionDate`: For automated cleanup (if implemented)

**Retention:**
- Minimum 7-year retention required
- No updates or deletes allowed
- Archived after retention period (future enhancement)


## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register
Register a new officer account.

**Request Body:**
```javascript
{
  name: String, // Required
  email: String, // Required, unique
  password: String, // Required, min 8 chars with uppercase, lowercase, numbers
  policeId: String, // Required, must exist in Registry
  department: String, // Required
  station: String, // Optional
  phoneNumber: String // Optional
}
```

**Response (201 Created):**
```javascript
{
  message: "Registration successful",
  officer: {
    id: String,
    name: String,
    email: String,
    policeId: String,
    department: String
  }
}
```

**Error Responses:**
- 400: Invalid Police ID, username already exists, password requirements not met
- 500: Database error

#### POST /api/auth/login
Authenticate an officer and receive JWT token.

**Request Body:**
```javascript
{
  email: String, // Required
  password: String // Required
}
```

**Response (200 OK):**
```javascript
{
  message: "Login successful",
  token: String, // JWT token, 24-hour expiration
  officer: {
    id: String,
    name: String,
    email: String,
    policeId: String,
    department: String,
    isAdmin: Boolean
  }
}
```

**Error Responses:**
- 401: Invalid credentials
- 500: Database error

#### POST /api/auth/logout
Invalidate current authentication token.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200 OK):**
```javascript
{
  message: "Logout successful"
}
```

**Error Responses:**
- 401: Invalid or missing token

### Evidence Endpoints

#### POST /api/evidence/upload
Upload a new evidence file.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
```javascript
{
  file: File, // Required, max 500MB
  caseId: String, // Required
  evidenceName: String, // Required
  evidenceType: String, // Required, enum: ['image', 'video', 'document', 'audio']
  description: String // Optional
}
```

**Response (201 Created):**
```javascript
{
  message: "Evidence uploaded successfully",
  evidence: {
    id: String,
    caseId: String,
    evidenceName: String,
    fileName: String,
    fileHash: String,
    transactionId: String,
    blockNumber: Number,
    uploadedBy: String,
    createdAt: Date
  }
}
```

**Error Responses:**
- 400: File too large, invalid file type, missing required fields
- 401: Invalid or missing token
- 500: File storage error, blockchain error, database error

#### GET /api/evidence
List evidence files for the authenticated officer.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
```javascript
{
  page: Number, // Optional, default 1
  limit: Number, // Optional, default 20
  caseId: String, // Optional, filter by case ID
  verificationStatus: String // Optional, filter by status
}
```

**Response (200 OK):**
```javascript
{
  evidence: [
    {
      id: String,
      caseId: String,
      evidenceName: String,
      fileName: String,
      fileSize: Number,
      fileHash: String,
      transactionId: String,
      blockNumber: Number,
      verificationStatus: String,
      lastVerified: Date,
      createdAt: Date
    }
  ],
  pagination: {
    currentPage: Number,
    totalPages: Number,
    totalItems: Number,
    itemsPerPage: Number
  }
}
```

**Error Responses:**
- 401: Invalid or missing token
- 500: Database error

#### GET /api/evidence/:id
Retrieve details for a specific evidence file.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200 OK):**
```javascript
{
  evidence: {
    id: String,
    caseId: String,
    evidenceName: String,
    evidenceType: String,
    description: String,
    fileName: String,
    fileSize: Number,
    fileHash: String,
    transactionId: String,
    blockNumber: Number,
    uploadedBy: String,
    uploadedByName: String,
    verificationStatus: String,
    lastVerified: Date,
    verificationCount: Number,
    createdAt: Date
  }
}
```

**Error Responses:**
- 401: Invalid or missing token
- 403: Permission denied (not owner and not admin)
- 404: Evidence not found
- 500: Database error

#### GET /api/evidence/:id/download
Download an evidence file.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200 OK):**
- Content-Type: Based on file type
- Content-Disposition: attachment; filename="{originalFilename}"
- Body: File binary data

**Error Responses:**
- 401: Invalid or missing token
- 403: Permission denied
- 404: Evidence or file not found
- 500: File system error

#### POST /api/evidence/:id/verify
Verify evidence integrity against blockchain hash.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200 OK):**
```javascript
{
  message: "Verification complete",
  verification: {
    evidenceId: String,
    status: String, // 'verified' or 'tampered'
    currentHash: String,
    blockchainHash: String,
    isMatch: Boolean,
    verifiedAt: Date,
    transactionId: String,
    blockNumber: Number
  }
}
```

**Error Responses:**
- 401: Invalid or missing token
- 403: Permission denied
- 404: Evidence not found
- 500: File system error, blockchain error, database error

#### POST /api/evidence/search
Search for evidence files.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```javascript
{
  filename: String, // Optional, partial match
  caseId: String, // Optional, exact match
  startDate: Date, // Optional, ISO 8601 format
  endDate: Date, // Optional, ISO 8601 format
  evidenceType: String, // Optional
  verificationStatus: String, // Optional
  page: Number, // Optional, default 1
  limit: Number // Optional, default 20
}
```

**Response (200 OK):**
```javascript
{
  results: [
    {
      id: String,
      caseId: String,
      evidenceName: String,
      fileName: String,
      evidenceType: String,
      verificationStatus: String,
      createdAt: Date
    }
  ],
  pagination: {
    currentPage: Number,
    totalPages: Number,
    totalItems: Number
  }
}
```

**Error Responses:**
- 401: Invalid or missing token
- 400: Invalid date format
- 500: Database error

### Dashboard Endpoints

#### GET /api/dashboard/stats
Retrieve dashboard statistics for the authenticated officer.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200 OK):**
```javascript
{
  stats: {
    totalEvidence: Number,
    verifiedLast30Days: Number,
    tamperedEvidence: Number,
    totalVerifications: Number,
    recentActivity: [
      {
        action: String,
        targetName: String,
        result: String,
        timestamp: Date
      }
    ]
  }
}
```

**Error Responses:**
- 401: Invalid or missing token
- 500: Database error

#### GET /api/dashboard/tampered
List all evidence flagged as tampered.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200 OK):**
```javascript
{
  tamperedEvidence: [
    {
      id: String,
      caseId: String,
      evidenceName: String,
      fileName: String,
      lastVerified: Date,
      uploadedBy: String
    }
  ]
}
```

**Error Responses:**
- 401: Invalid or missing token
- 500: Database error

### Registry Endpoints

#### GET /api/registry/validate/:policeId
Validate a police ID against the registry (used during registration).

**Response (200 OK):**
```javascript
{
  valid: Boolean,
  officer: {
    name: String,
    station: String,
    department: String
  }
}
```

**Error Responses:**
- 404: Police ID not found in registry
- 500: Database error

#### POST /api/registry/add (Admin only)
Add a new police ID to the registry.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```javascript
{
  policeId: String, // Required, unique
  name: String, // Required
  station: String, // Required
  department: String, // Optional
  rank: String // Optional
}
```

**Response (201 Created):**
```javascript
{
  message: "Police ID added to registry",
  registry: {
    id: String,
    policeId: String,
    name: String,
    station: String
  }
}
```

**Error Responses:**
- 401: Invalid or missing token
- 403: Not authorized (not admin)
- 400: Police ID already exists
- 500: Database error


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all 96 acceptance criteria, I identified the following redundancies:
- Criteria 1.2 is subsumed by 1.1 (both test police ID validation)
- Criteria 1.6 is subsumed by 1.4 (both test username uniqueness)
- Criteria 5.3 and 5.4 are covered by 3.4 (transaction ID storage)
- Criteria 8.1 is covered by 7.5 (tampering detection)
- Criteria 9.3 is covered by 7.6 (verification logging)
- Criteria 9.4 is covered by 8.3 (tampering logging)
- Criteria 11.5 is covered by 11.1 (permission checking)
- Criteria 14.3 is covered by 14.1 and 2.4 (token invalidation)
- Criteria 14.5 is covered by 14.4 (single session enforcement)
- Criteria 15.2 is covered by 3.8 (file size validation)

After consolidation, we have the following unique testable properties:

### Property 1: Police ID Validation

*For any* registration attempt with a police ID, the system should accept the registration if and only if the police ID exists in the Registry collection with 'approved' status.

**Validates: Requirements 1.1, 1.2**

### Property 2: Officer Account Creation

*For any* valid registration (valid police ID, unique username, valid password), the system should create an Officer document in the database with all provided credentials.

**Validates: Requirements 1.3**

### Property 3: Username Uniqueness

*For any* registration attempt with a username that already exists in the Officers collection, the system should reject the registration and return an error.

**Validates: Requirements 1.4, 1.6**

### Property 4: Password Validation

*For any* password string, the system should accept it if and only if it contains at least 8 characters with at least one uppercase letter, one lowercase letter, and one number.

**Validates: Requirements 1.5**

### Property 5: Authentication Token Generation

*For any* valid login credentials (matching username/email and password), the system should generate and return a JWT token containing the officer ID.

**Validates: Requirements 2.1**

### Property 6: Invalid Credentials Rejection

*For any* login attempt with credentials that don't match an existing officer or have an incorrect password, the system should reject the login and return an authentication error.

**Validates: Requirements 2.3**

### Property 7: Protected Endpoint Authorization

*For any* request to a protected endpoint without a valid authentication token, the system should reject the request with a 401 status code.

**Validates: Requirements 2.4**

### Property 8: Token Validation

*For any* request with an expired, malformed, or invalid token, the system should reject the request and return an authentication error.

**Validates: Requirements 2.5**

### Property 9: File Storage

*For any* evidence upload with valid authentication and within size limits, the system should store the file on the filesystem at a path derived from officer ID and case ID.

**Validates: Requirements 3.1**

### Property 10: Hash Generation

*For any* uploaded evidence file, the system should generate a SHA-256 hash that is a 64-character hexadecimal string.

**Validates: Requirements 3.2, 4.1, 4.3**

### Property 11: Blockchain Hash Storage

*For any* successfully uploaded evidence file, the system should store the file hash on the blockchain and receive a transaction ID.

**Validates: Requirements 3.3, 5.1**

### Property 12: Transaction ID Storage

*For any* evidence record created after successful blockchain storage, the record should contain a non-empty transaction ID and block number.

**Validates: Requirements 3.4, 3.5, 5.3, 5.4**

### Property 13: Evidence Metadata Completeness

*For any* evidence record in the database, it should contain all required fields: caseId, evidenceName, evidenceType, fileName, filePath, fileHash, transactionId, uploadedBy, and createdAt.

**Validates: Requirements 3.5**

### Property 14: File Type Validation

*For any* file upload, the system should accept files with MIME types matching image/*, video/*, application/pdf, application/msword, application/vnd.*, audio/*, and reject all other types.

**Validates: Requirements 3.7**

### Property 15: Hash Idempotence

*For any* file, generating the SHA-256 hash multiple times should always produce the same 64-character hexadecimal string.

**Validates: Requirements 4.4**

### Property 16: Complete File Hashing

*For any* file, modifying any byte in the file should result in a different hash value, demonstrating that the entire file contents are processed.

**Validates: Requirements 4.2**

### Property 17: Evidence Ownership Filtering

*For any* non-admin officer requesting their evidence list, the system should return only evidence records where uploadedBy matches the officer's ID.

**Validates: Requirements 6.1**

### Property 18: Evidence List Metadata

*For any* evidence list response, each evidence item should include filename, upload date, file size, transaction ID, and verification status.

**Validates: Requirements 6.2**

### Property 19: Evidence List Sorting

*For any* evidence list response, the records should be sorted by createdAt in descending order (newest first).

**Validates: Requirements 6.3**

### Property 20: Pagination

*For any* evidence list request with pagination parameters, the response should contain at most the specified limit of records and include correct pagination metadata (currentPage, totalPages, totalItems).

**Validates: Requirements 6.4**

### Property 21: Admin Evidence Access

*For any* officer with isAdmin=true requesting the evidence list, the system should return evidence from all officers, not just their own.

**Validates: Requirements 6.5**

### Property 22: Verification Hash Recalculation

*For any* verification request for an evidence file, the system should generate a new hash from the current file contents.

**Validates: Requirements 7.1**

### Property 23: Blockchain Hash Retrieval

*For any* verification request, the system should retrieve the original hash from the blockchain using the stored transaction ID.

**Validates: Requirements 7.2**

### Property 24: Hash Comparison

*For any* verification request, the system should compare the newly generated hash with the blockchain-retrieved hash and return both values in the response.

**Validates: Requirements 7.3**

### Property 25: Successful Verification

*For any* evidence file that has not been modified since upload, verification should return status='verified' and isMatch=true.

**Validates: Requirements 7.4**

### Property 26: Tampering Detection

*For any* evidence file that has been modified since upload, verification should return status='tampered' and isMatch=false.

**Validates: Requirements 7.5, 8.1**

### Property 27: Verification Logging

*For any* verification request, the system should create an ActivityLog entry with action='verify', the evidence ID, and the verification result.

**Validates: Requirements 7.6, 9.3**

### Property 28: Tampering Warning

*For any* verification that detects tampering (hash mismatch), the response should include a warning message indicating tampering was detected.

**Validates: Requirements 8.2**

### Property 29: Tampering Event Logging

*For any* verification that detects tampering, the system should create an ActivityLog entry with action='tamper_detected', timestamp, officer ID, and evidence ID.

**Validates: Requirements 8.3, 9.4**

### Property 30: Verification Response Completeness

*For any* verification response, it should include both the currentHash and blockchainHash for comparison.

**Validates: Requirements 8.4**

### Property 31: Tampered Evidence Deletion Prevention

*For any* evidence record with verificationStatus='tampered', delete operations should be rejected with an error.

**Validates: Requirements 8.5**

### Property 32: Login Logging

*For any* successful login, the system should create an ActivityLog entry with action='login', the officer ID, and timestamp.

**Validates: Requirements 9.1**

### Property 33: Upload Logging

*For any* successful evidence upload, the system should create an ActivityLog entry with action='upload', the evidence ID, filename, and officer ID.

**Validates: Requirements 9.2**

### Property 34: Activity Log Completeness

*For any* ActivityLog entry, it should contain timestamp, officerId, action, and result fields at minimum.

**Validates: Requirements 9.5**

### Property 35: Admin Activity Log Access

*For any* officer with isAdmin=true requesting activity logs, the system should return logs from all officers, not just their own.

**Validates: Requirements 9.7**

### Property 36: Dashboard Evidence Count

*For any* officer requesting dashboard statistics, the totalEvidence count should equal the number of evidence records where uploadedBy matches the officer's ID.

**Validates: Requirements 10.1**

### Property 37: Dashboard Verified Count

*For any* officer requesting dashboard statistics, the verifiedLast30Days count should equal the number of evidence records verified within the last 30 days by that officer.

**Validates: Requirements 10.2**

### Property 38: Dashboard Tampered Count

*For any* officer requesting dashboard statistics, the tamperedEvidence count should equal the number of evidence records with verificationStatus='tampered' for that officer.

**Validates: Requirements 10.3**

### Property 39: Dashboard Recent Activity

*For any* officer requesting dashboard statistics, the recentActivity array should contain the 10 most recent ActivityLog entries for that officer, sorted by timestamp descending.

**Validates: Requirements 10.4**

### Property 40: Admin Dashboard Statistics

*For any* officer with isAdmin=true requesting dashboard statistics, the counts should include evidence and activity from all officers system-wide.

**Validates: Requirements 10.5**

### Property 41: Download Permission Enforcement

*For any* download request, the system should allow the download if and only if the requesting officer is the uploader or has isAdmin=true.

**Validates: Requirements 11.1, 11.5**

### Property 42: Download File Serving

*For any* authorized download request, the system should serve the file from the stored filePath with the correct Content-Type header.

**Validates: Requirements 11.2**

### Property 43: Download Logging

*For any* successful download, the system should create an ActivityLog entry with action='download', the evidence ID, and officer ID.

**Validates: Requirements 11.3**

### Property 44: Download Filename Preservation

*For any* download response, the Content-Disposition header should include the original fileName from the evidence record.

**Validates: Requirements 11.4**

### Property 45: Evidence Details Transaction ID

*For any* evidence details response, it should include the transactionId field.

**Validates: Requirements 12.1**

### Property 46: Blockchain Explorer Link

*For any* evidence details response, it should include a properly formatted blockchain explorer URL containing the transaction ID.

**Validates: Requirements 12.2**

### Property 47: Evidence Details Block Number

*For any* evidence details response, it should include the blockNumber field.

**Validates: Requirements 12.4**

### Property 48: Evidence Details Blockchain Timestamp

*For any* evidence details response, it should include the blockchain confirmation timestamp.

**Validates: Requirements 12.5**

### Property 49: Filename Search

*For any* search query with a filename parameter, the results should only include evidence records where the fileName or evidenceName contains the search string (case-insensitive).

**Validates: Requirements 13.1**

### Property 50: Case ID Search

*For any* search query with a caseId parameter, the results should only include evidence records where the caseId exactly matches the search parameter.

**Validates: Requirements 13.2**

### Property 51: Date Range Search

*For any* search query with startDate and endDate parameters, the results should only include evidence records where createdAt falls within the specified range (inclusive).

**Validates: Requirements 13.3**

### Property 52: Search Permission Filtering

*For any* non-admin officer performing a search, the results should only include evidence records where uploadedBy matches the officer's ID.

**Validates: Requirements 13.4**

### Property 53: Search Result Format Consistency

*For any* search response, the evidence items should have the same structure as the evidence list response (same fields and format).

**Validates: Requirements 13.5**

### Property 54: Logout Token Invalidation

*For any* logout request with a valid token, subsequent requests using that token should be rejected with a 401 status code.

**Validates: Requirements 14.1, 14.3**

### Property 55: Single Session Enforcement

*For any* officer logging in, any previously issued tokens for that officer should be invalidated, ensuring only one active session.

**Validates: Requirements 14.4, 14.5**

### Property 56: Error Logging

*For any* error that occurs during request processing, the system should create a log entry (console or file) containing timestamp, error type, and stack trace.

**Validates: Requirements 15.5**

### Property 57: HTTP Status Code Correctness

*For any* error response, the HTTP status code should be 400-499 for client errors (invalid input, authentication failures) and 500-599 for server errors (database failures, blockchain errors).

**Validates: Requirements 15.6**


## Error Handling

### Error Categories

#### 1. Client Errors (4xx)

**400 Bad Request**
- Invalid input data (missing required fields, invalid formats)
- File size exceeds 500MB limit
- Invalid file type
- Invalid date format in search queries
- Password doesn't meet security requirements

**401 Unauthorized**
- Missing authentication token
- Invalid or expired token
- Incorrect login credentials
- Token signature verification failure

**403 Forbidden**
- Attempting to access another officer's evidence without admin privileges
- Attempting to delete tampered evidence
- Attempting to perform admin-only operations without admin role

**404 Not Found**
- Evidence record not found
- Officer not found
- Police ID not found in registry
- File not found on filesystem

**409 Conflict**
- Username already exists during registration
- Police ID already registered
- Duplicate evidence hash (attempting to upload same file twice)

#### 2. Server Errors (5xx)

**500 Internal Server Error**
- Database connection failures
- Blockchain connection failures
- File system errors (disk full, permission denied)
- Hash generation failures
- Unexpected exceptions

**503 Service Unavailable**
- Blockchain network unavailable after retry attempts
- Database temporarily unavailable
- External service dependencies down

### Error Response Format

All error responses follow a consistent JSON structure:

```javascript
{
  error: {
    code: String, // Error code (e.g., 'INVALID_POLICE_ID', 'FILE_TOO_LARGE')
    message: String, // Human-readable error message
    details: Object, // Optional, additional context
    timestamp: Date // ISO 8601 timestamp
  }
}
```

### Error Handling Strategies

#### 1. File Upload Errors

**Scenario**: File size exceeds 500MB
```javascript
{
  error: {
    code: 'FILE_TOO_LARGE',
    message: 'File size exceeds maximum allowed size of 500MB',
    details: {
      fileSize: 600000000,
      maxSize: 524288000
    }
  }
}
```

**Scenario**: Blockchain storage fails
- Retry up to 3 times with exponential backoff (2s, 4s, 8s)
- If all retries fail, delete uploaded file from filesystem
- Return error to client with suggestion to retry
- Log detailed error for debugging

```javascript
{
  error: {
    code: 'BLOCKCHAIN_STORAGE_FAILED',
    message: 'Failed to store evidence hash on blockchain after 3 attempts. Please try again later.',
    details: {
      attempts: 3,
      lastError: 'Network timeout'
    }
  }
}
```

**Rollback Procedure**:
1. Delete file from uploads directory
2. Do not create evidence record in database
3. Log the failure with full context
4. Return error response to client

#### 2. Authentication Errors

**Scenario**: Invalid credentials
```javascript
{
  error: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password'
  }
}
```

**Scenario**: Expired token
```javascript
{
  error: {
    code: 'TOKEN_EXPIRED',
    message: 'Authentication token has expired. Please log in again.',
    details: {
      expiredAt: '2024-01-15T10:30:00Z'
    }
  }
}
```

#### 3. Verification Errors

**Scenario**: Blockchain retrieval fails
```javascript
{
  error: {
    code: 'BLOCKCHAIN_RETRIEVAL_FAILED',
    message: 'Unable to retrieve original hash from blockchain. Please try again later.',
    details: {
      transactionId: '0x123...',
      error: 'Connection timeout'
    }
  }
}
```

**Scenario**: File not found (deleted or moved)
```javascript
{
  error: {
    code: 'FILE_NOT_FOUND',
    message: 'Evidence file not found on server. File may have been deleted or moved.',
    details: {
      expectedPath: '/uploads/officer123/case456/evidence.jpg'
    }
  }
}
```

#### 4. Database Errors

**Strategy**: Never expose internal database errors to clients
- Log detailed error with stack trace
- Return generic error message to client
- Include request ID for support tracking

```javascript
{
  error: {
    code: 'DATABASE_ERROR',
    message: 'An internal error occurred. Please try again or contact support.',
    details: {
      requestId: 'req_abc123xyz'
    }
  }
}
```

#### 5. Validation Errors

**Scenario**: Password requirements not met
```javascript
{
  error: {
    code: 'INVALID_PASSWORD',
    message: 'Password must be at least 8 characters and contain uppercase, lowercase, and numbers',
    details: {
      requirements: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true
      }
    }
  }
}
```

### Error Logging

All errors are logged with the following information:

```javascript
{
  timestamp: Date,
  level: String, // 'error', 'warn'
  requestId: String,
  officerId: String, // If authenticated
  endpoint: String,
  method: String,
  errorCode: String,
  errorMessage: String,
  stackTrace: String,
  context: Object // Request body, params, query (sanitized)
}
```

**Sensitive Data Handling**:
- Never log passwords or tokens
- Sanitize request bodies before logging
- Redact sensitive fields (password, token, etc.)

### Recovery Procedures

#### File Upload Failure Recovery
1. Detect failure at any stage (storage, hashing, blockchain)
2. Execute cleanup: delete uploaded file if it exists
3. Ensure no partial database records are created
4. Return appropriate error to client
5. Log failure with full context for debugging

#### Blockchain Transaction Failure Recovery
1. Implement retry logic with exponential backoff
2. After max retries, rollback file upload
3. Notify client of failure with retry suggestion
4. Log transaction details for manual investigation if needed

#### Database Connection Failure Recovery
1. Implement connection pooling with automatic reconnection
2. Queue requests during brief outages (if applicable)
3. Return 503 Service Unavailable if database is down
4. Log connection failures for monitoring

## Testing Strategy

### Overview

The testing strategy employs a dual approach combining unit tests for specific examples and edge cases with property-based tests for universal correctness guarantees. This ensures both concrete behavior validation and comprehensive input coverage.

### Testing Framework Selection

**Unit Testing**: Jest (JavaScript testing framework)
- Mature ecosystem with extensive mocking capabilities
- Built-in assertion library
- Excellent async/await support
- Code coverage reporting

**Property-Based Testing**: fast-check (JavaScript property testing library)
- Generates random test inputs automatically
- Shrinks failing cases to minimal examples
- Integrates seamlessly with Jest
- Supports custom generators for domain-specific types

**Installation**:
```bash
npm install --save-dev jest fast-check supertest mongodb-memory-server
```

### Test Organization

```
tests/
├── unit/
│   ├── auth.test.js
│   ├── evidence.test.js
│   ├── verification.test.js
│   ├── dashboard.test.js
│   └── search.test.js
├── property/
│   ├── auth.property.test.js
│   ├── evidence.property.test.js
│   ├── verification.property.test.js
│   ├── hash.property.test.js
│   └── permissions.property.test.js
├── integration/
│   ├── upload-flow.test.js
│   └── verification-flow.test.js
├── helpers/
│   ├── generators.js
│   ├── setup.js
│   └── teardown.js
└── fixtures/
    ├── officers.json
    ├── registry.json
    └── sample-files/
```

### Property-Based Testing Configuration

**Minimum Iterations**: Each property test must run at least 100 iterations to ensure adequate input coverage through randomization.

**Configuration Example**:
```javascript
fc.assert(
  fc.property(
    fc.string(), // Generator
    (input) => {
      // Property assertion
    }
  ),
  { numRuns: 100 } // Minimum 100 iterations
);
```

**Property Test Tagging**: Each property test must reference its design document property using a comment tag:

```javascript
/**
 * Feature: evitrack-evidence-management, Property 15: Hash Idempotence
 * For any file, generating the SHA-256 hash multiple times should 
 * always produce the same 64-character hexadecimal string.
 */
test('hash generation is idempotent', () => {
  fc.assert(
    fc.property(
      fc.uint8Array({ minLength: 1, maxLength: 1000 }),
      (fileData) => {
        const hash1 = generateHash(fileData);
        const hash2 = generateHash(fileData);
        expect(hash1).toBe(hash2);
        expect(hash1).toMatch(/^[a-f0-9]{64}$/);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Custom Generators

Property-based tests require custom generators for domain-specific types:

```javascript
// generators.js

const fc = require('fast-check');

// Generate valid police IDs
const policeIdGenerator = () => 
  fc.string({ minLength: 6, maxLength: 12 })
    .map(s => 'PID' + s.toUpperCase());

// Generate valid passwords
const validPasswordGenerator = () =>
  fc.tuple(
    fc.string({ minLength: 1 }).filter(s => /[A-Z]/.test(s)),
    fc.string({ minLength: 1 }).filter(s => /[a-z]/.test(s)),
    fc.string({ minLength: 1 }).filter(s => /[0-9]/.test(s)),
    fc.string({ minLength: 0, maxLength: 5 })
  ).map(([upper, lower, num, extra]) => 
    shuffle(upper + lower + num + extra)
  );

// Generate evidence metadata
const evidenceMetadataGenerator = () =>
  fc.record({
    caseId: fc.string({ minLength: 5, maxLength: 20 }),
    evidenceName: fc.string({ minLength: 1, maxLength: 100 }),
    evidenceType: fc.constantFrom('image', 'video', 'document', 'audio'),
    description: fc.option(fc.string({ maxLength: 500 }))
  });

// Generate file data
const fileDataGenerator = (maxSize = 1024) =>
  fc.uint8Array({ minLength: 1, maxLength: maxSize });

module.exports = {
  policeIdGenerator,
  validPasswordGenerator,
  evidenceMetadataGenerator,
  fileDataGenerator
};
```

### Unit Test Examples

Unit tests focus on specific examples, edge cases, and integration points:

#### Authentication Tests

```javascript
describe('Officer Registration', () => {
  test('should reject registration with invalid police ID', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        policeId: 'INVALID123',
        department: 'Homicide'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_POLICE_ID');
  });

  test('should reject registration with weak password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weak',
        policeId: 'PID123456',
        department: 'Homicide'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_PASSWORD');
  });

  test('should successfully register with valid data', async () => {
    // Pre-populate registry
    await Registry.create({
      policeId: 'PID123456',
      name: 'John Doe',
      station: 'Central Station'
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        policeId: 'PID123456',
        department: 'Homicide'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.officer.email).toBe('john@example.com');
  });
});
```

#### Evidence Upload Tests

```javascript
describe('Evidence Upload', () => {
  let authToken;
  let officerId;

  beforeEach(async () => {
    // Create officer and get auth token
    const officer = await Officer.create({
      name: 'Test Officer',
      email: 'test@example.com',
      password: await bcrypt.hash('Password123', 10),
      policeId: 'PID123456',
      department: 'Forensics'
    });
    officerId = officer._id;
    authToken = jwt.sign({ id: officerId }, process.env.JWT_SECRET);
  });

  test('should reject file larger than 500MB', async () => {
    const response = await request(app)
      .post('/api/evidence/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.alloc(525000000), 'large.jpg')
      .field('caseId', 'CASE001')
      .field('evidenceName', 'Large Evidence')
      .field('evidenceType', 'image');
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('FILE_TOO_LARGE');
  });

  test('should successfully upload valid evidence', async () => {
    const response = await request(app)
      .post('/api/evidence/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('test data'), 'evidence.jpg')
      .field('caseId', 'CASE001')
      .field('evidenceName', 'Test Evidence')
      .field('evidenceType', 'image');
    
    expect(response.status).toBe(201);
    expect(response.body.evidence.fileHash).toMatch(/^[a-f0-9]{64}$/);
    expect(response.body.evidence.transactionId).toBeDefined();
  });

  test('should rollback upload if blockchain storage fails', async () => {
    // Mock blockchain failure
    jest.spyOn(blockchain, 'storeHashOnBlockchain')
      .mockRejectedValue(new Error('Blockchain error'));

    const response = await request(app)
      .post('/api/evidence/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('test data'), 'evidence.jpg')
      .field('caseId', 'CASE001')
      .field('evidenceName', 'Test Evidence')
      .field('evidenceType', 'image');
    
    expect(response.status).toBe(500);
    
    // Verify file was deleted
    const evidence = await Evidence.findOne({ caseId: 'CASE001' });
    expect(evidence).toBeNull();
  });
});
```

### Property-Based Test Examples

Property tests verify universal properties across all inputs:

#### Hash Generation Properties

```javascript
/**
 * Feature: evitrack-evidence-management, Property 15: Hash Idempotence
 */
describe('Hash Generation Properties', () => {
  test('hash generation is idempotent', () => {
    fc.assert(
      fc.property(
        fileDataGenerator(10000),
        (fileData) => {
          const hash1 = generateHash(fileData);
          const hash2 = generateHash(fileData);
          expect(hash1).toBe(hash2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: evitrack-evidence-management, Property 16: Complete File Hashing
   */
  test('modifying any byte changes the hash', () => {
    fc.assert(
      fc.property(
        fileDataGenerator(1000),
        fc.nat(),
        (fileData, byteIndex) => {
          fc.pre(fileData.length > 0);
          const index = byteIndex % fileData.length;
          
          const originalHash = generateHash(fileData);
          
          // Modify one byte
          const modifiedData = Buffer.from(fileData);
          modifiedData[index] = (modifiedData[index] + 1) % 256;
          const modifiedHash = generateHash(modifiedData);
          
          expect(originalHash).not.toBe(modifiedHash);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: evitrack-evidence-management, Property 10: Hash Generation
   */
  test('all hashes are 64-character hexadecimal strings', () => {
    fc.assert(
      fc.property(
        fileDataGenerator(5000),
        (fileData) => {
          const hash = generateHash(fileData);
          expect(hash).toMatch(/^[a-f0-9]{64}$/);
          expect(hash.length).toBe(64);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

#### Authentication Properties

```javascript
/**
 * Feature: evitrack-evidence-management, Property 4: Password Validation
 */
describe('Password Validation Properties', () => {
  test('valid passwords are accepted', () => {
    fc.assert(
      fc.property(
        validPasswordGenerator(),
        (password) => {
          const result = validatePassword(password);
          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('passwords without uppercase are rejected', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 8 }).filter(s => !/[A-Z]/.test(s)),
        (password) => {
          const result = validatePassword(password);
          expect(result.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

#### Permission Properties

```javascript
/**
 * Feature: evitrack-evidence-management, Property 17: Evidence Ownership Filtering
 */
describe('Permission Properties', () => {
  test('officers only see their own evidence', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(evidenceMetadataGenerator(), { minLength: 10, maxLength: 50 }),
        fc.integer({ min: 0, max: 9 }),
        async (evidenceList, officerIndex) => {
          // Create multiple officers
          const officers = await Promise.all(
            Array(10).fill(0).map((_, i) => 
              Officer.create({
                name: `Officer ${i}`,
                email: `officer${i}@example.com`,
                password: 'hashed',
                policeId: `PID${i}`,
                department: 'Test'
              })
            )
          );

          // Create evidence for random officers
          await Promise.all(
            evidenceList.map(meta => 
              Evidence.create({
                ...meta,
                uploadedBy: officers[Math.floor(Math.random() * 10)]._id,
                filePath: '/test/path',
                fileHash: 'a'.repeat(64)
              })
            )
          );

          // Query as specific officer
          const officer = officers[officerIndex];
          const token = jwt.sign({ id: officer._id }, process.env.JWT_SECRET);
          
          const response = await request(app)
            .get('/api/evidence')
            .set('Authorization', `Bearer ${token}`);

          // Verify all returned evidence belongs to this officer
          response.body.evidence.forEach(ev => {
            expect(ev.uploadedBy).toBe(officer._id.toString());
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: evitrack-evidence-management, Property 41: Download Permission Enforcement
   */
  test('officers cannot download other officers evidence', async () => {
    fc.assert(
      fc.asyncProperty(
        evidenceMetadataGenerator(),
        async (metadata) => {
          // Create two officers
          const owner = await Officer.create({
            name: 'Owner',
            email: 'owner@example.com',
            password: 'hashed',
            policeId: 'PID001',
            department: 'Test'
          });

          const other = await Officer.create({
            name: 'Other',
            email: 'other@example.com',
            password: 'hashed',
            policeId: 'PID002',
            department: 'Test'
          });

          // Create evidence owned by first officer
          const evidence = await Evidence.create({
            ...metadata,
            uploadedBy: owner._id,
            filePath: '/test/path',
            fileHash: 'a'.repeat(64)
          });

          // Try to download as second officer
          const token = jwt.sign({ id: other._id }, process.env.JWT_SECRET);
          const response = await request(app)
            .get(`/api/evidence/${evidence._id}/download`)
            .set('Authorization', `Bearer ${token}`);

          expect(response.status).toBe(403);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

#### Verification Properties

```javascript
/**
 * Feature: evitrack-evidence-management, Property 25: Successful Verification
 */
describe('Verification Properties', () => {
  test('unmodified files verify successfully', async () => {
    fc.assert(
      fc.asyncProperty(
        fileDataGenerator(5000),
        evidenceMetadataGenerator(),
        async (fileData, metadata) => {
          // Upload evidence
          const hash = generateHash(fileData);
          const txId = await blockchain.storeHashOnBlockchain(hash, metadata.caseId);
          
          const evidence = await Evidence.create({
            ...metadata,
            uploadedBy: testOfficer._id,
            filePath: '/test/path',
            fileHash: hash,
            transactionId: txId
          });

          // Mock file reading to return same data
          jest.spyOn(fs, 'readFile').mockResolvedValue(fileData);

          // Verify
          const result = await verifyEvidence(evidence._id);
          
          expect(result.status).toBe('verified');
          expect(result.isMatch).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: evitrack-evidence-management, Property 26: Tampering Detection
   */
  test('modified files are detected as tampered', async () => {
    fc.assert(
      fc.asyncProperty(
        fileDataGenerator(5000),
        evidenceMetadataGenerator(),
        fc.nat(),
        async (fileData, metadata, byteIndex) => {
          fc.pre(fileData.length > 0);
          
          // Upload evidence
          const originalHash = generateHash(fileData);
          const txId = await blockchain.storeHashOnBlockchain(originalHash, metadata.caseId);
          
          const evidence = await Evidence.create({
            ...metadata,
            uploadedBy: testOfficer._id,
            filePath: '/test/path',
            fileHash: originalHash,
            transactionId: txId
          });

          // Modify file
          const modifiedData = Buffer.from(fileData);
          const index = byteIndex % modifiedData.length;
          modifiedData[index] = (modifiedData[index] + 1) % 256;
          
          jest.spyOn(fs, 'readFile').mockResolvedValue(modifiedData);

          // Verify
          const result = await verifyEvidence(evidence._id);
          
          expect(result.status).toBe('tampered');
          expect(result.isMatch).toBe(false);
          expect(result.currentHash).not.toBe(result.blockchainHash);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Test Coverage Goals

- **Unit Test Coverage**: Minimum 80% code coverage
- **Property Test Coverage**: All 57 correctness properties must have corresponding property tests
- **Integration Test Coverage**: All critical user flows (registration → login → upload → verify)
- **Edge Case Coverage**: All error conditions and boundary cases

### Continuous Integration

Tests should run automatically on:
- Every commit (pre-commit hook)
- Every pull request
- Before deployment to staging/production

**CI Configuration** (GitHub Actions example):
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:property
      - run: npm run test:integration
      - run: npm run test:coverage
```

### Test Maintenance

- Update property tests when correctness properties change
- Add new unit tests for bug fixes
- Review and update generators as domain models evolve
- Maintain test fixtures and sample data
- Document complex test scenarios

