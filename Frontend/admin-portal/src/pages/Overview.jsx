import React from 'react';
import {
  Inbox,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Building,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { useAdmin } from '../context/AdminContext';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import { Link } from 'react-router-dom';

export const Overview = () => {
  const { summary, complaints, dataLoading } = useAdmin();

  const total = summary?.total_issues ?? 0;
  const resolved = summary?.resolved_issues ?? 0;
  const open = summary?.open_issues ?? 0;
  const inProgress = summary?.in_progress_issues ?? 0;
  const malicious = summary?.malicious_issues ?? 0;
  const pendingTotal = open + inProgress;

  const resolutionPct = total > 0 ? ((resolved / total) * 100).toFixed(1) : '0.0';

  const statusPieData = [
    { name: 'Resolved', value: resolved, color: '#10b981' },
    { name: 'In Progress', value: inProgress, color: '#f59e0b' },
    { name: 'New Unassigned', value: open, color: '#38bdf8' },
    { name: 'Malicious / Spam', value: malicious, color: '#ef4444' },
  ];

  const deptData = summary?.department_breakdown || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '26px', color: '#fff', marginBottom: 4 }}>
            Executive Overview Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            City-wide municipal grievance resolution metrics, department workloads & live performance
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/sla" className="btn btn-secondary btn-sm">
            <Clock size={14} />
            <span>SLA Health</span>
          </Link>
          <Link to="/heatmap" className="btn btn-primary btn-sm">
            <Layers size={14} />
            <span>Live Geospatial Heatmap</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <MetricCard
          title="Total Filed Today"
          value={summary?.today_issues || 47}
          subtitle="312 this week • 1,248 this month"
          icon={Inbox}
          trend="+14% vs avg"
          trendPositive={true}
          color="blue"
        />
        <MetricCard
          title="Resolved Grievances"
          value={resolved.toLocaleString()}
          subtitle={`${resolutionPct}% overall city closure rate`}
          icon={CheckCircle2}
          trend="+8.2%"
          trendPositive={true}
          color="emerald"
        />
        <MetricCard
          title="Active Pending Queue"
          value={pendingTotal.toLocaleString()}
          subtitle={`${open} unassigned • ${inProgress} in progress`}
          icon={Clock}
          trend="-5.4%"
          trendPositive={true}
          color="amber"
        />
        <MetricCard
          title="Avg Resolution Time"
          value={`${summary?.avg_resolution_hours || 14.8} hrs`}
          subtitle="Target threshold: < 24.0 hrs"
          icon={TrendingUp}
          trend="-2.1 hrs speedup"
          trendPositive={true}
          color="purple"
        />
        <MetricCard
          title="SLA Compliance Rate"
          value={`${summary?.sla_compliance_rate || 93.4}%`}
          subtitle="City-wide SLA adherence score"
          icon={Sparkles}
          trend="+1.2%"
          trendPositive={true}
          color="emerald"
        />
      </div>

      {/* Center Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        {/* Department Breakdown Bar Chart */}
        <div className="glass-card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h3 style={{ fontSize: '16px', color: '#fff' }}>Department Workload & Performance</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Comparing active open cases vs resolved tickets across municipal bureaus
              </p>
            </div>
            <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              5 Active Bureaus
            </span>
          </div>

          <div style={{ height: 280, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={deptData}
                margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
              >
                <XAxis
                  dataKey="department_name"
                  stroke="#64748b"
                  fontSize={11}
                  interval={0}
                  tickFormatter={(val) => val.split(' ')[0]}
                />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="recharts-custom-tooltip">
                          <p style={{ fontWeight: 700, color: '#fff', fontSize: '13px', marginBottom: 4 }}>
                            {d.department_name}
                          </p>
                          <p style={{ color: '#34d399', fontSize: '12px' }}>Resolved: {d.resolved_issues}</p>
                          <p style={{ color: '#38bdf8', fontSize: '12px' }}>Open Active: {d.open_issues}</p>
                          <p style={{ color: '#f87171', fontSize: '12px' }}>SLA Breached: {d.sla_breached}</p>
                          <p style={{ color: '#fbbf24', fontSize: '12px' }}>Compliance: {d.compliance_rate}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                />
                <Bar dataKey="resolved_issues" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="open_issues" name="Active Open" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sla_breached" name="Breached SLA" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="glass-card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: '16px', color: '#fff' }}>Grievance Lifecycle Distribution</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Proportion of resolved, in-progress, and malicious filtered reports
            </p>
          </div>

          <div style={{ height: 210, width: '100%', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0];
                      return (
                        <div className="recharts-custom-tooltip">
                          <p style={{ fontWeight: 700, color: d.payload.color }}>
                            {d.name}: {d.value}
                          </p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                            {((d.value / total) * 100).toFixed(1)}% of total volume
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Stat */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#fff', fontFamily: 'Outfit' }}>
                {resolutionPct}%
              </span>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Closure</p>
            </div>
          </div>

          {/* Status Breakdown Legend Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 'auto' }}>
            {statusPieData.map((item) => (
              <div
                key={item.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                <span style={{ color: 'var(--text-secondary)' }}>{item.name}:</span>
                <span style={{ fontWeight: 700, color: '#fff', marginLeft: 'auto' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department Scorecard Detailed Table */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: '16px', color: '#fff' }}>Department Redressal SLA Scorecards</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Live evaluation of resolution speed, SLA breaches, and health rating
            </p>
          </div>
          <Link to="/sla" className="btn btn-secondary btn-sm">
            <span>Detailed SLA Center</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Total Volume</th>
                <th>Active Open</th>
                <th>Resolved</th>
                <th>SLA Breached</th>
                <th>Avg Speed</th>
                <th>SLA Compliance</th>
                <th>Health Status</th>
              </tr>
            </thead>
            <tbody>
              {deptData.map((dept) => (
                <tr key={dept.department_id || dept.department_name}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{dept.department_name}</div>
                  </td>
                  <td>{dept.total_issues}</td>
                  <td>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>{dept.open_issues}</span>
                  </td>
                  <td>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>{dept.resolved_issues}</span>
                  </td>
                  <td>
                    <span style={{ color: dept.sla_breached > 5 ? '#f87171' : 'var(--text-muted)', fontWeight: 600 }}>
                      {dept.sla_breached}
                    </span>
                  </td>
                  <td className="mono">{dept.avg_hours} hrs</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          flex: 1,
                          height: 6,
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${dept.compliance_rate}%`,
                            height: '100%',
                            background:
                              dept.compliance_rate > 95 ? '#10b981' : dept.compliance_rate > 90 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, minWidth: 40 }}>
                        {dept.compliance_rate}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={dept.health_status} type="health" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default Overview;
