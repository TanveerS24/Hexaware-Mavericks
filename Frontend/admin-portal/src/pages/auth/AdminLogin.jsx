import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Building2, Lock, Mail, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export const AdminLogin = () => {
  const { login, loading } = useAdmin();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Dynamic Background Glow Orbs */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 70%)',
          top: '10%',
          left: '15%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 450,
          height: 450,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
          bottom: '10%',
          right: '15%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '36px 32px',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-lg), 0 0 35px rgba(56, 189, 248, 0.15)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Brand Icon Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              boxShadow: '0 0 20px rgba(56, 189, 248, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              marginBottom: 16,
            }}
          >
            <Building2 size={28} />
          </div>
          <h2 style={{ fontSize: '24px', color: '#fff', marginBottom: 6 }}>
            Executive City Command
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Citizen Intelligence Redressal Administration
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Administrator Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                required
                className="input-control"
                style={{ paddingLeft: 38 }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                required
                className="input-control"
                style={{ paddingLeft: 38 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '12px', fontSize: '14px', marginTop: 4, width: '100%' }}
          >
            {loading ? (
              <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <>
                <span>Access Command Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
export default AdminLogin;
