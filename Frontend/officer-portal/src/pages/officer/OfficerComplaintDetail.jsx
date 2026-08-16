import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Send, Sparkles, Clock, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved & Closed' },
  { value: 'escalated', label: 'Escalated to High Authority' },
];

export default function OfficerComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updateText, setUpdateText] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadComplaint();
    const handle = () => loadComplaint();
    window.addEventListener('complaint_update', handle);
    return () => window.removeEventListener('complaint_update', handle);
  }, [id]);

  const loadComplaint = async () => {
    try {
      const { complaint: c } = await api.getComplaint(id);
      setComplaint(c);
    } catch (err) {
      toast.error('Grievance record not found');
      navigate('/officer/cases');
    } finally {
      setLoading(false);
    }
  };

  const postUpdate = async () => {
    if (!updateText.trim()) return toast.error('Please enter an action update');
    setUpdating(true);
    try {
      await api.updateComplaint(id, { update_text: updateText, new_status: newStatus || undefined });
      toast.success('Update logged & dispatched to citizen');
      setUpdateText('');
      setNewStatus('');
      loadComplaint();
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>;
  if (!complaint) return null;

  const slaPct = complaint.sla_deadline
    ? Math.min(100, ((Date.now() - new Date(complaint.created_at)) / (new Date(complaint.sla_deadline) - new Date(complaint.created_at))) * 100)
    : 0;
  const slaStatus = slaPct >= 90 ? 'critical' : slaPct >= 70 ? 'warning' : 'good';

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
        <ArrowLeft size={14} />
        <span>Back</span>
      </button>

      {/* Primary Details Card */}
      <div className="glass-card-static" style={{ padding: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span className={`badge priority-${complaint.priority}`}>{complaint.priority}</span>
              <span className={`badge status-${complaint.status}`}>{complaint.status.replace('_', ' ')}</span>
              {complaint.is_emergency && <span className="badge badge-danger">Emergency Hazard</span>}
            </div>
            <h2 style={{ marginBottom: 6 }}>{complaint.title}</h2>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span>Citizen: {complaint.citizen?.name} ({complaint.citizen?.phone})</span>
              <span>•</span>
              <span>Jurisdiction: {complaint.region}</span>
              <span>•</span>
              <span>{new Date(complaint.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* SLA Status */}
        {complaint.sla_deadline && (
          <div style={{ padding: 14, background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12.5 }}>
              <span>SLA Target Progress</span>
              <span style={{ color: slaStatus === 'critical' ? '#f87171' : slaStatus === 'warning' ? '#fbbf24' : '#34d399', fontWeight: 700, fontFamily: 'monospace' }}>
                Deadline: {new Date(complaint.sla_deadline).toLocaleString()}
              </span>
            </div>
            <div className="sla-bar" style={{ height: 4 }}>
              <div className={`sla-bar-fill sla-${slaStatus}`} style={{ width: `${slaPct}%` }} />
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
          <p style={{ color: '#f8fafc', lineHeight: 1.7, fontSize: 14 }}>{complaint.description}</p>
        </div>

        {complaint.ai_summary && (
          <div style={{ padding: 14, background: 'rgba(2, 132, 199, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Sparkles size={13} />
              <span>NLP Synthesis</span>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{complaint.ai_summary}</p>
          </div>
        )}
      </div>

      {/* Officer Dispatch Action Panel */}
      <div className="glass-card-static" style={{ padding: 24, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
        <h4 style={{ marginBottom: 4, color: '#38bdf8' }}>Log Action / Citizen Update</h4>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>
          Publishing an update notifies the citizen and logs an immutable timeline entry.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Action Log / Message *</label>
            <textarea className="form-input" style={{ minHeight: 90 }}
              placeholder="e.g., Maintenance team dispatched to site. Inspection in progress..."
              value={updateText}
              onChange={e => setUpdateText(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Update Grievance Status</label>
            <select className="form-input" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
              <option value="">Maintain Current Status</option>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <button onClick={postUpdate} className="btn btn-primary" disabled={updating || !updateText.trim()} style={{ width: '100%', padding: '11px' }}>
            {updating ? <span className="loading-spinner" /> : (
              <>
                <Send size={14} />
                <span>Publish Update & Notify Citizen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="glass-card-static" style={{ padding: 24 }}>
        <h4 style={{ marginBottom: 18 }}>Case Action History</h4>
        {complaint.timeline?.length > 0 ? (
          <div className="timeline">
            {[...complaint.timeline].reverse().map((item) => (
              <div key={item.id} className="timeline-item">
                <div className="timeline-dot" style={{
                  background: item.status === 'resolved' ? '#10b981' : item.status === 'in_progress' ? '#0284c7' : '#f59e0b',
                }} />
                <div className="timeline-content">
                  <div className="timeline-date">{new Date(item.timestamp).toLocaleString()}</div>
                  <div className="timeline-text">{item.update_text}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 14 }}>No actions recorded yet</div>
        )}
      </div>
    </div>
  );
}
