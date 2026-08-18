const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');

const generateToken = (userId, role, extra = {}) => {
  return jwt.sign({ userId, role, ...extra }, process.env.JWT_SECRET || 'civic-intel-secret-key-2024', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};


// POST /api/auth/register/citizen
const registerCitizen = async (req, res) => {
  try {
    const { name, email, password, phone, address, region, lat, lng } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'Name, email, password, and phone are required' });
    }

    // Check if email exists
    const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    const { data: user, error } = await supabase.from('users').insert({
      id: userId,
      name,
      email,
      password_hash: hashedPassword,
      phone,
      address: address || '',
      region: region || '',
      lat: lat || null,
      lng: lng || null,
      role: 'citizen',
      is_banned: false,
      warning_count: 0,
      created_at: new Date().toISOString(),
    }).select('id, name, email, phone, region, role').single();

    if (error) throw error;

    const token = generateToken(userId, 'citizen', { name, email, region: region || 'Chennai' });
    res.status(201).json({ success: true, user, token });

  } catch (err) {
    console.error('Register citizen error:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/register/officer
const registerOfficer = async (req, res) => {
  try {
    const { name, email, password, phone, department, region, employee_id, designation } = req.body;
    if (!name || !email || !password || !department || !region) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(password, 12);
    const io = req.app.get('io');

    // Check if user already exists
    const { data: existingUser } = await supabase.from('users').select('id, role').eq('email', normalizedEmail).single();

    let userId = existingUser?.id;
    let officerId = null;

    if (existingUser) {
      // Update existing officer user
      await supabase.from('users').update({
        name,
        password_hash: hashedPassword,
        phone: phone || '',
        region,
        role: 'officer',
        is_banned: false,
      }).eq('id', userId);

      // Check if officer profile exists
      const { data: existingOfficer } = await supabase.from('officers').select('id').eq('user_id', userId).single();
      if (existingOfficer) {
        officerId = existingOfficer.id;
        await supabase.from('officers').update({
          name,
          email: normalizedEmail,
          phone: phone || '',
          department,
          region,
          employee_id: employee_id || `GOV-2026-OFF-${Date.now()}`,
          designation: designation || 'Field Officer',
          status: 'pending',
          created_at: new Date().toISOString(),
        }).eq('id', officerId);
      }
    }

    if (!userId) {
      userId = uuidv4();
      const { error: userError } = await supabase.from('users').insert({
        id: userId,
        name,
        email: normalizedEmail,
        password_hash: hashedPassword,
        phone: phone || '',
        region,
        role: 'officer',
        is_banned: false,
        warning_count: 0,
        created_at: new Date().toISOString(),
      });
      if (userError) throw userError;
    }

    if (!officerId) {
      officerId = uuidv4();
      const { error: officerError } = await supabase.from('officers').insert({
        id: officerId,
        user_id: userId,
        name,
        email: normalizedEmail,
        phone: phone || '',
        department,
        region,
        employee_id: employee_id || `GOV-2026-OFF-${Date.now()}`,
        designation: designation || 'Field Officer',
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      if (officerError) throw officerError;
    }

    const pendingOfficerPayload = {
      id: officerId,
      user_id: userId,
      name,
      email: normalizedEmail,
      phone: phone || '',
      department,
      region,
      employee_id: employee_id || `GOV-2026-OFF-${Date.now()}`,
      designation: designation || 'Field Officer',
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    // Insert notification for admin
    await supabase.from('notifications').insert({
      id: uuidv4(),
      user_id: 'admin-1',
      type: 'officer_registration',
      message: `New field officer registration request: ${name} (${department} - ${region})`,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    // Broadcast to Admin real-time via Socket.IO
    if (io) {
      io.to('admin').emit('new_officer_registration', { officer: pendingOfficerPayload });
      io.to('admin').emit('officer_registered', { officer: pendingOfficerPayload });
      io.emit('new_officer_registration', { officer: pendingOfficerPayload });
      io.emit('officer_registered', { officer: pendingOfficerPayload });
    }

    res.status(201).json({ 
      success: true, 
      message: 'Registration submitted. Awaiting admin approval.',
      officer_id: officerId,
      officer: pendingOfficerPayload
    });
  } catch (err) {
    console.error('Register officer error:', err);
    res.status(500).json({ error: err.message });
  }
};


// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, password_hash, role, is_banned, ban_until, region, phone, address, lat, lng, avatar_url, warning_count')
      .eq('email', email)
      .single();

    if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.is_banned && user.ban_until && new Date(user.ban_until) > new Date()) {
      return res.status(403).json({ 
        error: 'Account temporarily suspended',
        ban_until: user.ban_until 
      });
    }

    // If officer, check approval status
    if (user.role === 'officer') {
      const { data: officer } = await supabase
        .from('officers')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (officer?.status === 'pending') {
        return res.status(403).json({ error: 'Officer account pending admin approval' });
      }
      if (officer?.status === 'rejected') {
        return res.status(403).json({ error: 'Officer registration was rejected' });
      }
      user.officer_profile = officer;
    }

    const { password_hash, ...userSafe } = user;
    const token = generateToken(user.id, user.role, { name: user.name, email: user.email, region: user.region });

    res.json({ success: true, user: userSafe, token });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, phone, region, role, is_banned, ban_until, lat, lng, address, avatar_url, warning_count, created_at')
      .eq('id', req.userId)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });

    if (user.role === 'officer') {
      const { data: officer } = await supabase
        .from('officers')
        .select('*')
        .eq('user_id', user.id)
        .single();
      user.officer_profile = officer;
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { registerCitizen, registerOfficer, login, getMe };
