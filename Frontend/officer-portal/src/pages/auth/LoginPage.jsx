import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please enter email and password');
    setLoading(true);
    try {
      const user = await login(form);
      if (user.role !== 'officer') {
        toast.error('This portal is reserved for Authorized Municipal Field Officers.');
        return;
      }
      toast.success(`Welcome, ${user.name}`);
      navigate('/officer');
    } catch (err) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="logo-badge" style={{ width: 48, height: 48, margin: '0 auto 16px', borderRadius: 12 }}>
            <ShieldCheck size={24} />
          </div>
          <h2 style={{ marginBottom: 6 }}>Officer Operations Portal</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13.5 }}>Municipal Grievance Dispatch & Field Management</p>
        </div>

        {/* Form Card */}
        <div className="glass-card-static" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Official Officer Email</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. officer.water@city.gov"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  autoComplete="email"
                  style={{ paddingLeft: 38 }}
                  required
                />
                <Mail size={16} color="var(--text-dim)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter your security password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                  style={{ paddingLeft: 38 }}
                  required
                />
                <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '11px', marginTop: 6 }}>
              {loading ? <span className="loading-spinner" /> : (
                <>
                  <span>Sign In to Officer Console</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link to="/register" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            New Field Officer? <span style={{ color: '#818cf8', fontWeight: 600 }}>Submit Officer Registration</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
