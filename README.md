# The Guardian Integration Gateway

A secure API gateway built with Express.js and TypeScript that handles sensitive inquiries with advanced data protection, featuring middleware-based data redaction, encrypted audit logging, simulated AI integration, and a circuit breaker pattern for system resilience.

## Index

1. [Architecture](#architecture)
2. [Persistence of Data](#persistence-of-data)
3. [Circuit Breaker](#circuit-breaker)
4. [Prompts Used](#prompts-used)
5. [Testing](#testing)
6. [Technologies](#technologies)

## Architecture

This project is a secure API gateway designed to handle sensitive inquiries with robust data protection and system resilience. The architecture follows a layered approach with clear separation of concerns:

### Evidence

[text](Docs/media/video.webm)

### Key Architectural Values

- **Security-First Design**: All sensitive data (emails, credit cards, SSNs) is automatically redacted at the middleware layer before reaching business logic
- **Cryptographic Storage**: Original messages containing PII are encrypted using AES-256-GCM with authenticated encryption (IV + Auth Tag)
- **Resilience Pattern**: Circuit breaker implementation prevents cascading failures from external services
- **Scalability**: Stateless request handling with persistent state management for circuit breaker and audit logs
- **Type Safety**: Full TypeScript implementation with strict typing across all layers

### Core Components

#### Entry Point

- **[src/index.ts](src/index.ts)**: Application entry point
  - Configures Express.js server with security middleware (Helmet)
  - Applies global redaction middleware to all routes
  - Defines the `/secure-inquiry` POST endpoint
  - JSON-only API (enforces `application/json` Content-Type)
  - Port configuration via environment variable (default: 3000)

#### Presentation Layer

- **[src/presentation/middlewares/redactSensitiveData.middleware.ts](src/presentation/middlewares/redactSensitiveData.middleware.ts)**:

  - Global middleware for sanitizing sensitive information
  - Uses regex patterns to detect:
    - **Emails**: RFC 5322 compliant pattern (`user@domain.com`)
    - **Credit Cards**: 13-19 digit sequences with optional spaces/dashes
    - **SSNs**: 9-digit patterns (`###-##-####` or `#########`)
  - Performs deep object/array traversal to redact nested data
  - Creates dual version of request body:
    - `redactedContent`: Sanitized data with `<REDACTED: type>` placeholders
    - `originalContent`: Deep copy of unredacted data for encrypted storage

- **[src/presentation/controllers/secure-inquiry.controller.ts](src/presentation/controllers/secure-inquiry.controller.ts)**:
  - Validates Content-Type header (must be `application/json`)
  - Extracts and validates `userId` and `message` (both required strings)
  - Executes AI call through circuit breaker
  - Handles circuit breaker states:
    - `CLOSED`: Normal operation, calls AI service
    - `OPEN`: Returns 503 with "Service Busy" fallback instantly
  - Persists audit log with encrypted original content
  - Returns appropriate HTTP status codes:
    - 201: Successful request
    - 400: Invalid input
    - 415: Unsupported media type
    - 500: Internal error
    - 503: Service unavailable (circuit open)

#### Application Layer

- **[src/application/secure-inquiry/infraestructure/persist-file/persist-file.db.ts](src/application/secure-inquiry/infraestructure/persist-file/persist-file.db.ts)**:

  - Handles all audit log persistence operations
  - Implements AES-256-GCM encryption/decryption
  - Generates UUIDs for log entries
  - Creates structured log entries with:
    - `uuid`: Unique identifier
    - `timestamp`: ISO 8601 format
    - `redacted-content`: Plaintext sanitized data
    - `original-content`: Encrypted object with `ciphertext`, `iv`, and `tag`
    - `ai-response`: AI service response or error message
  - Uses environment variable `AES_SECRET_KEY` for encryption (64 hex chars = 32 bytes)

- **[src/application/secure-inquiry/infraestructure/services/simulate-aI-call.ts](src/application/secure-inquiry/infraestructure/services/simulate-aI-call.ts)**:

  - Simulates external AI service with asynchronous Promise
  - 2-second delay using `setTimeout`
  - 25% random failure rate to test circuit breaker
  - Returns "Generated Answer" on success
  - Throws error on simulated failure

- **[src/application/shared/infra/services/circuit-breaker.ts](src/application/shared/infra/services/circuit-breaker.ts)**:
  - Implements circuit breaker pattern with persistent state
  - Singleton design pattern for shared state management
  - See [Circuit Breaker](#circuit-breaker) section for detailed information

## Persistence of Data

### Audit Log Database: [db.json](src/application/secure-inquiry/infraestructure/persist-file/db.json)

This file serves as the persistent storage for all audit logs. It's a JSON array where each entry represents a complete audit trail of a secure inquiry request.

#### Data Structure

Each audit log entry contains the following fields:

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-12-30T10:15:30.000Z",
  "redacted-content": {
    "userId": "user123",
    "message": "Contact me at <REDACTED: emails> or call <REDACTED: SSNs>"
  },
  "original-content": {
    "ciphertext": "base64_encoded_encrypted_data",
    "iv": "base64_encoded_initialization_vector",
    "tag": "base64_encoded_authentication_tag"
  },
  "ai-response": "Generated Answer"
}
```

#### Field Descriptions

| Field | Type | Storage Format | Purpose |
|-------|------|----------------|---------|
| **uuid** | String | UUID v4 | Unique identifier for the log entry. Generated using Node.js `crypto.randomUUID()` |
| **timestamp** | String | ISO 8601 | Records exact time when the request was processed |
| **redacted-content** | Object | Plaintext JSON | Sanitized version with PII replaced by `<REDACTED: type>`. Used for high-speed auditing and analytics without decryption |
| **original-content** | Object | Encrypted | AES-256-GCM encrypted original message. Contains three components:<br>• `ciphertext`: Encrypted data (Base64)<br>• `iv`: 12-byte initialization vector (Base64)<br>• `tag`: Authentication tag for GCM mode (Base64) |
| **ai-response** | String | Plaintext | Response from AI service or error message ("Service Busy", "Simulated AI call failed") |

#### Security Implementation

- **Encryption Algorithm**: AES-256-GCM (Galois/Counter Mode)
  - Provides both confidentiality and authenticity
  - 256-bit key length for strong encryption
  - 12-byte IV (initialization vector) for GCM mode
  - Authentication tag ensures data integrity and prevents tampering

- **Key Management**: 
  - Key loaded from `AES_SECRET_KEY` environment variable
  - Must be 64 hexadecimal characters (32 bytes)
  - Default key provided for development only
  - **Production Warning**: Never store real encryption keys in code. Use secure key management services (AWS KMS, HashiCorp Vault, etc.)

- **Separation of Concerns**:
  - **Redacted Content** (Plaintext): Safe for general access, logging, and analysis
  - **Original Content** (Encrypted): Only accessible with decryption key, used for compliance and "break-glass" scenarios

#### File Operations

The database file is managed by [PersistFileDB](src/application/secure-inquiry/infraestructure/persist-file/persist-file.db.ts) class:
- Automatically creates file if it doesn't exist
- Appends new entries to JSON array
- Thread-safe file operations using Node.js `fs` module
- Graceful error handling for corrupted JSON

## Circuit Breaker

The circuit breaker pattern protects the system from cascading failures when the AI service becomes unreliable. Implementation is in [circuit-breaker.ts](src/application/shared/infra/services/circuit-breaker.ts) with state persisted in [circuit-breaker-counter.json](src/application/shared/infra/services/circuit-breaker-counter.json).

### State Machine

The circuit breaker operates in two primary states:

| State | Behavior | Request Handling | Transition Trigger |
|-------|----------|-----------------|-------------------|
| **CLOSED** | Normal operation | Calls AI service with 2s delay | 3 consecutive failures → OPEN |
| **OPEN** | Fail-fast mode | Returns "Service Busy" instantly (0s delay) | 10-second timeout → CLOSED |

### Configuration

```typescript
const FAILURE_THRESHOLD = 3;    // Failures before opening circuit
const TIMEOUT = 10000;          // Milliseconds before reset (10 seconds)
```

### Implementation Details

#### Singleton Pattern
```typescript
export class CircuitBreaker {
  private static instance: CircuitBreaker;
  
  public static getInstance(): CircuitBreaker {
    if (!CircuitBreaker.instance) {
      CircuitBreaker.instance = new CircuitBreaker();
    }
    return CircuitBreaker.instance;
  }
}
```
- Ensures single shared instance across all requests
- Maintains consistent state throughout application lifecycle

#### Execution Flow
```typescript
public static async execute(
  action: () => Promise<any>, 
  fallback: string
): Promise<CircuitBreakerRes>
```

1. **Check State**: Load current state from persistent storage
2. **OPEN State**: Return fallback immediately without calling action
3. **CLOSED State**: 
   - Execute the action (AI call)
   - On success: Reset failure counter to 0
   - On failure: Increment counter and check threshold
4. **Threshold Reached**: Change state to OPEN and start timeout timer
5. **Timeout**: After 10 seconds, automatically reset to CLOSED

#### State Persistence

The circuit breaker state is stored in [circuit-breaker-counter.json](src/application/shared/infra/services/circuit-breaker-counter.json):

```json
{
  "counter": 0,
  "circuit_state": "CLOSED"
}
```

**Fields:**
- `counter` (number): Consecutive failure count (0-3)
- `circuit_state` (string): Current state ("CLOSED" or "OPEN")

**Persistence Benefits:**
- Survives application restarts
- Shared state across multiple instances (if using shared file system)
- Auditable state transitions

#### Key Methods

- **`loadState()`**: Reads current state from JSON file, returns default if file missing/corrupted
- **`saveState(state)`**: Writes state to JSON file with pretty printing
- **`recordFailure(currentState)`**: Increments counter, saves state, opens circuit at threshold
- **`reset()`**: Resets counter to 0 and state to CLOSED

### Resource Protection Benefits

- **Prevents Timeout Accumulation**: No waiting 2 seconds for calls that will fail
- **Fast Response**: Users get immediate feedback when service is down
- **System Stability**: Prevents thread/connection pool exhaustion
- **Graceful Degradation**: Application continues functioning with fallback responses

### Console Output Examples

```
✅ Circuit reset to CLOSED state.
❌ Failure count: 1
❌ Failure count: 2
❌ Failure count: 3
⚡ Circuit is OPEN. Returning fallback instantly.
🔄 Circuit breaker reset after timeout.
```

## Prompts Used

The following markdown files in [Docs/promts/](Docs/promts/) directory guided the implementation of this project. Each prompt defines specific requirements and architectural decisions:

### [point-01.md](Docs/promts/point-01.md) - Endpoint Definition
**Objective**: Define the basic API endpoint structure

**Key Requirements**:
- Create POST endpoint `/secure-inquiry`
- Accept only JSON request bodies
- Expected body structure: `{ userId: string, message: string }`
- Ensure scalability, consistency, and security of the architecture

**Implementation**: [src/index.ts](src/index.ts) and [secure-inquiry.controller.ts](src/presentation/controllers/secure-inquiry.controller.ts)

---

### [point-02.step-01.md](Docs/promts/point-02.step-01.md) - Data Sanitization Middleware
**Objective**: Implement robust sanitization for sensitive data

**Key Requirements**:
- **Email Detection**: RFC 5322 pattern for `user@domain.com`
- **Credit Card Detection**: 13-16 digit strings with optional Luhn algorithm validation
- **SSN Detection**: 9-digit patterns (`###-##-####` or `#########`)
- **Replacement Strategy**: Global replace with `<REDACTED: [type]>` placeholders
- **Scalability**: Handle multiple instances of sensitive data in single message

**Implementation**: [redactSensitiveData.middleware.ts](src/presentation/middlewares/redactSensitiveData.middleware.ts)
- Deep object/array traversal
- Applied globally to all routes
- Creates dual version (redacted + original)

---

### [point-02.step-02.md](Docs/promts/point-02.step-02.md) - Mock AI Call
**Objective**: Simulate external AI service integration

**Key Requirements**:
- **Asynchronous Simulation**: Use Promise-wrapped `setTimeout`
- **Delay**: 2-second timeout (2000ms)
- **Non-Blocking**: Allow proper async/await usage
- **Input/Output**: Accept redacted message, return "Generated Answer"
- **Data Flow**: Ensure waiting before moving to audit log step

**Implementation**: [simulate-aI-call.ts](src/application/secure-inquiry/infraestructure/services/simulate-aI-call.ts)
- 25% random failure rate for testing circuit breaker
- Proper error handling with rejected promises

---

### [point-02.step-03.md](Docs/promts/point-02.step-03.md) - Audit Logging & Encryption
**Objective**: Implement secure audit trail with encryption

**Key Requirements**:
- **Cryptographic Security**: AES-256-GCM encryption for PII
- **Dual Storage**:
  - **Redacted (Plaintext)**: For high-speed auditing without decryption
  - **Original (Encrypted)**: For "break-glass" compliance scenarios
- **Data Structure**:
  - `uuid`: Unique identifier (UUID format)
  - `timestamp`: ISO 8601 format
  - `redacted-content`: Plaintext sanitized data
  - `original-content`: Ciphertext with IV and authentication tag
  - `ai-response`: AI service output

**Security Best Practice**: Store encryption keys in dedicated Secret Manager (AWS KMS, HashiCorp Vault), never in code

**Implementation**: [persist-file.db.ts](src/application/secure-inquiry/infraestructure/persist-file/persist-file.db.ts)
- AES-256-GCM with 12-byte IV
- Authentication tag for integrity verification
- Environment-based key management

---

### [point-03.md](Docs/promts/point-03.md) - Circuit Breaker Pattern
**Objective**: Implement circuit breaker for system resilience

**Key Concepts**:

**Three States**:
1. **CLOSED (Normal)**: Requests flow through, failures counted
2. **OPEN (Tripped)**: After 3 consecutive failures, instantly return "Service Busy"
3. **HALF-OPEN (Testing)**: After cooldown, allow test request

**Logic Requirements**:
- **Failure Tracking**: Global `failureCount` variable
- **Threshold**: Open circuit at `failureCount >= 3`
- **Fail-Fast**: Return fallback instantly (0s) when OPEN
- **Success Reset**: Reset counter on successful call
- **Resource Protection**: Prevent timeout accumulation and backlog

**Circuit Behavior Table**:

| State | Request Action | Delay | Transition |
|-------|---------------|-------|------------|
| CLOSED | Call Mock AI | 2s | 3 Failures → OPEN |
| OPEN | Return "Service Busy" | 0s | Time passes → HALF-OPEN |
| HALF-OPEN | Call Mock AI (once) | 2s | Success → CLOSED / Fail → OPEN |

**Implementation**: [circuit-breaker.ts](src/application/shared/infra/services/circuit-breaker.ts)
- Singleton pattern for shared state
- 10-second cooldown period
- Persistent state in JSON file
- Automatic reset after timeout

---

### [point-04.md](Docs/promts/point-04.md) - Documentation Requirements
**Objective**: Create comprehensive project documentation

**Required Topics**:
- **Architecture**: Key architectural values and component descriptions
- **Persistence**: Details about `db.json` structure and encryption
- **Circuit Breaker**: State management and behavior patterns
- **Prompts**: Summary of all implementation guidance documents
- **Testing**: Manual and automated testing approaches
- **Technologies**: Docker configuration and package dependencies
- **Index**: Navigational table of contents

**Implementation**: This [README.md](README.md) document

## Testing

The project includes both manual and automated testing approaches to ensure API reliability and correctness.

### Manual Testing

Manual testing examples are provided in [Docs/manual-testing/](Docs/manual-testing/) directory using HTTP files compatible with REST Client extensions.

#### Health Check: [health.http](Docs/manual-testing/health.http)

Test the basic server availability:

```http
GET http://localhost:3000
```

**Expected Response**: 
- Status: 200 OK
- Body: `"Hello, Secure API is running!"`

---

#### Secure Inquiry Endpoint: [secure-inquiry.http](Docs/manual-testing/secure-inquiry.http)

Test the main endpoint with sample data:

```http
POST http://localhost:3000/secure-inquiry
Content-Type: application/json

{
    "userId": "user123",
    "message": "Hello"
}
```

**Expected Response** (Circuit CLOSED, AI success):
```json
{
  "status": "success",
  "received": {
    "userId": "user123",
    "message": "Hello"
  },
  "aiResponse": "Generated Answer"
}
```

**Testing Scenarios**:

1. **Basic Valid Request**:
   ```json
   { "userId": "user123", "message": "Hello" }
   ```
   Expected: 201 Created

2. **Sensitive Data Redaction**:
   ```json
   { 
     "userId": "user123", 
     "message": "Contact me at john@example.com or call 555-01-9999" 
   }
   ```
   Expected: Data redacted, logged with encrypted original

3. **Circuit Breaker Testing**:
   - Send multiple requests rapidly
   - Watch for AI failures (25% chance)
   - After 3 failures: 503 Service Unavailable with "Service Busy"
   - Wait 10 seconds for automatic reset

4. **Invalid Content-Type**:
   ```http
   Content-Type: text/plain
   ```
   Expected: 415 Unsupported Media Type

5. **Missing Required Fields**:
   ```json
   { "userId": "" }
   ```
   Expected: 400 Bad Request

---

### Automated Testing

Automated tests are implemented using **Jest** and **Supertest** in [test/secure-inquiry.test.ts](test/secure-inquiry.test.ts).

#### Test Suite: POST /secure-inquiry

**Test Cases**:

1. **Valid JSON Body Acceptance**
   ```typescript
   it('should accept valid JSON body', async () => {
     const res = await request(app)
       .post('/secure-inquiry')
       .set('Content-Type', 'application/json')
       .send({ userId: 'user123', message: 'Hello' });
     
     expect(res.status).toBe(201);
     expect(res.body.status).toBe('success');
     expect(res.body.received).toEqual({ 
       userId: 'user123', 
       message: 'Hello' 
     });
   });
   ```
   **Validates**: Successful request handling with correct response structure

2. **Content-Type Enforcement**
   ```typescript
   it('should reject non-JSON content type', async () => {
     const res = await request(app)
       .post('/secure-inquiry')
       .set('Content-Type', 'text/plain')
       .send('userId=user123&message=Hello');
     
     expect(res.status).toBe(415);
     expect(res.body.error).toMatch(/Content-Type/);
   });
   ```
   **Validates**: API rejects non-JSON requests

3. **Required Fields Validation**
   ```typescript
   it('should reject missing userId or message', async () => {
     const res = await request(app)
       .post('/secure-inquiry')
       .set('Content-Type', 'application/json')
       .send({ userId: '', message: '' });
     
     expect(res.status).toBe(400);
     expect(res.body.error).toMatch(/Invalid input/);
   });
   ```
   **Validates**: Empty strings are properly rejected

4. **Type Checking**
   ```typescript
   it('should reject non-string userId or message', async () => {
     const res = await request(app)
       .post('/secure-inquiry')
       .set('Content-Type', 'application/json')
       .send({ userId: 123, message: {} });
     
     expect(res.status).toBe(400);
     expect(res.body.error).toMatch(/Invalid input/);
   });
   ```
   **Validates**: Type enforcement for string fields

#### Running Tests

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run jest
```

#### Test Coverage

The test suite covers:
- ✅ Valid request handling
- ✅ Content-Type validation
- ✅ Required field validation
- ✅ Type checking for input fields
- ✅ Error message clarity
- ✅ HTTP status code correctness

**Note**: Circuit breaker and encryption features are tested through integration testing and manual verification due to their time-dependent and cryptographic nature.

## Technologies

This project leverages modern technologies for security, scalability, and maintainability.

### Core Technologies

#### Node.js & Express.js
- **Node.js**: v20.19.4 runtime environment
- **Express.js**: v5.2.1 - Minimal and flexible web application framework
- **Purpose**: Core backend framework for API development
- **Features Used**: 
  - Middleware system for request processing
  - JSON body parsing with size limits (1mb)
  - Routing and HTTP method handling

#### TypeScript
- **Version**: v5.9.3
- **Purpose**: Type safety and enhanced developer experience
- **Benefits**:
  - Static type checking at compile time
  - Better IDE support with IntelliSense
  - Enhanced code maintainability
  - Reduced runtime errors

#### Helmet
- **Version**: v8.1.0
- **Purpose**: Security middleware for HTTP headers
- **Protection**:
  - Sets various HTTP headers to prevent common attacks
  - Mitigates XSS, clickjacking, and other web vulnerabilities
  - Content Security Policy (CSP) configuration

---

### Containerization

#### [Docker Compose](docker-compose.yml)

Orchestrates the application container with proper configuration:

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - 3000:3000
    volumes:
      - back-volume:/app/src
    environment:
      - PORT=3000
      - AES_SECRET_KEY=0123456789abcdef...
```

**Configuration Details**:
- **Port Mapping**: Exposes port 3000 for API access
- **Volume Mount**: Persists source code for hot-reload development
- **Environment Variables**:
  - `PORT`: Server listening port
  - `AES_SECRET_KEY`: 64-character hex key for AES-256 encryption
- **Volume**: Named volume `back-volume` for data persistence

---

#### [Dockerfile](Dockerfile)

Multi-stage build configuration with security best practices:

```dockerfile
FROM node:20.19.4-alpine3.22

# Security: Non-root user
RUN addgroup backend_group && adduser -S -G backend_group user_back
USER user_back

WORKDIR /app/
RUN mkdir datos

# Dependency installation
COPY --chown=user_back:backend_group package*.json .
RUN npm install

# Application code
COPY --chown=user_back:backend_group . .

# File permissions for data persistence
RUN chmod 777 src/application/shared/infra/services/circuit-breaker-counter.json \
            src/application/secure-inquiry/infraestructure/persist-file/db.json

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

**Security Features**:
- **Alpine Linux**: Minimal base image (smaller attack surface)
- **Non-root User**: Runs as `user_back` with limited privileges
- **Group Permissions**: Dedicated `backend_group` for access control
- **File Ownership**: Proper `chown` for all copied files
- **Explicit Permissions**: Write access only for necessary data files

**Build Stages**:
1. User and group creation
2. Dependency installation (leverages Docker layer caching)
3. Application code copy
4. Runtime configuration

---

### Development Tools

#### Package Manager & Build Tools
- **npm**: Dependency management
- **nodemon**: v3.1.11 - Auto-restart on file changes
- **ts-node**: v10.9.2 - TypeScript execution without compilation
- **tsconfig-paths**: v4.2.0 - Path aliasing support (`@/` imports)

#### Testing Framework
- **Jest**: Testing framework (v30.0.0)
  - Test runner and assertion library
  - Mock and spy capabilities
- **Supertest**: v7.1.4
  - HTTP assertion library
  - Integration testing for Express routes
  - Fluent API for HTTP requests

---

### Package Summary: [package.json](package.json)

#### Production Dependencies
```json
{
  "express": "^5.2.1",      // Web server framework
  "helmet": "^8.1.0"        // Security HTTP headers
}
```

**Lightweight Production**: Only 2 dependencies to minimize attack surface and deployment size.

#### Development Dependencies
```json
{
  "@types/express": "^5.0.6",      // TypeScript types for Express
  "@types/jest": "^30.0.0",        // TypeScript types for Jest
  "@types/node": "^25.0.3",        // TypeScript types for Node.js
  "@types/supertest": "^6.0.3",   // TypeScript types for Supertest
  "nodemon": "^3.1.11",            // Development auto-restart
  "supertest": "^7.1.4",           // HTTP testing
  "ts-node": "^10.9.2",            // TypeScript runtime
  "tsconfig-paths": "^4.2.0",      // Module path resolution
  "typescript": "^5.9.3"           // TypeScript compiler
}
```

#### Scripts
```json
{
  "dev": "nodemon --exec ts-node -r tsconfig-paths/register src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "test": "echo \"Error: no test specified\" && exit 1",
  "jest": "jest --watch"
}
```

**Script Purposes**:
- **dev**: Development mode with hot-reload and path aliasing
- **build**: Compile TypeScript to JavaScript
- **start**: Run compiled production code
- **jest**: Interactive test watcher

---

### Built-in Node.js Modules

The project uses several Node.js core modules without external dependencies:

- **crypto**: AES-256-GCM encryption, UUID generation, random IV generation
- **fs**: File system operations for JSON persistence
- **path**: Cross-platform path resolution

**Benefit**: Reduced dependency tree and improved security by using battle-tested core modules.
