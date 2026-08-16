import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Briefcase, ArrowRight, Clock, Layers } from 'lucide-react';

export default function MyCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCases();
    const handle = () => loadCases();
    window.addEventListener('complaint_status_changed', handle);
    return () => window.removeEventListener('complaint_status_changed', handle);
  }, []);

  const loadCases = async () => {
    try {
      const { complaints } = await api.getComplaints({ status: 'in_progress', limit: 50 });
      setCases(complaints || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSLAPercent = (c) => {
    if (!c.sla_deadline) return 0;
    const total = new Date(c.sla_deadline) - new Date(c.created_at);
    const elapsed = Date.now() - new Date(c.created_at);
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ marginBottom: 4 }}>My Assigned Cases</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13.5 }}>{cases.length} active investigations in progress</p>
      </div>

      {cases.length === 0 ? (
        <div className="empty-state glass-card-static">
          <Briefcase size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
          <h4 style={{ marginBottom: 4 }}>No Assigned Active Cases</h4>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Claim pending tickets from the incoming queue to begin resolution.</p>
          <Link to="/officer/incoming" className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>
            <span>View Incoming Triage</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cases.map(c => {
            const slaPct = getSLAPercent(c);
            const slaStatus = slaPct >= 90 ? 'critical' : slaPct >= 70 ? 'warning' : 'good';
            return (
              <Link key={c.id} to={`/officer/complaints/${c.id}`} className={`complaint-card ${c.priority}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: '#f8fafc', marginBottom: 3 }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Citizen: {c.citizen?.name} • Region: {c.region} • {new Date(c.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className={`badge priority-${c.priority}`}>{c.priority}</span>
                    <span className="badge status-in_progress">In Progress</span>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>
                  {c.ai_summary || (c.description?.substring(0, 140) + '...')}
                </p>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
                    <span>SLA Deadline: {new Date(c.sla_deadline).toLocaleString()}</span>
                    <span style={{ color: slaStatus === 'critical' ? '#f87171' : slaStatus === 'warning' ? '#fbbf24' : '#34d399', fontWeight: 600 }}>
                      {Math.round(slaPct)}%
                    </span>
                  </div>
                  <div className="sla-bar">
                    <div className={`sla-bar-fill sla-${slaStatus}`} style={{ width: `${slaPct}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
