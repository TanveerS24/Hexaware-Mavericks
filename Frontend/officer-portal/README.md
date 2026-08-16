# 🏛️ CitizenAI — Field Officer Operations Dashboard

The **Officer Operations Dashboard** is a dedicated, real-time command console designed for municipal field personnel across government departments (Water & Sewerage, Electricity, Roads & Transport, Sanitation, Police, etc.). 

It enables field officers to:
- Monitor incoming regional grievances in real time filtered strictly by **Department** and **Region/Ward**.
- **Claim / Accept** incoming cases, which officially initiates the **SLA resolution countdown**.
- Publish real-time field investigation updates directly into the citizen's audit timeline.
- Handle emergency alerts and coordinate field resolution teams.
- Connect seamlessly to the team's **Central API Gateway on Render** (`https://hexaware-mavericks.onrender.com`).

---

## 📁 Folder Structure

```
Officers Dashboard/
├── public/
├── src/
│   ├── components/
│   │   ├── AIChatbot.jsx             # AI Grievance Assistant
│   │   └── NotificationPanel.jsx     # Real-time alert notifications
│   ├── context/
│   │   └── AppContext.jsx            # Auth state & Socket.IO real-time client
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx         # Officer login & quick switcher
│   │   │   └── RegisterOfficer.jsx   # Officer onboarding & admin approval
│   │   └── officer/
│   │       ├── OfficerLayout.jsx     # Navigation sidebar & status header
│   │       ├── OfficerDashboard.jsx  # Telemetry KPIs & operational overview
│   │       ├── IncomingComplaints.jsx# Regional triage queue (Accept/Reject)
│   │       ├── MyCases.jsx           # Active assigned cases & SLA monitors
│   │       └── OfficerComplaintDetail.jsx # SLA progress bar & action logs
│   ├── services/
│   │   └── api.js                    # Universal REST API client (Render + Local)
│   ├── App.jsx                       # Main application router
│   ├── index.css                     # Executive GovTech dark slate design system
│   └── main.jsx                      # App entry point
├── .env                              # Environment configuration (Render Gateway)
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

---

## 🚀 Quick Start & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Verify `.env` in this directory:
```env
# Team Central API Gateway on Render
VITE_API_URL=https://hexaware-mavericks.onrender.com
VITE_SOCKET_URL=https://hexaware-mavericks.onrender.com

# For local backend testing, switch to:
# VITE_API_URL=http://localhost:5000/api
# VITE_SOCKET_URL=http://localhost:5000
```

### 3. Start Development Server
```bash
npm run dev
```
The Officer Dashboard will run at: **`http://localhost:5174`** (or configured port).

---

## 🔗 Live Integration with Render Backend (`https://hexaware-mavericks.onrender.com`)

The `api.js` client is pre-wired to the team's deployed OpenAPI Gateway:

| Officer Feature | Render Backend Endpoint | HTTP Method |
|---|---|---|
| **Officer Login** | `/officer/auth/login` | `POST` |
| **Department Queue** | `/officer/queue` | `GET` |
| **Grievance Detail** | `/officer/issues/{issue_id}` | `GET` |
| **Claim / Start SLA** | `/officer/issues/{issue_id}/claim` | `PATCH` |
| **Status / Action Log** | `/officer/issues/{issue_id}/status` | `PATCH` |
| **Mark Malicious** | `/officer/issues/{issue_id}/mark-malicious` | `PATCH` |
| **Interactive Docs** | `https://hexaware-mavericks.onrender.com/docs#/` | Swagger UI |

---

## ⚡ Synchronization with Citizen & Admin Portals

1. **Citizen Portal Synchronization**:
   - When a citizen files a complaint (via `/citizen/issues`), it routes immediately into the matching officer's **Incoming Queue** (`/officer/queue`).
   - When the officer claims the grievance, the status updates to `in_progress` and the **SLA countdown starts** on the citizen's screen.
   - When the officer logs progress via `/officer/issues/:id/status`, the update publishes instantly to the citizen's resolution timeline.

2. **Admin Command Synchronization**:
   - Officer personnel and departmental registrations are visible to administrators under `/admin/users`.
   - City-wide analytics, SLA compliance rates, and department resolution metrics are aggregated live at `/admin/analytics/summary`.

---

## 🔐 Demo Officer Credentials

| Municipal Department | Officer Name | Email | Password | Jurisdiction |
|---|---|---|---|---|
| **Water & Sewerage** | Officer Rajesh Sharma | `officer@citizenai.gov.in` | `Officer@123` | Mumbai |
| **Electricity** | Officer Amit Verma | `officer.electricity@citizenai.gov.in` | `Officer@123` | Mumbai |
| **Roads & Transport** | Officer Vikram Rathore | `officer.transport@citizenai.gov.in` | `Officer@123` | Mumbai |

*(You can also use the **Quick Officer Switch** buttons on the login screen for 1-click authentication).*
