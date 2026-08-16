import React, { useState } from 'react';
import {
  Radio,
  Layers,
  AlertTriangle,
  Send,
  CheckCircle,
  Users,
  Clock,
  ArrowRight,
  Sparkles,
  GitMerge,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdmin } from '../context/AdminContext';
import MetricCard from '../components/MetricCard';
import BroadcastModal from '../components/BroadcastModal';

export const Clusters = () => {
  const { clusters, consolidateCluster } = useAdmin();
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastData, setBroadcastData] = useState({});

  const activeClusters = clusters.filter((c) => !c.is_consolidated);
  const totalClusteredTickets = clusters.reduce((acc, c) => acc + c.ticket_count, 0);

  const handleOpenBroadcastForCluster = (cluster) => {
    setBroadcastData({
      title: `Emergency Notice: ${cluster.title}`,
      message: `Multiple reports received in ${cluster.ward}. Municipal emergency crews have confirmed a systemic incident. Response teams are on-site.`,
      ward: cluster.ward,
      category: cluster.category,
      severity: 'urgent',
    });
    setIsBroadcastOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '26px', color: '#fff', marginBottom: 4 }}>
            Duplicate Triage & Emerging Incident Clusters
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Live geospatial radar detecting localized ticket surges before they flood field officer queues as duplicate tasks
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: activeClusters.length > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${activeClusters.length > 0 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
              color: activeClusters.length > 0 ? '#fbbf24' : '#34d399',
              fontSize: '12.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span className={`pulse-dot ${activeClusters.length > 0 ? 'amber' : 'green'}`} />
            <span>{activeClusters.length} Emerging Clusters Detected</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <MetricCard
          title="Active Emerging Clusters"
          value={activeClusters.length}
          subtitle="Localized incident groups < 500m"
          icon={Radio}
          trend="2 require consolidation"
          trendPositive={false}
          color="amber"
        />
        <MetricCard
          title="Clustered Complaints"
          value={totalClusteredTickets}
          subtitle="Tickets grouped across all clusters"
          icon={Layers}
          trend="Prevents queue flooding"
          trendPositive={true}
          color="blue"
        />
        <MetricCard
          title="Avg Cluster Confidence"
          value="93.7%"
          subtitle="Semantic & spatial match accuracy"
          icon={Sparkles}
          trend="+99% pgvector match"
          trendPositive={true}
          color="purple"
        />
        <MetricCard
          title="Consolidated Masters"
          value={clusters.filter((c) => c.is_consolidated).length}
          subtitle="Unified master dispatch tickets"
          icon={GitMerge}
          trend="1 active master order"
          trendPositive={true}
          color="emerald"
        />
      </div>

      {/* Clusters List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: '18px', color: '#fff' }}>
          Live Spatial Clustering Stream
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {clusters.map((cluster) => {
            const isConsolidated = cluster.is_consolidated;

            return (
              <div
                key={cluster.cluster_id}
                className="glass-card"
                style={{
                  padding: '22px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  border: !isConsolidated ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
                  background: !isConsolidated
                    ? 'linear-gradient(145deg, rgba(245, 158, 11, 0.05) 0%, rgba(14, 22, 43, 0.85) 100%)'
                    : 'rgba(14, 22, 43, 0.6)',
                }}
              >
                {/* Cluster Top Bar */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: '12px',
                        background: isConsolidated ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.2)',
                        border: `1px solid ${isConsolidated ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isConsolidated ? '#34d399' : '#fbbf24',
                        flexShrink: 0,
                      }}
                    >
                      {isConsolidated ? <CheckCircle size={24} /> : <Radio size={24} className="pulse-dot amber" />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className="mono" style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>
                          {cluster.cluster_id}
                        </span>
                        <span
                          className="badge"
                          style={{
                            background: isConsolidated ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: isConsolidated ? '#34d399' : '#fbbf24',
                          }}
                        >
                          {isConsolidated ? 'Consolidated Master Incident' : 'Emerging Incident Surge'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Confidence: {cluster.confidence_score}%
                        </span>
                      </div>

                      <h4 style={{ fontSize: '17px', color: '#fff', fontWeight: 700 }}>
                        {cluster.title}
                      </h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 2 }}>
                        📍 {cluster.ward} • Radius: {cluster.radius_meters}m • First reported: {cluster.first_reported}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', fontFamily: 'Outfit' }}>
                      {cluster.ticket_count} Tickets
                    </div>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Grouped under single incident</p>
                  </div>
                </div>

                {/* Affected Streets & Sample Tickets */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr',
                    gap: 14,
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Affected Streets / Junctions:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {cluster.affected_streets.map((st) => (
                        <span
                          key={st}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '11.5px',
                          }}
                        >
                          📍 {st}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Sample Subsumed Grievances:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {cluster.sample_issues.map((iss) => (
                        <span
                          key={iss}
                          className="mono"
                          style={{
                            background: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          {iss}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Suggested Action & Buttons */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    paddingTop: 4,
                  }}
                >
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', maxWidth: 550 }}>
                    💡 <strong style={{ color: '#fff' }}>Recommended Action:</strong> {cluster.suggested_action}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => handleOpenBroadcastForCluster(cluster)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Send size={13} />
                      <span>Push Broadcast to Area</span>
                    </button>

                    {!isConsolidated && (
                      <button
                        onClick={() => consolidateCluster(cluster.cluster_id)}
                        className="btn btn-primary btn-sm"
                      >
                        <GitMerge size={13} />
                        <span>Consolidate into Master Incident</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        initialData={broadcastData}
      />
    </div>
  );
};
export default Clusters;
