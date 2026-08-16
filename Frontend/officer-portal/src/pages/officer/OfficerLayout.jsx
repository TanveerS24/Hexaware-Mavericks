import React, { useState } from 'react';
import { useLocation, Link, Outlet } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import NotificationPanel from '../../components/NotificationPanel';
import toast from 'react-hot-toast';
import { 
  ShieldCheck, LayoutDashboard, Inbox, Briefcase, 
  Building2, MapPin, BadgeCheck, LogOut, Bell
} from 'lucide-react';

const navItems = [
  { to: '/officer', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/officer/incoming', label: 'Incoming Queue', icon: Inbox },
  { to: '/officer/cases', label: 'My Assigned Cases', icon: Briefcase },
];

export default function OfficerLayout() {
  const { user, logout, unreadCount, isConnected } = useApp();
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const officer = user?.officer_profile;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="logo-badge" style={{ background: 'linear-gradient(135deg, #4f46e5, #0284c7)' }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="logo-title">CitizenAI</div>
              <div className="logo-subtitle">Officer Operations</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Operations</div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {officer && (
            <>
              <div className="nav-section-title" style={{ marginTop: 16 }}>Deployment</div>
              <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={13} color="#38bdf8" />
                  <span>{officer.department}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={13} color="#fbbf24" />
                  <span>{officer.region}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BadgeCheck size={13} color="#34d399" />
                  <span>{officer.designation}</span>
                </div>
              </div>
            </>
          )}

          <div className="nav-section-title" style={{ marginTop: 16 }}>Telemetry</div>
          <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: isConnected ? '#10b981' : '#ef4444',
            }} />
            <span>{isConnected ? 'Dispatch Network Online' : 'Connecting...'}</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #4f46e5, #0284c7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, flexShrink: 0, color: '#fff',
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Field Officer</div>
            </div>
          </div>
          <button onClick={() => { logout(); toast.success('Signed out'); }} className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 10 }}>
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-title">
            {navItems.find(n => n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to))?.label || 'Officer Portal'}
          </div>
          <div className="topbar-right">
            <button className="notification-btn" onClick={() => setShowNotifs(!showNotifs)}>
              <Bell size={16} />
              {unreadCount > 0 && <span className="notification-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
          </div>
        </header>
        {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}
        <div className="page-content"><Outlet /></div>
      </main>
    </div>
  );
}
