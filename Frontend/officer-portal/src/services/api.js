// CitizenAI Officer Portal API Client
// Multi-tier failover: Render Production → localhost:8000 (FastAPI) → localStorage fallback

const API_BASE = import.meta.env.VITE_API_URL || '';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE.replace(/\/$/, '');
    // Production Render URL for direct requests
    this.renderUrl = 'https://hexaware-mavericks.onrender.com';
  }

  getToken() {
    return localStorage.getItem('citizen_ai_token');
  }

  getHeaders(isMultipart = false) {
    const headers = {};
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isMultipart) headers['Content-Type'] = 'application/json';
    return headers;
  }

  async request(method, endpoint, data = null, isMultipart = false) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: this.getHeaders(isMultipart),
    };
    if (data) options.body = isMultipart ? data : JSON.stringify(data);

    const response = await fetch(url, options);

    if (response.status === 401) {
      throw new Error('Unauthorized or session expired.');
    }

    const result = await response.json().catch(() => ({ error: 'Invalid response format' }));
    if (!response.ok) {
      const errorMsg = result.detail || result.error || result.message || `HTTP ${response.status}`;
      throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }
    return result;
  }

  get(endpoint) { return this.request('GET', endpoint); }
  post(endpoint, data, isMultipart = false) { return this.request('POST', endpoint, data, isMultipart); }
  patch(endpoint, data) { return this.request('PATCH', endpoint, data); }
  put(endpoint, data) { return this.request('PUT', endpoint, data); }
  delete(endpoint) { return this.request('DELETE', endpoint); }

  // ─────────────────────────────────────────────────────
  // 1. OFFICER LOGIN — 4-strategy failover
  // ─────────────────────────────────────────────────────
  async loginUser(credentials) {
    const emailLower = (credentials.email || '').toLowerCase().trim();
    const pwd = credentials.password || '';

    const buildUser = (data, email) => {
      // Normalize TokenResponse from FastAPI backend
      if (data.access_token) {
        return {
          token: data.access_token,
          user: data.user || {
            id: data.user_id || 'officer-1',
            name: data.name || email.split('@')[0],
            email,
            role: data.role || 'officer',
            officer_profile: {
              department: data.department_name || 'Water & Sewerage',
              department_id: data.department_id || 1,
              region: 'Mumbai Central',
              designation: data.designation || 'Field Grievance Officer',
              employee_id: data.employee_id || `GOV-2026-OFF-${data.user_id || '001'}`,
            }
          }
        };
      }
      // Node.js backend format
      if (data.token && data.user) {
        return { token: data.token, user: data.user };
      }
      return null;
    };

    // Strategy 1: Render production FastAPI
    try {
      const res = await fetch(`${this.renderUrl}/officer/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLower, password: pwd })
      });
      if (res.ok) {
        const data = await res.json();
        const result = buildUser(data, emailLower);
        if (result) {
          localStorage.setItem('citizen_ai_token', result.token);
          localStorage.setItem('citizen_ai_user', JSON.stringify(result.user));
          return result;
        }
      }
    } catch { /* fall through */ }

    // Strategy 2: Local FastAPI gateway (http://localhost:8000)
    try {
      const res = await fetch('http://localhost:8000/officer/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLower, password: pwd })
      });
      if (res.ok) {
        const data = await res.json();
        const result = buildUser(data, emailLower);
        if (result) {
          localStorage.setItem('citizen_ai_token', result.token);
          localStorage.setItem('citizen_ai_user', JSON.stringify(result.user));
          return result;
        }
      }
    } catch { /* fall through */ }

    // Strategy 3: Local Node.js backend (http://localhost:5000)
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLower, password: pwd })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user?.role === 'officer' && data.token) {
          localStorage.setItem('citizen_ai_token', data.token);
          localStorage.setItem('citizen_ai_user', JSON.stringify(data.user));
          return { token: data.token, user: data.user };
        }
      }
    } catch { /* fall through */ }

    // Strategy 4: Known seeded officer accounts fallback
    const knownOfficers = {
      'officer.water@city.gov': { name: 'Officer Priya Sharma', dept: 'Water & Sewerage', deptId: 1 },
      'officer.power@city.gov': { name: 'Officer David Miller', dept: 'Electricity & Power', deptId: 2 },
      'officer@citizenai.gov.in': { name: 'Officer Rajesh Sharma', dept: 'Water & Sewerage', deptId: 1 },
      'officer.electricity@citizenai.gov.in': { name: 'Officer Priya Kumar', dept: 'Electricity & Power', deptId: 2 },
      'ranjith18@gmail.com': { name: 'Officer Ranjith Kumar', dept: 'Water & Sewerage', deptId: 1 },
      'kurubaranjith18@gmail.com': { name: 'Officer Ranjith Kumar', dept: 'Water & Sewerage', deptId: 1 },
    };

    const knownMatch = knownOfficers[emailLower];
    if (knownMatch && pwd === 'Officer@123') {
      const officerUser = {
        id: `officer-${Math.random().toString(36).substr(2, 9)}`,
        name: knownMatch.name,
        email: emailLower,
        role: 'officer',
        officer_profile: {
          department: knownMatch.dept,
          department_id: knownMatch.deptId,
          region: 'Mumbai Central',
          designation: 'Field Grievance Officer',
          employee_id: `GOV-2026-OFF-${Math.floor(Math.random() * 999999)}`
        }
      };
      const token = `officer_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('citizen_ai_token', token);
      localStorage.setItem('citizen_ai_user', JSON.stringify(officerUser));
      return { user: officerUser, token };
    }

    throw new Error('Invalid credentials. Please check your email and password.');
  }

  async registerOfficer(data) {
    // Try production first, fallback to local
    try {
      return await fetch(`${this.renderUrl}/officer/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json());
    } catch {
      return this.post('/officer/auth/register', data);
    }
  }

  async getMe() {
    // Try production
    try {
      const res = await fetch(`${this.renderUrl}/officer/me`, { headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        return { user: data.user || data };
      }
    } catch { /* fall through */ }

    // Fallback to localStorage
    const saved = localStorage.getItem('citizen_ai_user');
    if (saved) return { user: JSON.parse(saved) };
    throw new Error('No active officer session');
  }

  // ─────────────────────────────────────────────────────
  // 2. COMPLAINTS / QUEUE
  // ─────────────────────────────────────────────────────
  async getComplaints(params = {}) {
    const query = new URLSearchParams(params).toString();
    const normalize = (res) => {
      const list = res.items || res.complaints || (Array.isArray(res) ? res : []);
      return {
        complaints: list.map(item => ({
          id: item.id || item.issue_id,
          title: item.title || item.subject || 'Untitled Complaint',
          description: item.description || item.summary || '',
          department: item.department_name || item.department || 'General',
          region: item.ward || item.region || 'City',
          priority: (item.priority || 'normal').toLowerCase(),
          status: (item.status || 'pending').toLowerCase(),
          is_emergency: item.priority === 'emergency' || item.priority === 'high' || item.is_emergency,
          ai_summary: item.ai_summary || item.summary || item.description,
          sla_deadline: item.sla_deadline || item.target_resolution_at,
          created_at: item.created_at,
          citizen: item.citizen || { name: item.citizen_name || 'Citizen', email: item.citizen_email || '' },
        })),
        total: res.total || list.length
      };
    };

    try {
      const res = await fetch(`${this.renderUrl}/officer/queue?${query}`, { headers: this.getHeaders() });
      if (res.ok) return normalize(await res.json());
    } catch { /* fall through */ }

    try {
      const res = await this.get(`/officer/queue?${query}`);
      return normalize(res);
    } catch { /* fall through */ }

    return { complaints: [], total: 0 };
  }

  async getComplaint(id) {
    try {
      const res = await fetch(`${this.renderUrl}/officer/issues/${id}`, { headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        return { complaint: data.issue || data };
      }
    } catch { /* fall through */ }
    return this.get(`/officer/issues/${id}`).catch(() => ({ complaint: null }));
  }

  async assignComplaint(id, data) {
    try {
      const res = await fetch(`${this.renderUrl}/officer/issues/${id}/claim`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ notes: data.notes || '', version: data.version || 1 })
      });
      if (res.ok) return res.json();
    } catch { /* fall through */ }
    return this.patch(`/officer/issues/${id}/claim`, data);
  }

  async updateComplaint(id, data) {
    const payload = {
      status: data.new_status || 'in_progress',
      action_taken: data.update_text || '',
      resolution_notes: data.update_text || '',
      version: data.version || 1
    };
    try {
      const res = await fetch(`${this.renderUrl}/officer/issues/${id}/status`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) return res.json();
    } catch { /* fall through */ }
    return this.patch(`/officer/issues/${id}/status`, payload);
  }

  markMalicious(id, data) {
    return fetch(`${this.renderUrl}/officer/issues/${id}/mark-malicious`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()).catch(() => this.patch(`/officer/issues/${id}/mark-malicious`, data));
  }

  // ─────────────────────────────────────────────────────
  // 3. NOTIFICATIONS
  // ─────────────────────────────────────────────────────
  getNotifications() {
    return fetch(`${this.renderUrl}/officer/notifications`, { headers: this.getHeaders() })
      .then(r => r.ok ? r.json() : { notifications: [] })
      .catch(() => ({ notifications: [] }));
  }

  markNotificationRead(id) {
    return fetch(`${this.renderUrl}/notifications/${id}/read`, {
      method: 'PATCH', headers: this.getHeaders()
    }).catch(() => {});
  }

  markAllRead() {
    return fetch(`${this.renderUrl}/notifications/read-all`, {
      method: 'PATCH', headers: this.getHeaders()
    }).catch(() => {});
  }

  // ─────────────────────────────────────────────────────
  // 4. CHATBOT
  // ─────────────────────────────────────────────────────
  async chatbot(message) {
    try {
      const res = await fetch(`${this.renderUrl}/citizen/chatbot`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ message })
      });
      if (res.ok) return res.json();
    } catch { /* fall through */ }
    return this.post('/citizen/chatbot', { message });
  }
}

export const api = new ApiClient();
export default api;
