import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  MapPin,
  TrendingUp,
  FileSpreadsheet,
  Cpu,
  Radio,
  Send,
  ShieldCheck,
  Building2,
  LogOut,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

export const Sidebar = () => {
  const { user, logout, clusters, hotspots, pendingOfficers } = useAdmin();

  const activeClustersCount = clusters.filter(c => !c.is_consolidated).length;
  const criticalHotspotsCount = hotspots.filter(h => h.severity === 'critical').length;
  const pendingOfficersCount = (pendingOfficers || []).filter(o => o.status === 'pending').length;

  const navItems = [
    { to: '/', label: 'Executive Overview', icon: LayoutDashboard },
    { to: '/pending-officers', label: 'Pending Officers', icon: UserCheck, badge: pendingOfficersCount > 0 ? `${pendingOfficersCount} Pending` : null, badgeColor: 'amber' },
    { to: '/sla', label: 'SLA Monitoring', icon: Clock, badge: 'Live' },
    { to: '/heatmap', label: 'Geospatial Heatmap', icon: MapPin },
    { to: '/trends', label: 'Trend & Spike Analytics', icon: TrendingUp },
    { to: '/audit', label: 'Audit Logs & Users', icon: FileSpreadsheet },
    { to: '/predictive', label: 'Predictive Hotspots', icon: Cpu, badge: criticalHotspotsCount > 0 ? `${criticalHotspotsCount} Alert` : null, badgeColor: 'rose' },
    { to: '/clusters', label: 'Duplicate / Clusters', icon: Radio, badge: activeClustersCount > 0 ? `${activeClustersCount} Active` : null, badgeColor: 'amber' },
    { to: '/broadcasts', label: 'Emergency Broadcast', icon: Send },
  ];

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #090E1C 0%, #060A14 100%)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '24px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            boxShadow: '0 0 16px rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          <Building2 size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: 'Outfit' }}>
              CITY COMMAND
            </span>
            <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 5px', borderRadius: '4px', fontWeight: 700 }}>
              ADMIN
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Citizen Intelligence OS</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 12px 4px' }}>
          Municipal Intelligence
        </span>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 14px',
                borderRadius: '10px',
                color: isActive ? '#38bdf8' : 'var(--text-secondary)',
                background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                textDecoration: 'none',
                fontSize: '13.5px',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.18s ease',
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Icon size={18} />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '9999px',
                    background: item.badgeColor === 'rose'
                      ? 'rgba(244, 63, 94, 0.2)'
                      : item.badgeColor === 'amber'
                      ? 'rgba(245, 158, 11, 0.2)'
                      : 'rgba(56, 189, 248, 0.2)',
                    color: item.badgeColor === 'rose'
                      ? '#fb7185'
                      : item.badgeColor === 'amber'
                      ? '#fbbf24'
                      : '#38bdf8',
                    border: `1px solid ${
                      item.badgeColor === 'rose'
                        ? 'rgba(244, 63, 94, 0.35)'
                        : item.badgeColor === 'amber'
                        ? 'rgba(245, 158, 11, 0.35)'
                        : 'rgba(56, 189, 248, 0.35)'
                    }`,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User / Session Footer */}
      <div
        style={{
          padding: '16px 14px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(10, 16, 32, 0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || 'Administrator'}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>City Superintendent</p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <LogOut size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: 'var(--text-dim)' }}>
          <span className="pulse-dot green" style={{ width: 6, height: 6 }} />
          <span>System Engine: Connected (Port 8000)</span>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
