import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { api } from '../services/api';


const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('admin_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [users, setUsers] = useState([]);
  const [pendingOfficers, setPendingOfficers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIncidentModal, setActiveIncidentModal] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Fetch all real data from backend on mount (only when logged in)
  const fetchAllData = useCallback(async () => {
    if (!localStorage.getItem('admin_access_token')) return;
    setDataLoading(true);
    const results = await Promise.allSettled([
      api.getAnalyticsSummary(),
      api.getAnalyticsTrends(14),
      api.getHeatmapPoints(),
      api.getIssues({ limit: 100 }),
      api.getUsers({ limit: 100 }),
      api.getAnnouncements(),
      api.getPendingOfficers(),
    ]);

    if (results[0].status === 'fulfilled') setSummary(results[0].value);
    if (results[1].status === 'fulfilled') setTrends(Array.isArray(results[1].value) ? results[1].value : []);
    if (results[2].status === 'fulfilled') setHeatmapPoints(Array.isArray(results[2].value) ? results[2].value : []);
    if (results[3].status === 'fulfilled') {
      const v = results[3].value;
      setComplaints(Array.isArray(v) ? v : v?.items || []);
    }
    if (results[4].status === 'fulfilled') {
      const v = results[4].value;
      setUsers(Array.isArray(v) ? v : v?.items || []);
    }
    if (results[5].status === 'fulfilled') {
      const v = results[5].value;
      setBroadcasts(Array.isArray(v) ? v : v?.items || []);
    }
    if (results[6].status === 'fulfilled' && Array.isArray(results[6].value)) {
      const backendOfficers = results[6].value;
      setPendingOfficers(prev => {
        const merged = [...backendOfficers];
        prev.forEach(p => {
          if (!merged.some(b => b.id === p.id || b.email?.toLowerCase() === p.email?.toLowerCase())) {
            merged.push(p);
          }
        });
        return merged;
      });
    }
    setDataLoading(false);
  }, []);


  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Real-time BroadcastChannel Sync: allows instant communication across localhost ports

  useEffect(() => {
    let channel = null;
    try {
      channel = new BroadcastChannel('OFFICER_APPROVAL_CHANNEL');
      channel.onmessage = (event) => {
        const msg = event.data;
        if (msg?.type === 'NEW_OFFICER_REGISTRATION' && msg.officer) {
          setPendingOfficers(prev => {
            const filtered = prev.filter(o => o.email?.toLowerCase() !== msg.officer.email?.toLowerCase());
            return [msg.officer, ...filtered];
          });
          toast.success(`📢 New Officer Request: ${msg.officer.name} (${msg.officer.department || 'Officer'})`);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }
    return () => {
      if (channel) channel.close();
    };
  }, []);

  // Real-time Socket.IO connection to Node backend (port 5000) for instant live sync
  useEffect(() => {
    let socket = null;
    try {
      socket = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 2000,
      });

      socket.on('connect', () => {
        setWsConnected(true);
        socket.emit('join_admin_room');
        console.log('⚡ Admin Portal connected to Live Socket.IO Stream on port 5000');
      });

      socket.on('disconnect', () => {
        setWsConnected(false);
      });

      socket.on('new_officer_registration', (data) => {
        if (data?.officer) {
          setPendingOfficers(prev => {
            const filtered = prev.filter(o => o.email?.toLowerCase() !== data.officer.email?.toLowerCase() && o.id !== data.officer.id);
            return [data.officer, ...filtered];
          });
          toast.success(`📢 New Officer Request: ${data.officer.name} (${data.officer.department || 'Officer'})`);
          fetchAllData();
        }
      });

      socket.on('officer_registered', (data) => {
        if (data?.officer) {
          setPendingOfficers(prev => {
            const filtered = prev.filter(o => o.email?.toLowerCase() !== data.officer.email?.toLowerCase() && o.id !== data.officer.id);
            return [data.officer, ...filtered];
          });
          fetchAllData();
        }
      });

      socket.on('new_complaint', () => fetchAllData());
      socket.on('complaint_updated', () => fetchAllData());
      socket.on('complaint_assigned', () => fetchAllData());
      socket.on('complaint_resolved', () => fetchAllData());
    } catch (e) {
      console.warn('Socket.IO init error:', e);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [fetchAllData]);

  // Periodic continuous background sync (every 10s)
  useEffect(() => {
    if (!localStorage.getItem('admin_access_token')) return;
    const interval = setInterval(() => {
      fetchAllData();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Handle incoming live status changes from field officers claiming or resolving complaints

  const handleLiveStatusChange = (payload) => {
    const { issue_id, status, officer_name, officer_id, assigned_at, lat, lng, category, ward, priority, summary: issueSummary } = payload;

    // 1. Update Heatmap Points Live
    setHeatmapPoints(prev => {
      const exists = prev.some(p => p.id === issue_id);
      if (exists) {
        return prev.map(p => {
          if (p.id === issue_id) {
            return {
              ...p,
              status,
              officer_name: officer_name || p.officer_name,
              officer_id: officer_id || p.officer_id,
              assigned_at: assigned_at || p.assigned_at || new Date().toISOString(),
              timestamp: p.timestamp || 'Just now'
            };
          }
          return p;
        });
      } else if (lat && lng) {
        return [
          {
            id: issue_id,
            lat,
            lng,
            weight: 0.9,
            category: category || 'General',
            ward: ward || 'Ward 4 (Central)',
            priority: priority || 'medium',
            status,
            summary: issueSummary || 'Complaint claimed by officer',
            officer_name,
            officer_id,
            assigned_at: assigned_at || new Date().toISOString(),
            timestamp: 'Just now'
          },
          ...prev
        ];
      }
      return prev;
    });

    // 2. Update Complaints table
    setComplaints(prev =>
      prev.map(c => {
        if (c.id === issue_id) {
          return {
            ...c,
            status,
            assigned_officers: officer_name ? [officer_name] : c.assigned_officers,
            assigned_at: assigned_at || new Date().toISOString(),
          };
        }
        return c;
      })
    );

    // 3. User Toast Alert
    if (status === 'in_progress') {
      toast(
        (t) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '18px' }}>🚩</span>
            <div>
              <strong style={{ color: '#fb7185' }}>Live Map Update:</strong>
              <div style={{ fontSize: '12px', color: '#e2e8f0' }}>
                {issue_id} claimed by <strong style={{ color: '#fff' }}>{officer_name || 'Officer'}</strong>
              </div>
            </div>
          </div>
        ),
        { duration: 4500, style: { background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(244, 63, 94, 0.4)' } }
      );
    } else if (status === 'resolved') {
      toast.success(`Complaint ${issue_id} marked RESOLVED by officer.`, { duration: 4000 });
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await api.login(email, password);
      setUser(data.user);
      localStorage.setItem('admin_user', JSON.stringify(data.user));
      if (data.access_token) {
        localStorage.setItem('admin_access_token', data.access_token);
      }
      toast.success(`Welcome back, ${data.user?.name || 'Admin'}!`);
      // Fetch real data now that we have a token
      await fetchAllData();
      return true;
    } catch (err) {
      toast.error(err.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setSummary(null);
    setTrends([]);
    setHeatmapPoints([]);
    setHotspots([]);
    setClusters([]);
    setBroadcasts([]);
    setComplaints([]);
    setUsers([]);
    setPendingOfficers([]);
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_access_token');
    toast.success('Logged out successfully');
  };

  // Consolidate Cluster into Master Incident
  const consolidateCluster = (clusterId) => {
    setClusters(prev =>
      prev.map(c =>
        c.cluster_id === clusterId ? { ...c, is_consolidated: true, status: 'consolidated_master' } : c
      )
    );
    toast.success(`Cluster ${clusterId} consolidated into Master Incident. Queues updated.`);
  };

  // Dispatch Broadcast
  const sendBroadcast = async (broadcastPayload) => {
    try {
      const result = await api.createAnnouncement(broadcastPayload);
      setBroadcasts(prev => [result, ...prev]);
      toast.success('Broadcast alert published successfully!');
      return result;
    } catch (err) {
      toast.error(`Broadcast failed: ${err.message}`);
      throw err;
    }
  };

  // Block/Unblock Citizen — calls backend then refreshes users
  const toggleBlockUser = async (userId, tier = '3d', reason = 'Malicious activity detected') => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8000'}/admin/users/${userId}/block`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('admin_access_token')}`
          },
          body: JSON.stringify({ duration_tier: tier, reason })
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success('Citizen block status updated.');
      // Refresh users list
      const updated = await api.getUsers({ limit: 100 });
      setUsers(Array.isArray(updated) ? updated : updated?.items || []);
    } catch (err) {
      toast.error(`Block action failed: ${err.message}`);
    }
  };

  // Adjust Credibility Score — calls backend
  const adjustCredibility = async (userId, delta, reason) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8000'}/admin/users/${userId}/credibility`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('admin_access_token')}`
          },
          body: JSON.stringify({ delta, reason })
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(`Credibility score adjusted (${delta > 0 ? '+' : ''}${delta}). Reason: ${reason}`);
      // Refresh users list
      const updated = await api.getUsers({ limit: 100 });
      setUsers(Array.isArray(updated) ? updated : updated?.items || []);
    } catch (err) {
      toast.error(`Credibility adjustment failed: ${err.message}`);
    }
  };

  // Trigger Action on Predictive Hotspot (UI-only — no backend endpoint)
  const triggerHotspotAction = (hotspotId) => {
    setHotspots(prev =>
      prev.map(h =>
        h.id === hotspotId ? { ...h, action_dispatched: true } : h
      )
    );
    toast.success(`Permanent Infrastructure Work Order dispatched for ${hotspotId}!`);
  };

  // Approve Officer Registration
  const approveOfficer = async (officerId, departmentId = null, notes = null) => {
    try {
      await api.approveOfficer(officerId, { department_id: departmentId, notes });
      setPendingOfficers(prev =>
        prev.map(off =>
          off.id === officerId
            ? { ...off, status: 'active', rejection_reason: null }
            : off
        )
      );
      const approvedOff = pendingOfficers.find(o => o.id === officerId);
      toast.success(`Officer "${approvedOff?.name || officerId}" approved! Officer can now log in.`);
      // Broadcast to Officer Portal tab with full officer data for instant login sync
      try {
        const channel = new BroadcastChannel('OFFICER_APPROVAL_CHANNEL');
        channel.postMessage({
          type: 'OFFICER_APPROVED',
          officer: {
            ...approvedOff,
            email: approvedOff?.email || '',
          },
          officerId
        });
        setTimeout(() => channel.close(), 500);
      } catch (bcErr) {
        console.warn(bcErr);
      }
    } catch (err) {
      toast.error(`Approval failed: ${err.message}`);
    }
  };

  // Reject Officer Registration
  const rejectOfficer = async (officerId, reason = '') => {
    try {
      await api.rejectOfficer(officerId, reason);
      setPendingOfficers(prev =>
        prev.map(off =>
          off.id === officerId
            ? { ...off, status: 'rejected', rejection_reason: reason || 'Application credentials could not be verified' }
            : off
        )
      );
      const rejectedOff = pendingOfficers.find(o => o.id === officerId);
      toast.error(`Registration for "${rejectedOff?.name || officerId}" rejected.`);
      // Broadcast to Officer Portal tab with email for registry cleanup
      try {
        const channel = new BroadcastChannel('OFFICER_APPROVAL_CHANNEL');
        channel.postMessage({ type: 'OFFICER_REJECTED', officerId, officerEmail: rejectedOff?.email || '', reason });
        setTimeout(() => channel.close(), 500);
      } catch (bcErr) {
        console.warn(bcErr);
      }
    } catch (err) {
      toast.error(`Rejection failed: ${err.message}`);
    }
  };

  // Refresh pending officers from real API
  const resetPendingOfficers = async () => {
    try {
      const officers = await api.getPendingOfficers();
      // If 401 returned empty {}, officers will be undefined/empty \u2014 silently handled by ADMIN_TOKEN_EXPIRED event
      if (Array.isArray(officers)) {
        setPendingOfficers(officers);
        toast.success(`Pending requests refreshed! ${officers.length} applications ready for review.`);
      } else {
        toast(`Queue refreshed — ${officers?.items?.length || 0} pending requests found.`, { icon: '🔄' });
      }
    } catch (err) {
      // Only show error for non-auth failures
      if (!err.message?.includes('expired') && !err.message?.includes('401')) {
        toast.error(`Refresh failed: ${err.message}`);
      }
    }
  };

  // Add officer directly (from WebSocket push)
  const addPendingOfficer = (officer) => {
    setPendingOfficers(prev => {
      const filtered = prev.filter(o => o.email?.toLowerCase() !== officer.email?.toLowerCase());
      return [officer, ...filtered];
    });
    toast.success(`Officer request for "${officer.name}" added to review queue!`);
  };

  return (
    <AdminContext.Provider
      value={{
        user,
        loading,
        dataLoading,
        login,
        logout,
        summary,
        trends,
        heatmapPoints,
        hotspots,
        clusters,
        broadcasts,
        complaints,
        users,
        pendingOfficers,
        approveOfficer,
        rejectOfficer,
        resetPendingOfficers,
        addPendingOfficer,
        searchQuery,
        setSearchQuery,
        activeIncidentModal,
        setActiveIncidentModal,
        consolidateCluster,
        sendBroadcast,
        toggleBlockUser,
        adjustCredibility,
        triggerHotspotAction,
        wsConnected,
        handleLiveStatusChange,
        fetchAllData,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => useContext(AdminContext);
