const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const supabase = require('../config/supabase');
const aiService = require('../services/aiService');

// GET /api/notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ success: true, notifications: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chatbot or /
router.post(['/', '/chatbot'], authMiddleware, async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    
    // Fetch citizen's active complaints from DB for real context
    const { data: userComplaints } = await supabase
      .from('complaints')
      .select('id, title, category, department, priority, status, sla_deadline, region, created_at, assigned_to')
      .eq('citizen_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const enrichedComplaints = [];
    if (userComplaints && userComplaints.length > 0) {
      for (const c of userComplaints) {
        let officerName = null;
        if (c.assigned_to) {
          const { data: offUser } = await supabase.from('users').select('name').eq('id', c.assigned_to).single();
          officerName = offUser?.name || null;
        }
        enrichedComplaints.push({
          ...c,
          officer_name: officerName
        });
      }
    }

    const context = {
      userName: req.user?.name || 'Citizen',
      complaintCount: enrichedComplaints.length,
      region: req.user?.region || 'Chennai',
      complaints: enrichedComplaints,
    };

    const response = await aiService.chatbotResponse(message || '', context);
    res.json({ success: true, response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
