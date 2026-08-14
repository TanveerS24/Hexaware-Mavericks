# 🏛️ AI-Powered Citizen Call Intelligence Platform — Backend

A production-grade, modular, asynchronous FastAPI backend designed for municipal grievance redressal, smart call triage, automated Speech-to-Text & LLM classification, duplicate detection via vector similarity (`pgvector`), and progressive credibility management.

---

## 📑 Table of Contents
1. [Architecture & Network Ports](#-architecture--network-ports)
2. [Quick Start with Docker](#-quick-start-with-docker)
3. [Pre-Seeded Demo Accounts](#-pre-seeded-demo-accounts)
4. [Centralized API Gateway & Authentication](#-centralized-api-gateway--authentication)
5. [Credibility & Progressive Blocking System](#-credibility--progressive-blocking-system)
6. [Frontend Integration Guide (Web & Mobile)](#-frontend-integration-guide-web--mobile)
7. [Complete API Reference](#-complete-api-reference)
8. [Running Tests](#-running-tests)

---

## 🌐 Architecture & Network Ports

All services are bound to `0.0.0.0` inside Docker Compose, allowing teammates on the same local network or VPN to connect their frontend apps directly to your machine's IP address (`http://<YOUR_LAN_IP>:<PORT>`).

```
                              [ Teammate Frontends / Mobile Apps ]
                                               │
                                               ▼
                              ┌─────────────────────────────────┐
                              │  Centralized API Gateway: 8000  │
                              │   - Centralized Auth Middleware │
                              │   - Swagger Docs: /docs         │
                              └────────────────┬────────────────┘
                                               │
               ┌────────────────┬──────────────┼────────────────┬────────────────┐
               │                │              │                │                │
               ▼                ▼              ▼                ▼                ▼
        ┌──────────────┐ ┌──────────────┐┌──────────────┐┌──────────────┐ ┌──────────────┐
        │ Citizen API  │ │ Call Centre  ││ Officer API  ││  Admin API   │ │ PostgreSQL   │
        │  Port: 8001  │ │  Port: 8002  ││  Port: 8003  ││  Port: 8004  │ │  (pgvector)  │
        └──────┬───────┘ └──────┬───────┘└──────┬───────┘└──────┬───────┘ └──────┬───────┘
               │                │              │                │                │
               └────────────────┴──────────────┴────────────────┴────────────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │  Ollama Engine  │
                                      │   Port: 11434   │
                                      └─────────────────┘
```

### Exposed Port Table
| Service | Port | Description | Interactive Swagger Docs |
| :--- | :--- | :--- | :--- |
| **API Gateway** | **`8000`** | **Primary unified entry point for all frontends** | `http://<IP>:8000/docs` |
| **Citizen API** | `8001` | Citizen self-service, grievance filing, RAG chatbot | `http://<IP>:8001/docs` |
| **Call Centre API** | `8002` | Priority triage queue, forwarding, manual ticket logging | `http://<IP>:8002/docs` |
| **Officer API** | `8003` | Scoped department queue, optimistic lock claim, resolution | `http://<IP>:8003/docs` |
| **Admin API** | `8004` | Staff management, block rules, credibility, analytics, SLA | `http://<IP>:8004/docs` |
| **PostgreSQL** | `5432` | Postgres 16 with `pgvector` extension enabled | — |
| **Ollama AI** | `11434` | Local LLM inference & Vector Embeddings | — |

---

## 🚀 Quick Start with Docker

### Prerequisites
- Docker & Docker Compose installed and running.

### 1. Start the Complete Stack
```bash
# Clone and enter directory
git clone <repo-url>
cd Mavericks

# Copy environment variables (pre-configured for Docker network)
cp .env.example .env

# Start all containers in background
docker compose up -d --build
```

### 2. Verify Container Health
```bash
docker compose ps
```
The entrypoint automatically waits for PostgreSQL, applies Alembic migrations, and seeds initial master data and demo accounts.

### 3. Run the Automated Live Integration Test
```bash
bash scripts/test_curl_all.sh
```

---

## 👥 Pre-Seeded Demo Accounts

| Role | Email | Password | Scope / Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@city.gov` | `Admin@123` | City-wide oversight, block issuance, SLA config, staff management |
| **Call Centre Agent** | `callcentre1@city.gov` | `Agent@123` | City priority queue, ticket forwarding, direct resolution, spam flags |
| **Field Officer (Water)** | `officer.water@city.gov` | `Officer@123` | Scoped to Water & Sanitation department |
| **Field Officer (Power)** | `officer.power@city.gov` | `Officer@123` | Scoped to Electricity & Power department |
| **Citizen (Standard)** | `citizen.jane@example.com` | `Citizen@123` | Credibility: `1.0`, Active, can file grievances & chat |
| **Citizen (Low Score)** | `citizen.spammer@example.com` | `Citizen@123` | Credibility: `0.35`, Triggers admin alerts (< 0.5) |

---

## 🛡️ Centralized API Gateway & Authentication

### Security Architecture
- **Stateless JWT Access Tokens**: 15-minute expiration, contains `user_id`, `role`, `department_id`.
- **Rotated Refresh Tokens**: Stored server-side as SHA-256 hashes. Rotated upon every refresh request.
- **Token Reuse Detection**: If a revoked refresh token is submitted (stolen token attack), the platform automatically invalidates **all** active sessions for that user.
- **Authentication Middleware**: Centralized on the API Gateway and portal services. Automatically validates JWTs on all private routes while strictly excluding public endpoints (`/health`, `/docs`, `/citizen/auth/*`, `/callcentre/auth/login`, `/officer/auth/login`, `/admin/auth/login`, `/citizen/faq`, `/citizen/announcements`).

---

## ⚖️ Credibility & Progressive Blocking System

### Credibility Score Dynamics
1. **Initial Score**: New citizen accounts start with `1.0`.
2. **Malicious Grievance Penalty**: When a call centre agent or field officer marks an issue as `malicious`, the citizen's score is penalized by `0.15`:
   $$\text{Score}_{\text{new}} = \max(0.0, \text{Score}_{\text{old}} - 0.15)$$
3. **Low Credibility Alert**: If a citizen's score drops below `0.5`, an automated high-priority alert is generated for city administrators. **Citizens are not auto-blocked** — blocking requires administrative review.

### Progressive Block Escalation Tiers
When an administrator reviews a low-credibility citizen via `GET /admin/users/{id}/block-suggest`, the system auto-suggests the duration tier:
- **1st Block**: `3d` (3 days)
- **2nd Block**: `10d` (10 days)
- **3rd Block**: `30d` (30 days)
- **4th+ Block**: `permanent` (Flips user status to `banned`)

### Gradual Credibility Recovery Formula
When a temporary block expires, credibility recovers smoothly without background cron jobs (lazily computed on read):
$$\text{Recovery Period (Days)} = 2 \times \text{Block Duration (Days)}$$
$$\text{Daily Recovery Rate} = \frac{0.70 - \text{Score at Unblock}}{\text{Recovery Period}}$$
$$\text{Current Score} = \min(0.70, \text{Score at Unblock} + \text{Daily Rate} \times \text{Days Since Unblock})$$

---

## 📱 Frontend Integration Guide (Web & Mobile)

### Web Frontends (React / Vue / Next.js)
The backend automatically sets `httpOnly`, `SameSite=Lax`, `Secure` cookies for `access_token` and `refresh_token`. Ensure your HTTP client includes credentials:
```javascript
fetch('http://<YOUR_IP>:8000/citizen/me', {
  credentials: 'include'
});
```

### Mobile Frontends (Flutter / React Native / Swift / Kotlin)
Tokens are returned in the JSON response body. Store `refresh_token` securely in iOS Keychain / Android Keystore:
```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "k8X_j90A2...",
  "token_type": "bearer",
  "expires_in": 900,
  "role": "citizen",
  "user_id": 5,
  "name": "Jane Citizen"
}
```
Include `Authorization: Bearer <access_token>` in all subsequent requests.

---

## 📖 Complete API Reference

All endpoints can be called via the Central Gateway `http://<IP>:8000` or individual portal ports.

### 👤 Citizen Portal (`/citizen`)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/citizen/auth/register` | No | Public citizen account registration |
| `POST` | `/citizen/auth/login` | No | Citizen login (returns JWT & sets cookie) |
| `POST` | `/citizen/auth/refresh` | No | Rotate refresh token |
| `POST` | `/citizen/auth/logout` | No | Invalidate refresh token session |
| `GET` | `/citizen/me` | **Yes** | Profile, credibility score, and block status |
| `POST` | `/citizen/issues` | **Yes (Not Blocked)** | File grievance (JSON or audio upload + AI triage) |
| `GET` | `/citizen/issues` | **Yes** | List grievances submitted by authenticated citizen |
| `GET` | `/citizen/issues/{id}` | **Yes** | Detailed grievance history and status tracking |
| `POST` | `/citizen/chatbot` | Optional | AI RAG copilot querying knowledge base |
| `GET` | `/citizen/faq` | No | Public municipal service FAQ articles |
| `GET` | `/citizen/announcements`| No | Public municipal announcements |
| `GET` | `/citizen/notifications`| **Yes** | Citizen alerts and grievance updates |

### 🎧 Call Centre Portal (`/callcentre`)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/callcentre/auth/login` | No | Agent login |
| `GET` | `/callcentre/queue` | **Yes (CallCentre/Admin)** | Priority queue (High → Medium → Low) with filters |
| `GET` | `/callcentre/issues/{id}` | **Yes** | Full issue inspection |
| `POST` | `/callcentre/issues` | **Yes** | Manual ticket creation on citizen's behalf |
| `PATCH`| `/callcentre/issues/{id}/forward` | **Yes** | Forward grievance to department claim pool |
| `PATCH`| `/callcentre/issues/{id}/resolve` | **Yes** | Directly resolve simple grievances |
| `PATCH`| `/callcentre/issues/{id}/mark-malicious` | **Yes** | Flag malicious issue & penalize citizen |

### 👷 Officer Portal (`/officer`)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/officer/auth/login` | No | Field officer login |
| `GET` | `/officer/queue` | **Yes (Officer/Admin)** | Queue scoped to officer's department |
| `GET` | `/officer/issues/{id}` | **Yes** | Issue details |
| `PATCH`| `/officer/issues/{id}/claim` | **Yes** | Claim grievance (Optimistic Locking) |
| `PATCH`| `/officer/issues/{id}/status` | **Yes** | Update status (`in_progress`, `resolved`) |
| `PATCH`| `/officer/issues/{id}/mark-malicious` | **Yes** | Flag malicious grievance |

### ⚙️ Admin Dashboard (`/admin`)
| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/admin/auth/login` | No | Administrator login |
| `POST` | `/admin/users` | **Yes (Admin)** | Provision callcentre, officer, or admin accounts |
| `GET` | `/admin/users` | **Yes (Admin)** | List platform users with role/status filters |
| `GET` | `/admin/issues` | **Yes (Admin)** | City-wide grievance search and inspection |
| `GET` | `/admin/analytics/summary` | **Yes (Admin)** | High-level metrics, SLA compliance rate |
| `GET` | `/admin/analytics/trends` | **Yes (Admin)** | Daily volume & resolution timeline |
| `GET` | `/admin/analytics/heatmap` | **Yes (Admin)** | Geographic lat/lng coordinate clusters |
| `GET` | `/admin/users/low-credibility` | **Yes (Admin)** | Citizen alert list (< 0.5 score) |
| `GET` | `/admin/users/{id}/credibility`| **Yes (Admin)** | Audit trail of citizen credibility score changes |
| `GET` | `/admin/users/{id}/block-suggest`| **Yes (Admin)**| Auto-suggest next escalation block tier |
| `POST` | `/admin/users/{id}/block` | **Yes (Admin)** | Issue block (`3d`, `10d`, `30d`, `permanent`) |
| `GET` | `/admin/users/{id}/block-history`| **Yes (Admin)**| User block history audit log |
| `POST` | `/admin/announcements` | **Yes (Admin)** | Publish public announcements |
| `GET/POST`| `/admin/sla-config` | **Yes (Admin)** | Manage category & priority SLA target hours |
| `GET/POST`| `/admin/knowledge-base` | **Yes (Admin)** | Manage knowledge base articles & vector embeddings |

---

## 🧪 Running Tests

### 1. Pytest Unit & Integration Tests
```bash
pytest tests/ -v
```

### 2. Live Docker HTTP / Curl Suite
```bash
bash scripts/test_curl_all.sh
```
