# 🏛️ AI Agent Reference & Developer Guide — Citizen Intelligence Platform

> **Target Audience:** AI Coding Agents (Claude, Antigravity, Cursor, Copilot, etc.) and Human Engineers developing or maintaining this repository.
> **Last Updated:** August 2026

---

## 📌 1. Platform Overview & System Architecture

The **Citizen Intelligence Platform** is an enterprise-grade, asynchronous municipal grievance redressal backend built with **Python 3.11+**, **FastAPI**, **SQLAlchemy 2.0 (asyncio + asyncpg)**, **Supabase PostgreSQL 16 with pgvector**, **Supabase Auth / JWKS**, and **Cloud AI Engine** (Google Gemini / OpenAI-compatible API).

The backend serves three distinct portals via a single shared `core/` package and a Centralized API Gateway:

```
                               ┌─────────────────────────────────────────┐
                               │  Teammate Web & Mobile Frontends / Apps │
                               └────────────────────┬────────────────────┘
                                                    │
                                                    ▼
                       ┌────────────────────────────────────────────────────────┐
                       │  Centralized API Gateway: Port 8000 (/docs)            │
                       │   - Unified Entry Point, CORS & Auth Middleware        │
                       └───────────┬────────────────────────┬───────────────────┘
                                   │                        │
         ┌─────────────────────────┼────────────────────────┴─────────────────────────┐
         ▼                         ▼                                                  ▼
┌──────────────────┐      ┌──────────────────┐                               ┌──────────────────┐
│ Citizen Portal   │      │ Officer API      │                               │ Admin API        │
│ Port 8001 (/docs)│      │ Port 8003 (/docs)│                               │ Port 8004 (/docs)│
└────────┬─────────┘      └────────┬─────────┘                               └────────┬─────────┘
         │                         │                                                  │
         └─────────────────────────┼──────────────────────────────────────────────────┘
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────┐
        │  Supabase (PostgreSQL 16 + pgvector + Auth / JWKS)  │
        │  Cloud AI API (Gemini / OpenAI LLM + Embeddings)    │
        └─────────────────────────────────────────────────────┘
```

---

## 📁 2. Repository Layout & Architecture

The repository enforces strict separation of concerns. **Zero business logic duplication** across portal applications:

```
Hexaware-Mavericks/
├── AGENTS.md                   # Master agent reference guide
├── .gitignore
└── Backend/                    # Single source of backend code and config
    ├── .env                    # Active local environment variables (DO NOT COMMIT SECRETS)
    ├── .env.example            # Committed reference template with all defaults
    ├── README.md               # Backend documentation
    ├── requirements.txt        # Python dependency manifest
    ├── alembic.ini             # Alembic migration configuration
    ├── core/                   # SHARED BUSINESS LOGIC & DATA LAYER
    │   ├── config.py           # Pydantic-settings config (reads Backend/.env)
    │   ├── security.py         # JWT tokens, Supabase JWKS validation, password hashing
    │   ├── exceptions.py       # Custom exception hierarchy & standard error responses
    │   ├── middleware.py       # JWT Authentication & Authorization middleware
    │   ├── db/
    │   │   ├── base.py         # Declarative Base metadata
    │   │   └── session.py      # AsyncSessionLocal & AsyncEngine setup
    │   ├── models/             # SQLAlchemy Async Declarative Models
    │   │   ├── users.py        # User & Role definitions (citizen, officer, admin)
    │   │   ├── refresh_tokens.py # Hashed refresh tokens for session management
    │   │   ├── blocked_users.py  # User block audit log & duration tiers
    │   │   ├── credibility_log.py# Score adjustment audit log
    │   │   ├── departments.py  # Municipal department directory
    │   │   ├── issues.py       # Grievance issues, geolocation & SLA
    │   │   ├── issue_status_history.py # Status change audit trail
    │   │   ├── issue_embeddings.py     # pgvector embeddings for duplicate triage
    │   │   ├── announcements.py        # Municipal public announcements
    │   │   ├── knowledge_base.py       # Department RAG articles + vectors
    │   │   ├── sla_config.py           # Category & priority SLA deadlines
    │   │   └── notifications.py        # Citizen notifications & alerts
    │   ├── schemas/            # Pydantic v2 Request & Response schemas
    │   │   ├── auth.py, issue.py, user.py, block.py, credibility.py,
    │   │   ├── analytics.py, knowledge_base.py, announcement.py, sla.py
    │   └── services/           # Reusable Business Services
    │       ├── auth_service.py         # Login, register, token rotation, reuse detection
    │       ├── issue_service.py        # Triage pipeline, duplicates, optimistic locking
    │       ├── ai_service.py           # Cloud AI (Gemini/OpenAI) classifier + fallback
    │       ├── rag_service.py          # Vector embeddings, duplicate triage & chatbot RAG
    │       ├── credibility_service.py  # Penalty & lazy smooth recovery calculations
    │       ├── block_service.py        # Progressive tier suggestions & active block guards
    │       ├── notification_service.py # Citizen alert dispatch
    │       └── analytics_service.py    # Metric aggregates, SLA compliance, heatmaps
    ├── gateway_api/            # Centralized API Gateway (Port 8000)
    │   └── main.py             # Mounts citizen, officer, and admin portal routers
    ├── citizen_api/            # Citizen Self-Service Portal (Port 8001)
    │   ├── main.py
    │   └── routers/            # auth, issues, chatbot, notifications, announcements, faq
    ├── officer_api/            # Field Officer Portal (Port 8003)
    │   ├── main.py
    │   └── routers/            # auth, queue, issues
    ├── admin_api/              # Municipal Administrator Dashboard (Port 8004)
    │   ├── main.py
    │   └── routers/            # auth, users, issues, blocks, credibility, analytics, sla, kb
    ├── alembic/                # Database migrations
    │   └── versions/           # Versioned migration files
    ├── scripts/
    │   ├── seed.py             # Seeds master data, SLA configs & demo users
    │   └── test_curl_all.sh    # Comprehensive cURL integration test suite
    └── tests/                  # Pytest unit & integration test suite
        ├── test_credibility_recovery.py
        ├── test_auth_security.py
        ├── test_ai_service.py
        └── test_api_portals.py
```

