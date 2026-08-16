import React, { useState } from 'react';
import { X, Send, AlertTriangle, Radio, Users, CheckCircle } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

export const BroadcastModal = ({ isOpen, onClose, initialData = {} }) => {
  const { sendBroadcast } = useAdmin();

  const [title, setTitle] = useState(initialData.title || '');
  const [message, setMessage] = useState(initialData.message || '');
  const [targetWard, setTargetWard] = useState(initialData.ward || 'Ward 4 (Central)');
  const [targetCategory, setTargetCategory] = useState(initialData.category || 'Water & Sanitation');
  const [severity, setSeverity] = useState('urgent');
  const [channels, setChannels] = useState(['Push Notification', 'Citizen Portal Banner', 'SMS Alert']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const templates = [
    {
      label: '💧 Water Main Disruption',
      title: 'Emergency Water Supply Disruption in Zone 4',
      message: 'Emergency repair on primary 450mm feeder pipeline at MG Road junction. Water supply suspended. Restoration expected by 7:30 PM today.',
      ward: 'Ward 4 (Central)',
      category: 'Water & Sanitation',
      severity: 'urgent',
    },
    {
      label: '⚡ Grid Transformer Outage',
      title: 'Power Substation 7B Tripping & Repair Advisory',
      message: 'Due to severe phase overload at Substation 7-B, feeder lines are isolated for emergency transformer replacement. Power restored by 9:00 PM.',
      ward: 'Ward 7 (Koramangala)',
      category: 'Electricity & Power',
      severity: 'urgent',
    },
    {
      label: '🚧 Road Cavity & Traffic Diversion',
      title: 'Urgent Traffic Diversion: 100 Feet Road Storm Drain Work',
      message: 'Civil works in progress to reinforce collapsed storm drainage slab. Please take 12th Main detour until 6:00 AM tomorrow.',
      ward: 'Ward 12 (Indiranagar)',
      category: 'Roads & Infrastructure',
      severity: 'advisory',
    },
    {
      label: '🌧️ Heavy Monsoon Flash Flood Warning',
      title: 'City-Wide Monsoon Alert: Low-Lying Drainage Notice',
      message: 'Intense precipitation forecasted for next 6 hours. Emergency de-watering pumps deployed. Report waterlogging via Citizen Portal hotline.',
      ward: 'City-Wide (All Wards)',
      category: 'All Categories',
      severity: 'urgent',
    },
  ];

  const applyTemplate = (tmpl) => {
    setTitle(tmpl.title);
    setMessage(tmpl.message);
    setTargetWard(tmpl.ward);
    setTargetCategory(tmpl.category);
    setSeverity(tmpl.severity);
  };

  const getEstimatedAudience = () => {
    if (targetWard === 'City-Wide (All Wards)') return 145000;
    if (targetWard.includes('Ward 4')) return 18400;
    if (targetWard.includes('Ward 7')) return 24200;
    if (targetWard.includes('Ward 12')) return 16800;
    return 12000;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);
    await sendBroadcast({
      title,
      message,
      target_ward: targetWard,
      target_category: targetCategory,
      severity,
      channels,
      recipients_reached: getEstimatedAudience(),
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(14, 22, 43, 0.8)',
          }}
        >
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
              <Send size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', color: '#fff' }}>Emergency Citizen Broadcast</h3>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Push real-time municipal alerts to citizens in affected zones
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick Templates */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              ⚡ Fast-Fill Crisis Templates:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {templates.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyTemplate(tmpl)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-light)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Broadcast Title *
            </label>
            <input
              type="text"
              required
              className="input-control"
              placeholder="e.g. Water supply disruption in Zone 4, restoration expected by 7 PM"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Message Body */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Citizen Advisory Message *
            </label>
            <textarea
              required
              rows={3}
              className="input-control"
              style={{ resize: 'vertical' }}
              placeholder="Provide clear details on the systemic issue, affected area, and ETA for full restoration..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {/* Targeting Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Target Municipal Ward
              </label>
              <select
                className="input-control"
                value={targetWard}
                onChange={(e) => setTargetWard(e.target.value)}
              >
                <option value="City-Wide (All Wards)">City-Wide (All Wards)</option>
                <option value="Ward 4 (Central)">Ward 4 (Central)</option>
                <option value="Ward 7 (Koramangala)">Ward 7 (Koramangala)</option>
                <option value="Ward 12 (Indiranagar)">Ward 12 (Indiranagar)</option>
                <option value="Ward 9 (Jayanagar)">Ward 9 (Jayanagar)</option>
                <option value="Ward 2 (Malleshwaram)">Ward 2 (Malleshwaram)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Incident Category
              </label>
              <select
                className="input-control"
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
              >
                <option value="All Categories">All Categories</option>
                <option value="Water & Sanitation">Water & Sanitation</option>
                <option value="Electricity & Power">Electricity & Power</option>
                <option value="Roads & Infrastructure">Roads & Infrastructure</option>
                <option value="Public Health & Waste">Public Health & Waste</option>
              </select>
            </div>
          </div>

          {/* Severity & Audience Estimate */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Alert Severity Level
              </label>
              <select
                className="input-control"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <option value="urgent">🔴 Urgent Emergency Alert</option>
                <option value="advisory">🟡 Advisory / Maintenance Notice</option>
                <option value="info">🔵 Informational Update</option>
              </select>
            </div>

            <div
              style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Users size={24} style={{ color: '#38bdf8', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Estimated Citizen Reach</p>
                <p style={{ fontSize: '16px', fontWeight: 800, color: '#fff', fontFamily: 'Outfit' }}>
                  ~{getEstimatedAudience().toLocaleString()} Residents
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              marginTop: 10,
              paddingTop: 16,
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
            }}
          >
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !message.trim()}
              className="btn btn-primary"
              style={{
                background: severity === 'urgent' ? 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)' : undefined,
                borderColor: severity === 'urgent' ? 'rgba(244, 63, 94, 0.4)' : undefined,
              }}
            >
              <Send size={15} />
              <span>{isSubmitting ? 'Dispatching Alert...' : 'Push Broadcast Alert'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default BroadcastModal;
