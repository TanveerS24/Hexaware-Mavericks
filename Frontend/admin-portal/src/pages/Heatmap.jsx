import React, { useState } from 'react';
import {
  MapPin,
  Flame,
  Filter,
  Layers,
  Send,
  Building,
  TrendingUp,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import MapVisualizer from '../components/MapVisualizer';
import StatusBadge from '../components/StatusBadge';
import BroadcastModal from '../components/BroadcastModal';

export const Heatmap = () => {
  const { heatmapPoints } = useAdmin();
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [broadcastTarget, setBroadcastTarget] = useState(null);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

  // Ward density rankings
  const wardDensity = [
    { ward: 'Ward 4 (Central)', count: 42, color: '#38bdf8', primaryCategory: 'Water & Sanitation', threat: 'High Density' },
    { ward: 'Ward 7 (Koramangala)', count: 38, color: '#fbbf24', primaryCategory: 'Electricity & Power', threat: 'Emerging Outage' },
    { ward: 'Ward 12 (Indiranagar)', count: 24, color: '#34d399', primaryCategory: 'Roads & Infrastructure', threat: 'Moderate' },
    { ward: 'Ward 9 (Jayanagar)', count: 18, color: '#c084fc', primaryCategory: 'Public Health & Waste', threat: 'Low-Moderate' },
    { ward: 'Ward 2 (Malleshwaram)', count: 11, color: '#f43f5e', primaryCategory: 'Urban Forestry', threat: 'Normal' },
  ];

  const handleBroadcastForWard = (ward, category) => {
    setBroadcastTarget({
      ward,
      category,
      title: `Advisory: Incident Response Active in ${ward}`,
      message: `Municipal response teams have been dispatched to resolve active ${category} issues in ${ward}. Restoration in progress.`,
    });
    setIsBroadcastOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '26px', color: '#fff', marginBottom: 4 }}>
            Geospatial Grievance Heatmap
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Real-time density distribution, cluster intensities, and coordinate drill-down across municipal zones
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <Flame size={14} />
            <span>Live Vector Density Active</span>
          </div>
        </div>
      </div>

      {/* Map & Side Panel Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: 20 }}>
        {/* Left: Map Visualizer */}
        <div>
          <MapVisualizer
            points={heatmapPoints}
            height={580}
            showFilters={true}
            onSelectPoint={(pt) => setSelectedPoint(pt)}
            selectedPointId={selectedPoint?.id}
          />
        </div>

        {/* Right: Ward Concentration Leaderboard & Selected Point Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Ward Density Leaderboard */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', color: '#fff', marginBottom: 4 }}>
              Ward Hotspot Leaderboard
            </h3>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: 14 }}>
              Zones ranked by complaint concentration
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {wardDensity.map((w, idx) => (
                <div
                  key={w.ward}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: idx === 0 ? '#f43f5e' : 'rgba(255, 255, 255, 0.1)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 800,
                        }}
                      >
                        #{idx + 1}
                      </span>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#fff' }}>
                        {w.ward}
                      </span>
                    </div>
                    <span className="mono" style={{ fontSize: '12px', fontWeight: 700, color: w.color }}>
                      {w.count} incidents
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Top Issue: {w.primaryCategory}</span>
                    <button
                      onClick={() => handleBroadcastForWard(w.ward, w.primaryCategory)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#38bdf8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      <Send size={10} />
                      <span>Alert Zone</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Point Deep Dive Card */}
          {selectedPoint ? (
            <div className="glass-card" style={{ padding: '18px 20px', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="mono" style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                  {selectedPoint.id}
                </span>
                <StatusBadge status={selectedPoint.priority} type="priority" />
              </div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: 6 }}>
                {selectedPoint.summary}
              </p>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                <div>📍 {selectedPoint.ward}</div>
                <div>🏷️ {selectedPoint.category}</div>
                <div>🌐 {selectedPoint.lat?.toFixed(4)}, {selectedPoint.lng?.toFixed(4)}</div>
              </div>
              <button
                onClick={() => handleBroadcastForWard(selectedPoint.ward, selectedPoint.category)}
                className="btn btn-primary btn-sm"
                style={{ width: '100%' }}
              >
                <Send size={12} />
                <span>Notify Residents in {selectedPoint.ward.split(' ')[0]}</span>
              </button>
            </div>
          ) : (
            <div
              className="glass-card"
              style={{
                padding: '20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <MapPin size={24} style={{ color: 'var(--text-dim)' }} />
              <p>Click any map pin or density node to inspect coordinates & trigger localized advisories.</p>
            </div>
          )}
        </div>
      </div>

      <BroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        initialData={broadcastTarget || {}}
      />
    </div>
  );
};
export default Heatmap;
