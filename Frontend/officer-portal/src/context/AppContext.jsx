import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';

const AppContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('citizen_ai_token'));
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Load user on mount
  useEffect(() => {
    if (token) {
      api.getMe()
        .then(({ user: u }) => {
          setUser(u);
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

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
      newSocket.emit('authenticate', {
        userId: user.id,
        role: user.role,
        region: user.region || user.officer_profile?.region,
        department: user.officer_profile?.department || user.department,
      });
    });

    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('new_complaint', (complaint) => {
      window.dispatchEvent(new CustomEvent('new_complaint', { detail: complaint }));
    });

    newSocket.on('complaint_assigned', (data) => {
      window.dispatchEvent(new CustomEvent('complaint_assigned', { detail: data }));
    });

    newSocket.on('complaint_update', (data) => {
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
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('citizen_ai_token');
    setToken(null);
    setUser(null);
    setNotifications([]);
    setUnreadCount(0);
    if (socket) socket.disconnect();
  }, [socket]);

  const markNotificationRead = useCallback(async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const value = {
    user,
    setUser,
    token,
    loading,
    socket,
    isConnected,
    notifications,
    unreadCount,
    loadNotifications,
    markNotificationRead,
    login,
    logout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
};

export default AppContext;