---

## ⚙️ 3. Environment & Configuration Rules

### 🔑 Single Source of Truth: `Backend/.env`
- **Rule**: All environment variables reside in `Backend/.env` (templated by `Backend/.env.example`).

### Supabase & Cloud AI Parameters
| Parameter | Default | Description |
| :--- | :--- | :--- |
| `SUPABASE_URL` | `https://qmodhgbjhqkveaihtwmg.supabase.co` | Supabase project API URL |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Supabase Anon / Publishable client key |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` | Supabase Service Role Secret Key |
| `SUPABASE_JWKS_URL` | `.../.well-known/jwks.json` | JWKS endpoint for asymmetric JWT validation |
| `DATABASE_URL` | `postgresql+asyncpg://...` | Async SQLAlchemy DB connection string |
| `AI_PROVIDER` | `claude` | Cloud AI provider (`claude`, `gemini`, or `openai`) |
| `AI_API_KEY` | `""` | Cloud LLM & Embeddings API key |
| `AI_MODEL` | `claude-3-5-haiku-20241022` | LLM model for categorization & triage |
| `AI_EMBEDDING_MODEL` | `text-embedding-004` | Model for semantic duplicate detection |
| `ENABLE_MOCK_AI_FALLBACK` | `true` | Falls back to rule-based classification if offline |
| `CORS_ORIGINS` | `*` | Allowed CORS origins for teammate frontends |

---

## 🗄️ 4. Data Models & Database Schema

```mermaid
erDiagram
    users ||--o{ issues : submits
    users ||--o{ refresh_tokens : has
    users ||--o{ blocked_users : receives
    users ||--o{ credibility_log : logs
    departments ||--o{ users : assigns
    departments ||--o{ issues : manages
    departments ||--o{ knowledge_base : owns
    issues ||--o{ issue_status_history : tracks
    issues ||--o| issue_embeddings : embeds

    users {
        int id PK
        string name
        string phone
        string email UK
        string password_hash
        enum role "citizen | officer | admin"
        int department_id FK
        float credibility_score "default 1.0"
        enum status "active | banned"
        datetime created_at
    }

    issues {
        int id PK
        string issue_id UK "ISS-2026-XXXXXX"
        int citizen_id FK
        string category
        int department_id FK
        enum priority "high | medium | low"
        enum status "new | reviewed | forwarded | in_progress | resolved | malicious"
        float location_lat
        float location_lng
        string ward
        string transcript
        string ai_summary
        string sentiment
        int_array assigned_officer_ids
        int version "optimistic locking"
        datetime sla_due_at
        datetime resolved_at
        datetime created_at
    }

    blocked_users {
        int id PK
        int user_id FK
        datetime block_start_at
        datetime block_end_at "nullable = permanent"
        enum duration_tier "3d | 10d | 30d | permanent"
        string reason
        int issued_by_admin_id FK
        bool is_active
        float score_at_unblock
        datetime created_at
    }

    credibility_log {
        int id PK
        int user_id FK
        float delta
        string reason "malicious_flag | recovery_tick | manual_adjustment"
        int issue_id FK
        datetime created_at
    }
```

