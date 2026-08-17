import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';

const AppContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('citizen_ai_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem('citizen_ai_token'));
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Verify session in background without forcing abrupt logouts
  useEffect(() => {
    if (token) {
      api.getMe()
        .then(({ user: u }) => {
          if (u) {
            setUser(u);
            localStorage.setItem('citizen_ai_user', JSON.stringify(u));
          }
        })
        .catch((err) => {
          console.warn('Background session sync:', err?.message);
        });
    }
  }, [token]);

  // Listen for real-time approval/rejection from Admin Portal via BroadcastChannel
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

  // Setup Socket.IO when user is available
  useEffect(() => {
    if (!user) return;

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      if (user.officer_profile?.department_id) {
        newSocket.emit('join_department', user.officer_profile.department_id);
      }
      if (user.id) {
        newSocket.emit('join_user', user.id);
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('new_complaint', (data) => {
      setNotifications(prev => [data, ...prev]);
      setUnreadCount(c => c + 1);
      window.dispatchEvent(new CustomEvent('new_complaint_received', { detail: data }));
    });

    newSocket.on('complaint_updated', (data) => {
      window.dispatchEvent(new CustomEvent('complaint_update', { detail: data }));
    });

    newSocket.on('complaint_status_changed', (data) => {
      window.dispatchEvent(new CustomEvent('complaint_status_changed', { detail: data }));
    });

    newSocket.on('emergency_alert', (data) => {
      window.dispatchEvent(new CustomEvent('emergency_alert', { detail: data }));
    });

    newSocket.on('account_approved', () => {
      window.dispatchEvent(new CustomEvent('account_approved'));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user?.id]);

  // Load notifications
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = useCallback(async () => {
    try {
      const { notifications: notifs } = await api.getNotifications();
      setNotifications(notifs || []);
      setUnreadCount((notifs || []).filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await api.loginUser(credentials);
    const { user: u, token: t } = result;
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
  }, []);

  const markNotificationAsRead = useCallback(async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await api.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  }, []);

  return (
    <AppContext.Provider value={{
      user,
      token,
      loading,
      socket,
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
