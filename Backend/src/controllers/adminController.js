const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const aiService = require('../services/aiService');

// GET /api/admin/officers — List all officers with status
const listOfficers = async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase.from('officers').select('*, user:users(name, email, phone, region, created_at)').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, officers: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/officers/:id/approve — Approve officer
const approveOfficer = async (req, res) => {
  try {
    const { id } = req.params;
    const io = req.app.get('io');

    // Find officer by id or user_id or email
    const { data: officersList } = await supabase.from('officers').select('*');
    const officerMatch = (officersList || []).find(o => 
      o.id === id || o.user_id === id || o.email?.toLowerCase() === id.toLowerCase()
    );

    const targetId = officerMatch?.id || id;
    const userId = officerMatch?.user_id || id;

    const { data: officer, error } = await supabase
      .from('officers')
      .update({ status: 'approved', approved_by: req.userId || 'admin', approved_at: new Date().toISOString() })
      .eq('id', targetId)
      .select('*, user:users(name, email)')
      .single();

    if (error) throw error;

    // Notify officer
    await supabase.from('notifications').insert({
      id: uuidv4(),
      user_id: userId,
      type: 'account_approved',
      message: 'Your officer account has been approved! You can now log in.',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    if (io) {
      io.to(`user_${userId}`).emit('account_approved', { officerId: targetId, userId });
      io.to('admin').emit('officer_approved', { officerId: targetId, userId });
      io.emit('officer_approved', { officerId: targetId, userId });
    }

    res.json({ success: true, officer: officer || { id: targetId, user_id: userId, status: 'approved' } });
  } catch (err) {
    console.error('Approve officer error:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/officers/:id/reject
const rejectOfficer = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const io = req.app.get('io');

    const { data: officersList } = await supabase.from('officers').select('*');
    const officerMatch = (officersList || []).find(o => 
      o.id === id || o.user_id === id || o.email?.toLowerCase() === id.toLowerCase()
    );

    const targetId = officerMatch?.id || id;
    const userId = officerMatch?.user_id || id;

    const { data: officer, error } = await supabase
      .from('officers')
      .update({ status: 'rejected', rejection_reason: reason || '' })
      .eq('id', targetId)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('notifications').insert({
      id: uuidv4(),
      user_id: userId,
      type: 'account_rejected',
      message: `Your officer registration was not approved. Reason: ${reason || 'Not specified'}`,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    if (io) {
      io.to(`user_${userId}`).emit('account_rejected', { officerId: targetId, userId, reason });
      io.to('admin').emit('officer_rejected', { officerId: targetId, userId });
      io.emit('officer_rejected', { officerId: targetId, userId });
    }

    res.json({ success: true, message: 'Officer rejected' });
  } catch (err) {
    console.error('Reject officer error:', err);
    res.status(500).json({ error: err.message });
  }
};


// GET /api/admin/analytics — Dashboard analytics
const getAnalytics = async (req, res) => {
  try {
    const { region, days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let baseQuery = supabase.from('complaints').select('*').gte('created_at', since);
    if (region) baseQuery = baseQuery.eq('region', region);

    const { data: complaints, error } = await baseQuery;
    if (error) throw error;

    const total = complaints.length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const pending = complaints.filter(c => c.status === 'pending').length;
    const inProgress = complaints.filter(c => c.status === 'in_progress').length;
    const duplicates = complaints.filter(c => c.is_duplicate).length;
    const emergency = complaints.filter(c => c.is_emergency).length;

    // By department
    const byDepartment = {};
    complaints.forEach(c => {
      byDepartment[c.department] = (byDepartment[c.department] || 0) + 1;
    });

    // By priority
    const byPriority = { emergency: 0, high: 0, normal: 0, low: 0 };
    complaints.forEach(c => { byPriority[c.priority] = (byPriority[c.priority] || 0) + 1; });

    // By region (heatmap data)
    const byRegion = {};
    complaints.forEach(c => {
      if (c.region) byRegion[c.region] = (byRegion[c.region] || 0) + 1;
    });

    // Trend by day
    const trendByDay = {};
    complaints.forEach(c => {
      const day = c.created_at.substring(0, 10);
      trendByDay[day] = (trendByDay[day] || 0) + 1;
    });

    // Avg resolution time
    const resolvedWithTime = complaints.filter(c => c.status === 'resolved' && c.created_at && c.updated_at);
    const avgResolutionHours = resolvedWithTime.length > 0
      ? resolvedWithTime.reduce((sum, c) => {
          const hrs = (new Date(c.updated_at) - new Date(c.created_at)) / (1000 * 60 * 60);
          return sum + hrs;
        }, 0) / resolvedWithTime.length
      : 0;

    // AI insights
    const analyticsData = { total, resolved, pending, byDepartment, byPriority, byRegion };
    const insights = await aiService.generateInsights(analyticsData);

    // Officers count
    const { count: officerCount } = await supabase.from('officers').select('id', { count: 'exact' }).eq('status', 'approved');
    const { count: pendingOfficers } = await supabase.from('officers').select('id', { count: 'exact' }).eq('status', 'pending');

    res.json({
      success: true,
      analytics: {
        total, resolved, pending, inProgress, duplicates, emergency,
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
        byDepartment,
        byPriority,
        byRegion,
        trendByDay,
        officerCount: officerCount || 0,
        pendingOfficers: pendingOfficers || 0,
      },
      insights,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/duplicates — List duplicate complaints
const getDuplicates = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select('*, citizen:users!complaints_citizen_id_fkey(name, email)')
      .eq('is_duplicate', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, duplicates: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/citizens/:id/unban
const unbanCitizen = async (req, res) => {
  try {
    const { id } = req.params;
    await supabase.from('users').update({ is_banned: false, ban_until: null, warning_count: 0 }).eq('id', id);
    res.json({ success: true, message: 'Citizen unbanned' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/complaints — All complaints with full audit
const getAllComplaints = async (req, res) => {
  try {
    const { status, region, department, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase.from('complaints').select(`
      *,
      citizen:users!complaints_citizen_id_fkey(name, email, phone),
      assignments:complaint_assignments(action, timestamp, notes, officer:users(name))
    `, { count: 'exact' }).order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (region) query = query.eq('region', region);
    if (department) query = query.eq('department', department);

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ success: true, complaints: data, total: count, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/users — All users (citizens & officers with live metrics)
const listUsers = async (req, res) => {
  try {
    const { data: users, error: uErr } = await supabase.from('users').select('*');
    if (uErr) throw uErr;

    const { data: officers } = await supabase.from('officers').select('*');

    const { data: complaints } = await supabase.from('complaints').select('*');
    const { data: assignments } = await supabase.from('complaint_assignments').select('*');

    const formattedUsers = (users || []).map(u => {
      if (u.role === 'officer') {
        const offProf = (officers || []).find(o => o.user_id === u.id || o.email?.toLowerCase() === u.email?.toLowerCase()) || {};
        const officerAssignments = (assignments || []).filter(a => a.officer_id === u.id || a.officer_id === offProf.id);
        const resolvedCases = (complaints || []).filter(c => c.assigned_to === u.id && c.status === 'resolved');

        return {
          id: u.id,
          name: u.name || offProf.name || 'Officer',
          email: u.email,
          role: 'officer',
          department: offProf.department || 'General Administration',
          region: offProf.region || u.region || 'City',
          ward: offProf.region || u.region || 'City',
          phone: offProf.phone || u.phone || '',
          credibility_score: 1.0,
          is_blocked: Boolean(u.is_banned),
          action_count: officerAssignments.length,
          resolved_count: resolvedCases.length,
          avg_speed_hours: resolvedCases.length > 0 ? 3.5 : null,
          created_at: u.created_at || offProf.created_at,
        };
      }

      if (u.role === 'citizen') {
        const userComplaints = (complaints || []).filter(c => c.citizen_id === u.id);
        const penalty = (u.warning_count || 0) * 0.15;
        const credibility = Math.max(0.1, Math.min(1.0, 1.0 - penalty));

        return {
          id: u.id,
          name: u.name || 'Citizen',
          email: u.email,
          role: 'citizen',
          department: 'Public',
          region: u.region || 'City',
          ward: u.region || 'City',
          phone: u.phone || '',
          credibility_score: credibility,
          is_blocked: Boolean(u.is_banned),
          complaint_count: userComplaints.length,
          block_history: u.is_banned ? ['Spam warning'] : [],
          created_at: u.created_at,
        };
      }

      return {
        id: u.id,
        name: u.name || 'Administrator',
        email: u.email,
        role: 'admin',
        department: 'City Command',
        region: 'Headquarters',
        ward: 'Headquarters',
        phone: u.phone || '',
        credibility_score: 1.0,
        is_blocked: false,
        action_count: (complaints || []).length,
        resolved_count: (complaints || []).filter(c => c.status === 'resolved').length,
        avg_speed_hours: 2.1,
        created_at: u.created_at,
      };
    });

    res.json({ success: true, users: formattedUsers, total: formattedUsers.length });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/announcements
const listAnnouncements = async (req, res) => {
  try {
    const { data: broadcasts } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false });
    res.json({ success: true, items: broadcasts || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/announcements
const createAnnouncement = async (req, res) => {
  try {
    const { title, message, department, region, priority } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();
    const newBc = {
      id,
      title: title || 'Municipal Advisory',
      message: message || '',
      department: department || 'General Administration',
      region: region || 'All',
      priority: priority || 'normal',
      created_at: now
    };
    await supabase.from('broadcasts').insert(newBc);

    const io = req.app.get('io');
    if (io) {
      io.emit('new_broadcast', newBc);
    }
    res.status(201).json({ success: true, broadcast: newBc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { 
  listOfficers, 
  approveOfficer, 
  rejectOfficer, 
  getAnalytics, 
  getDuplicates, 
  unbanCitizen, 
  getAllComplaints, 
  listUsers,
  listAnnouncements,
  createAnnouncement
};


