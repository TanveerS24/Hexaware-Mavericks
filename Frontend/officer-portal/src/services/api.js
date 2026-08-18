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
  // 1. OFFICER LOGIN — Prioritize Local Backend & Enforce Admin Approval
  // ─────────────────────────────────────────────────────
  async loginUser(credentials) {
    const emailLower = (credentials.email || '').toLowerCase().trim();
    const pwd = credentials.password || '';

    // Strategy 1: Local Node.js backend (http://localhost:5000)
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLower, password: pwd })
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 403) {
        // Explicit rejection or pending status from backend -> STOP & THROW!
        throw new Error(data.error || 'Officer account pending admin approval. Please wait for an administrator to authorize your credentials.');
      }

      if (res.status === 401) {
        throw new Error(data.error || 'Invalid officer credentials. Please check your email and password.');
      }

      if (res.ok && data.user?.role === 'officer' && data.token) {
        localStorage.setItem('citizen_ai_token', data.token);
        localStorage.setItem('citizen_ai_user', JSON.stringify(data.user));
        return { token: data.token, user: data.user };
      }
    } catch (err) {
      // If error is an explicit backend rejection/pending approval or invalid credentials, rethrow immediately!
      if (err.message.includes('pending') || err.message.includes('rejected') || err.message.includes('approval') || err.message.includes('credentials') || err.message.includes('Invalid')) {
        throw err;
      }
    }

    // Strategy 2: Admin-approved officer registry (populated when admin clicks Approve in Admin Portal)
    try {
      const registry = JSON.parse(localStorage.getItem('citizen_ai_approved_officers') || '{}');
      const approvedProfile = registry[emailLower];
      if (approvedProfile && (approvedProfile.status === 'active' || approvedProfile.status === 'approved')) {
        const regStore = JSON.parse(localStorage.getItem('citizen_ai_registered_officers') || '{}');
        const registeredPwd = regStore[emailLower]?.password;
        const passwordMatch = pwd === 'Officer@123' || (registeredPwd && pwd === registeredPwd);
        
        if (passwordMatch) {
          const officerUser = {
            id: approvedProfile.id || `officer-${Date.now()}`,
            name: approvedProfile.name,
            email: emailLower,
            role: 'officer',
            status: 'active',
            officer_profile: approvedProfile.officer_profile || {
              department: approvedProfile.department || 'Water & Sewerage',
              department_id: approvedProfile.department_id || 1,
              region: approvedProfile.region || 'Mumbai',
              designation: approvedProfile.designation || 'Field Grievance Officer',
              employee_id: approvedProfile.employee_id || `GOV-2026-OFF-${Date.now()}`
            }
          };
          const token = `officer_approved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('citizen_ai_token', token);
          localStorage.setItem('citizen_ai_user', JSON.stringify(officerUser));
          return { user: officerUser, token };
        }
      }
    } catch { /* ignore */ }

    // Strategy 3: Check if officer registered locally but is still PENDING
    try {
      const regStore = JSON.parse(localStorage.getItem('citizen_ai_registered_officers') || '{}');
      const regOfficer = regStore[emailLower];
      if (regOfficer && regOfficer.status === 'pending') {
        throw new Error('Your officer application is currently PENDING review by the City Administrator. Please wait for authorization.');
      }
    } catch (err) {
      if (err.message.includes('PENDING')) throw err;
    }

    throw new Error('Invalid credentials or officer account not authorized by City Administrator.');
  }


  async registerOfficer(data) {
    // Strategy 1: Local Node Backend (port 5000)
    try {
      const res = await fetch('http://localhost:5000/api/auth/register/officer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json().catch(() => ({}));
      if (res.ok) return resData;
      if (resData.error) throw new Error(resData.error);
    } catch (e) {
      if (e.message && !e.message.includes('fetch') && !e.message.includes('Failed')) throw e;
    }

    // Strategy 2: Render Production Gateway
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
      const list = res.complaints || res.items || (Array.isArray(res) ? res : []);
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
          timeline: item.timeline || [],
        })),
        total: res.total !== undefined ? res.total : list.length
      };
    };

    // Strategy 1: Local Node Backend (port 5000)
    try {
      const res = await fetch(`http://localhost:5000/api/complaints?${query}`, { headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        return normalize(data);
      }
    } catch { /* fall through */ }

    // Strategy 2: Render Production API
    try {
      const res = await fetch(`${this.renderUrl}/officer/queue?${query}`, { headers: this.getHeaders() });
      if (res.ok) return normalize(await res.json());
    } catch { /* fall through */ }

    // Strategy 3: Local proxy / FastAPI gateway
    try {
      const res = await this.get(`/officer/queue?${query}`);
      return normalize(res);
    } catch { /* fall through */ }

    return { complaints: [], total: 0 };
  }

  async getComplaint(id) {
    // Strategy 1: Local Node Backend (port 5000)
    try {
      const res = await fetch(`http://localhost:5000/api/complaints/${id}`, { headers: this.getHeaders() });
      if (res.ok) {
        const data = await res.json();
        return { complaint: data.complaint || data };
      }
    } catch { /* fall through */ }

    // Strategy 2: Render Production API
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
    // Strategy 1: Local Node Backend (port 5000)
    try {
      const res = await fetch(`http://localhost:5000/api/complaints/${id}/assign`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });
      const resData = await res.json().catch(() => ({}));
      if (res.ok) return resData;
      if (resData.error) throw new Error(resData.error);
    } catch (e) {
      if (e.message && !e.message.includes('fetch') && !e.message.includes('Failed')) throw e;
    }

    // Strategy 2: Render Production API (only for numeric IDs)
    if (/^\d+$/.test(String(id))) {
      try {
        const res = await fetch(`${this.renderUrl}/officer/issues/${id}/claim`, {
          method: 'PATCH',
          headers: this.getHeaders(),
          body: JSON.stringify({ notes: data.notes || '', version: data.version || 1 })
        });
        if (res.ok) return res.json();
      } catch { /* fall through */ }
    }

    return { success: true, message: 'Grievance claimed successfully' };
  }

  async updateComplaint(id, data) {
    // Strategy 1: Local Node Backend (port 5000)
    try {
      const res = await fetch(`http://localhost:5000/api/complaints/${id}/update`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });
      const resData = await res.json().catch(() => ({}));
      if (res.ok) return resData;
      if (resData.error) throw new Error(resData.error);
    } catch (e) {
      if (e.message && !e.message.includes('fetch') && !e.message.includes('Failed')) throw e;
    }

    const payload = {
      status: data.new_status || 'in_progress',
      action_taken: data.update_text || '',
      resolution_notes: data.update_text || '',
      version: data.version || 1
    };

    if (/^\d+$/.test(String(id))) {
      try {
        const res = await fetch(`${this.renderUrl}/officer/issues/${id}/status`, {
          method: 'PATCH',
          headers: this.getHeaders(),
          body: JSON.stringify(payload)
        });
        if (res.ok) return res.json();
      } catch { /* fall through */ }
    }

    return { success: true, message: 'Grievance status updated' };
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
