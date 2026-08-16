import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const MyComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await api.get('/issues', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setComplaints(response.data.items || []);
      } catch (err) {
        setError('Failed to fetch your complaints. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'new': return 'var(--primary-blue)';
      case 'reviewed': return '#17a2b8';
      case 'in_progress': return 'var(--warning)';
      case 'resolved': return 'var(--success)';
      case 'malicious': return 'var(--error)';
      default: return 'var(--text-secondary)';
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Loading your complaints...</h2>
      </div>
    );
  }

  return (
    <div className="my-complaints-page">
      <h2>My Complaints</h2>
      
      {error && <div className="error-alert" style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</div>}
      
      {complaints.length === 0 && !error ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>You have no complaints yet.</h3>
          <p>If you face any issues, you can easily file a complaint.</p>
          <Link to="/report">
            <button className="primary-btn" style={{ 
              marginTop: '1rem', 
              padding: '0.75rem 1.5rem', 
              background: 'var(--primary-blue)', 
              color: 'white', 
              border: 'none', 
              borderRadius: 'var(--radius)', 
              cursor: 'pointer' 
            }}>
              File a Complaint
            </button>
          </Link>
        </div>
      ) : (
        <div className="complaints-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {complaints.map(issue => (
            <div key={issue.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', marginBottom: '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <strong>{issue.issue_id}</strong>
                <span style={{ 
                  backgroundColor: getStatusColor(issue.status), 
                  color: (issue.status === 'in_progress' || issue.status === 'new') ? '#000' : '#fff', 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase'
                }}>
                  {issue.status.replace('_', ' ')}
                </span>
              </div>
              
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Category:</span><br/>
                <strong>{issue.category}</strong>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Filed On:</span><br/>
                <span>{new Date(issue.created_at).toLocaleDateString()} at {new Date(issue.created_at).toLocaleTimeString()}</span>
              </div>
              
              <div style={{ marginTop: 'auto' }}>
                <Link to={`/my-complaints/${issue.id}`} style={{ width: '100%', display: 'block' }}>
                  <button style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'transparent',
                    border: '1px solid var(--primary-blue)',
                    color: 'var(--primary-blue)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}>
                    View Details & Track
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyComplaints;
