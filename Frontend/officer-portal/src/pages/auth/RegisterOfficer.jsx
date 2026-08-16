import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ShieldCheck, ShieldAlert, Building2, UserCheck, Clock, ArrowRight } from 'lucide-react';

const DEPARTMENTS = [
  'Water & Sewerage', 'Electricity', 'Roads & Transport', 'Sanitation & Waste',
  'Health & Medical', 'Police & Safety', 'Housing & Construction', 'Environment',
  'Education', 'Revenue & Land', 'Disaster Management',
];
const REGIONS = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Other'];

export default function RegisterOfficer() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', department: '', region: '', employee_id: '', designation: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.department || !form.region) {
      return toast.error('Please complete all required fields');
    }
    setLoading(true);
    try {
      await api.registerOfficer(form);
      toast.success('Registration submitted. Awaiting administrator authorization.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 540 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="logo-badge" style={{ width: 44, height: 44, margin: '0 auto 12px', borderRadius: 10, background: 'linear-gradient(135deg, #4f46e5, #0284c7)' }}>
            <ShieldCheck size={20} />
          </div>
          <h2 style={{ marginBottom: 4 }}>Field Officer Registration</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Government personnel grievance dispatch authorization portal
          </p>
          <div className="badge badge-warning" style={{ marginTop: 10, padding: '4px 10px', fontSize: 10.5 }}>
            <Clock size={12} style={{ marginRight: 4 }} />
            Account requires administrative verification prior to portal access
          </div>
        </div>

        <div className="glass-card-static" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Officer Full Name *</label>
                <input className="form-input" placeholder="Officer Name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Official Phone *</label>
                <input className="form-input" placeholder="+91 9876543210" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Official Government Email *</label>
              <input type="email" className="form-input" placeholder="officer@domain.gov.in" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
            </div>

            <div className="form-group">
              <label className="form-label">Portal Password *</label>
              <input type="password" className="form-input" placeholder="Minimum 6 characters" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Department *</label>
                <select className="form-input" value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Jurisdiction Region *</label>
                <select className="form-input" value={form.region} onChange={e => setForm(f => ({...f, region: e.target.value}))}>
                  <option value="">Select region</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Government Employee ID</label>
                <input className="form-input" placeholder="GOV-2024-XXXX" value={form.employee_id} onChange={e => setForm(f => ({...f, employee_id: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Designation</label>
                <input className="form-input" placeholder="Assistant Engineer / Inspector" value={form.designation} onChange={e => setForm(f => ({...f, designation: e.target.value}))} />
              </div>
            </div>

            <button type="submit" className="btn btn-secondary" disabled={loading} style={{
              width: '100%', padding: '11px', marginTop: 4,
              borderColor: 'rgba(99, 102, 241, 0.3)', color: '#a5b4fc',
            }}>
              {loading ? <span className="loading-spinner" /> : 'Submit Registration for Approval'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link to="/login" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Already verified? <span style={{ color: 'var(--primary-light)', fontWeight: 600 }}>Sign in</span>
          </Link>
          <Link to="/" style={{ color: 'var(--text-dim)', fontSize: 12 }}>← Return to Homepage</Link>
        </div>
      </div>
    </div>
  );
}
