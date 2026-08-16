import React, { useState, useEffect } from 'react';
import api from '../api';

const Settings = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Preferences state (UI only for now)
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [language, setLanguage] = useState('English');
  const [isDark, setIsDark] = useState(document.documentElement.getAttribute('data-theme') === 'dark');

  useEffect(() => {
    fetchProfile();
    
    // Listen for theme changes from other components (like navbar)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await api.get('/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const handleSavePreferences = (e) => {
    e.preventDefault();
    alert("Preferences saved successfully!");
  };

  if (loading) return <div className="text-center mt-4">Loading settings...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Account Settings</h2>
      
      <div className="grid grid-2">
        {/* Profile Card */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            👤 Profile Details
          </h3>
          <div className="mb-3">
            <label className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>Full Name</label>
            <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{user?.name}</div>
          </div>
          <div className="mb-3">
            <label className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>Email Address</label>
            <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{user?.email}</div>
          </div>
          <div className="mb-3">
            <label className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>Phone Number</label>
            <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{user?.phone || 'Not provided'}</div>
          </div>
          
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--primary-light)', borderRadius: 'var(--radius)', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>Credibility Score</span>
              <span style={{ fontWeight: 700, color: user?.credibility_score < 0.5 ? 'var(--error)' : 'var(--success)' }}>
                {user ? (user.credibility_score * 100).toFixed(0) : 0} / 100
              </span>
            </div>
            <div className="score-meter">
              <div 
                className="score-fill" 
                style={{ 
                  width: `${user ? user.credibility_score * 100 : 0}%`,
                  background: user?.credibility_score < 0.5 ? 'var(--error)' : 'var(--success)'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Preferences Card */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            ⚙️ Preferences
          </h3>
          
          <form onSubmit={handleSavePreferences}>
            <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label style={{ margin: 0, fontWeight: 600 }}>Dark Mode</label>
                <p className="text-secondary" style={{ fontSize: '0.85rem', margin: 0 }}>Switch between light and dark themes</p>
              </div>
              <button 
                type="button" 
                onClick={toggleTheme}
                className="btn"
                style={{ 
                  background: isDark ? 'var(--primary-blue)' : 'var(--border)', 
                  color: isDark ? 'white' : 'var(--text-primary)',
                  padding: '0.5rem 1rem',
                  borderRadius: '999px'
                }}
              >
                {isDark ? 'ON 🌙' : 'OFF ☀️'}
              </button>
            </div>
            
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label style={{ fontWeight: 600 }}>Preferred Language</label>
              <select 
                className="form-control" 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="English">English</option>
                <option value="Telugu">Telugu</option>
                <option value="Hindi">Hindi</option>
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '1rem' }}>Notifications</label>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <input 
                  type="checkbox" 
                  id="emailAlerts" 
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                />
                <label htmlFor="emailAlerts" style={{ margin: 0, cursor: 'pointer' }}>Email Alerts (Grievance Updates)</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input 
                  type="checkbox" 
                  id="smsAlerts" 
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                />
                <label htmlFor="smsAlerts" style={{ margin: 0, cursor: 'pointer' }}>SMS Alerts (Emergency Notifications)</label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-4" style={{ width: '100%' }}>
              Save Preferences
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
