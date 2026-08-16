import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive = true,
  color = 'blue',
  onClick,
}) => {
  const colorMap = {
    blue: {
      border: 'rgba(56, 189, 248, 0.25)',
      glow: 'rgba(56, 189, 248, 0.1)',
      iconBg: 'rgba(56, 189, 248, 0.15)',
      iconColor: '#38bdf8',
    },
    emerald: {
      border: 'rgba(16, 185, 129, 0.25)',
      glow: 'rgba(16, 185, 129, 0.1)',
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#34d399',
    },
    amber: {
      border: 'rgba(245, 158, 11, 0.25)',
      glow: 'rgba(245, 158, 11, 0.1)',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      iconColor: '#fbbf24',
    },
    rose: {
      border: 'rgba(244, 63, 94, 0.25)',
      glow: 'rgba(244, 63, 94, 0.1)',
      iconBg: 'rgba(244, 63, 94, 0.15)',
      iconColor: '#fb7185',
    },
    purple: {
      border: 'rgba(168, 85, 247, 0.25)',
      glow: 'rgba(168, 85, 247, 0.1)',
      iconBg: 'rgba(168, 85, 247, 0.15)',
      iconColor: '#c084fc',
    },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div
      onClick={onClick}
      className={`glass-card ${onClick ? 'glass-card-interactive' : ''}`}
      style={{
        padding: '20px 22px',
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${scheme.border}`,
        background: `linear-gradient(145deg, rgba(14, 22, 43, 0.85) 0%, rgba(10, 16, 32, 0.95) 100%)`,
      }}
    >
      {/* Background Accent Glow */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: scheme.glow,
          filter: 'blur(25px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </span>
        {Icon && (
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              background: scheme.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: scheme.iconColor,
            }}
          >
            <Icon size={20} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: '28px', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', fontFamily: 'Outfit, sans-serif' }}>
          {value}
        </span>
        {trend && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              fontSize: '12px',
              fontWeight: 700,
              color: trendPositive ? '#34d399' : '#f87171',
              background: trendPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              padding: '2px 7px',
              borderRadius: '9999px',
            }}
          >
            {trendPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend}
          </span>
        )}
      </div>

      {subtitle && (
        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: 2 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};
export default MetricCard;
