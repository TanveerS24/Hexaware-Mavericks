# 🏛️ Municipal Executive Admin Portal

> **Citizen Intelligence Redressal Platform — Executive Operations & Oversight Dashboard**
> Built with **React 19**, **Vite**, **Recharts**, **Lucide Icons**, and a modern Glassmorphic Design System.

---

## 🚀 Key Features

### 1. 📊 Executive Overview Dashboard (`/`)
- Total complaints tracking (Today, Week, Month).
- Live closure rate and lifecycle distribution (Resolved, In-Progress, New, Malicious).
- Average resolution turnaround time benchmarks.
- Department workload comparison (Water, Electricity, Roads, Waste, Forestry).

### 2. ⏱️ SLA Monitoring & Health Center (`/sla`)
- Per-department SLA matrix with **Red / Yellow / Green** traffic light indicators.
- Real-time countdowns for active complaints nearing deadline or breaching.
- Priority framework: Critical (< 4h), High (< 12h), Medium (< 24h), Low (< 48h).
- Instant administrative escalation triggers.

### 3. 🗺️ Geospatial Heatmap View (`/heatmap`)
- Geographic density visualization across municipal wards.
- Interactive category (Water, Power, Roads, Waste) and time range filters.
- Ward density leaderboard with direct coordinate drill-down and localized citizen alerts.

### 4. 📈 Trend Charts & Spike Detection (`/trends`)
- Multi-series time-series charts (7d, 14d, 30d) for category trajectories and filing vs resolution velocity.
- Automated anomaly spike alerts (e.g. *"Water complaints tripled in Ward 4"*).
- Incident attribution correlating data surges with physical infrastructure events.

### 5. 🗄️ Full Audit Log & User Access (`/audit`)
- Searchable & filterable grievance master table with CSV/JSON export.
- Citizen credibility oversight (0.00 – 1.00 score inspection, manual adjustments, and progressive block tiers: `3d`, `10d`, `30d`, `permanent`).
- Field officer performance directory.
- Cryptographic system action audit trail.

### 6. 🔮 Predictive Hotspot & Infrastructure Health (`/predictive`)
- Recurrence pattern engine identifying chronic failure junctions (e.g. *"4 pipe leaks in 45 days"*).
- Root cause diagnosis and permanent capital upgrade recommendations vs repeat patchwork.
- Financial ROI cost-avoidance calculators and one-click work order dispatch.

### 7. 📡 Duplicate Triage & Emerging Incident Clusters (`/clusters`)
- Live spatial radar clustering co-located tickets (< 500m) in real-time.
- Outage detection before multiple duplicate tickets flood officer queues.
- One-click consolidation into a single Master Emergency Ticket.

### 8. 📢 Emergency Broadcast Tool (`/broadcasts`)
- Push targeted announcements and restoration ETAs to affected wards.
- Fast-fill crisis templates (Water disruptions, grid failures, storm advisories).
- Live citizen reach estimator and delivery tracking.

---

## 🔑 Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Municipal Administrator** | `admin@city.gov` | `Admin@123` |

---

## 🛠️ Running Locally

```bash
# Navigate to the admin portal
cd Frontend/admin-portal

# Install dependencies
npm install

# Start Vite dev server on port 5175
npm run dev
```
