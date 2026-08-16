import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Inbox, Check, X, Eye, AlertTriangle, 
  Clock, ShieldAlert, Sparkles, User, MapPin
} from 'lucide-react';

export default function IncomingComplaints() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    loadComplaints();
    const handle = (e) => {
      loadComplaints();
      if (e.detail?.action === 'accepted' && e.detail?.officerName) {
        toast(`Case claimed by ${e.detail.officerName}`);
      }
    };
    window.addEventListener('new_complaint', handle);
    window.addEventListener('complaint_assigned', handle);
    window.addEventListener('emergency_alert', (e) => {
      toast.error(`EMERGENCY: ${e.detail?.title}`, { duration: 8000 });
    });
    return () => {
      window.removeEventListener('new_complaint', handle);
      window.removeEventListener('complaint_assigned', handle);
    };
  }, [filter]);

  const loadComplaints = async () => {
    try {
      const params = { status: 'pending', limit: 50 };
      if (filter !== 'all') params.priority = filter;
      const { complaints: c } = await api.getComplaints(params);
      const sorted = (c || []).sort((a, b) => {
        const order = { emergency: 0, high: 1, normal: 2, low: 3 };
        return (order[a.priority] || 2) - (order[b.priority] || 2);
      });
      setComplaints(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (complaintId) => {
    setActionLoading(p => ({ ...p, [complaintId]: 'accepting' }));
    try {
      await api.assignComplaint(complaintId, { action: 'accepted', notes: 'Claimed by field officer for investigation.' });
      toast.success('Grievance claimed successfully');
      setComplaints(prev => prev.filter(c => c.id !== complaintId));
    } catch (err) {
      toast.error(err.message || 'Failed to claim grievance');
    } finally {
      setActionLoading(p => ({ ...p, [complaintId]: null }));
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(p => ({ ...p, [rejectModal]: 'rejecting' }));
    try {
      await api.assignComplaint(rejectModal, { action: 'rejected', notes: rejectNote || 'Complaint reviewed and rejected with reason.' });
      toast.success('Grievance rejected with documented rationale.');
      setComplaints(prev => prev.filter(c => c.id !== rejectModal));
      setRejectModal(null);
      setRejectNote('');
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(p => ({ ...p, [rejectModal]: null }));
    }
  };

  const filters = [
    { key: 'all', label: 'All Urgencies' },
    { key: 'emergency', label: 'Emergency' },
    { key: 'high', label: 'High Priority' },
    { key: 'normal', label: 'Normal' },
    { key: 'low', label: 'Low' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Incoming Grievance Triage</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13.5 }}>
            {complaints.length} unassigned cases pending field claim in your jurisdiction
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
          <span>Real-time Ingestion Stream</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`btn ${filter === f.key ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="loading-spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : complaints.length === 0 ? (
        <div className="empty-state glass-card-static">
          <Inbox size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
          <h4 style={{ marginBottom: 4 }}>Triage Queue Clear</h4>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No unassigned grievances pending review in this jurisdiction.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {complaints.map(c => {
            const action = actionLoading[c.id];
            const isAccepted = c.assignments?.some(a => a.action === 'accepted');
            const acceptedBy = c.assignments?.find(a => a.action === 'accepted')?.officer?.name;

            return (
              <div key={c.id} className={`complaint-card ${c.priority}`} style={{ cursor: 'default' }}>
                {c.is_emergency && (
                  <div style={{
                    padding: '6px 12px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)',
                    marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#f87171', fontWeight: 700,
                  }}>
                    <AlertTriangle size={14} />
                    <span>EMERGENCY HAZARD — 2-Hour SLA Target</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#f8fafc', marginBottom: 3 }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>Citizen: {c.citizen?.name}</span>
                      <span>•</span>
                      <span>Region: {c.region}</span>
                      <span>•</span>
                      <span>{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className={`badge priority-${c.priority}`}>{c.priority}</span>
                    <span className={`badge status-${c.status}`}>{c.status}</span>
                  </div>
                </div>

                {/* AI Summary */}
                {c.ai_summary && (
                  <div style={{ padding: '10px 14px', background: 'rgba(2, 132, 199, 0.04)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Sparkles size={12} />
                      <span>NLP Extraction</span>
                    </div>
                    {c.ai_summary}
                  </div>
                )}

                {/* Actions */}
                {isAccepted ? (
                  <div style={{
                    padding: '8px 12px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)',
                    fontSize: 12.5, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <Check size={14} />
                    <span>Claimed by <strong>{acceptedBy}</strong></span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleAccept(c.id)}
                      className="btn btn-success btn-sm"
                      disabled={!!action}
                    >
                      <Check size={13} />
                      <span>{action === 'accepting' ? 'Claiming...' : 'Claim Grievance'}</span>
                    </button>
                    <button
                      onClick={() => setRejectModal(c.id)}
                      className="btn btn-danger btn-sm"
                      disabled={!!action}
                    >
                      <X size={13} />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => navigate(`/officer/complaints/${c.id}`)}
                      className="btn btn-secondary btn-sm"
                      style={{ marginLeft: 'auto' }}
                    >
                      <Eye size={13} />
                      <span>Inspect Details</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#f87171' }}>
                <X size={16} />
                <span>Reject Grievance Ticket</span>
              </div>
              <button onClick={() => setRejectModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 14, color: 'var(--text-secondary)', fontSize: 13 }}>
                Document reason for rejection. This log is archived and notified to the citizen.
              </p>
              <div className="form-group">
                <label className="form-label">Rejection Rationale *</label>
                <textarea className="form-input" style={{ minHeight: 90 }} placeholder="State why this grievance cannot be serviced or is invalid..."
                  value={rejectNote} onChange={e => setRejectNote(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setRejectModal(null)} className="btn btn-secondary btn-sm">Cancel</button>
              <button onClick={handleReject} className="btn btn-danger btn-sm" disabled={!rejectNote.trim()}>
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
