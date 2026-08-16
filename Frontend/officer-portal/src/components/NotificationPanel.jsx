import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, AlertTriangle, RefreshCw, UserCheck, X, FileText } from 'lucide-react';

export default function NotificationPanel({ onClose }) {
  const { notifications, unreadCount, markNotificationRead } = useApp();
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const getIcon = (type) => {
    switch (type) {
      case 'complaint_accepted': return <CheckCircle size={16} color="#10b981" />;
      case 'complaint_rejected': return <AlertTriangle size={16} color="#ef4444" />;
      case 'complaint_update': return <RefreshCw size={16} color="#38bdf8" />;
      case 'account_approved': return <UserCheck size={16} color="#10b981" />;
      case 'new_complaint': return <FileText size={16} color="#38bdf8" />;
      default: return <Bell size={16} color="#94a3b8" />;
    }
  };

  const handleClick = (notif) => {
    if (!notif.is_read) markNotificationRead(notif.id);
    if (notif.complaint_id) {
      navigate(`/citizen/complaints/${notif.complaint_id}`);
      onClose();
    }
  };

  return (
    <div ref={ref} style={{
      position: 'absolute', top: 64, right: 24, width: 380, maxHeight: 480,
      background: '#0e1626',
      border: '1px solid var(--border-medium)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 200, display: 'flex', flexDirection: 'column',
      animation: 'fadeIn 0.15s ease',
    }}>
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={15} color="#38bdf8" />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span style={{
              background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700,
              padding: '1px 6px', borderRadius: 9999,
            }}>
              {unreadCount}
            </span>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            <Bell size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <div style={{ fontSize: 13 }}>No unread notifications</div>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                cursor: n.complaint_id ? 'pointer' : 'default',
                background: n.is_read ? 'transparent' : 'rgba(2, 132, 199, 0.05)',
                transition: 'background 0.15s ease',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(2, 132, 199, 0.05)'}
            >
              <div style={{ marginTop: 2, flexShrink: 0 }}>
                {getIcon(n.type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: n.is_read ? '#94a3b8' : '#f8fafc', lineHeight: 1.45, fontWeight: n.is_read ? 400 : 500 }}>
                  {n.message}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
              {!n.is_read && (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', flexShrink: 0, marginTop: 6 }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
