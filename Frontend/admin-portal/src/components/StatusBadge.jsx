import React from 'react';
import { AlertTriangle, CheckCircle, Clock, ShieldAlert, Sparkles } from 'lucide-react';

export const StatusBadge = ({ status, type = 'status' }) => {
  if (!status) return null;

  const normalized = status.toLowerCase().replace('-', '_');

  if (type === 'sla') {
    if (normalized === 'breached') {
      return (
        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.18)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
          <AlertTriangle size={12} /> Breached
        </span>
      );
    }
    if (normalized === 'nearing_breach') {
      return (
        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.18)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
          <Clock size={12} /> Near Breach
        </span>
      );
    }
    return (
      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.18)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
        <CheckCircle size={12} /> Within SLA
      </span>
    );
  }

  if (type === 'priority') {
    if (normalized === 'high' || normalized === 'critical') {
      return (
        <span className="badge badge-high">
          <span className="pulse-dot red" style={{ width: 6, height: 6 }} /> {status}
        </span>
      );
    }
    if (normalized === 'medium') {
      return (
        <span className="badge badge-medium">
          <span className="pulse-dot amber" style={{ width: 6, height: 6 }} /> {status}
        </span>
      );
    }
    return (
      <span className="badge badge-low">
        <span className="pulse-dot cyan" style={{ width: 6, height: 6 }} /> {status}
      </span>
    );
  }

  if (type === 'health') {
    if (normalized === 'red') {
      return (
        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <span className="pulse-dot red" style={{ width: 6, height: 6 }} /> Critical Risk
        </span>
      );
    }
    if (normalized === 'yellow') {
      return (
        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <span className="pulse-dot amber" style={{ width: 6, height: 6 }} /> Caution
        </span>
      );
    }
    return (
      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        <span className="pulse-dot green" style={{ width: 6, height: 6 }} /> Optimal
      </span>
    );
  }

  // Generic grievance status
  if (normalized === 'resolved') {
    return <span className="badge badge-resolved"><CheckCircle size={11} /> Resolved</span>;
  }
  if (normalized === 'in_progress') {
    return <span className="badge badge-in_progress"><Clock size={11} /> In Progress</span>;
  }
  if (normalized === 'malicious') {
    return <span className="badge badge-malicious"><ShieldAlert size={11} /> Malicious</span>;
  }
  if (normalized === 'reviewed') {
    return <span className="badge badge-reviewed"><Sparkles size={11} /> Reviewed</span>;
  }

  return <span className="badge badge-new"><span className="pulse-dot cyan" style={{ width: 6, height: 6 }} /> New</span>;
};
export default StatusBadge;