---

## 🔐 5. Authentication, Security & Session Management

### 1. Dual Token Validation (Supabase JWKS + HS256)
- **Supabase Auth:** Validates incoming Bearer tokens against `SUPABASE_JWKS_URL` using cached public keys.
- **Native JWTs:** Validates and creates HS256 signed access tokens (`15 min`) and rotated refresh tokens (`30 days`).

### 2. Dual Web & Mobile Delivery
- **Web Browsers:** Receives tokens as `httpOnly`, `Secure`, `SameSite=Lax` cookies.
- **Mobile Apps (Flutter, React Native, iOS, Android):** Receives tokens in JSON body.

### 3. RBAC & Route Access Control
- **Public Routes:** `/health`, `/docs`, `/openapi.json`, `/citizen/auth/*`, `/officer/auth/login`, `/admin/auth/login`, `/citizen/faq`, `/citizen/announcements`.
- **Role Provisioning:** Citizens can self-register via `POST /citizen/auth/register`. Staff roles (`officer`, `admin`) **must be provisioned by an Admin** via `POST /admin/users`.

---

## 🧮 6. Core Business Logic & Mathematical Formulas

### 1. Issue Creation Pipeline (`POST /citizen/issues`)
1. **Block Enforcement:** Verifies citizen is not blocked via `require_not_blocked` dependency.
2. **STT & Audio Processing:** If audio uploaded, transcribes via STT.
3. **AI Triage (Cloud AI / Heuristic Fallback):** Classifies `{category, priority, summary, sentiment}` via structured LLM prompt.
4. **Reverse-Geocoding:** Maps `(location_lat, location_lng)` to municipal `ward`.
5. **Duplicate Detection via pgvector:**
   $$\text{Cosine Similarity} = 1 - (\mathbf{v}_{\text{new}} \cdot \mathbf{v}_{\text{existing}})$$
   If similarity exceeds `DUPLICATE_SIMILARITY_THRESHOLD` (0.82) within the same ward/category, the issue is tagged with duplicate metadata.
6. **Public ID Generation:** Formats sequential ID `ISS-YYYY-XXXXXX`.
7. **SLA Calculation:** Looks up configured SLA hours from `sla_config` and computes `sla_due_at = created_at + timedelta(hours=sla_hours)`.

### 2. Credibility Score Penalty
- New accounts start with: $\text{Credibility Score} = 1.0$.
- When an issue is marked `malicious` by Officer or Admin:
  $$\text{Score}_{\text{new}} = \max(0.0, \text{Score}_{\text{old}} - 0.15)$$
- **Alert Threshold:** When $\text{Score} < 0.5$, an administrative alert is generated.

### 3. Progressive Block Tier Escalation
- **0 prior blocks (1st block):** `3d` (3 days)
- **1 prior block (2nd block):** `10d` (10 days)
- **2 prior blocks (3rd block):** `30d` (30 days)
- **3+ prior blocks (4th+ block):** `permanent` (flips `users.status` to `banned`)

### 4. Lazy Smooth Credibility Recovery Formula
$$\text{Recovery Period (Days)} = 2 \times \text{Block Duration (Days)}$$
$$\text{Daily Recovery Rate} = \frac{0.70 - \text{Score at Unblock}}{\text{Recovery Period (Days)}}$$
$$\text{Current Score} = \min(0.70, \text{Score at Unblock} + \text{Daily Rate} \times \text{Days Since Unblock})$$

---

## 📡 7. Full API Endpoint Matrix

