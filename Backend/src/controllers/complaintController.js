const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const aiService = require('../services/aiService');
const path = require('path');
const fs = require('fs');

const SLA_HOURS = {
  emergency: 2,
  high: 24,
  normal: 72,
  low: 168,
};

// POST /api/complaints — Create complaint (citizen)
const createComplaint = async (req, res) => {
  try {
    const { title, description, address, lat, lng } = req.body;
    const citizenId = req.userId;
    const region = req.user.region;

    // Check if citizen is banned
    if (req.user.is_banned) {
      return res.status(403).json({ error: 'Your account is currently suspended from filing complaints' });
    }

    // Get audio transcription if audio file uploaded
    let transcriptData = null;
    let finalDescription = description || '';

    if (req.files && req.files.audio && req.files.audio[0]) {
      const audioPath = req.files.audio[0].path;
      try {
        transcriptData = await aiService.transcribeAudio(audioPath);
        finalDescription = transcriptData.text || description;
        fs.unlinkSync(audioPath); // cleanup temp file
      } catch (err) {
        console.error('STT error:', err.message);
      }
    }

    if (!finalDescription || finalDescription.trim().length < 10) {
      return res.status(400).json({ error: 'Complaint description is too short' });
    }

    // AI Classification
    const classification = await aiService.classifyComplaint(finalDescription, title);

    // Upload audio to Supabase Storage
    let audioUrl = null;
    if (req.files && req.files.audio && req.files.audio[0]) {
      // Already processed above
    }

    // Upload images
    let imageUrls = [];
    if (req.files && req.files.images) {
      for (const imageFile of req.files.images) {
        const fileName = `complaints/${citizenId}/${uuidv4()}-${imageFile.originalname}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('complaint-assets')
          .upload(fileName, imageFile.buffer, {
            contentType: imageFile.mimetype,
            upsert: false,
          });
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('complaint-assets').getPublicUrl(fileName);
          imageUrls.push(publicUrl);
        }
      }
    }

    // Detect duplicates from recent similar complaints (last 7 days, same region)
    const { data: recentComplaints } = await supabase
      .from('complaints')
      .select('id, title, description')
      .eq('region', region)
      .eq('department', classification.department)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(50);

    let dupResult = { isDuplicate: false, duplicateOf: null, similarity: 0 };
    try {
      const detected = await aiService.detectDuplicate(finalDescription, recentComplaints || []);
      if (detected) dupResult = detected;
    } catch (dupErr) {
      console.warn('Duplicate detection error fallback:', dupErr.message);
    }

    const complaintId = uuidv4();
    const slaHours = SLA_HOURS[classification.priority] || 72;
    const deadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

    const isDuplicate = Boolean(dupResult && dupResult.isDuplicate);

    const { data: complaint, error } = await supabase.from('complaints').insert({
      id: complaintId,
      citizen_id: citizenId,
      title: title || classification.category,
      description: finalDescription,
      transcript: transcriptData?.text || null,
      detected_language: transcriptData?.language || 'en',
      audio_url: audioUrl,
      image_urls: imageUrls,
      category: classification.category,
      department: classification.department,
      priority: classification.priority,
      sentiment: classification.sentiment,
      sentiment_score: classification.sentiment_score,
      ai_summary: classification.summary,
      keywords: classification.keywords,
      is_emergency: classification.is_emergency,
      is_duplicate: isDuplicate,
      duplicate_of: dupResult.duplicateOf || null,
      status: isDuplicate ? 'duplicate' : 'pending',
      address: address || req.user.address,
      lat: lat || req.user.lat,
      lng: lng || req.user.lng,
      region,
      sla_hours: slaHours,
      sla_deadline: deadline,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;

    // If not duplicate, notify officers in same region+department
    if (!isDuplicate) {
      await notifyOfficers(complaint, req.app.get('io'));
    }

    // Create SLA tracking
    await supabase.from('sla_tracking').insert({
      id: uuidv4(),
      complaint_id: complaintId,
      sla_hours: slaHours,
      started_at: new Date().toISOString(),
      deadline,
      status: 'active',
      breach_count: 0,
    });

    // Create initial timeline entry
    await supabase.from('timeline_updates').insert({
      id: uuidv4(),
      complaint_id: complaintId,
      update_text: `Complaint filed successfully. AI classified as: ${classification.department} - ${classification.category}. Priority: ${classification.priority.toUpperCase()}.`,
      status: 'pending',
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({ 
      success: true, 
      complaint,
      classification,
      is_duplicate: isDuplicate,
    });
  } catch (err) {
    console.error('Create complaint error:', err);
    res.status(500).json({ error: err.message });
  }

};

const notifyOfficers = async (complaint, io) => {
  const deptKey = (complaint.department || '').replace(/[^a-zA-Z0-9]/g, '_');
  
  // Get officers specifically in matching region and matching department
  const { data: officers } = await supabase
    .from('officers')
    .select('user_id, id, name, department, region')
    .eq('region', complaint.region)
    .eq('department', complaint.department)
    .eq('status', 'approved');

  if (officers && officers.length > 0) {
    for (const officer of officers) {
      // Create DB notification for each matching officer
      await supabase.from('notifications').insert({
        id: uuidv4(),
        user_id: officer.user_id,
        type: 'new_complaint',
        message: `[${complaint.region} • ${complaint.department}] New ${complaint.priority.toUpperCase()} grievance: ${complaint.title}`,
        complaint_id: complaint.id,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }
  }

  // Real-time broadcast to department+region room, region room, and admin room
  if (io) {
    io.to(`dept_${complaint.region}_${deptKey}`).emit('new_complaint', complaint);
    io.to(`region_${complaint.region}`).emit('new_complaint', complaint);
    io.to('admin').emit('new_complaint', complaint);
    if (complaint.is_emergency) {
      io.to(`dept_${complaint.region}_${deptKey}`).emit('emergency_alert', complaint);
      io.to(`region_${complaint.region}`).emit('emergency_alert', complaint);
      io.to('admin').emit('emergency_alert', complaint);
    }
  }
};

// GET /api/complaints — Get complaints (role-based)
const getComplaints = async (req, res) => {
  try {
    const { status, department, priority, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase.from('complaints').select(`
      *,
      citizen:users!complaints_citizen_id_fkey(name, email, phone),
      assignments:complaint_assignments(officer_id, action, timestamp, notes, officer:users(name))
    `, { count: 'exact' });

    if (req.user.role === 'citizen') {
      query = query.eq('citizen_id', req.userId);
    } else if (req.user.role === 'officer') {
      const { data: officer } = await supabase.from('officers').select('department, region').eq('user_id', req.userId).single();
      // If officer has a specific department (not General Administration / General), filter by it
      if (officer?.department && !['general administration', 'general', 'all'].includes(officer.department.toLowerCase())) {
        query = query.eq('department', officer.department);
      }
      if (officer?.region && !['all', 'city', 'city central', 'general'].includes(officer.region.toLowerCase())) {
        if (req.query.region) {
          query = query.eq('region', req.query.region);
        }
      }
      query = query.neq('is_duplicate', true);
    }
    // Admin sees all



    if (status) query = query.eq('status', status);
    if (department) query = query.eq('department', department);
    if (priority) query = query.eq('priority', priority);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ 
      success: true, 
      complaints: data, 
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    console.error('Get complaints error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/complaints/:id
const getComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('complaints')
      .select(`
        *,
        citizen:users!complaints_citizen_id_fkey(name, email, phone, region),
        assignments:complaint_assignments(*, officer:users(name, email)),
        timeline:timeline_updates(*),
        sla:sla_tracking(*)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Complaint not found' });

    // Access control
    if (req.user.role === 'citizen' && data.citizen_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ success: true, complaint: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/complaints/:id/assign — Officer accepts/rejects
const assignComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'accepted' | 'rejected'
    const officerId = req.userId;
    const io = req.app.get('io');

    if (!['accepted', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Action must be accepted or rejected' });
    }

    const { data: complaint, error: cError } = await supabase
      .from('complaints')
      .select('*, citizen:users!complaints_citizen_id_fkey(name)')
      .eq('id', id)
      .single();

    if (cError || !complaint) return res.status(404).json({ error: 'Complaint not found' });

    const { data: officer } = await supabase
      .from('officers')
      .select('name, department, region')
      .eq('user_id', officerId)
      .single();

    // Allow verified field officers to claim triage grievances
    if (officer?.department && !['general administration', 'general', 'all'].includes(officer.department.toLowerCase())) {
      // If officer has a specialized department, log jurisdiction
      console.log(`[Assign] Officer ${officer.name} (${officer.department}) claiming ${complaint.department} case`);
    }


    // Check if already accepted by another officer
    const { data: existingAccept } = await supabase
      .from('complaint_assignments')
      .select('*')
      .eq('complaint_id', id)
      .eq('action', 'accepted')
      .single();

    if (existingAccept && action === 'accepted') {
      return res.status(409).json({ error: 'Grievance already claimed by another officer', accepted_by: existingAccept });
    }

    const now = new Date();
    const slaHours = complaint.sla_hours || SLA_HOURS[complaint.priority] || 72;
    const deadline = new Date(now.getTime() + slaHours * 60 * 60 * 1000).toISOString();

    // Create assignment record
    const assignmentId = uuidv4();
    await supabase.from('complaint_assignments').insert({
      id: assignmentId,
      complaint_id: id,
      officer_id: officerId,
      action,
      notes: notes || '',
      timestamp: now.toISOString(),
    });

    const newStatus = action === 'accepted' ? 'in_progress' : 'rejected';

    // When officer ACCEPTS: Official SLA countdown starts from now!
    if (action === 'accepted') {
      await supabase.from('complaints').update({
        status: newStatus,
        assigned_to: officerId,
        sla_started_at: now.toISOString(),
        sla_deadline: deadline,
        updated_at: now.toISOString(),
      }).eq('id', id);

      // Initialize / activate SLA tracking record with start time
      await supabase.from('sla_tracking').update({
        started_at: now.toISOString(),
        deadline: deadline,
        status: 'active',
      }).eq('complaint_id', id);
    } else {
      await supabase.from('complaints').update({
        status: newStatus,
        assigned_to: null,
        updated_at: now.toISOString(),
      }).eq('id', id);
    }

    // Add timeline update
    await supabase.from('timeline_updates').insert({
      id: uuidv4(),
      complaint_id: id,
      officer_id: officerId,
      update_text: action === 'accepted' 
        ? `Grievance claimed and accepted by Officer ${officer?.name || 'Authorized Personnel'}. Official ${slaHours}-hour SLA resolution window initiated.`
        : `Grievance evaluated by Officer ${officer?.name || 'Authorized Personnel'}. Result: Rejected (${notes || 'No reason provided'})`,
      status: newStatus,
      timestamp: now.toISOString(),
    });

    // Notify citizen with SLA details
    await supabase.from('notifications').insert({
      id: uuidv4(),
      user_id: complaint.citizen_id,
      type: action === 'accepted' ? 'complaint_accepted' : 'complaint_rejected',
      message: action === 'accepted' 
        ? `Your grievance "${complaint.title}" has been accepted by Officer ${officer?.name || 'Staff'}. Official ${slaHours}-hour SLA target resolution window is now active.`
        : `Your grievance "${complaint.title}" was reviewed and rejected. Details: ${notes || 'Standard protocol'}`,
      complaint_id: id,
      is_read: false,
      created_at: now.toISOString(),
    });

    // If rejected: increment warning count and ban citizen if 3 strikes
    if (action === 'rejected') {
      const { data: citizen } = await supabase
        .from('users')
        .select('warning_count, id')
        .eq('id', complaint.citizen_id)
        .single();

      const newWarnings = (citizen?.warning_count || 0) + 1;
      const updates = { warning_count: newWarnings };

      if (newWarnings >= 3) {
        updates.is_banned = true;
        updates.ban_until = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      }

      await supabase.from('users').update(updates).eq('id', complaint.citizen_id);
    }

    const deptKey = (complaint.department || '').replace(/[^a-zA-Z0-9]/g, '_');

    // 100% Real-time synchronization broadcast across all relevant rooms
    if (io) {
      const broadcastData = {
        complaintId: id,
        action,
        officerName: officer?.name,
        department: complaint.department,
        region: complaint.region,
        status: newStatus,
        sla_started_at: now.toISOString(),
        sla_deadline: deadline,
      };

      // 1. Notify department+region officers
      io.to(`dept_${complaint.region}_${deptKey}`).emit('complaint_assigned', broadcastData);
      // 2. Notify regional officers
      io.to(`region_${complaint.region}`).emit('complaint_assigned', broadcastData);
      // 3. Notify citizen who filed it
      io.to(`citizen_${complaint.citizen_id}`).emit('complaint_update', {
        complaintId: id,
        status: newStatus,
        officerName: officer?.name,
        sla_deadline: deadline,
        message: action === 'accepted' ? 'Your grievance has been claimed by a field officer!' : 'Your grievance status has been updated.',
      });
      // 4. Notify admin room
      io.to('admin').emit('complaint_assigned', broadcastData);
      // 5. Notify specific complaint room
      io.to(`complaint_${id}`).emit('complaint_assigned', broadcastData);
    }

    res.json({ 
      success: true, 
      action, 
      assignment_id: assignmentId,
      sla_deadline: deadline,
      sla_started_at: now.toISOString(),
      status: newStatus
    });
  } catch (err) {
    console.error('Assign complaint error:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/complaints/:id/update — Officer posts status update
const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { update_text, new_status } = req.body;
    const officerId = req.userId;
    const io = req.app.get('io');

    const { data: complaint } = await supabase.from('complaints').select('citizen_id, title, region').eq('id', id).single();
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    // Add timeline update
    await supabase.from('timeline_updates').insert({
      id: uuidv4(),
      complaint_id: id,
      officer_id: officerId,
      update_text,
      status: new_status || 'in_progress',
      timestamp: new Date().toISOString(),
    });

    if (new_status) {
      await supabase.from('complaints').update({
        status: new_status,
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      if (new_status === 'resolved') {
        await supabase.from('sla_tracking').update({ status: 'completed' }).eq('complaint_id', id);
      }
    }

    // Notify citizen
    const { data: officer } = await supabase.from('officers').select('name').eq('user_id', officerId).single();
    await supabase.from('notifications').insert({
      id: uuidv4(),
      user_id: complaint.citizen_id,
      type: 'complaint_update',
      message: `Update on your complaint "${complaint.title}": ${update_text}`,
      complaint_id: id,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    if (io) {
      io.to(`citizen_${complaint.citizen_id}`).emit('complaint_update', {
        complaintId: id,
        status: new_status,
        update: update_text,
        officerName: officer?.name,
      });
      io.to(`region_${complaint.region}`).emit('complaint_status_changed', { complaintId: id, status: new_status });
      io.to('admin').emit('complaint_status_changed', { complaintId: id, status: new_status });
    }

    res.json({ success: true, message: 'Update posted' });
  } catch (err) {
    console.error('Update complaint error:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/complaints/transcribe — Just transcribe audio
const transcribeAudio = async (req, res) => {
  try {
    if (!req.files || !req.files.audio) {
      return res.status(400).json({ error: 'Audio file required' });
    }
    const audioPath = req.files.audio[0].path;
    const result = await aiService.transcribeAudio(audioPath);
    fs.unlinkSync(audioPath);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/complaints/classify — Pre-classify before submitting
const preClassify = async (req, res) => {
  try {
    const { text, title } = req.body;
    const result = await aiService.classifyComplaint(text, title);
    res.json({ success: true, classification: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { 
  createComplaint, 
  getComplaints, 
  getComplaint, 
  assignComplaint, 
  updateComplaint,
  transcribeAudio,
  preClassify,
};
