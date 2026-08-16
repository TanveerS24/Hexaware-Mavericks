import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import { 
  Inbox, Briefcase, CheckCircle2, AlertTriangle, 
  ArrowRight, Building2, MapPin, ShieldCheck, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';

const StatCard = ({ icon, label, value, color }) => (
  <div className="stat-card" style={{ '--accent-color': color }}>
    <div className="stat-header">
      <div className="stat-icon-wrapper" style={{ color }}>{icon}</div>
    </div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

export default function OfficerDashboard() {
  const { user } = useApp();
  const officer = user?.officer_profile;
  const [stats, setStats] = useState({ incoming: 0, myActive: 0, resolved: 0, emergency: 0 });
  const [loading, setLoading] = useState(true);
  const [recentComplaints, setRecentComplaints] = useState([]);

  useEffect(() => {
    loadData();
    const handle = () => loadData();
    window.addEventListener('complaint_assigned', handle);
    window.addEventListener('new_complaint', handle);
    return () => {
      window.removeEventListener('complaint_assigned', handle);
      window.removeEventListener('new_complaint', handle);
    };
  }, []);

  const loadData = async () => {
    try {
      const [incoming, cases] = await Promise.all([
        api.getComplaints({ status: 'pending', limit: 5 }),
        api.getComplaints({ status: 'in_progress', limit: 5 }),
      ]);
      const resolved = await api.getComplaints({ status: 'resolved', limit: 1 });
      setStats({
        incoming: incoming.total || 0,
        myActive: cases.total || 0,
        resolved: resolved.total || 0,
        emergency: incoming.complaints?.filter(c => c.is_emergency).length || 0,
      });
      setRecentComplaints([...(incoming.complaints || []).slice(0, 3), ...(cases.complaints || []).slice(0, 2)]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Welcome Header */}
      <div className="glass-card-static" style={{
        padding: '24px 28px',
        borderLeft: '3px solid #6366f1',
      }}>
        <h2 style={{ marginBottom: 4 }}>Officer Station — {user?.name}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, marginBottom: 8 }}>
          Department Jurisdiction: <strong style={{ color: '#38bdf8' }}>{officer?.department || 'Municipal Service'}</strong> • Assigned Region: <strong style={{ color: '#38bdf8' }}>{officer?.region || 'All'}</strong>
        </p>
        <div className="badge badge-success" style={{ fontSize: 11 }}>
          <ShieldCheck size={13} style={{ marginRight: 4 }} />
          Verified Officer Authorization • {officer?.designation || 'Field Officer'}
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4">
        <StatCard icon={<Inbox size={18} />} label="Pending Review" value={stats.incoming} color="#fbbf24" />
        <StatCard icon={<Briefcase size={18} />} label="My Active Cases" value={stats.myActive} color="#38bdf8" />
        <StatCard icon={<CheckCircle2 size={18} />} label="Resolved Cases" value={stats.resolved} color="#34d399" />
        <StatCard icon={<AlertTriangle size={18} />} label="Emergency Hazards" value={stats.emergency} color="#ef4444" />
      </div>

      {/* Quick Access */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {[
          { icon: <Inbox size={20} color="#fbbf24" />, label: 'Incoming Triage Queue', desc: `${stats.incoming} cases awaiting claim`, to: '/officer/incoming' },
          { icon: <Briefcase size={20} color="#38bdf8" />, label: 'My Assigned Cases', desc: `${stats.myActive} cases currently in resolution`, to: '/officer/cases' },
        ].map((item, i) => (
          <Link key={i} to={item.to} style={{ textDecoration: 'none' }}>
            <div className="glass-card" style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="stat-icon-wrapper">{item.icon}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#f8fafc', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.desc}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      {recentComplaints.length > 0 && (
        <div className="glass-card-static" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Recent Dispatch Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentComplaints.map(c => (
              <Link key={c.id} to={`/officer/complaints/${c.id}`} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--radius-md)', textDecoration: 'none', border: '1px solid var(--border-subtle)',
                transition: 'all 0.15s ease',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc', marginBottom: 2 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.department} • {new Date(c.created_at).toLocaleDateString()}</div>
                </div>
                <span className={`badge priority-${c.priority}`}>{c.priority}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
