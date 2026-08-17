import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

const AppContext = createContext(null);

// ─── localStorage Keys ───────────────────────────────────────────
const APPROVED_OFFICERS_KEY = 'citizen_ai_approved_officers'; // persisted officer registry
const TOKEN_KEY = 'citizen_ai_token';
const USER_KEY = 'citizen_ai_user';

// ─── Helper: read approved officer registry from localStorage ───
const getApprovedRegistry = () => {
  try {
    return JSON.parse(localStorage.getItem(APPROVED_OFFICERS_KEY) || '{}');
  } catch {
    return {};
  }
};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  // ─── Background session verification (non-blocking) ────────────
  useEffect(() => {
    if (!token) return;
    api.getMe()
      .then(({ user: u }) => {
        if (u) {
          setUser(u);
          localStorage.setItem(USER_KEY, JSON.stringify(u));
        }
      })
      .catch((err) => {
        console.warn('[Officer] Background session sync (non-critical):', err?.message);
      });
  }, [token]);

  // ─── Cross-portal sync: Admin Approval → Officer Login ─────────
  useEffect(() => {
    let channel = null;
    try {
      channel = new BroadcastChannel('OFFICER_APPROVAL_CHANNEL');
      channel.onmessage = (event) => {
        const msg = event.data;

        // 🟢 OFFICER APPROVED: Store in persistent registry so login works instantly
        if (msg?.type === 'OFFICER_APPROVED' && msg.officer) {
          const officer = msg.officer;

          // Build the officer profile from admin approval data
          const approvedProfile = {
            id: officer.id || `officer-${Date.now()}`,
            name: officer.name,
            email: (officer.email || '').toLowerCase(),
            role: 'officer',
            status: 'active',
            approvedAt: new Date().toISOString(),
            officer_profile: {
              department: officer.department || officer.department_name || 'General Administration',
              department_id: officer.department_id || 1,
              region: officer.region || officer.ward || 'City Central',
              designation: officer.designation || 'Field Grievance Officer',
              employee_id: officer.employee_id || `GOV-2026-OFF-${officer.id || Date.now()}`,
            }
          };

          // Persist into the approved officer registry (keyed by email)
          const registry = getApprovedRegistry();
          registry[approvedProfile.email] = approvedProfile;
          localStorage.setItem(APPROVED_OFFICERS_KEY, JSON.stringify(registry));

          // ALSO update the registration store so Strategy 5 sees status='active'
          try {
            const regStore = JSON.parse(localStorage.getItem('citizen_ai_registered_officers') || '{}');
            if (regStore[approvedProfile.email]) {
              regStore[approvedProfile.email].status = 'active';
              localStorage.setItem('citizen_ai_registered_officers', JSON.stringify(regStore));
            }
          } catch { /* silent */ }

          console.log(`[Officer Portal] ✅ Officer approval synced: ${approvedProfile.name} (${approvedProfile.email})`);

          // Fire UI event so the login page can show a "You are now approved!" toast
          window.dispatchEvent(new CustomEvent('account_approved', {
            detail: { officer: approvedProfile }
          }));
        }

        // 🔴 OFFICER REJECTED: Remove from registry
        if (msg?.type === 'OFFICER_REJECTED') {
          const emailToRemove = (msg.officerEmail || '').toLowerCase();
          if (emailToRemove) {
            const registry = getApprovedRegistry();
            delete registry[emailToRemove];
            localStorage.setItem(APPROVED_OFFICERS_KEY, JSON.stringify(registry));
          }
          window.dispatchEvent(new CustomEvent('account_rejected', { detail: msg }));
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }
    return () => {
      if (channel) channel.close();
    };
  }, []);

  // ─── Socket.IO real-time (async, fails silently) ───────────────
  useEffect(() => {
    if (!user) return;

    let socket = null;
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://hexaware-mavericks.onrender.com';

    const connectSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        socket = io(SOCKET_URL, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 2000,
          timeout: 8000,
        });

        socket.on('connect', () => {
          setIsConnected(true);
          if (user.officer_profile?.department_id) {
            socket.emit('join_department', user.officer_profile.department_id);
          }
          if (user.id) socket.emit('join_user', user.id);
        });

        socket.on('disconnect', () => setIsConnected(false));

        socket.on('new_complaint', (data) => {
          setNotifications(prev => [data, ...prev]);
          setUnreadCount(c => c + 1);
          window.dispatchEvent(new CustomEvent('new_complaint_received', { detail: data }));
        });

        socket.on('complaint_updated', (data) => {
          window.dispatchEvent(new CustomEvent('complaint_update', { detail: data }));
        });

        socket.on('complaint_status_changed', (data) => {
          window.dispatchEvent(new CustomEvent('complaint_status_changed', { detail: data }));
        });

        socket.on('emergency_alert', (data) => {
          window.dispatchEvent(new CustomEvent('emergency_alert', { detail: data }));
        });

        socket.on('account_approved', (data) => {
          window.dispatchEvent(new CustomEvent('account_approved', { detail: data }));
        });

        socketRef.current = socket;
      } catch (err) {
        console.warn('[Officer] Socket.IO connection skipped:', err.message);
      }
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.id]);

  // ─── Load notifications silently ──────────────────────────────
  useEffect(() => {
    if (user) loadNotifications();
  }, [user?.id]);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.getNotifications();
      const notifs = res?.notifications || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch { /* silent */ }
  }, []);

  // ─── Login ─────────────────────────────────────────────────────
  const login = useCallback(async (credentials) => {
    const result = await api.loginUser(credentials);
    const u = result?.user;
    const t = result?.token;
    if (!u || !t) throw new Error('Invalid login response from server');
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(t);
    setUser(u);
    // Return full result so LoginPage can detect offlineMode
    return result;
  }, []);


  // ─── Logout ────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setNotifications([]);
    setUnreadCount(0);
    setIsConnected(false);
  }, []);

  const markNotificationAsRead = useCallback(async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch { /* silent */ }
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await api.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  }, []);

  return (
    <AppContext.Provider value={{
      user,
      token,
      loading,
      socket: socketRef.current,
      isConnected,
      notifications,
      unreadCount,
      login,
      logout,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      refreshNotifications: loadNotifications,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
