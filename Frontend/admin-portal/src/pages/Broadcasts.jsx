import React, { useState } from 'react';
import {
  Send,
  Radio,
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import MetricCard from '../components/MetricCard';
import BroadcastModal from '../components/BroadcastModal';

export const Broadcasts = () => {
  const { broadcasts } = useAdmin();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWardFilter, setSelectedWardFilter] = useState('all');

  const totalCitizensReached = broadcasts.reduce((acc, b) => acc + (b.recipients_reached || 0), 0);
  const activeAlerts = broadcasts.filter((b) => b.status === 'active');

  const filteredBroadcasts = broadcasts.filter((b) => {
    if (selectedWardFilter !== 'all' && !b.target_ward.includes(selectedWardFilter)) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '26px', color: '#fff', marginBottom: 4 }}>
            Emergency Citizen Broadcast & Notification Tool
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Push targeted municipal alerts and ETA notices to affected citizens when systemic incidents emerge
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
            style={{ padding: '10px 18px', fontSize: '13.5px' }}
          >
            <Send size={16} />
            <span>Create New Emergency Broadcast</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <MetricCard
          title="Citizens Reached"
          value={totalCitizensReached.toLocaleString()}
          subtitle="Delivered across all broadcast channels"
          icon={Users}
          trend="+42.5k this week"
          trendPositive={true}
          color="blue"
        />
        <MetricCard
          title="Active Live Advisories"
          value={activeAlerts.length}
          subtitle="Currently displayed on citizen portals"
          icon={Radio}
          trend="1 in Ward 4 Central"
          trendPositive={true}
          color="rose"
        />
        <MetricCard
          title="Delivery Channels"
          value="4 Channels"
          subtitle="Push, SMS, Portal Banner, IVR"
          icon={Sparkles}
          trend="99.8% delivery rate"
          trendPositive={true}
          color="purple"
        />
        <MetricCard
          title="Avg Dispatch Speed"
          value="< 45 sec"
          subtitle="From incident trigger to delivery"
          icon={Clock}
          trend="Automated pipeline"
          trendPositive={true}
          color="emerald"
        />
      </div>

      {/* Broadcast History Feed */}
      <div className="glass-card" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: '17px', color: '#fff' }}>Municipal Broadcast Log & Impact</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Historical log of citizen advisories, affected wards, and delivery reach
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              className="input-control"
              style={{ width: 'auto', padding: '6px 32px 6px 10px', fontSize: '12px' }}
              value={selectedWardFilter}
              onChange={(e) => setSelectedWardFilter(e.target.value)}
            >
              <option value="all">All Target Wards</option>
              <option value="Ward 4">Ward 4 (Central)</option>
              <option value="Ward 7">Ward 7 (Koramangala)</option>
              <option value="Ward 12">Ward 12 (Indiranagar)</option>
              <option value="City-Wide">City-Wide</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredBroadcasts.map((bc) => {
            const isUrgent = bc.severity === 'urgent';
            return (
              <div
                key={bc.id}
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: isUrgent ? 'rgba(244, 63, 94, 0.06)' : 'rgba(10, 16, 32, 0.65)',
                  border: `1px solid ${isUrgent ? 'rgba(244, 63, 94, 0.35)' : 'var(--border-subtle)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="mono" style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                        {bc.id}
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: isUrgent ? 'rgba(244, 63, 94, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                          color: isUrgent ? '#fb7185' : '#38bdf8',
                        }}
                      >
                        {isUrgent ? '🔴 Urgent Emergency Alert' : '🟡 Advisory Notice'}
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: bc.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                          color: bc.status === 'active' ? '#34d399' : 'var(--text-muted)',
                        }}
                      >
                        {bc.status === 'active' ? 'Live on Portal' : 'Archived'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '16px', color: '#fff', fontWeight: 700 }}>
                      {bc.title}
                    </h4>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff', fontFamily: 'Outfit' }}>
                      ~{bc.recipients_reached?.toLocaleString()} Citizens
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Estimated Reach</p>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {bc.message}
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    fontSize: '11.5px',
                    paddingTop: 8,
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: 'var(--text-muted)' }}>
                    <span>📍 Target: <strong style={{ color: '#fff' }}>{bc.target_ward}</strong></span>
                    <span>🏷️ Category: <strong style={{ color: '#fff' }}>{bc.target_category}</strong></span>
                    <span>🕒 Dispatched: {bc.sent_at}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {bc.channels?.map((ch) => (
                      <span
                        key={ch}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          color: 'var(--text-secondary)',
                          fontSize: '10.5px',
                        }}
                      >
                        ✓ {ch}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BroadcastModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
export default Broadcasts;
