const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const isRealSupabase = process.env.SUPABASE_URL && 
  !process.env.SUPABASE_URL.includes('your-project') &&
  process.env.SUPABASE_SERVICE_KEY && 
  !process.env.SUPABASE_SERVICE_KEY.includes('your-service-role-key');

let supabase;

if (isRealSupabase) {
  try {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    console.log('✅ Connected to live Supabase cloud database.');
  } catch (err) {
    console.warn('⚠️ Supabase init error, falling back to in-memory store:', err.message);
  }
}

// In-memory mock database store for seamless demo / local testing
const inMemoryStore = {
  users: [
    {
      id: 'admin-1',
      name: 'System Administrator',
      email: 'admin@citizenai.gov.in',
      password_hash: bcrypt.hashSync('Admin@123', 10),
      role: 'admin',
      region: 'Delhi',
      phone: '+91 9999900000',
      address: 'Central Secretariat, New Delhi',
      is_banned: false,
      warning_count: 0,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'officer-1',
      name: 'Officer Rajesh Sharma',
      email: 'officer@citizenai.gov.in',
      password_hash: bcrypt.hashSync('Officer@123', 10),
      role: 'officer',
      region: 'Mumbai',
      phone: '+91 9820123456',
      address: 'BMC Water Department, Mumbai',
      is_banned: false,
      warning_count: 0,
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
    {
      id: 'officer-2',
      name: 'Officer Amit Verma',
      email: 'officer.electricity@citizenai.gov.in',
      password_hash: bcrypt.hashSync('Officer@123', 10),
      role: 'officer',
      region: 'Mumbai',
      phone: '+91 9820111222',
      address: 'MSEDCL Power Grid Division, Mumbai',
      is_banned: false,
      warning_count: 0,
      created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    },
    {
      id: 'officer-3',
      name: 'Officer Vikram Rathore',
      email: 'officer.transport@citizenai.gov.in',
      password_hash: bcrypt.hashSync('Officer@123', 10),
      role: 'officer',
      region: 'Mumbai',
      phone: '+91 9820333444',
      address: 'MMRDA Highway & Transport Cell, Mumbai',
      is_banned: false,
      warning_count: 0,
      created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
    {
      id: 'citizen-1',
      name: 'Priya Patel',
      email: 'citizen@citizenai.gov.in',
      password_hash: bcrypt.hashSync('Citizen@123', 10),
      role: 'citizen',
      region: 'Mumbai',
      phone: '+91 9876543210',
      address: '402 Sunset Heights, Bandra West, Mumbai',
      is_banned: false,
      warning_count: 0,
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
      id: 'admin-2',
      name: 'City Administrator',
      email: 'admin@city.gov',
      password_hash: bcrypt.hashSync('Admin@123', 10),
      role: 'admin',
      region: 'City',
      phone: '+91 9999911111',
      address: 'City Hall, Municipal Corp',
      is_banned: false,
      warning_count: 0,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'officer-ranjith',
      name: 'Officer Ranjith Kumar',
      email: 'kurubaranjith18@gmail.com',
      password_hash: bcrypt.hashSync('Officer@123', 10),
      role: 'officer',
      status: 'active',
      region: 'Mumbai',
      phone: '+91 9820999888',
      address: 'Municipal Field Office, Mumbai',
      is_banned: false,
      warning_count: 0,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: 'officer-ranjith2',
      name: 'Officer Ranjith',
      email: 'ranjith18@gmail.com',
      password_hash: bcrypt.hashSync('Officer@123', 10),
      role: 'officer',
      status: 'active',
      region: 'Mumbai',
      phone: '+91 9820999777',
      address: 'Municipal Field Office, Mumbai',
      is_banned: false,
      warning_count: 0,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  ],
  officers: [
    {
      id: 'off-prof-1',
      user_id: 'officer-1',
      name: 'Officer Rajesh Sharma',
      email: 'officer@citizenai.gov.in',
      phone: '+91 9820123456',
      department: 'Water & Sewerage',
      region: 'Mumbai',
      employee_id: 'BMC-WTR-8841',
      designation: 'Senior Hydraulic Engineer',
      status: 'approved',
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
    {
      id: 'off-prof-2',
      user_id: 'officer-2',
      name: 'Officer Amit Verma',
      email: 'officer.electricity@citizenai.gov.in',
      phone: '+91 9820111222',
      department: 'Electricity',
      region: 'Mumbai',
      employee_id: 'MSEDCL-PWR-5520',
      designation: 'Assistant Electrical Inspector',
      status: 'approved',
      created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    },
    {
      id: 'off-prof-3',
      user_id: 'officer-3',
      name: 'Officer Vikram Rathore',
      email: 'officer.transport@citizenai.gov.in',
      phone: '+91 9820333444',
      department: 'Roads & Transport',
      region: 'Mumbai',
      employee_id: 'MMRDA-RDS-9031',
      designation: 'Executive Roadway Engineer',
      status: 'approved',
      created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
    {
      id: 'off-prof-ranjith',
      user_id: 'officer-ranjith',
      name: 'Officer Ranjith Kumar',
      email: 'kurubaranjith18@gmail.com',
      phone: '+91 9820999888',
      department: 'Water & Sewerage',
      region: 'Mumbai',
      employee_id: 'GOV-2026-OFF-RJ1',
      designation: 'Field Grievance Officer',
      status: 'approved',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: 'off-prof-ranjith2',
      user_id: 'officer-ranjith2',
      name: 'Officer Ranjith',
      email: 'ranjith18@gmail.com',
      phone: '+91 9820999777',
      department: 'Water & Sewerage',
      region: 'Mumbai',
      employee_id: 'GOV-2026-OFF-RJ2',
      designation: 'Field Grievance Officer',
      status: 'approved',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    }
  ],
  complaints: [
    {
      id: 'comp-101',
      citizen_id: 'citizen-1',
      title: 'Major pipeline burst flooding residential street',
      description: 'The main water line on 14th Road has burst and clean drinking water is gushing onto the road since 6 AM. Basements are getting flooded.',
      department: 'Water & Sewerage',
      category: 'Pipeline Leak',
      priority: 'emergency',
      is_emergency: true,
      status: 'in_progress',
      assigned_to: 'officer-1',
      sentiment: 'distressed',
      sentiment_score: 0.9,
      ai_summary: 'Critical water pipeline burst causing severe flooding on residential road. Urgent repair required.',
      address: '14th Road, Khar West, Mumbai',
      region: 'Mumbai',
      sla_started_at: new Date(Date.now() - 1800000).toISOString(),
      sla_deadline: new Date(Date.now() + 2 * 3600000).toISOString(),
      created_at: new Date(Date.now() - 3600000).toISOString(),
      image_urls: ['https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&q=80'],
      transcript: null,
      detected_language: 'en',
    },
    {
      id: 'comp-102',
      citizen_id: 'citizen-1',
      title: 'High voltage fluctuations causing appliance damage',
      description: 'Continuous voltage drops between 160V and 280V in Sector 4. Refrigerator and AC tripped repeatedly.',
      department: 'Electricity',
      category: 'Power Grid Fluctuation',
      priority: 'high',
      is_emergency: false,
      status: 'in_progress',
      assigned_to: 'officer-2',
      sentiment: 'frustrated',
      sentiment_score: 0.75,
      ai_summary: 'Severe voltage fluctuations reported in residential sector. Grid transformer inspection required.',
      address: 'Sector 4, Bandra East, Mumbai',
      region: 'Mumbai',
      sla_started_at: new Date(Date.now() - 3600000).toISOString(),
      sla_deadline: new Date(Date.now() + 18 * 3600000).toISOString(),
      created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
      image_urls: [],
      transcript: null,
      detected_language: 'en',
    },
    {
      id: 'comp-103',
      citizen_id: 'citizen-1',
      title: 'Deep potholes on Link Road after monsoon',
      description: 'Multiple dangerous potholes formed near the flyover junction causing traffic jams and bike skids.',
      department: 'Roads & Transport',
      category: 'Road Repair',
      priority: 'normal',
      is_emergency: false,
      status: 'resolved',
      assigned_to: 'officer-3',
      sentiment: 'neutral',
      sentiment_score: 0.4,
      ai_summary: 'Pothole repairs requested on Link Road flyover junction. Road resurfacing completed.',
      address: 'Link Road Junction, Mumbai',
      region: 'Mumbai',
      sla_started_at: new Date(Date.now() - 48 * 3600000).toISOString(),
      sla_deadline: new Date(Date.now() - 12 * 3600000).toISOString(),
      created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
      image_urls: [],
      transcript: null,
      detected_language: 'en',
    }
  ],
  complaint_assignments: [
    {
      id: 'asgn-1',
      complaint_id: 'comp-101',
      officer_id: 'officer-1',
      action: 'accepted',
      notes: 'Dispatched hydraulic maintenance crew to isolate leaking main junction valve.',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'asgn-2',
      complaint_id: 'comp-102',
      officer_id: 'officer-2',
      action: 'accepted',
      notes: 'Dispatched electric power grid team to inspect transformer substation.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'asgn-3',
      complaint_id: 'comp-103',
      officer_id: 'officer-3',
      action: 'accepted',
      notes: 'Asphalt resurfacing work assigned to Link Road maintenance contractor.',
      timestamp: new Date(Date.now() - 40 * 3600000).toISOString(),
    }
  ],
  timeline_updates: [
    {
      id: 'time-1',
      complaint_id: 'comp-101',
      status: 'in_progress',
      update_text: 'Officer Rajesh Sharma (Water & Sewerage) accepted the grievance. Emergency valve isolated.',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'time-2',
      complaint_id: 'comp-102',
      status: 'in_progress',
      update_text: 'Officer Amit Verma (Electricity) accepted the grievance. Transformer calibration in progress.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'time-3',
      complaint_id: 'comp-103',
      status: 'resolved',
      update_text: 'Officer Vikram Rathore (Roads & Transport) closed the case. Road resurfacing completed.',
      timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
    }
  ],
  notifications: [
    {
      id: 'notif-1',
      user_id: 'citizen-1',
      type: 'complaint_accepted',
      title: 'Complaint Accepted',
      message: 'Officer Rajesh Sharma accepted your electricity complaint.',
      complaint_id: 'comp-102',
      is_read: false,
      created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    },
    {
      id: 'notif-2',
      user_id: 'citizen-1',
      type: 'complaint_update',
      title: 'Complaint Resolved',
      message: 'Your pothole complaint on Link Road was resolved.',
      complaint_id: 'comp-103',
      is_read: true,
      created_at: new Date(Date.now() - 10 * 3600000).toISOString(),
    }
  ]
};

// Fluent query builder emulator for in-memory database
function createQueryBuilder(table) {
  let rows = inMemoryStore[table] ? [...inMemoryStore[table]] : [];
  let filters = [];
  let sortField = null;
  let sortAsc = true;
  let limitCount = null;
  let offsetCount = 0;
  let selectedFields = null;

  const builder = {
    select(fields = '*') {
      selectedFields = fields;
      return builder;
    },
    eq(col, val) {
      filters.push(row => row[col] === val);
      return builder;
    },
    neq(col, val) {
      filters.push(row => row[col] !== val);
      return builder;
    },
    gt(col, val) {
      filters.push(row => row[col] > val);
      return builder;
    },
    gte(col, val) {
      filters.push(row => row[col] >= val);
      return builder;
    },
    lt(col, val) {
      filters.push(row => row[col] < val);
      return builder;
    },
    lte(col, val) {
      filters.push(row => row[col] <= val);
      return builder;
    },
    in(col, vals) {
      filters.push(row => vals.includes(row[col]));
      return builder;
    },
    order(col, { ascending = true } = {}) {
      sortField = col;
      sortAsc = ascending;
      return builder;
    },
    range(from, to) {
      offsetCount = from;
      limitCount = to - from + 1;
      return builder;
    },
    limit(n) {
      limitCount = n;
      return builder;
    },
    async single() {
      let filtered = rows.filter(r => filters.every(f => f(r)));
      if (filtered.length === 0) return { data: null, error: { message: 'Not found' } };
      let item = filtered[0];
      if (table === 'complaints') {
        item = enrichComplaint(item);
      }
      return { data: item, error: null };
    },
    async then(resolve, reject) {
      try {
        let filtered = rows.filter(r => filters.every(f => f(r)));
        if (sortField) {
          filtered.sort((a, b) => {
            if (a[sortField] > b[sortField]) return sortAsc ? 1 : -1;
            if (a[sortField] < b[sortField]) return sortAsc ? -1 : 1;
            return 0;
          });
        }
        const total = filtered.length;
        if (offsetCount > 0) filtered = filtered.slice(offsetCount);
        if (limitCount !== null) filtered = filtered.slice(0, limitCount);

        if (table === 'complaints') {
          filtered = filtered.map(enrichComplaint);
        }

        resolve({ data: filtered, count: total, error: null });
      } catch (err) {
        reject(err);
      }
    },
    insert(records) {
      if (!inMemoryStore[table]) inMemoryStore[table] = [];
      const toInsert = Array.isArray(records) ? records : [records];
      toInsert.forEach(rec => inMemoryStore[table].unshift(rec));
      
      const insertResult = {
        data: Array.isArray(records) ? toInsert : toInsert[0],
        error: null,
        select(fields) {
          return {
            single() {
              return Promise.resolve({ data: toInsert[0], error: null });
            },
            then(resolve, reject) {
              return Promise.resolve({ data: Array.isArray(records) ? toInsert : toInsert[0], error: null }).then(resolve, reject);
            }
          };
        },
        single() {
          return Promise.resolve({ data: toInsert[0], error: null });
        },
        then(resolve, reject) {
          return Promise.resolve({ data: Array.isArray(records) ? toInsert : toInsert[0], error: null }).then(resolve, reject);
        }
      };
      return insertResult;
    },
    update(updates) {
      const updateResult = {
        eq(col, val) {
          filters.push(row => row[col] === val);
          return updateResult;
        },
        select(fields) {
          return {
            single() {
              if (inMemoryStore[table]) {
                inMemoryStore[table] = inMemoryStore[table].map(row => {
                  if (filters.every(f => f(row))) return { ...row, ...updates };
                  return row;
                });
              }
              const updated = (inMemoryStore[table] || []).find(row => filters.every(f => f(row)));
              return Promise.resolve({ data: updated || null, error: null });
            },
            then(resolve, reject) {
              if (inMemoryStore[table]) {
                inMemoryStore[table] = inMemoryStore[table].map(row => {
                  if (filters.every(f => f(row))) return { ...row, ...updates };
                  return row;
                });
              }
              const updated = (inMemoryStore[table] || []).filter(row => filters.every(f => f(row)));
              return Promise.resolve({ data: updated, error: null }).then(resolve, reject);
            }
          };
        },
        single() {
          if (inMemoryStore[table]) {
            inMemoryStore[table] = inMemoryStore[table].map(row => {
              if (filters.every(f => f(row))) return { ...row, ...updates };
              return row;
            });
          }
          const updated = (inMemoryStore[table] || []).find(row => filters.every(f => f(row)));
          return Promise.resolve({ data: updated || null, error: null });
        },
        then(resolve, reject) {
          if (inMemoryStore[table]) {
            inMemoryStore[table] = inMemoryStore[table].map(row => {
              if (filters.every(f => f(row))) return { ...row, ...updates };
              return row;
            });
          }
          const updated = (inMemoryStore[table] || []).filter(row => filters.every(f => f(row)));
          return Promise.resolve({ data: updated, error: null }).then(resolve, reject);
        }
      };
      return updateResult;
    },
    async delete() {
      if (inMemoryStore[table]) {
        inMemoryStore[table] = inMemoryStore[table].filter(row => !filters.every(f => f(row)));
      }
      return { data: null, error: null };
    }
  };

  return builder;
}

function enrichComplaint(c) {
  if (!c) return c;
  const citizen = inMemoryStore.users.find(u => u.id === c.citizen_id);
  const assignments = inMemoryStore.complaint_assignments
    .filter(a => a.complaint_id === c.id)
    .map(a => {
      const officer = inMemoryStore.users.find(u => u.id === a.officer_id) || { name: 'Officer' };
      return { ...a, officer };
    });
  const timeline = inMemoryStore.timeline_updates.filter(t => t.complaint_id === c.id);
  return {
    ...c,
    citizen: citizen ? { id: citizen.id, name: citizen.name, email: citizen.email, phone: citizen.phone, region: citizen.region } : null,
    assignments,
    timeline,
  };
}

// Fallback client proxy
const mockSupabase = {
  from(table) {
    return createQueryBuilder(table);
  },
  storage: {
    from() {
      return {
        upload: async (path, file) => ({ data: { path }, error: null }),
        getPublicUrl: (path) => ({ data: { publicUrl: `https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&q=80` } })
      };
    }
  }
};

const exportedClient = isRealSupabase && supabase ? supabase : mockSupabase;

module.exports = exportedClient;
