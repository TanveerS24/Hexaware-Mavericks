import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  Flag,
  CheckCircle,
  Clock,
  Layers,
  Flame,
  Filter,
  Eye,
  Crosshair,
  Maximize2,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  Sparkles,
  Info,
  UserCheck,
  Zap,
  Radio
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useAdmin } from '../context/AdminContext';

export const MapVisualizer = ({
  points = [],
  height = 560,
  showFilters = true,
  onSelectPoint,
  selectedPointId,
}) => {
  const { wsConnected, handleLiveStatusChange } = useAdmin();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedWard, setSelectedWard] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('30d');
  const [heatIntensity, setHeatIntensity] = useState(0.85);
  const [showHeatLayer, setShowHeatLayer] = useState(true);
  const [showPins, setShowPins] = useState(true);
  const [activePoint, setActivePoint] = useState(null);
  const [nowTime, setNowTime] = useState(Date.now());

  // Update live clock every 30 seconds for accurate elapsed time calculation
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Wards with bounding center
  const WARDS = [
    { name: 'Ward 4 (Central)', lat: 12.9716, lng: 77.5946, x: 50, y: 45, color: '#38bdf8' },
    { name: 'Ward 7 (Koramangala)', lat: 12.9352, lng: 77.6245, x: 75, y: 70, color: '#fbbf24' },
    { name: 'Ward 12 (Indiranagar)', lat: 12.9784, lng: 77.6408, x: 80, y: 35, color: '#10b981' },
    { name: 'Ward 9 (Jayanagar)', lat: 12.9250, lng: 77.5838, x: 38, y: 78, color: '#c084fc' },
    { name: 'Ward 2 (Malleshwaram)', lat: 13.0012, lng: 77.5685, x: 28, y: 20, color: '#f43f5e' },
  ];

  // Map lat/lng coordinates to percentage coordinates (x, y) on the canvas
  const minLat = 12.915, maxLat = 13.015;
  const minLng = 77.550, maxLng = 77.660;

  const projectCoord = (lat, lng) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 80 + 10;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 75 + 12;
    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  };

  const filteredPoints = useMemo(() => {
    return points.filter((pt) => {
      if (selectedCategory !== 'all' && !pt.category.toLowerCase().includes(selectedCategory.toLowerCase())) {
        return false;
      }
      if (selectedWard !== 'all' && pt.ward !== selectedWard) {
        return false;
      }
      if (selectedStatusFilter !== 'all') {
        const normStatus = pt.status?.toLowerCase();
        if (selectedStatusFilter === 'in_progress' && normStatus !== 'in_progress') return false;
        if (selectedStatusFilter === 'resolved' && normStatus !== 'resolved') return false;
        if (selectedStatusFilter === 'pending' && (normStatus === 'in_progress' || normStatus === 'resolved')) return false;
      }
      return true;
    });
  }, [points, selectedCategory, selectedWard, selectedStatusFilter]);

  const handlePointClick = (pt) => {
    setActivePoint(pt);
    if (onSelectPoint) onSelectPoint(pt);
  };

  const getCategoryColor = (cat = '') => {
    if (cat.includes('Water')) return '#38bdf8';
    if (cat.includes('Power') || cat.includes('Electricity')) return '#fbbf24';
    if (cat.includes('Road')) return '#34d399';
    if (cat.includes('Health') || cat.includes('Waste')) return '#f87171';
    return '#c084fc';
  };

  // Calculate elapsed time since assignment (e.g. "14 min ago", "1 hr 20 min ago")
  const formatElapsedTime = (assignedAt) => {
    if (!assignedAt) return 'Just now';
    try {
      const assignedMs = new Date(assignedAt).getTime();
      if (isNaN(assignedMs)) return '14 min ago';
      const diffMinutes = Math.floor((nowTime - assignedMs) / (1000 * 60));
      if (diffMinutes <= 0) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes} min ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      const remMin = diffMinutes % 60;
      return `${diffHours} hr ${remMin > 0 ? `${remMin}m ` : ''}ago`;
    } catch {
      return '14 min ago';
    }
  };

  // Demo simulation function for testing live WebSocket status changes
  const simulateOfficerClaim = () => {
    if (!handleLiveStatusChange) return;
    const pendingTickets = points.filter(p => p.status !== 'in_progress' && p.status !== 'resolved');
    const target = pendingTickets.length > 0 ? pendingTickets[0] : points[0];
    if (target) {
      handleLiveStatusChange({
        issue_id: target.id,
        status: 'in_progress',
        officer_name: 'Officer Raj',
        officer_id: 8,
        assigned_at: new Date().toISOString(),
        lat: target.lat,
        lng: target.lng,
        category: target.category,
        ward: target.ward,
        priority: target.priority,
        summary: target.summary
      });
    }
  };

  return (
    <div
      className="glass-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top Filter Bar */}
      {showFilters && (
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(10, 16, 32, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Category Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={14} style={{ color: 'var(--text-muted)' }} />
              <select
                className="input-control"
                style={{ width: 'auto', padding: '6px 32px 6px 10px', fontSize: '12.5px' }}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="Water">Water & Sanitation</option>
                <option value="Power">Electricity & Power</option>
                <option value="Road">Roads & Infrastructure</option>
                <option value="Waste">Public Health & Waste</option>
                <option value="Forestry">Urban Forestry</option>
              </select>
            </div>

            {/* Status Filter */}
            <select
              className="input-control"
              style={{ width: 'auto', padding: '6px 32px 6px 10px', fontSize: '12.5px' }}
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending / New (📍)</option>
              <option value="in_progress">In Progress (🚩 Red Flag)</option>
              <option value="resolved">Resolved (✔️ Checkmark)</option>
            </select>

            {/* Ward Filter */}
            <select
              className="input-control"
              style={{ width: 'auto', padding: '6px 32px 6px 10px', fontSize: '12.5px' }}
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
            >
              <option value="all">City-Wide (All Wards)</option>
              {WARDS.map((w) => (
                <option key={w.name} value={w.name}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Layer & Simulation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Live WS Status Indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: '9999px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <span className="pulse-dot green" style={{ width: 6, height: 6 }} />
              <span>Live Map Stream</span>
            </div>

            <button
              onClick={simulateOfficerClaim}
              className="btn btn-sm btn-secondary"
              title="Simulate an officer claiming a pending ticket over WebSocket"
              style={{ fontSize: '11px', padding: '4px 8px', color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.3)' }}
            >
              <Zap size={11} />
              <span>Test Claim (🚩)</span>
            </button>

            <button
              onClick={() => setShowHeatLayer(!showHeatLayer)}
              className="btn btn-sm"
              style={{
                background: showHeatLayer ? 'rgba(244, 63, 94, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                color: showHeatLayer ? '#fb7185' : 'var(--text-muted)',
                borderColor: showHeatLayer ? 'rgba(244, 63, 94, 0.35)' : 'var(--border-subtle)',
              }}
            >
              <Flame size={12} />
              <span>Heat</span>
            </button>

            <button
              onClick={() => setShowPins(!showPins)}
              className="btn btn-sm"
              style={{
                background: showPins ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                color: showPins ? '#38bdf8' : 'var(--text-muted)',
                borderColor: showPins ? 'rgba(56, 189, 248, 0.35)' : 'var(--border-subtle)',
              }}
            >
              <MapPin size={12} />
              <span>Pins</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Map Canvas Area */}
      <div
        style={{
          position: 'relative',
          height,
          background: 'radial-gradient(ellipse at center, #0B1426 0%, #050811 100%)',
          overflow: 'hidden',
          cursor: 'grab',
        }}
      >
        {/* Map Grid Lines */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.2, pointerEvents: 'none' }}
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(56, 189, 248, 0.4)" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <path d="M 0 280 Q 300 240 600 310 T 1200 260" fill="none" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="2" />
          <path d="M 320 0 Q 380 250 420 600" fill="none" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="2" />
          <path d="M 680 0 Q 640 280 720 600" fill="none" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="2" />
        </svg>

        {/* Ward Polygons & Boundaries */}
        {WARDS.map((ward) => (
          <div
            key={ward.name}
            style={{
              position: 'absolute',
              left: `${ward.x}%`,
              top: `${ward.y}%`,
              transform: 'translate(-50%, -50%)',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(10, 16, 32, 0.7)',
              border: `1px dashed ${ward.color}88`,
              backdropFilter: 'blur(4px)',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: ward.color, letterSpacing: '0.04em' }}>
              {ward.name}
            </span>
          </div>
        ))}

        {/* Heatmap Density Glow Layers */}
        {showHeatLayer &&
          filteredPoints.map((pt, i) => {
            const { x, y } = projectCoord(pt.lat, pt.lng);
            const intensity = (pt.weight || 0.8) * heatIntensity;
            const color = getCategoryColor(pt.category);
            return (
              <div
                key={`heat-${pt.id || i}`}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${60 + intensity * 90}px`,
                  height: `${60 + intensity * 90}px`,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${
                    pt.status === 'in_progress' ? 'rgba(239, 68, 68, 0.5)' : `${color}44`
                  } 0%, rgba(245, 158, 11, 0.2) 40%, transparent 70%)`,
                  filter: 'blur(16px)',
                  pointerEvents: 'none',
                  zIndex: 8,
                }}
              />
            );
          })}

        {/* Interactive Grievance Point Markers with Status Icons */}
        {showPins &&
          filteredPoints.map((pt) => {
            const { x, y } = projectCoord(pt.lat, pt.lng);
            const isSelected = selectedPointId === pt.id || activePoint?.id === pt.id;
            const categoryColor = getCategoryColor(pt.category);
            const normStatus = pt.status?.toLowerCase();

            // Status-based marker configuration
            const isInProgress = normStatus === 'in_progress';
            const isResolved = normStatus === 'resolved';

            return (
              <div
                key={pt.id}
                onClick={() => handlePointClick(pt)}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: `translate(-50%, -50%) scale(${isSelected ? 1.35 : 1})`,
                  cursor: 'pointer',
                  zIndex: isSelected ? 35 : isInProgress ? 28 : 20,
                  transition: 'all 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                }}
              >
                {/* 1. In-Progress Red Pulsing Halo */}
                {isInProgress && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -8,
                      left: -8,
                      right: -8,
                      bottom: -8,
                      borderRadius: '50%',
                      border: '2px solid #ef4444',
                      background: 'rgba(239, 68, 68, 0.2)',
                      animation: 'pulse-ring 1.8s infinite',
                    }}
                  />
                )}

                {/* Marker Shape & Icon */}
                {isInProgress ? (
                  /* IN_PROGRESS: Officer Avatar Photo Marker */
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: isSelected ? '2.5px solid #38bdf8' : '2px solid #ef4444',
                      boxShadow: '0 0 18px rgba(239, 68, 68, 0.85)',
                      background: '#0B1426',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <img
                      src="/officer-avatar.jpg"
                      alt={pt.officer_name || "Officer"}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* Small Live Active Status Indicator Dot */}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#10b981',
                        border: '1.5px solid #000',
                      }}
                    />
                  </div>
                ) : isResolved ? (
                  /* RESOLVED: Gray Checkmark Marker */
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'rgba(30, 41, 59, 0.9)',
                      border: '1.5px solid #64748b',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                    }}
                  >
                    <CheckCircle size={12} strokeWidth={2.5} />
                  </div>
                ) : (
                  /* PENDING / DEFAULT: Plain / Default Category Marker */
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: isSelected ? '#fff' : categoryColor,
                      border: `2px solid ${isSelected ? categoryColor : '#050811'}`,
                      boxShadow: `0 0 12px ${categoryColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSelected ? categoryColor : '#050811',
                    }}
                  >
                    <MapPin size={13} strokeWidth={2.5} />
                  </div>
                )}
              </div>
            );
          })}

        {/* Floating Point Detail Popup */}
        {activePoint && (
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              right: 20,
              width: 350,
              background: 'rgba(14, 22, 43, 0.96)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${
                activePoint.status === 'in_progress' ? 'rgba(56, 189, 248, 0.4)' : 'var(--border-medium)'
              }`,
              borderRadius: 'var(--radius-lg)',
              padding: '18px 20px',
              boxShadow: 'var(--shadow-lg), 0 0 30px rgba(0, 0, 0, 0.6)',
              zIndex: 40,
              animation: 'modalScale 0.2s ease-out',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="mono" style={{ fontSize: '12.5px', fontWeight: 700, color: '#38bdf8' }}>
                {activePoint.id}
              </span>
              <button
                onClick={() => setActivePoint(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '15px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* In-Progress Officer Details Banner with Photo */}
            {activePoint.status === 'in_progress' && (
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(56, 189, 248, 0.08) 100%)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {/* Officer Picture Avatar */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '2px solid #ef4444',
                    boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src="/officer-avatar.jpg"
                    alt={activePoint.officer_name || 'Field Officer'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff' }}>
                    Assigned to {activePoint.officer_name || 'Officer Raj'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Clock size={12} />
                    <span>In Progress: {formatElapsedTime(activePoint.assigned_at)}</span>
                  </div>
                  {activePoint.assigned_at && (
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 2 }}>
                      Claimed at: {new Date(activePoint.assigned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#fff', marginBottom: 8, lineHeight: 1.4 }}>
              {activePoint.summary || activePoint.category}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              <StatusBadge status={activePoint.status} />
              <StatusBadge status={activePoint.priority} type="priority" />
            </div>

            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>📍 Ward: <strong style={{ color: '#fff' }}>{activePoint.ward}</strong></div>
              <div>🏷️ Category: <strong style={{ color: '#fff' }}>{activePoint.category}</strong></div>
              <div>🌐 Coordinates: <span className="mono">{activePoint.lat?.toFixed(4)}, {activePoint.lng?.toFixed(4)}</span></div>
              {activePoint.timestamp && <div>🕒 Reported: {activePoint.timestamp}</div>}
            </div>
          </div>
        )}

        {/* Map Legend Overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            background: 'rgba(10, 16, 32, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 14,
            fontSize: '11px',
            zIndex: 30,
          }}
        >
          <span style={{ fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Marker Types:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8' }} />
            <span>Pending (📍)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f87171', fontWeight: 600 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', overflow: 'hidden', border: '1px solid #ef4444' }}>
              <img src="/officer-avatar.jpg" alt="Officer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span>In Progress (Officer Photo)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8' }}>
            <CheckCircle size={12} />
            <span>Resolved (✔️)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default MapVisualizer;
