import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Flame,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  Zap
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid
} from 'recharts';
import { useAdmin } from '../context/AdminContext';
import MetricCard from '../components/MetricCard';

export const Trends = () => {
  const { trends } = useAdmin();
  const [timelineRange, setTimelineRange] = useState(14);
  const [selectedChartType, setSelectedChartType] = useState('category'); // 'category' | 'lifecycle'

  // Spike detection insights
  const spikeInsights = [
    {
      category: 'Water & Sanitation',
      spikeMultiplier: '3.1x',
      period: 'Aug 10 – Aug 12',
      zone: 'Ward 4 (Central)',
      cause: 'Primary 450mm Feeder Pipeline rupture at MG Road junction caused sudden surge from 18 to 58 daily complaints.',
      status: 'Stabilizing (Down to 19 today)',
      severity: 'high',
    },
    {
      category: 'Electricity & Power',
      spikeMultiplier: '1.8x',
      period: 'Aug 16 (Today)',
      zone: 'Ward 7 (Koramangala)',
      cause: 'Substation 7-B transformer phase overload during evening peak hours resulted in 14 simultaneous blackout tickets.',
      status: 'Active Incident (Crew Dispatched)',
      severity: 'high',
    },
    {
      category: 'Roads & Civil Works',
      spikeMultiplier: '1.2x',
      period: 'Aug 07 – Aug 09',
      zone: 'Ward 12 (Indiranagar)',
      cause: 'Pre-monsoon asphalt erosion created 6 recurring sinkhole reports near storm drains.',
      status: 'Resolved via concrete reinforcement',
      severity: 'medium',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '26px', color: '#fff', marginBottom: 4 }}>
            Trend Charts & Anomaly Spike Detection
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Historical grievance volume patterns, multi-category trajectory analytics, and surge alerts
          </p>
        </div>

        {/* Timeline Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: 2,
            }}
          >
            {[
              { label: '7 Days', val: 7 },
              { label: '14 Days', val: 14 },
              { label: '30 Days', val: 30 },
            ].map((t) => (
              <button
                key={t.val}
                onClick={() => setTimelineRange(t.val)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: timelineRange === t.val ? 'var(--primary)' : 'transparent',
                  color: timelineRange === t.val ? '#fff' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Anomaly Spike Alert Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.25)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171',
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h4 style={{ fontSize: '15px', color: '#fff' }}>
                Anomaly Alert: Water Complaints Tripled in Week 32
              </h4>
              <span className="badge badge-high">3.1x Spike Detected</span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: 2 }}>
              Surge of 58 complaints in 48 hours detected in Ward 4 Central due to feeder pipeline rupture. Automated triage grouped duplicates.
            </p>
          </div>
        </div>
      </div>

      {/* Main Multi-Series Category Trends Chart */}
      <div className="glass-card" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: '17px', color: '#fff' }}>
              {selectedChartType === 'category' ? 'Grievance Volume Trajectory by Category' : 'Filing vs Resolution Velocity'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Spotting abnormal surges and verifying if resolution velocity keeps pace with incoming volume
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setSelectedChartType('category')}
              className="btn btn-sm"
              style={{
                background: selectedChartType === 'category' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
              }}
            >
              Category Breakdown
            </button>
            <button
              onClick={() => setSelectedChartType('lifecycle')}
              className="btn btn-sm"
              style={{
                background: selectedChartType === 'lifecycle' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
              }}
            >
              Created vs Resolved
            </button>
          </div>
        </div>

        <div style={{ height: 340, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            {selectedChartType === 'category' ? (
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorRoads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="recharts-custom-tooltip">
                          <p style={{ fontWeight: 700, color: '#fff', fontSize: '12.5px', marginBottom: 6 }}>
                            📅 {label}
                          </p>
                          {payload.map((entry) => (
                            <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, fontSize: '11.5px', color: entry.color }}>
                              <span>{entry.name}:</span>
                              <span style={{ fontWeight: 700 }}>{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="water" name="Water & Sanitation" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorWater)" />
                <Area type="monotone" dataKey="power" name="Electricity & Power" stroke="#fbbf24" strokeWidth={2} fillOpacity={1} fill="url(#colorPower)" />
                <Area type="monotone" dataKey="roads" name="Roads & Civil" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#colorRoads)" />
              </AreaChart>
            ) : (
              <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="recharts-custom-tooltip">
                          <p style={{ fontWeight: 700, color: '#fff', fontSize: '12.5px', marginBottom: 6 }}>
                            📅 {label}
                          </p>
                          {payload.map((entry) => (
                            <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, fontSize: '11.5px', color: entry.color }}>
                              <span>{entry.name}:</span>
                              <span style={{ fontWeight: 700 }}>{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="total_created" name="Total Filed" stroke="#38bdf8" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="resolved_count" name="Total Resolved" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="malicious_count" name="Malicious Spam Blocked" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Spike Diagnosis Cards */}
      <div className="glass-card" style={{ padding: '22px 24px' }}>
        <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: 4 }}>
          Detected Spike History & Incident Attribution
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 16 }}>
          Correlating sudden statistical anomalies with physical municipal infrastructure events
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {spikeInsights.map((spk, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px 18px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(10, 16, 32, 0.7)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  {spk.category}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                  }}
                >
                  {spk.spikeMultiplier} Spike
                </span>
              </div>

              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                📍 <strong style={{ color: 'var(--text-secondary)' }}>{spk.zone}</strong> • {spk.period}
              </div>

              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {spk.cause}
              </p>

              <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span style={{ color: spk.status.includes('Active') ? '#fbbf24' : '#34d399', fontWeight: 600 }}>
                  {spk.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default Trends;
