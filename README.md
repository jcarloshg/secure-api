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

<video src="Docs/media/video.webm" controls width="600">
  Your browser does not support the video tag.
</video>

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

### [db.json](src/application/secure-inquiry/infraestructure/persist-file/db.json)

This file acts as a mock database for audit logs. Each entry contains:

- `uuid`: Unique identifier
- `timestamp`: ISO 8601 timestamp
- `redacted-content`: Plaintext, sanitized message
- `original-content`: Encrypted (AES-256-GCM) original message (ciphertext, IV, tag)
- `ai-response`: The AI-generated or fallback response

**Security Note:** The encryption key is loaded from the `AES_SECRET_KEY` environment variable or a default value. Never store real keys in code for production.

### [circuit-breaker-counter.json](src/application/shared/infra/services/circuit-breaker-counter.json)

This file stores the state of the circuit breaker:

```
{
	"counter": 0,
	"circuit_state": "CLOSED"
}
```

It tracks consecutive AI call failures and the current state (`CLOSED` or `OPEN`).

## Prompts Used

The following markdown files in [Docs/promts/](Docs/promts) guided the implementation:

- **point-01.md**: Defines the endpoint and JSON body requirements.
- **point-02.step-01.md**: Details the sanitization middleware for emails, credit cards, and SSNs.
- **point-02.step-02.md**: Describes the simulated AI call with a 2-second delay.
- **point-02.step-03.md**: Specifies audit logging, encryption, and data structure.
- **point-03.md**: Outlines the circuit breaker pattern and its states.
- **point-04.md**: Summarizes documentation requirements and structure.

## Testing

Manual testing instructions and examples are provided in [Docs/manual-testing](Docs/manual-testing):

- **secure-inquiry.http**: Example POST request to `/secure-inquiry`:

  ```http
  POST http://localhost:3000/secure-inquiry
  Content-Type: application/json

  {
  		"userId": "user123",
  		"message": "Hello"
  }
  ```

- **health.http**: Health check for the root endpoint:
  ```http
  GET http://localhost:3000
  ```

Automated tests are in [test/secure-inquiry.test.ts](test/secure-inquiry.test.ts), covering:

- Valid/invalid JSON body
- Content-Type enforcement
- Required fields validation
- Type checking for `userId` and `message`

## Technologies

- **Node.js & Express.js**: Core backend framework.
- **TypeScript**: Type safety and modern JS features.
- **Helmet**: Security HTTP headers.
- **Docker & Docker Compose**: Containerization and orchestration.
  - [docker-compose.yml](docker-compose.yml): Defines the backend service, port mapping, environment variables, and volume for data persistence.
  - [Dockerfile](Dockerfile):
    - Uses Node.js Alpine image
    - Creates a non-root user
    - Installs dependencies
    - Sets permissions for data files
    - Runs the app with `npm run dev`
- **Jest & Supertest**: Testing framework and HTTP assertions.

### Notable Packages ([package.json](package.json))

- `express`: Web server
- `helmet`: Security middleware
- `nodemon`, `ts-node`, `typescript`: Development and TypeScript tooling
- `supertest`, `@types/*`: Testing and type definitions
