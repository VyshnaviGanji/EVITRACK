# Implementation Plan: Evitrack Evidence Management System

## Overview

This implementation plan breaks down the Evitrack blockchain-based forensic evidence management system into sequential, manageable tasks. The system uses Node.js/Express.js for the backend, MongoDB for data storage, Ethereum blockchain for immutable hash storage, and JWT for authentication. Tasks are organized to build incrementally, with testing integrated throughout to catch errors early.

## Tasks

- [ ] 1. Project setup and configuration
  - Initialize Node.js project with package.json
  - Install core dependencies: express, mongoose, web3, jsonwebtoken, bcryptjs, multer, dotenv
  - Install dev dependencies: jest, fast-check, supertest, mongodb-memory-server
  - Create .env.example with required environment variables (MONGODB_URI, JWT_SECRET, ETHEREUM_NETWORK, CONTRACT_ADDRESS, PRIVATE_KEY)
  - Set up project directory structure (models/, routes/, middleware/, utils/, controllers/, tests/)
  - Configure Jest for testing with coverage reporting
  - _Requirements: Infrastructure setup_

- [ ] 2. Database models and schemas
  - [ ] 2.1 Create Officer model with Mongoose schema
    - Define schema with fields: name, email, password, policeId, department, station, phoneNumber, isAdmin, createdAt, lastLogin, sessionToken
    - Add unique indexes on email and policeId
    - Add validation for email format
    - _Requirements: 1.3, 1.4, 1.5_

  - [ ] 2.2 Create Registry model with Mongoose schema
    - Define schema with fields: policeId, name, station, department, rank, status
    - Add unique index on policeId
    - Add default status='approved'
    - _Requirements: 1.1_

  - [ ] 2.3 Create Evidence model with Mongoose schema
    - Define schema with fields: caseId, evidenceName, evidenceType, description, fileName, filePath, fileSize, fileHash, transactionId, blockNumber, uploadedBy, uploadedByName, verificationStatus, lastVerified, verificationCount, isTampered, createdAt, updatedAt
    - Add indexes on caseId, uploadedBy, verificationStatus, createdAt, fileHash
    - Add compound index on (uploadedBy, createdAt)
    - Add enum validation for evidenceType and verificationStatus
    - _Requirements: 3.5, 6.1_

  - [ ] 2.4 Create ActivityLog model with Mongoose schema
    - Define schema with fields: officerId, officerName, action, targetId, targetName, result, details, ipAddress, userAgent, timestamp, retentionDate
    - Add indexes on officerId, timestamp, action
    - Add compound index on (officerId, timestamp)
    - Add enum validation for action and result fields
    - _Requirements: 9.5_

  - [ ]* 2.5 Write property tests for data models
    - **Property 13: Evidence Metadata Completeness**
    - **Validates: Requirements 3.5**
    - Test that all required fields are present in Evidence model
    - Test that validation rules are enforced

- [ ] 3. Utility functions and helpers
  - [ ] 3.1 Implement SHA-256 hash generation utility
    - Create generateFileHash function using Node.js crypto module
    - Use stream-based processing for memory efficiency
    - Return 64-character hexadecimal string
    - _Requirements: 3.2, 4.1, 4.2, 4.3_

  - [ ]* 3.2 Write property tests for hash generation
    - **Property 10: Hash Generation**
    - **Property 15: Hash Idempotence**
    - **Property 16: Complete File Hashing**
    - **Validates: Requirements 3.2, 4.1, 4.2, 4.3, 4.4**
    - Test hash format (64-char hex string)
    - Test idempotence (same file → same hash)
    - Test completeness (any byte change → different hash)

  - [ ] 3.3 Implement password validation utility
    - Create validatePassword function
    - Check minimum 8 characters, uppercase, lowercase, numbers
    - Return validation result with error messages
    - _Requirements: 1.5_

  - [ ]* 3.4 Write property tests for password validation
    - **Property 4: Password Validation**
    - **Validates: Requirements 1.5**
    - Test valid passwords are accepted
    - Test invalid passwords are rejected

  - [ ] 3.5 Create custom property test generators
    - Create policeIdGenerator for valid police IDs
    - Create validPasswordGenerator for valid passwords
    - Create evidenceMetadataGenerator for evidence data
    - Create fileDataGenerator for file content
    - Place in tests/helpers/generators.js
    - _Requirements: Testing infrastructure_