### 👤 Citizen Portal (`/citizen` — Port 8001)
| Method | Path | Auth / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/citizen/auth/register` | Public | Citizen registration |
| `POST` | `/citizen/auth/login` | Public | Citizen login |
| `POST` | `/citizen/auth/refresh` | Public | Refresh token rotation |
| `POST` | `/citizen/auth/logout` | Authenticated | Revoke session |
| `GET` | `/citizen/me` | Authenticated | Profile, credibility score & block banner status |
| `POST` | `/citizen/issues` | Authenticated (`not_blocked`) | File grievance (JSON or audio upload + AI triage) |
| `GET` | `/citizen/issues` | Authenticated | List citizen's filed issues |
| `GET` | `/citizen/issues/{id}` | Authenticated | Detailed issue history & status tracking |
| `POST` | `/citizen/chatbot` | Optional | AI RAG copilot querying knowledge base |
| `GET` | `/citizen/faq` | Public | Public municipal service FAQ articles |
| `GET` | `/citizen/announcements` | Public | Public municipal announcements |
| `GET` | `/citizen/notifications` | Authenticated | Citizen alerts and grievance updates |

### 👷 Officer Portal (`/officer` — Port 8003)
| Method | Path | Auth / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/officer/auth/login` | Public | Officer login |
| `GET` | `/officer/queue` | `officer`, `admin` | Queue scoped to officer's department & ward |
| `GET` | `/officer/issues/{id}` | `officer`, `admin` | Issue details |
| `PATCH`| `/officer/issues/{id}/claim` | `officer` | Claim grievance (Optimistic Locking) |
| `PATCH`| `/officer/issues/{id}/status` | `officer`, `admin` | Update status (`in_progress`, `resolved`) |
| `PATCH`| `/officer/issues/{id}/mark-malicious` | `officer`, `admin` | Flag malicious grievance |

### ⚙️ Admin Dashboard (`/admin` — Port 8004)
| Method | Path | Auth / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/admin/auth/login` | Public | Administrator login |
| `POST` | `/admin/users` | `admin` | Provision officer or admin accounts |
| `GET` | `/admin/users` | `admin` | List platform users with role/status filters |
| `GET` | `/admin/issues` | `admin` | City-wide grievance search and inspection |
| `GET` | `/admin/analytics/summary` | `admin` | High-level metrics, SLA compliance rate |
| `GET` | `/admin/analytics/trends` | `admin` | Daily volume & resolution timeline |
| `GET` | `/admin/analytics/heatmap` | `admin` | Geographic lat/lng coordinate clusters |
| `GET` | `/admin/users/low-credibility` | `admin` | Citizen alert list (< 0.5 score) |
| `GET` | `/admin/users/{id}/credibility` | `admin` | Audit trail of citizen credibility score changes |
| `GET` | `/admin/users/{id}/block-suggest` | `admin` | Auto-suggest next escalation block tier |
| `POST` | `/admin/users/{id}/block` | `admin` | Issue block (`3d`, `10d`, `30d`, `permanent`) |
| `GET` | `/admin/users/{id}/block-history` | `admin` | User block history audit log |
| `POST` | `/admin/announcements` | `admin` | Publish public announcements |
| `GET/POST`| `/admin/sla-config` | `admin` | Manage category & priority SLA target hours |
| `GET/POST`| `/admin/knowledge-base` | `admin` | Manage knowledge base articles & vector embeddings |

---

## 👥 8. Pre-Seeded Demo Credentials

| Role | Email | Password | Details / Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@city.gov` | `Admin@123` | City-wide oversight & staff provisioning |
| **Field Officer (Water)** | `officer.water@city.gov` | `Officer@123` | Scoped to Water & Sanitation department |
| **Field Officer (Power)** | `officer.power@city.gov` | `Officer@123` | Scoped to Electricity & Power department |
| **Citizen (Standard)** | `citizen.jane@example.com` | `Citizen@123` | Credibility: `1.0`, Active, can file grievances |
| **Citizen (Low Score)** | `citizen.spammer@example.com` | `Citizen@123` | Credibility: `0.35`, Triggers admin alerts |

---

## 🛠️ 9. Developer Workflow Guide

### 1. Running Backend Services Locally
```bash
# Navigate to Backend folder
cd Backend

# Run Database Migrations (Supabase PostgreSQL)
alembic upgrade head

# Seed Initial Master Data & Demo Users
python scripts/seed.py

# Start API Gateway (Port 8000)
python -m gateway_api.main
```

### 2. Running Test Suites
```bash
cd Backend
pytest tests/ -v
```
