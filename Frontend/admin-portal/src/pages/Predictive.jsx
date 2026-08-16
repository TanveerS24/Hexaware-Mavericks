import React, { useState } from 'react';
import {
  Cpu,
  AlertTriangle,
  Wrench,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Zap,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdmin } from '../context/AdminContext';
import MetricCard from '../components/MetricCard';

export const Predictive = () => {
  const { hotspots, triggerHotspotAction } = useAdmin();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '26px', color: '#fff', marginBottom: 4 }}>
            Predictive Hotspot & Infrastructure Health
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            AI pattern detection identifying chronic failure zones requiring permanent capital upgrades vs repeated temporary patches
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              color: '#c084fc',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Sparkles size={14} />
            <span>Predictive Recurrence Engine: ACTIVE</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <MetricCard
          title="Flagged Chronic Zones"
          value={hotspots.length}
          subtitle="4 zones with recurring failures"
          icon={AlertTriangle}
          trend="Highest in Ward 4"
          trendPositive={false}
          color="rose"
        />
        <MetricCard
          title="Mean Recurrence Likelihood"
          value="85.2%"
          subtitle="Probability of re-failure < 30 days"
          icon={Activity}
          trend="+4% risk factor"
          trendPositive={false}
          color="amber"
        />
        <MetricCard
          title="Est. Capital Savings"
          value="$129,000"
          subtitle="Saved by permanent engineering fixes"
          icon={DollarSign}
          trend="3.2x ROI"
          trendPositive={true}
          color="emerald"
        />
        <MetricCard
          title="Preventative Orders"
          value="3 Dispatched"
          subtitle="Under civil contractor review"
          icon={Wrench}
          trend="1 pending approval"
          trendPositive={true}
          color="purple"
        />
      </div>

      {/* Hotspots Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: '18px', color: '#fff' }}>
          Identified Chronic Failure Hotspots & Permanent Action Plans
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          {hotspots.map((h) => {
            const isCritical = h.severity === 'critical';
            return (
              <div
                key={h.id}
                className="glass-card"
                style={{
                  padding: '22px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  border: isCritical ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border-medium)',
                  background: isCritical
                    ? 'linear-gradient(160deg, rgba(244, 63, 94, 0.08) 0%, rgba(14, 22, 43, 0.85) 100%)'
                    : undefined,
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="mono" style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                        {h.id}
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: isCritical ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: isCritical ? '#fb7185' : '#fbbf24',
                        }}
                      >
                        {h.risk_score}% Recurrence Risk
                      </span>
                    </div>
                    <h4 style={{ fontSize: '15px', color: '#fff' }}>{h.zone}</h4>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{h.category} • {h.timeframe}</p>
                  </div>

                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isCritical ? '#f43f5e' : '#f59e0b',
                      flexShrink: 0,
                    }}
                  >
                    <Zap size={22} />
                  </div>
                </div>

                {/* Pattern & Root Cause */}
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 600 }}>
                    ⚠️ Root Cause: {h.failure_type}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {h.pattern_summary}
                  </p>
                </div>

                {/* Recommendation Box */}
                <div style={{ fontSize: '12.5px', color: '#fff', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                    💡 Recommended Permanent Fix:
                  </span>
                  <p style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {h.recommended_action}
                  </p>
                </div>

                {/* Financial ROI comparison */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Est. Upgrade Cost</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{h.estimated_cost}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Cost Avoidance</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#34d399' }}>{h.estimated_savings}</div>
                  </div>
                </div>

                {/* Dispatch Button */}
                <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                  {h.action_dispatched ? (
                    <div
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        color: '#34d399',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <CheckCircle size={14} />
                      <span>Permanent Work Order Dispatched</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => triggerHotspotAction(h.id)}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '9px 14px', fontSize: '12.5px' }}
                    >
                      <Wrench size={14} />
                      <span>Dispatch Permanent Engineering Upgrade</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default Predictive;