- [ ] 4. Blockchain integration layer
  - [ ] 4.1 Create Web3 client configuration
    - Initialize Web3 instance with provider URL from environment
    - Configure connection to Ethereum network (mainnet/testnet/local)
    - Export configured Web3 instance
    - _Requirements: 5.6_

  - [ ] 4.2 Create smart contract interface
    - Load contract ABI and address from configuration
    - Create contract instance using Web3
    - Implement storeEvidence method wrapper
    - Implement getEvidence method wrapper
    - Implement verifyEvidence method wrapper
    - _Requirements: 5.1_

  - [ ] 4.3 Implement blockchain transaction handling
    - Create storeHashOnBlockchain function with retry logic
    - Implement exponential backoff (2s, 4s, 8s) for 3 attempts
    - Wait for transaction confirmation (3 blocks)
    - Return transaction ID and block number
    - Handle gas estimation and transaction signing
    - _Requirements: 5.2, 5.3, 5.5_

  - [ ] 4.4 Implement blockchain hash retrieval
    - Create getHashFromBlockchain function
    - Retrieve hash using transaction ID
    - Handle blockchain connection errors
    - Return original hash and block metadata
    - _Requirements: 7.2_

  - [ ]* 4.5 Write unit tests for blockchain integration
    - Mock Web3 provider for testing
    - Test successful hash storage
    - Test retry logic on failures
    - Test transaction confirmation waiting
    - Test hash retrieval

- [ ] 5. Authentication middleware and utilities
  - [ ] 5.1 Implement JWT token generation
    - Create generateToken function
    - Include officer ID and issuance timestamp in payload
    - Set 24-hour expiration
    - Sign with JWT_SECRET from environment
    - _Requirements: 2.1, 2.2_

  - [ ] 5.2 Implement JWT authentication middleware
    - Create authenticateToken middleware
    - Extract token from Authorization header
    - Verify token signature and expiration
    - Attach officer data to request object
    - Return 401 for invalid/missing tokens
    - _Requirements: 2.4, 2.5_

  - [ ]* 5.3 Write property tests for authentication
    - **Property 5: Authentication Token Generation**
    - **Property 7: Protected Endpoint Authorization**
    - **Property 8: Token Validation**
    - **Validates: Requirements 2.1, 2.4, 2.5**
    - Test valid credentials generate tokens
    - Test invalid tokens are rejected
    - Test expired tokens are rejected

  - [ ] 5.3 Implement admin authorization middleware
    - Create requireAdmin middleware
    - Check if authenticated officer has isAdmin=true
    - Return 403 for non-admin users
    - _Requirements: 6.5, 9.7, 10.5_

  - [ ] 5.4 Implement password hashing utilities
    - Create hashPassword function using bcryptjs (10 rounds)
    - Create comparePassword function for login verification
    - _Requirements: 1.5, 2.1_

