import React, { useState, useEffect } from 'react';
import { Search, Bell, Radio, Send, ShieldAlert, Sparkles } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

export const Navbar = ({ onOpenBroadcast }) => {
  const { searchQuery, setSearchQuery, clusters, summary } = useAdmin();
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeClusters = clusters.filter(c => !c.is_consolidated).length;

  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(9, 14, 28, 0.75)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
      }}
    >
      {/* Search & System Indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1, maxWidth: 520 }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="input-control"
            style={{ paddingLeft: 38, background: 'rgba(14, 22, 43, 0.6)' }}
            placeholder="Search tickets, citizen email, ward, or incident ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Right Controls & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Live Municipal Clock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '9999px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          <span className="pulse-dot green" style={{ width: 6, height: 6 }} />
          <span className="mono" style={{ color: '#fff', fontWeight: 600 }}>{time}</span>
          <span style={{ color: 'var(--text-muted)' }}>| IST</span>
        </div>

        {/* Emerging Incident Alert Badge */}
        {activeClusters > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: '9999px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fbbf24',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <Radio size={14} className="pulse-dot amber" />
            <span>{activeClusters} Emerging Clusters</span>
          </div>
        )}

        {/* Quick Emergency Broadcast Button */}
        <button
          onClick={onOpenBroadcast}
          className="btn btn-primary"
          style={{ padding: '7px 14px', fontSize: '12.5px', borderRadius: '8px' }}
        >
          <Send size={14} />
          <span>Dispatch Broadcast</span>
        </button>
      </div>
    </header>
  );
};
export default Navbar;
