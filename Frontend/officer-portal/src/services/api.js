const API_BASE = import.meta.env.VITE_API_URL || 'https://hexaware-mavericks.onrender.com';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE.replace(/\/$/, '');
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

    if (data) {
      options.body = isMultipart ? data : JSON.stringify(data);
    }

    const response = await fetch(url, options);
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

  // 1. Officer Authentication (Supports both FastAPI Gateway & Node backend)
  async loginUser(credentials) {
    try {
      // Try FastAPI Gateway endpoint: /officer/auth/login
      const res = await this.post('/officer/auth/login', credentials);
      const token = res.access_token || res.token;
      const user = res.user || {
        id: res.user_id || 'officer-1',
        name: res.name || 'Officer',
        email: credentials.email,
        role: 'officer',
        officer_profile: {
          department: res.department || 'Water & Sewerage',
          region: res.region || 'Mumbai',
          designation: res.designation || 'Field Officer',
        }
      };
      return { user, token };
    } catch (e) {
      // Fallback to standard /api/auth/login or /auth/login
      const res = await this.post('/auth/login', credentials);
      return { user: res.user, token: res.token || res.access_token };
    }
  }

  registerOfficer(data) { 
    return this.post('/auth/register/officer', data).catch(() => this.post('/admin/users', { ...data, role: 'officer' })); 
  }

  async getMe() { 
    try {
      const res = await this.get('/officer/me');
      return { user: res.user || res };
    } catch {
      return this.get('/auth/me');
    }
  }

  // 2. Officer Queue & Complaints (Supports /officer/queue and /complaints)
  async getComplaints(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      // Try FastAPI gateway /officer/queue
      const res = await this.get(`/officer/queue?${query}`);
      const list = res.items || res.complaints || res;
      // Normalize FastAPI issue schema to frontend model if needed
      const normalized = Array.isArray(list) ? list.map(item => ({
        id: item.id || item.issue_id,
        title: item.title,
        description: item.description,
        department: item.department || item.department_name,
        region: item.ward || item.region || 'Mumbai',
        priority: (item.priority || 'normal').toLowerCase(),
        status: (item.status || 'pending').toLowerCase(),
        is_emergency: item.priority === 'emergency' || item.priority === 'high' || item.is_emergency,
        ai_summary: item.ai_summary || item.summary || item.description,
        sla_deadline: item.sla_deadline || item.target_resolution_at,
        created_at: item.created_at,
        citizen: item.citizen || { name: item.citizen_name || 'Citizen' },
      })) : [];
      return { complaints: normalized, total: res.total || normalized.length };
    } catch {
      // Fallback to /complaints
      return this.get(`/complaints?${query}`);
    }
  }

  // 3. Issue Detail
  async getComplaint(id) { 
    try {
      const res = await this.get(`/officer/issues/${id}`);
      const c = res.issue || res;
      return {
        complaint: {
          id: c.id,
          title: c.title,
          description: c.description,
          department: c.department || c.department_name,
          region: c.ward || c.region,
          priority: (c.priority || 'normal').toLowerCase(),
          status: (c.status || 'pending').toLowerCase(),
          is_emergency: c.priority === 'emergency' || c.priority === 'high',
          ai_summary: c.ai_summary || c.description,
          sla_deadline: c.sla_deadline || c.target_resolution_at,
          created_at: c.created_at,
          citizen: c.citizen || { name: c.citizen_name || 'Citizen' },
          timeline: c.timeline || [],
        }
      };
    } catch {
      return this.get(`/complaints/${id}`);
    }
  }

  // 4. Claim / Assign Complaint (Starts SLA)
  async assignComplaint(id, data) { 
    try {
      // Try FastAPI optimistic locking claim: PATCH /officer/issues/{id}/claim
      return await this.patch(`/officer/issues/${id}/claim`, { notes: data.notes || '' });
    } catch {
      // Fallback to Node backend: POST /complaints/{id}/assign
      return await this.post(`/complaints/${id}/assign`, data);
    }
  }

  // 5. Update Status & Timeline
  async updateComplaint(id, data) { 
    try {
      // Try FastAPI endpoint: PATCH /officer/issues/{id}/status
      return await this.patch(`/officer/issues/${id}/status`, { 
        status: data.new_status || 'in_progress', 
        action_taken: data.update_text || '',
        resolution_notes: data.update_text || '' 
      });
    } catch {
      // Fallback to Node backend: POST /complaints/{id}/update
      return await this.post(`/complaints/${id}/update`, data);
    }
  }

  // 6. Mark Malicious
  markMalicious(id, data) {
    return this.patch(`/officer/issues/${id}/mark-malicious`, data);
  }

  // 7. Notifications
  getNotifications() { return this.get('/officer/notifications').catch(() => this.get('/notifications')); }
  markNotificationRead(id) { return this.patch(`/notifications/${id}/read`); }
  markAllRead() { return this.patch('/notifications/read-all'); }

  // 8. Chatbot
  chatbot(message) { return this.post('/citizen/chatbot', { message }).catch(() => this.post('/chatbot', { message })); }
}

export const api = new ApiClient();
export default api;