- [ ] 6. Activity logging service
  - [ ] 6.1 Create activity logging utility
    - Implement logActivity function
    - Accept parameters: officerId, officerName, action, targetId, targetName, result, details, ipAddress, userAgent
    - Create ActivityLog document in database
    - Calculate retentionDate (timestamp + 7 years)
    - Handle logging errors gracefully (don't fail main operation)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 6.2 Write property tests for activity logging
    - **Property 32: Login Logging**
    - **Property 33: Upload Logging**
    - **Property 27: Verification Logging**
    - **Property 34: Activity Log Completeness**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
    - Test all required fields are present
    - Test logging doesn't fail main operations

- [ ] 7. Checkpoint - Core infrastructure complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Authentication routes and controllers
  - [ ] 8.1 Implement POST /api/auth/register endpoint
    - Validate request body (name, email, password, policeId, department)
    - Validate police ID against Registry collection
    - Check username uniqueness in Officers collection
    - Validate password requirements
    - Hash password with bcryptjs
    - Create Officer document
    - Return success response with officer data (exclude password)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 8.2 Write property tests for registration
    - **Property 1: Police ID Validation**
    - **Property 2: Officer Account Creation**
    - **Property 3: Username Uniqueness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.6**
    - Test valid police IDs are accepted
    - Test invalid police IDs are rejected
    - Test duplicate usernames are rejected

  - [ ] 8.3 Implement POST /api/auth/login endpoint
    - Validate request body (email, password)
    - Find Officer by email
    - Compare password with bcryptjs
    - Generate JWT token with 24-hour expiration
    - Invalidate previous session token (single session enforcement)
    - Update Officer.sessionToken and Officer.lastLogin
    - Log login activity
    - Return token and officer data
    - _Requirements: 2.1, 2.3, 14.4, 14.5_

  - [ ]* 8.4 Write property tests for login
    - **Property 5: Authentication Token Generation**
    - **Property 6: Invalid Credentials Rejection**
    - **Property 55: Single Session Enforcement**
    - **Validates: Requirements 2.1, 2.3, 14.4, 14.5**
    - Test valid credentials generate tokens
    - Test invalid credentials are rejected
    - Test previous tokens are invalidated

  - [ ] 8.5 Implement POST /api/auth/logout endpoint
    - Require authentication middleware
    - Clear Officer.sessionToken in database
    - Log logout activity
    - Return success response
    - _Requirements: 14.1, 14.3_

  - [ ]* 8.6 Write property tests for logout
    - **Property 54: Logout Token Invalidation**
    - **Validates: Requirements 14.1, 14.3**
    - Test tokens are invalidated after logout
    - Test subsequent requests with old token fail

- [ ] 9. Registry routes and controllers
  - [ ] 9.1 Implement GET /api/registry/validate/:policeId endpoint
    - Find police ID in Registry collection
    - Check status='approved'
    - Return validation result with officer details
    - Return 404 if not found
    - _Requirements: 1.1_

  - [ ] 9.2 Implement POST /api/registry/add endpoint (admin only)
    - Require authentication and admin middleware
    - Validate request body (policeId, name, station)
    - Check police ID uniqueness
    - Create Registry document
    - Return success response
    - _Requirements: Registry management_

- [ ] 10. Evidence upload implementation
  - [ ] 10.1 Configure Multer middleware for file uploads
    - Set up storage destination (uploads/ directory)
    - Configure filename with timestamp and officer ID
    - Set file size limit to 500MB (524,288,000 bytes)
    - Configure file type filtering (image/*, video/*, application/pdf, application/msword, application/vnd.*, audio/*)
    - _Requirements: 3.1, 3.7, 3.8_

  - [ ]* 10.2 Write property tests for file validation
    - **Property 14: File Type Validation**
    - **Validates: Requirements 3.7**
    - Test allowed file types are accepted
    - Test disallowed file types are rejected

  - [ ] 10.3 Implement POST /api/evidence/upload endpoint
    - Require authentication middleware
    - Use Multer middleware for file processing
    - Validate required fields (caseId, evidenceName, evidenceType)
    - Generate SHA-256 hash from uploaded file
    - Store hash on blockchain with retry logic
    - Create Evidence document with all metadata
    - Log upload activity
    - Return evidence record with transaction details
    - Implement rollback on blockchain failure (delete file, no DB record)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 10.4 Write property tests for evidence upload
    - **Property 9: File Storage**
    - **Property 11: Blockchain Hash Storage**
    - **Property 12: Transaction ID Storage**
    - **Validates: Requirements 3.1, 3.3, 3.4, 3.5, 5.3, 5.4**
    - Test files are stored correctly
    - Test hashes are stored on blockchain
    - Test transaction IDs are saved
    - Test rollback on blockchain failure

- [ ] 11. Evidence listing and retrieval
  - [ ] 11.1 Implement GET /api/evidence endpoint
    - Require authentication middleware
    - Filter by uploadedBy (officer ID) unless admin
    - Support query parameters: page, limit, caseId, verificationStatus
    - Sort by createdAt descending
    - Implement pagination (default 20 per page)
    - Return evidence list with pagination metadata
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 11.2 Write property tests for evidence listing
    - **Property 17: Evidence Ownership Filtering**
    - **Property 18: Evidence List Metadata**
    - **Property 19: Evidence List Sorting**
    - **Property 20: Pagination**
    - **Property 21: Admin Evidence Access**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
    - Test officers only see their own evidence
    - Test admins see all evidence
    - Test pagination works correctly
    - Test sorting is correct

  - [ ] 11.3 Implement GET /api/evidence/:id endpoint
    - Require authentication middleware
    - Find evidence by ID
    - Check permission (owner or admin)
    - Return 403 if not authorized
    - Return complete evidence details
    - _Requirements: 11.5, 12.1, 12.4, 12.5_

  - [ ]* 11.4 Write property tests for evidence details
    - **Property 45: Evidence Details Transaction ID**
    - **Property 47: Evidence Details Block Number**
    - **Validates: Requirements 12.1, 12.4**
    - Test transaction ID is included
    - Test block number is included

  - [ ] 11.5 Implement GET /api/evidence/:id/download endpoint
    - Require authentication middleware
    - Find evidence by ID
    - Check permission (owner or admin)
    - Return 403 if not authorized
    - Serve file from filesystem with correct Content-Type
    - Set Content-Disposition header with original filename
    - Log download activity
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 11.6 Write property tests for evidence download
    - **Property 41: Download Permission Enforcement**
    - **Property 42: Download File Serving**
    - **Property 43: Download Logging**
    - **Property 44: Download Filename Preservation**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**
    - Test permission enforcement
    - Test file is served correctly
    - Test downloads are logged

- [ ] 12. Checkpoint - Evidence management complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Evidence verification implementation
  - [ ] 13.1 Implement POST /api/evidence/:id/verify endpoint
    - Require authentication middleware
    - Find evidence by ID
    - Check permission (owner or admin)
    - Read file from filesystem
    - Generate current SHA-256 hash
    - Retrieve original hash from blockchain using transaction ID
    - Compare current hash with blockchain hash
    - Update evidence record: verificationStatus, lastVerified, verificationCount, isTampered
    - Log verification activity with result
    - If tampered, log tamper detection event
    - Return verification result with both hashes
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 13.2 Write property tests for verification
    - **Property 22: Verification Hash Recalculation**
    - **Property 23: Blockchain Hash Retrieval**
    - **Property 24: Hash Comparison**
    - **Property 25: Successful Verification**
    - **Property 26: Tampering Detection**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 8.1**
    - Test unmodified files verify successfully
    - Test modified files are detected as tampered
    - Test both hashes are returned

  - [ ] 13.3 Implement tampering detection logic
    - Create helper function to detect hash mismatch
    - Set isTampered flag when hashes don't match
    - Generate warning message for tampering
    - Ensure both currentHash and blockchainHash are in response
    - _Requirements: 8.1, 8.2, 8.4_

  - [ ]* 13.4 Write property tests for tampering detection
    - **Property 28: Tampering Warning**
    - **Property 29: Tampering Event Logging**
    - **Property 30: Verification Response Completeness**
    - **Property 31: Tampered Evidence Deletion Prevention**
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.5, 9.4**
    - Test warning message is included
    - Test tampering events are logged
    - Test both hashes are in response

- [ ] 14. Dashboard and statistics
  - [ ] 14.1 Implement GET /api/dashboard/stats endpoint
    - Require authentication middleware
    - Calculate totalEvidence count for officer (or all if admin)
    - Calculate verifiedLast30Days count (last 30 days)
    - Calculate tamperedEvidence count (verificationStatus='tampered')
    - Retrieve recent activity logs (last 10 entries)
    - Return statistics object
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 14.2 Write property tests for dashboard statistics
    - **Property 36: Dashboard Evidence Count**
    - **Property 37: Dashboard Verified Count**
    - **Property 38: Dashboard Tampered Count**
    - **Property 39: Dashboard Recent Activity**
    - **Property 40: Admin Dashboard Statistics**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
    - Test counts are accurate
    - Test admin sees system-wide stats
    - Test recent activity is correct

  - [ ] 14.3 Implement GET /api/dashboard/tampered endpoint
    - Require authentication middleware
    - Find all evidence with isTampered=true
    - Filter by officer (unless admin)
    - Return list of tampered evidence
    - _Requirements: 8.5_

  - [ ] 14.4 Implement GET /api/dashboard/recent-activity endpoint
    - Require authentication middleware
    - Find activity logs for officer (or all if admin)
    - Sort by timestamp descending
    - Limit to specified count (default 10)
    - Return activity log entries
    - _Requirements: 9.7_

  - [ ]* 14.5 Write property tests for activity log access
    - **Property 35: Admin Activity Log Access**
    - **Validates: Requirements 9.7**
    - Test admins see all logs
    - Test officers see only their logs

- [ ] 15. Search functionality
  - [ ] 15.1 Implement POST /api/evidence/search endpoint
    - Require authentication middleware
    - Accept search parameters: filename, caseId, startDate, endDate, evidenceType, verificationStatus, page, limit
    - Build MongoDB query with filters
    - Filter by uploadedBy (unless admin)
    - Implement filename partial match (case-insensitive)
    - Implement case ID exact match
    - Implement date range filtering
    - Implement pagination
    - Return search results with pagination metadata
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 15.2 Write property tests for search
    - **Property 49: Filename Search**
    - **Property 50: Case ID Search**
    - **Property 51: Date Range Search**
    - **Property 52: Search Permission Filtering**
    - **Property 53: Search Result Format Consistency**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5**
    - Test filename search works correctly
    - Test case ID search is exact match
    - Test date range filtering
    - Test permission filtering

- [ ] 16. Blockchain transaction tracking
  - [ ] 16.1 Add blockchain explorer URL generation
    - Create helper function to generate explorer URL
    - Use transaction ID and configured network
    - Support multiple networks (mainnet, Sepolia, Goerli)
    - _Requirements: 12.2, 12.3_

  - [ ]* 16.2 Write unit tests for blockchain tracking
    - **Property 46: Blockchain Explorer Link**
    - **Property 48: Evidence Details Blockchain Timestamp**
    - **Validates: Requirements 12.2, 12.5**
    - Test explorer URL format is correct
    - Test timestamp is included

  - [ ] 16.3 Update evidence details endpoint to include explorer link
    - Add blockchainExplorerUrl to response
    - Add blockchainTimestamp to response
    - _Requirements: 12.2, 12.5_

- [ ] 17. Error handling and recovery
  - [ ] 17.1 Create centralized error handling middleware
    - Implement error handler middleware
    - Categorize errors (client 4xx vs server 5xx)
    - Format error responses consistently
    - Include error code, message, details, timestamp
    - Log all errors with context
    - Sanitize sensitive data from logs
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [ ]* 17.2 Write property tests for error handling
    - **Property 56: Error Logging**
    - **Property 57: HTTP Status Code Correctness**
    - **Validates: Requirements 15.5, 15.6**
    - Test errors are logged
    - Test status codes are correct

  - [ ] 17.3 Implement specific error handlers
    - Create custom error classes (ValidationError, AuthenticationError, BlockchainError, etc.)
    - Implement error response formatting
    - Add error codes for all error types
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [ ] 17.4 Implement rollback procedures
    - Add file cleanup on blockchain failure
    - Add transaction rollback on database errors
    - Ensure no partial records are created
    - _Requirements: 3.6, 5.5_

- [ ] 18. Checkpoint - Core functionality complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Integration and wiring
  - [ ] 19.1 Create main Express application
    - Initialize Express app
    - Configure middleware (body-parser, cors, helmet)
    - Set up static file serving for uploads
    - Configure error handling middleware
    - _Requirements: Application setup_

  - [ ] 19.2 Wire all routes to Express app
    - Mount /api/auth routes
    - Mount /api/evidence routes
    - Mount /api/registry routes
    - Mount /api/dashboard routes
    - Add 404 handler for unknown routes
    - _Requirements: API structure_

  - [ ] 19.3 Create database connection module
    - Initialize MongoDB connection with Mongoose
    - Handle connection errors
    - Implement connection retry logic
    - Export connection instance
    - _Requirements: Database setup_

  - [ ] 19.4 Create server entry point
    - Import and configure Express app
    - Connect to MongoDB
    - Initialize blockchain connection
    - Start server on configured port
    - Handle graceful shutdown
    - _Requirements: Application startup_

  - [ ]* 19.5 Write integration tests for complete flows
    - Test registration → login → upload → verify flow
    - Test tampering detection flow
    - Test search and download flow
    - Test admin operations flow

- [ ] 20. Environment configuration and deployment preparation
  - [ ] 20.1 Create comprehensive .env.example
    - Document all required environment variables
    - Include examples for different networks
    - Add comments explaining each variable
    - _Requirements: Configuration_

  - [ ] 20.2 Create README.md with setup instructions
    - Document installation steps
    - Document environment configuration
    - Document API endpoints
    - Document testing procedures
    - _Requirements: Documentation_

  - [ ] 20.3 Add input validation and sanitization
    - Validate all request bodies with express-validator
    - Sanitize user inputs to prevent injection
    - Add rate limiting for API endpoints
    - _Requirements: Security_

  - [ ] 20.4 Implement security best practices
    - Add helmet middleware for security headers
    - Configure CORS appropriately
    - Implement request logging
    - Add rate limiting with express-rate-limit
    - _Requirements: Security_

- [ ] 21. Final checkpoint and testing
  - [ ] 21.1 Run complete test suite
    - Execute all unit tests
    - Execute all property tests (minimum 100 iterations each)
    - Execute all integration tests
    - Generate coverage report (target 80%+ coverage)
    - _Requirements: Testing_

  - [ ] 21.2 Manual testing checklist
    - Test registration with valid/invalid police IDs
    - Test login and token expiration
    - Test evidence upload with various file types and sizes
    - Test verification with unmodified and modified files
    - Test search functionality
    - Test dashboard statistics
    - Test admin vs non-admin permissions
    - _Requirements: Quality assurance_

  - [ ] 21.3 Review and fix any failing tests
    - Address any test failures
    - Fix any bugs discovered during testing
    - Ensure all 57 correctness properties pass
    - _Requirements: Quality assurance_

- [ ] 22. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- All 57 correctness properties from the design document are covered by property test tasks
- The implementation follows the architecture and design specifications exactly
- Blockchain integration includes retry logic and rollback procedures for reliability
- Security is built in from the start with JWT authentication, password hashing, and input validation
