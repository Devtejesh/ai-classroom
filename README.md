
<div align="center">

# AI Classroom

### AI-Powered Learning Platform with Event-Driven Backend Architecture

Transform passive video learning into an interactive,
multilingual and AI-assisted educational experience.

![Go](https://img.shields.io/badge/Go-Backend-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Python](https://img.shields.io/badge/Python-AI_Engine-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

![Kafka](https://img.shields.io/badge/Apache_Kafka-231F20?style=for-the-badge&logo=apachekafka&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)

![Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=flat-square&logo=googlegemini&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-LLM_Inference-F55036?style=flat-square)
![JWT](https://img.shields.io/badge/JWT-Authentication-000000?style=flat-square&logo=jsonwebtokens)
![Whisper](https://img.shields.io/badge/Faster_Whisper-Speech_AI-6D28D9?style=flat-square)
![Status](https://img.shields.io/badge/Status-Active_Development-success?style=flat-square)

</div>

---

## Overview

AI Classroom is a full-stack AI-powered educational platform
designed to transform conventional video-based learning into
an interactive, personalized learning experience.

The platform combines contextual AI tutoring, multilingual
transcript processing, automated study-note generation,
speech processing, and learning-session management.

Built using a polyglot backend architecture with Go and Python,
AI Classroom separates business logic from AI inference workloads
and uses Apache Kafka to process long-running AI jobs asynchronously.

The system incorporates production-oriented engineering patterns
including persistent job scheduling, chunk-level checkpointing,
provider fallback, quota-aware retries, database concurrency
control, JWT authentication, and Prometheus observability.

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [AI Engineering](#ai-engineering)
- [Event-Driven Processing](#event-driven-processing)
- [Reliability and Fault Tolerance](#reliability-and-fault-tolerance)
- [Backend Engineering](#backend-engineering)
- [Database Architecture](#database-architecture)
- [Observability](#observability)
- [Authentication and Security](#authentication-and-security)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Engineering Decisions](#engineering-decisions)
- [Current Limitations](#current-limitations)
- [Roadmap](#roadmap)

---

## Problem Statement

Traditional video-based learning platforms provide educational
content but offer limited opportunities for students to interact
with the material.

Students frequently encounter challenges such as:

- Difficulty understanding complex concepts.
- Language barriers in educational videos.
- Lack of immediate clarification when doubts arise.
- Time-consuming manual preparation of study notes.
- Fragmented learning resources.
- Limited accessibility through voice-based interaction.

AI Classroom addresses these challenges by combining video
learning with contextual AI tutoring, multilingual processing,
and automated educational content generation within a unified
learning environment.

From an engineering perspective, the project also addresses
the challenges of integrating external AI providers, managing
long-running inference workloads, handling provider rate limits,
and preserving processing progress across failures.

---

## Key Features

### Intelligent AI Tutor

- Transcript-aware question answering.
- Contextual explanations based on video lessons.
- Support for follow-up questions.
- Structured Markdown responses.
- Mathematical explanations rendered using LaTeX and KaTeX.
- Configurable tutor identity.
- Support for English, Telugu, and Hindi.

### Interactive Video Learning

- YouTube lesson integration.
- Automatic retrieval of available video transcripts.
- Timestamp-aware transcript representation.
- Video and chat side-by-side learning interface.
- Dedicated video-only and chat-only modes.

### Automated Study Notes

- AI-generated educational notes from video transcripts.
- Chunk-based processing of lengthy educational content.
- Background note-generation jobs.
- Persistent job progress tracking.
- Automatic storage of completed notes in PostgreSQL.
- Markdown-based note previews.
- Text export and printable PDF support.
- Token-based note-sharing functionality.

### Multilingual Learning

- English, Telugu, and Hindi support.
- AI-powered transcript translation.
- Background translation processing.
- Preservation of transcript timestamps during translation.
- Language-aware AI tutor responses.

### Voice-Enabled Learning

- Browser-based speech recognition.
- Voice input for student questions.
- Gemini-powered text-to-speech.
- Audio playback of AI tutor responses.
- Faster Whisper-based audio processing.
- CPU-oriented speech model configuration.

### Learning Management

- User registration and authentication.
- Email verification using OTP.
- Password recovery.
- Persistent learning sessions.
- Saved study notes.
- Personal learning history interface.
- User profile management.

### Asynchronous AI Processing

- Apache Kafka-based job dispatch.
- Background AI job workers.
- Persistent job scheduling.
- Chunk-level progress tracking.
- Automatic retries.
- Provider quota management.
- Duplicate job prevention.
- Resumable AI processing.

---

## Technology Stack

### Backend and API Engineering

| Technology | Purpose |
|---|---|
| Go | Business logic and application APIs |
| Gin | HTTP routing and middleware |
| Python | AI inference and background processing |
| FastAPI | AI service REST APIs |
| Uvicorn | ASGI application server |
| Pydantic | AI request schemas and validation |
| REST APIs | Communication between application components |

### Artificial Intelligence and Speech Processing

| Technology | Purpose |
|---|---|
| Google Gemini | LLM-powered tutoring and content generation |
| Groq | Alternative LLM inference provider |
| Google GenAI SDK | Gemini model integration |
| Groq SDK | Groq model integration |
| Faster Whisper | Audio transcription and translation |
| Gemini TTS | AI-generated speech |
| YouTube Transcript API | Educational transcript retrieval |
| Prompt Engineering | Contextual explanations and educational content generation |
| Browser Speech Recognition | Voice-based question input |

### Messaging and Background Processing

| Technology | Purpose |
|---|---|
| Apache Kafka 3.9.1 | Event-driven AI job processing |
| KRaft | Kafka metadata and controller management |
| Confluent Kafka Python | Kafka producer and consumer implementation |
| Python Threading | Background scheduler execution |
| PostgreSQL Job Queue | Persistent job state and retry scheduling |

### Database and Persistence

| Technology | Purpose |
|---|---|
| PostgreSQL | Relational application storage |
| JSONB | Transcript chunks and AI-generated results |
| database/sql | Go database abstraction |
| lib/pq | PostgreSQL driver for Go |
| Psycopg 3 | PostgreSQL integration for Python workers |
| SQL Migrations | Version-controlled database schema |
| Row-Level Locking | Concurrent job-processing coordination |

### Frontend Engineering

| Technology | Purpose |
|---|---|
| React | Interactive learning interface |
| TypeScript | Type-safe frontend development |
| Vite | Development server and build tooling |
| CSS | Responsive interface design |
| React Markdown | Structured AI response rendering |
| KaTeX | Mathematical notation rendering |
| Remark Math | Markdown mathematical expression parsing |
| Rehype KaTeX | Mathematical HTML rendering |

### Security and Authentication

| Technology | Purpose |
|---|---|
| JWT | Token-based authentication |
| HMAC | OTP protection |
| Go Crypto | Cryptographic application operations |
| Resend | Email verification and recovery messages |
| CORS | Browser cross-origin access configuration |
| Environment Variables | Runtime configuration and secret management |

### Infrastructure and Observability

| Technology | Purpose |
|---|---|
| Docker | Containerized Kafka infrastructure |
| Docker Compose | Local infrastructure configuration |
| Prometheus | Application metrics collection |
| Prometheus Go Client | HTTP metrics instrumentation |
| Git and GitHub | Version control and collaboration |

---

## System Architecture

AI Classroom uses a service-oriented architecture that separates
application APIs, AI workloads, messaging infrastructure,
and persistent storage.

```mermaid
flowchart TB
    User["Student / User"]

    subgraph Frontend["Presentation Layer"]
        React["React + TypeScript"]
        Video["YouTube Player"]
        Chat["AI Tutor"]
        Notes["Notes Workspace"]
    end

    subgraph Backend["Application Backend"]
        Go["Go + Gin REST API"]
        Auth["JWT and OTP Authentication"]
        Learning["Learning Services"]
        Jobs["AI Job Management"]
        Metrics["Prometheus Middleware"]
    end

    subgraph AI["AI Service Layer"]
        FastAPI["Python + FastAPI"]
        Tutor["Contextual AI Tutor"]
        Transcript["Transcript Processing"]
        Speech["Speech Processing"]
        Router["LLM Provider Router"]
    end

    subgraph Async["Asynchronous Processing"]
        Scheduler["Job Scheduler"]
        Producer["Kafka Producer"]
        Kafka["Apache Kafka / KRaft"]
        Consumer["Kafka Consumer"]
        Worker["AI Job Worker"]
    end

    subgraph Providers["External AI Providers"]
        Gemini["Google Gemini"]
        Groq["Groq"]
    end

    DB[("PostgreSQL")]
    Prometheus["Prometheus"]
    Email["Resend Email API"]

    User --> React
    React --> Video
    React --> Chat
    React --> Notes

    React --> Go
    React --> FastAPI

    Go --> Auth
    Go --> Learning
    Go --> Jobs

    Auth --> Email
    Auth --> DB
    Learning --> DB
    Jobs --> DB

    FastAPI --> Tutor
    FastAPI --> Transcript
    FastAPI --> Speech
    Tutor --> Router
    Speech --> Gemini

    Scheduler --> DB
    Scheduler --> Producer
    Producer --> Kafka
    Kafka --> Consumer
    Consumer --> Worker

    Worker --> Router
    Worker --> DB

    Router --> Gemini
    Router --> Groq

    Go --> Metrics
    Prometheus --> Metrics
```

### Architectural Responsibilities

| Component | Responsibility |
|---|---|
| React Frontend | User interaction and learning experience |
| Go Backend | Authentication, sessions, notes, and job-management APIs |
| Python AI Engine | AI inference, transcription, translation, and speech |
| PostgreSQL | Persistent application and AI-job state |
| Kafka | Asynchronous job-event delivery |
| Scheduler | Dispatch of eligible and retryable AI jobs |
| Worker | AI chunk processing and checkpoint persistence |
| Prometheus | Backend request and latency monitoring |

This separation allows AI-specific workloads to evolve
independently from application business logic.

---

## AI Engineering

### Multi-Provider LLM Integration

The AI engine supports multiple inference providers through
a shared response-generation interface.

Supported providers:

- Google Gemini.
- Groq.

The primary provider is configurable through environment
variables.

If the primary provider fails, the system can attempt
another configured provider.

```mermaid
flowchart TD
    A["AI Request"] --> B["Prompt Construction"]
    B --> C["LLM Provider Router"]
    C --> D["Configured Primary Provider"]
    D --> E{"Successful Response?"}
    E -->|Yes| F["Return AI Response"]
    E -->|No| G["Alternative Provider"]
    G --> H{"Successful Response?"}
    H -->|Yes| F
    H -->|No| I["Error / Retry Handling"]
```

### Contextual Prompt Engineering

The tutoring pipeline constructs prompts using:

- Student questions.
- Video transcript content.
- Transcript timestamps.
- Selected response language.
- Recent conversation context supplied by the frontend.
- Structured educational response instructions.

The tutor is designed to explain concepts rather than simply
repeat or summarize transcript content.

Prompt instructions encourage:

- Step-by-step reasoning.
- Practical examples.
- Beginner-friendly explanations.
- Preservation of mathematical expressions.
- Clear distinction between transcript content and
  additional model-generated knowledge.

The current contextual tutoring implementation uses
prompt-based transcript context injection rather than a
vector-database-backed RAG pipeline.

### Mathematical Content Rendering

AI responses support mathematical notation through:

- Markdown.
- Inline LaTeX.
- Block LaTeX.
- KaTeX rendering.
- Structured educational explanations.

This makes the platform suitable for technical and
mathematical learning content.

### Speech Processing

The speech-processing layer integrates:

- Faster Whisper for audio processing.
- CPU-based inference using INT8 computation.
- Voice activity detection.
- Timestamped transcription segments.
- Gemini text-to-speech.
- Browser speech recognition for user input.

The current Faster Whisper implementation includes a
Hindi-to-English audio translation workflow.

---

## Event-Driven Processing

Long-running AI operations such as note generation and
transcript translation are handled asynchronously.

Instead of keeping an HTTP request open throughout multiple
LLM calls, the backend persists an AI job and delegates
processing to background components.

### AI Job Execution Pipeline

```mermaid
sequenceDiagram
    participant U as React Frontend
    participant G as Go Backend
    participant D as PostgreSQL
    participant S as Scheduler
    participant K as Kafka
    participant W as AI Worker
    participant L as LLM Provider

    U->>G: Submit AI job
    G->>G: Validate and prepare chunks
    G->>D: Persist job
    G-->>U: Return job ID

    loop Until all chunks are processed
        S->>D: Find eligible jobs
        D-->>S: Job ID and next chunk
        S->>K: Publish chunk event
        K->>W: Consume event
        W->>D: Lock and validate job
        W->>L: Generate or translate chunk
        L-->>W: AI result
        W->>D: Save checkpoint and commit
        W->>K: Commit consumer offset
    end

    U->>G: Poll job status
    G->>D: Retrieve progress
    G-->>U: Return completed result
```

### Job Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Queued
    Queued --> Processing
    Processing --> Processing: More chunks
    Processing --> WaitingForQuota: Provider quota exceeded
    WaitingForQuota --> Processing: Cooldown expires
    Processing --> Queued: Retryable failure
    Processing --> Failed: Permanent failure or retry limit
    Processing --> Completed: Final checkpoint
    Completed --> [*]
    Failed --> [*]
```

### Kafka Configuration

| Configuration | Implementation |
|---|---|
| Kafka Version | 3.9.1 |
| Controller Mode | KRaft |
| Default Topic | ai.chunks.process |
| Default Consumer Group | ai-classroom-worker |
| Producer Idempotence | Enabled |
| Producer Acknowledgment | all |
| Producer Retries | 5 |
| Consumer Auto Commit | Disabled |
| Offset Commit | Manual and synchronous |
| Initial Offset Policy | earliest |
| Message Key | AI Job ID |
| Local Replication Factor | 1 |

The current Kafka topology is intended for local
development and does not provide multi-broker
high availability.

### Kafka Event Structure

```json
{
  "id": 42,
  "chunk": 3
}
```

Kafka messages carry lightweight job references rather than
complete transcripts or generated notes.

The complete processing state remains in PostgreSQL.

This approach keeps message payloads small and enables
the database to remain the authoritative job-state store.

---

## Reliability and Fault Tolerance

### 1. Persistent Job State

AI jobs are stored in PostgreSQL with:

- Current status.
- Input hash.
- Transcript chunks.
- Generated results.
- Next chunk index.
- Retry attempt count.
- Next retry timestamp.
- Dispatch lease expiration.
- Error information.

Job progress is not maintained solely in process memory.

### 2. Chunk-Level Checkpointing

Large AI workloads are divided into smaller processing units.

After a successful chunk:

1. The generated result is persisted.
2. The next chunk index is advanced.
3. Progress is recorded in PostgreSQL.
4. The transaction is committed.
5. The Kafka consumer offset is committed.

This design allows processing to resume from the last
successfully persisted checkpoint.

### 3. Duplicate Job Prevention

The database uses an input hash and a composite unique
constraint across:

- User ID.
- Learning session ID.
- Job type.
- Target language.
- Input hash.

This prevents identical job submissions from creating
independent duplicate database records.

Workers additionally validate the requested chunk index
against the persisted checkpoint to skip stale events.

### 4. Database Concurrency Control

The scheduler uses PostgreSQL:

```sql
FOR UPDATE SKIP LOCKED
```

This allows eligible job records to be claimed without
waiting on rows already locked by another transaction.

The worker uses:

```sql
FOR UPDATE
```

to coordinate processing of an individual job.

These mechanisms help protect job state against conflicting
concurrent modifications.

### 5. Dispatch Lease Management

The scheduler assigns a time-limited dispatch lease
before publishing eligible work to Kafka.

If publishing fails, the lease can be released for
subsequent scheduling.

Expired leases allow eligible jobs to be redispatched.

| Scheduler Setting | Current Value |
|---|---:|
| Polling interval | 3 seconds |
| Dispatch lease | 600 seconds |
| Maximum jobs per scheduling batch | 20 |
| Maximum processing retries | 5 |

### 6. Exponential Backoff

Temporary processing failures are retried using
a bounded exponential-backoff strategy.

```python
delay = min(900, 30 * (2 ** attempts))
```

Retry eligibility is persisted in PostgreSQL rather than
depending on an in-memory timer.

Permanent failures are handled separately.

### 7. Provider Quota Management

Background AI processing detects provider quota failures
and records provider cooldown timestamps.

Provider cooldowns are persisted in a dedicated
database table.

When AI providers are temporarily unavailable:

- Jobs transition to a waiting-for-quota state.
- Retry timestamps are persisted.
- The scheduler identifies jobs when they become eligible.
- Processing resumes from the existing checkpoint.

This reduces unnecessary retry attempts against providers
that have temporarily exhausted their available quota.

### 8. Message Processing Semantics

The Kafka consumer disables automatic offset commits.

Offsets are committed only after the job-processing
function returns successfully following database
transaction completion.

If an unexpected processing failure occurs, the consumer
stops rather than intentionally committing past the
failed message.

The architecture is designed around at-least-once
processing with database-level duplicate protection.

It does not claim end-to-end exactly-once execution of
external LLM requests.

---

## Backend Engineering

The Go backend uses a layered architecture.

```mermaid
flowchart TD
    Client["HTTP Client"]
    Routes["Router"]
    Middleware["Authentication and Metrics Middleware"]
    Handler["HTTP Handler"]
    Service["Business Service"]
    Repository["Data Repository"]
    Database[("PostgreSQL")]

    Client --> Routes
    Routes --> Middleware
    Middleware --> Handler
    Handler --> Service
    Service --> Repository
    Repository --> Database
```

### Layer Responsibilities

| Layer | Responsibility |
|---|---|
| Routes | Endpoint registration |
| Middleware | Authentication and observability |
| Handlers | HTTP request processing and responses |
| Services | Business logic |
| Repositories | Database operations |
| Models | Application data structures |
| Config | Runtime configuration |
| Database | Connection and migration management |

The AI job-management handler currently performs job-specific
database operations directly.

The remaining layered components provide separation of
concerns and make application functionality easier
to maintain and extend.

---

## Database Architecture

PostgreSQL stores application data and asynchronous AI-job state.

### Core Tables

| Table | Purpose |
|---|---|
| users | User accounts |
| email_otps | Email verification and recovery OTPs |
| learning_sessions | Video-based learning sessions |
| saved_notes | Educational notes and sharing metadata |
| saved_questions | Stored question schema |
| ai_jobs | Persistent asynchronous processing state |
| ai_provider_cooldowns | AI provider retry eligibility |
| schema_migrations | Applied database migration tracking |

### Core Relationships

```mermaid
erDiagram
    USERS ||--o{ EMAIL_OTPS : has
    USERS ||--o{ LEARNING_SESSIONS : creates
    USERS ||--o{ SAVED_NOTES : owns
    USERS ||--o{ AI_JOBS : submits
    LEARNING_SESSIONS ||--o{ SAVED_NOTES : contains
    LEARNING_SESSIONS ||--o{ AI_JOBS : generates
    SAVED_NOTES o|--o{ AI_JOBS : result
```

### Database Engineering Highlights

- Version-controlled SQL migrations.
- Transactional migration execution.
- Foreign-key constraints.
- Composite unique constraints.
- JSONB storage for flexible AI workloads.
- Partial indexing for eligible AI jobs.
- Row-level locking.
- Persistent retry and scheduling metadata.

The Go backend automatically applies pending migrations
during application startup.

---

## Observability

The Go backend integrates Prometheus instrumentation
through custom HTTP middleware.

### Exposed Metrics

| Metric | Type | Purpose |
|---|---|---|
| http_requests_total | Counter | Total HTTP requests |
| http_active_requests | Gauge | In-flight HTTP requests |
| http_request_duration_seconds | Histogram | HTTP request latency |

Request counters and latency histograms use labels for:

- HTTP method.
- Route template.
- HTTP response status.

Using route templates rather than arbitrary request URLs
helps control metric-label cardinality.

### Monitoring Architecture

```mermaid
flowchart LR
    Client["Client"]
    API["Go API"]
    Middleware["Metrics Middleware"]
    Endpoint["/metrics"]
    Prometheus["Prometheus"]

    Client --> API
    API --> Middleware
    Middleware --> Endpoint
    Prometheus -->|Scrape every 15s| Endpoint
```

### Metrics Endpoint

```text
GET http://localhost:8081/metrics
```

### Prometheus Query Examples

Request rate:

```promql
sum(rate(http_requests_total[5m]))
```

Request rate by route:

```promql
sum by (route) (
    rate(http_requests_total[5m])
)
```

HTTP 5xx error ratio:

```promql
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))
```

95th percentile request latency:

```promql
histogram_quantile(
    0.95,
    sum by (le, route) (
        rate(http_request_duration_seconds_bucket[5m])
    )
)
```

Currently active HTTP requests:

```promql
http_active_requests
```

These metrics can be visualized through Prometheus
or an external Grafana installation.

Kafka workers also emit logs covering:

- Job dispatch.
- Partition and offset information.
- Chunk-processing progress.
- Provider quota failures.
- Retry scheduling.
- Checkpoint persistence.
- Job completion.

---

## Authentication and Security

The application implements authentication and account
verification through the Go backend.

### Implemented Security Mechanisms

- JWT-based authentication.
- Email OTP verification.
- Password recovery through email OTP.
- Cryptographic OTP protection.
- Protected learning-management endpoints.
- Environment-based credential configuration.
- User-associated persistent resources.
- Configured CORS origins.

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as Go Auth API
    participant D as PostgreSQL
    participant E as Resend

    U->>A: Register
    A->>D: Create user and OTP state
    A->>E: Send verification email
    E-->>U: Verification OTP
    U->>A: Verify OTP
    A->>D: Update verification status
    U->>A: Login
    A->>D: Validate credentials
    A-->>U: JWT access token
    U->>A: Protected request with Bearer token
    A-->>U: Authorized response
```

Secrets must be configured locally through environment
variables and must never be committed to version control.

The current authentication implementation protects the
Go application APIs. Direct AI-engine endpoints require
additional authentication and rate limiting before
public deployment.

---

## API Reference

### Go Application Backend

Base URL:

```text
http://localhost:8081/api
```

#### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | /auth/register | Register a user |
| POST | /auth/login | Authenticate a user |
| POST | /auth/send-otp | Send verification OTP |
| POST | /auth/verify-otp | Verify email OTP |
| POST | /auth/forgot-password | Request password recovery |
| POST | /auth/reset-password | Reset password |
| GET | /auth/profile | Retrieve authenticated profile |

#### Learning Management

| Method | Endpoint | Description |
|---|---|---|
| POST | /learning/sessions | Create learning session |
| POST | /learning/notes | Save study notes |
| GET | /learning/notes | Retrieve saved notes |
| POST | /learning/notes/:id/share | Enable note sharing |
| DELETE | /learning/notes/:id/share | Disable note sharing |
| GET | /learning/shared-notes/:token | Retrieve shared note |

#### AI Job Management

| Method | Endpoint | Description |
|---|---|---|
| POST | /learning/ai-jobs | Submit background AI job |
| GET | /learning/ai-jobs | List user AI jobs |
| GET | /learning/ai-jobs/:id | Retrieve job details |

Learning and AI-job endpoints require JWT authentication.

#### System Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/health | Backend health check |
| GET | /metrics | Prometheus metrics |

System endpoint paths are relative to the server root.

### Python AI Engine

Base URL:

```text
http://localhost:8000/api
```

| Method | Endpoint | Description |
|---|---|---|
| POST | /youtube/transcript | Retrieve YouTube transcript |
| POST | /youtube/process | Process YouTube learning content |
| POST | /transcription | Audio transcription/translation |
| POST | /translate | Translate transcript |
| POST | /tutor | Generate contextual tutor response |
| POST | /tutor/speak | Generate tutor speech |
| POST | /speech | Generate speech audio |

Additional system endpoints:

```text
GET http://localhost:8000/health
GET http://localhost:8000/docs
```

FastAPI provides interactive OpenAPI documentation
through Swagger UI.

### Example: AI Tutor Request

```bash
curl -X POST http://localhost:8000/api/tutor \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Explain how Kafka consumer groups work.",
    "segments": [],
    "target_language": "en"
  }'
```

Example response structure:

```json
{
  "success": true,
  "answer": "A Kafka consumer group is...",
  "language": "en"
}
```

### Example: Submit Background AI Job

```bash
curl -X POST http://localhost:8081/api/learning/ai-jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "session_id": 1,
    "kind": "notes",
    "source_language": "en",
    "target_language": "en",
    "segments": [
      {
        "start": 0,
        "end": 30,
        "text": "Introduction to event-driven architecture."
      }
    ]
  }'
```

Use an existing learning session owned by the
authenticated user.

---

## Project Structure

```text
ai-classroom/
│
├── backend/
│   ├── config/
│   ├── database/
│   ├── handlers/
│   │   ├── auth_handler.go
│   │   ├── learning_handler.go
│   │   ├── ai_job_handler.go
│   │   └── health_handler.go
│   ├── middleware/
│   │   ├── auth.go
│   │   └── metrics.go
│   ├── models/
│   ├── monitoring/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   ├── main.go
│   └── go.mod
│
├── ai-engine/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── tutor.py
│   │   │   ├── translation.py
│   │   │   └── speech.py
│   │   ├── services/
│   │   │   ├── llm.py
│   │   │   ├── job_llm.py
│   │   │   ├── transcription.py
│   │   │   ├── translation.py
│   │   │   ├── speech.py
│   │   │   └── tts.py
│   │   ├── config.py
│   │   └── main.py
│   ├── kafka/
│   │   ├── config.py
│   │   ├── producer.py
│   │   └── consumer.py
│   ├── workers/
│   │   ├── job_worker.py
│   │   └── scheduler.py
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── database/
│   └── migrations/
│
├── infrastructure/
│   └── prometheus/
│       └── prometheus.yml
│
├── docker-compose.yml
├── Makefile
└── README.md
```

---

## Getting Started

### Prerequisites

Install the following development tools:

- Go version compatible with backend/go.mod.
- Python 3.11 or a compatible newer version.
- Node.js compatible with the project's Vite version.
- npm.
- PostgreSQL.
- Docker and Docker Compose.
- Git.

External service credentials:

- Gemini API key.
- Groq API key, if using Groq inference or fallback.
- Resend API key.
- Authorized sender email configuration.

### 1. Clone the Repository

```bash
git clone https://github.com/Devtejesh/ai-classroom.git
cd ai-classroom
```

### 2. Configure PostgreSQL

Create a PostgreSQL database:

```bash
sudo -u postgres createdb ai_classroom
```

Configure the database user and password for your
local PostgreSQL installation.

### 3. Configure Backend Environment

Create the backend environment file:

```bash
cp backend/.env.example backend/.env
```

Configure the following values:

```env
SERVER_PORT=8081

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_DATABASE_PASSWORD
DB_NAME=ai_classroom
DB_SSLMODE=disable

JWT_SECRET=YOUR_RANDOM_JWT_SECRET
OTP_HMAC_SECRET=YOUR_RANDOM_OTP_SECRET

RESEND_API_KEY=YOUR_RESEND_API_KEY
EMAIL_FROM=YOUR_VERIFIED_SENDER
```

Use unique, cryptographically random secrets for JWT
and OTP configuration.

### 4. Start Kafka Infrastructure

From the repository root:

```bash
docker compose up -d kafka
```

Verify the running container:

```bash
docker compose ps
```

View Kafka logs:

```bash
docker compose logs -f kafka
```

### 5. Start Go Backend

Open a new terminal:

```bash
cd backend

go mod download

go run .
```

Pending database migrations are applied during startup.

Backend URL:

```text
http://localhost:8081
```

### 6. Configure Python AI Engine

Open another terminal:

```bash
cd ai-engine

python3 -m venv .venv

source .venv/bin/activate

pip install -r requirements.txt
```

Create `ai-engine/.env` with the following configuration:

```env
AI_PROVIDER=gemini

GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-2.5-flash

GROQ_API_KEY=YOUR_GROQ_API_KEY
GROQ_MODEL=openai/gpt-oss-120b

AI_JOBS_DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ai_classroom

KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_TOPIC=ai.chunks.process
KAFKA_CONSUMER_GROUP=ai-classroom-worker
```

Configure `TTS_MODEL` with a speech model supported
by your Gemini API account when required.

Model availability and provider quotas may vary.

### 7. Start Python AI Engine

```bash
python -m uvicorn app.main:app \
  --host 127.0.0.1 \
  --port 8000 \
  --reload
```

AI Engine documentation:

```text
http://localhost:8000/docs
```

### 8. Start Kafka Worker and Scheduler

Open another terminal:

```bash
cd ai-engine

source .venv/bin/activate

python -m workers.job_worker
```

The worker entry point initializes the Kafka topic,
starts the background scheduler thread, and begins
consuming AI job events.

### 9. Start React Frontend

Open another terminal:

```bash
cd frontend

npm ci

npm run dev
```

Open:

```text
http://localhost:5174
```

The repository currently configures Vite to use port 5174.

### 10. Verify Services

```bash
curl http://localhost:8081/api/health
```

```bash
curl http://localhost:8000/health
```

```bash
curl http://localhost:8081/metrics
```

```bash
docker compose ps
```

### Local Service Ports

| Service | Port |
|---|---:|
| React Frontend | 5174 |
| Go Backend | 8081 |
| Python AI Engine | 8000 |
| PostgreSQL | 5432 |
| Kafka External Listener | 9092 |
| Prometheus, when started separately | 9090 |

### Start Prometheus

With Prometheus installed locally, run from the
repository root:

```bash
prometheus \
  --config.file=infrastructure/prometheus/prometheus.yml
```

Open:

```text
http://localhost:9090
```

### Frontend Production Build

```bash
cd frontend

npm run build
```

The generated frontend assets are available in `dist/`.

---

## Engineering Decisions

### Why Go for Application APIs?

Go provides a straightforward concurrency model,
strong typing, efficient server execution, and a mature
ecosystem for building backend services.

The Go service handles authentication, application
business logic, database persistence, and job management.

### Why Python for AI Workloads?

Python provides access to a mature ecosystem of AI,
LLM, transcription, and speech-processing libraries.

Separating AI functionality into Python allows the
application to integrate specialized AI tooling without
coupling it tightly to the Go backend.

### Why Kafka Instead of Synchronous AI Requests?

Notes generation and transcript translation may require
multiple external AI calls.

Synchronous execution can increase request duration,
make failures difficult to recover from, and tie up
application resources.

Kafka-based dispatch separates job submission from
execution and enables background processing.

### Why PostgreSQL Alongside Kafka?

Kafka transports job events, while PostgreSQL stores
authoritative processing state.

PostgreSQL provides transactional updates, checkpoints,
constraints, retry timestamps, and application data.

This combination allows events to be replayed without
relying exclusively on Kafka offsets for business-state
management.

### Why Chunk-Based AI Processing?

Long transcripts can exceed practical model input limits
or consume significant inference resources.

Chunk-based execution allows workloads to be processed
incrementally, supports progress tracking, and reduces
the amount of successful work that must be repeated
after a failure.

### Why Multi-Provider AI Integration?

External AI providers may experience quota exhaustion,
temporary failures, or model availability changes.

A configurable provider abstraction reduces dependence
on a single inference provider.

Persisted cooldown information enables quota-aware
background scheduling.

### Why Prometheus?

Prometheus exposes measurable backend behavior through
request counters, active-request gauges, and latency
histograms.

This establishes an observability foundation for
performance analysis and operational debugging.

---

## Current Limitations

AI Classroom is currently an actively developed,
locally runnable application with production-oriented
architectural patterns.

The following limitations remain:

- The complete application stack is not yet deployed
  to public cloud infrastructure.
- Docker Compose currently manages Kafka rather than
  every application service.
- The local Kafka configuration uses a single broker
  and does not provide broker-level high availability.
- The current tutor uses transcript context injection,
  not embedding-based semantic retrieval.
- Direct AI-engine endpoints require further access
  control and rate limiting before public exposure.
- External AI inference calls remain dependent on
  provider quotas and model availability.
- The current worker design can hold a database
  transaction open during an external AI call.
- End-to-end exactly-once inference execution is
  not guaranteed.
- Production-scale load testing and published performance
  benchmarks are not yet available.

---

## Roadmap

### AI Engineering

- [ ] Embedding-based semantic retrieval.
- [ ] Vector database integration.
- [ ] Retrieval-Augmented Generation (RAG).
- [ ] PDF and image-based multimodal tutoring.
- [ ] Token usage and inference cost tracking.
- [ ] Automated quiz generation.
- [ ] AI response quality evaluation.
- [ ] Streaming tutor responses.

### Backend and Distributed Systems

- [ ] API gateway or unified reverse proxy.
- [ ] AI-engine authentication and rate limiting.
- [ ] Redis-based caching.
- [ ] Dead-letter topic for unrecoverable events.
- [ ] Improved worker transaction boundaries.
- [ ] Multi-worker concurrency testing.
- [ ] Multi-broker Kafka deployment.
- [ ] Integration and end-to-end testing.

### Infrastructure and DevOps

- [ ] Complete application containerization.
- [ ] CI/CD pipeline using GitHub Actions.
- [ ] Grafana monitoring dashboards.
- [ ] Centralized structured logging.
- [ ] Kafka consumer-lag monitoring.
- [ ] Cloud deployment.
- [ ] HTTPS and production configuration.
- [ ] Load testing and performance benchmarking.

### User Experience

- [ ] Progressive Web App support.
- [ ] Mobile installation experience.
- [ ] Enhanced learning analytics.
- [ ] Persistent conversation history.
- [ ] Personalized learning recommendations.

---

## Engineering Competencies Demonstrated

AI Classroom serves as a practical implementation
of multiple AI and backend engineering disciplines.

| Domain | Applied Concepts |
|---|---|
| AI Engineering | LLM integration, prompt engineering, contextual AI, speech processing |
| AI Reliability | Provider fallback, quota-aware scheduling, incremental inference |
| Backend Engineering | REST APIs, middleware, authentication, layered architecture |
| Distributed Systems | Event-driven processing, Kafka producers and consumers |
| Messaging Reliability | Manual offset commits, idempotent producer configuration |
| Database Engineering | Transactions, JSONB, indexing, constraints, row-level locking |
| Fault Tolerance | Retry scheduling, exponential backoff, checkpoint recovery |
| Observability | Counters, gauges, histograms, operational logging |
| Frontend Engineering | Typed React development, Markdown and mathematical rendering |
| Infrastructure | Docker Compose, environment configuration, Git workflows |

---

## Project Status

**Active Development**

AI Classroom is an engineering-focused educational
application exploring reliable AI integration and
event-driven backend systems.

Its architecture emphasizes separation of concerns,
persistent processing state, recoverable background
workloads, and observable application behavior.

---

<div align="center">

### AI Classroom

**Engineering intelligent learning systems with reliable backend architecture.**

Go · Python · FastAPI · Apache Kafka · PostgreSQL · React · LLMs

</div>
