// In development, Vite proxies /admin/* → http://localhost:8000/admin/*
// so we use an empty base URL (relative). In production, set VITE_API_GATEWAY_URL.
const BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || '';

const getAuthHeaders = () => {
  const token = localStorage.getItem('admin_access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const handleResponse = async (res) => {
  if (res.status === 503) {
    // DB offline — backend returns empty payload, treat as empty result
    const data = await res.json().catch(() => ({}));
    return data; // { items: [], total: 0, points: [], trends: [] }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.detail || `HTTP ${res.status}`);
  }
  return res.json();
};

export const api = {
  // 1. Auth — multi-tier fallback: Render → localhost:5000 → localhost:8000
  async login(email, password) {
    const normalize = (data, email) => {
      if (data.access_token && !data.user) {
        return {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: {
            id: data.user_id,
            name: data.name || 'Administrator',
            email: email,
            role: data.role || 'admin',
            department_id: data.department_id,
            credibility_score: 1.0
          }
        };
      }
      return data;
    };

    // Strategy 1: Render production API
    try {
      const res = await fetch(`${BASE_URL}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        return normalize(data, email);
      }
    } catch (e) { /* fall through */ }

    // Strategy 2: Local Node backend
    try {
      const res2 = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.user?.role === 'admin' || data2.token) {
          return {
            access_token: data2.token || data2.access_token,
            user: data2.user || { id: 'admin-1', name: 'Admin', email, role: 'admin' }
          };
        }
      }
    } catch (e) { /* fall through */ }

    // Strategy 3: FastAPI local gateway
    try {
      const res3 = await fetch('http://localhost:8000/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res3.ok) {
        const data3 = await res3.json();
        return normalize(data3, email);
      }
    } catch (e) { /* fall through */ }

    throw new Error('Invalid administrator credentials. Use admin@city.gov / Admin@123');
  },

  // 2. Executive Analytics Summary
  async getAnalyticsSummary() {
    const res = await fetch(`${BASE_URL}/admin/analytics/summary`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // 3. Historical Trends
  async getAnalyticsTrends(days = 14) {
    const res = await fetch(`${BASE_URL}/admin/analytics/trends?days=${days}`, {
      headers: getAuthHeaders()
    });
    const data = await handleResponse(res);
    return data.trends || data;
  },

  // 4. Heatmap Data
  async getHeatmapPoints() {
    const res = await fetch(`${BASE_URL}/admin/analytics/heatmap`, {
      headers: getAuthHeaders()
    });
    const data = await handleResponse(res);
    return data.points || data;
  },

  // 5. Raw Complaints / Issues
  async getIssues(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/admin/issues?${query}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // 6. Users & Staff
  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/admin/users?${query}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // 7. Announcements / Broadcasts
  async getAnnouncements() {
    const res = await fetch(`${BASE_URL}/admin/announcements`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async createAnnouncement(payload) {
    const res = await fetch(`${BASE_URL}/admin/announcements`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // 8. Officer Registration & Approval Workflow
  async getPendingOfficers() {
    const res = await fetch(`${BASE_URL}/admin/users/pending-officers`, {
      headers: getAuthHeaders()
    });
    const data = await handleResponse(res);
    return data.items || [];
  },

  async approveOfficer(userId, data = {}) {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async rejectOfficer(userId, reason = '') {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    return handleResponse(res);
  }
};
