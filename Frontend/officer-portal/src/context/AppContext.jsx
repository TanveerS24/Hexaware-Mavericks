import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // Initialize user from localStorage FIRST (no async, instant)
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('citizen_ai_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem('citizen_ai_token'));
  // loading starts FALSE because we already know user state from localStorage
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  // Background session refresh — does NOT change routing
  useEffect(() => {
    if (!token) return;
    api.getMe()
      .then(({ user: u }) => {
        if (u) {
          setUser(u);
          localStorage.setItem('citizen_ai_user', JSON.stringify(u));
        }
      })
      .catch((err) => {
        // Silent fail — do NOT logout, just keep localStorage session
        console.warn('[Officer] Background session sync failed (non-critical):', err?.message);
      });
  }, [token]);

  // Real-time cross-portal sync via BroadcastChannel
  useEffect(() => {
    let channel = null;
    try {
      channel = new BroadcastChannel('OFFICER_APPROVAL_CHANNEL');
      channel.onmessage = (event) => {
        const msg = event.data;
        if (msg?.type === 'OFFICER_APPROVED' && msg.officer) {
          window.dispatchEvent(new CustomEvent('account_approved', { detail: msg }));
        }
        if (msg?.type === 'OFFICER_REJECTED' && msg.officerId) {
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

  // Socket.IO — attempt connection but do NOT block UI if it fails
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

        socket.on('account_approved', () => {
          window.dispatchEvent(new CustomEvent('account_approved'));
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

  // Load notifications
  useEffect(() => {
    if (user) loadNotifications();
  }, [user?.id]);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.getNotifications();
      const notifs = res?.notifications || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch {
      // Silently ignore — notifications are non-critical
    }
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await api.loginUser(credentials);
    const { user: u, token: t } = result;
    if (!u || !t) throw new Error('Invalid login response from server');
    localStorage.setItem('citizen_ai_token', t);
    localStorage.setItem('citizen_ai_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('citizen_ai_token');
    localStorage.removeItem('citizen_ai_user');
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
