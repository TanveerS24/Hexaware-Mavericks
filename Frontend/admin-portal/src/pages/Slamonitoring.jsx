import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  AlertOctagon,
  TrendingDown,
  ArrowUpRight,
  UserCheck,
  Zap,
  Filter,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdmin } from '../context/AdminContext';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';

export const Slamonitoring = () => {
  const { summary, complaints } = useAdmin();
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');

  const deptStats = summary?.department_breakdown || [];
  const totalBreached = deptStats.reduce((acc, d) => acc + (d.sla_breached || 0), 0);
  const totalNearing = deptStats.reduce((acc, d) => acc + (d.nearing_sla || 0), 0);

  const breachedTickets = (complaints || []).filter(
    (c) => c.sla_status === 'breached' || c.sla_status === 'nearing_breach'
  );

  const handleEscalate = (ticketId) => {
    toast.success(`Priority escalation notice dispatched for ${ticketId} to Executive Superintendent.`);
  };

  const slaTargets = [
    { priority: 'Critical / Emergency', target: '< 4 Hours', example: 'Major Pipeline Rupture / Grid Fire', color: '#f43f5e' },
    { priority: 'High Priority', target: '< 12 Hours', example: 'Contaminated Water / Blackout Area', color: '#fb7185' },
    { priority: 'Medium Priority', target: '< 24 Hours', example: 'Deep Pothole / Garbage Overflow', color: '#fbbf24' },
    { priority: 'Low Priority', target: '< 48 Hours', example: 'Faded Crossing / Tree Trimming', color: '#38bdf8' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '26px', color: '#fff', marginBottom: 4 }}>
            SLA Monitoring & Health Center
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Real-time tracking of department resolution deadlines, breach warnings, and automated escalations
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: totalBreached > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${totalBreached > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
              color: totalBreached > 0 ? '#f87171' : '#34d399',
              fontSize: '12.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span className={`pulse-dot ${totalBreached > 0 ? 'red' : 'green'}`} />
            <span>{totalBreached} Total Active Breaches Across City</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <MetricCard
          title="Overall SLA Adherence"
          value={`${summary?.sla_compliance_rate || 93.4}%`}
          subtitle="Target city standard: ≥ 90.0%"
          icon={CheckCircle}
          trend="+1.2%"
          trendPositive={true}
          color="emerald"
        />
        <MetricCard
          title="Active SLA Breaches"
          value={totalBreached}
          subtitle="Tickets past resolution deadline"
          icon={AlertOctagon}
          trend="+3 today"
          trendPositive={false}
          color="rose"
        />
        <MetricCard
          title="Nearing Breach (< 2h)"
          value={totalNearing}
          subtitle="Require immediate officer dispatch"
          icon={Clock}
          trend="8 in warning zone"
          trendPositive={false}
          color="amber"
        />
        <MetricCard
          title="Avg City Resolution"
          value={`${summary?.avg_resolution_hours || 14.8}h`}
          subtitle="Across all 5 departments"
          icon={Zap}
          trend="-2.1h speedup"
          trendPositive={true}
          color="blue"
        />
      </div>

      {/* Department SLA Matrix with Red/Yellow/Green indicators */}
      <div className="glass-card" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: '17px', color: '#fff' }}>Department SLA Health Matrix</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Real-time evaluation of department compliance, active breaches, and traffic-light status
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '11.5px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399' }}>
              <span className="pulse-dot green" style={{ width: 6, height: 6 }} /> Optimal (&gt; 95%)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fbbf24' }}>
              <span className="pulse-dot amber" style={{ width: 6, height: 6 }} /> Caution (90-95%)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f87171' }}>
              <span className="pulse-dot red" style={{ width: 6, height: 6 }} /> Breaching (&lt; 90%)
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {deptStats.map((dept) => {
            const isRed = dept.compliance_rate < 90 || dept.sla_breached > 10;
            const isYellow = !isRed && (dept.compliance_rate < 95 || dept.sla_breached > 4);
            const statusType = isRed ? 'red' : isYellow ? 'yellow' : 'green';

            return (
              <div
                key={dept.department_id || dept.department_name}
                style={{
                  background: 'rgba(10, 16, 32, 0.7)',
                  border: `1px solid ${
                    isRed ? 'rgba(239, 68, 68, 0.4)' : isYellow ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.3)'
                  }`,
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                    {dept.department_name}
                  </span>
                  <StatusBadge status={statusType} type="health" />
                </div>

                {/* Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>SLA Compliance Rate</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{dept.compliance_rate}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${dept.compliance_rate}%`,
                        height: '100%',
                        background: isRed ? '#ef4444' : isYellow ? '#f59e0b' : '#10b981',
                      }}
                    />
                  </div>
                </div>

                {/* Breakdown Stats */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    textAlign: 'center',
                    fontSize: '11px',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Open Cases</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>{dept.open_issues}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Nearing SLA</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#fbbf24' }}>{dept.nearing_sla || 0}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Breached</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: dept.sla_breached > 0 ? '#f87171' : '#fff' }}>
                      {dept.sla_breached}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SLA Target Framework Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>
        {/* Priority SLA Target Guidelines */}
        <div className="glass-card" style={{ padding: '20px 22px' }}>
          <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: 6 }}>
            Configured Municipal SLA Deadlines
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 14 }}>
            Automated SLA clock triggers upon citizen ticket filing
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {slaTargets.map((item) => (
              <div
                key={item.priority}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: item.color }}>
                    {item.priority}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.example}</div>
                </div>
                <span className="mono" style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                  {item.target}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actionable Breached / Critical Tickets Queue */}
        <div className="glass-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: '16px', color: '#fff' }}>Urgent Escalation Queue</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Active tickets breaching or within 1 hour of SLA expiration
              </p>
            </div>
            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
              {breachedTickets.length} Critical Cases
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 290, overflowY: 'auto' }}>
            {breachedTickets.map((ticket) => (
              <div
                key={ticket.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: ticket.sla_status === 'breached' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  border: `1px solid ${ticket.sla_status === 'breached' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="mono" style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                      {ticket.id}
                    </span>
                    <StatusBadge status={ticket.sla_status} type="sla" />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ticket.ward}</span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#fff', fontWeight: 500 }}>
                    {ticket.ai_summary || ticket.category}
                  </p>
                  <p style={{ fontSize: '11px', color: ticket.sla_status === 'breached' ? '#f87171' : '#fbbf24', marginTop: 2 }}>
                    ⏱️ {ticket.time_remaining}
                  </p>
                </div>

                <button
                  onClick={() => handleEscalate(ticket.id)}
                  className="btn btn-sm btn-danger"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <Zap size={12} />
                  <span>Escalate</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Slamonitoring;
