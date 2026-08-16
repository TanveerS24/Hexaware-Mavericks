import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

const ComplaintDetails = () => {
  const { id } = useParams();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchIssueDetails = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await api.get(`/issues/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setIssue(response.data);
      } catch (err) {
        setError('Failed to load complaint details. It may have been deleted or you do not have permission to view it.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchIssueDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Loading complaint details...</h2>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h3 style={{ color: 'var(--error)' }}>{error || 'Issue not found'}</h3>
        <Link to="/my-complaints">
          <button className="primary-btn" style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', background: 'var(--primary-blue)', color: 'white', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
            Back to My Complaints
          </button>
        </Link>
      </div>
    );
  }

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

  const statusList = ['new', 'reviewed', 'in_progress', 'resolved'];
  let currentStatusIndex = statusList.indexOf(issue.status);
  // Special case for malicious
  if (issue.status === 'malicious') currentStatusIndex = 4;

  return (
    <div className="complaint-details-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Complaint Details</h2>
        <Link to="/my-complaints" style={{ color: 'var(--primary-blue)' }}>&larr; Back</Link>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-dark)' }}>{issue.issue_id}</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Filed on: {new Date(issue.created_at).toLocaleString()}
            </p>
          </div>
          <span style={{ 
            backgroundColor: getStatusColor(issue.status), 
            color: (issue.status === 'in_progress' || issue.status === 'new') ? '#000' : '#fff', 
            padding: '0.5rem 1rem', 
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }}>
            {issue.status.replace('_', ' ')}
          </span>
        </div>

        {/* Tracking Pipeline */}
        <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--primary-light)', borderRadius: 'var(--radius)' }}>
          <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Tracking Status</h4>
          
          {issue.status === 'malicious' ? (
            <div style={{ color: 'var(--error)', fontWeight: 'bold' }}>
              This complaint was marked as malicious. It will not be processed further.
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '10px', left: '10%', right: '10%', height: '4px', background: 'var(--border)', zIndex: 1 }}></div>
              <div style={{ position: 'absolute', top: '10px', left: '10%', width: `${(currentStatusIndex / (statusList.length - 1)) * 80}%`, height: '4px', background: 'var(--success)', zIndex: 2, transition: 'width 0.5s ease' }}></div>
              
              {statusList.map((step, index) => (
                <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3, width: '25%' }}>
                  <div style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    background: index <= currentStatusIndex ? 'var(--success)' : 'var(--surface)',
                    border: `3px solid ${index <= currentStatusIndex ? 'var(--success)' : 'var(--border)'}`,
                    marginBottom: '0.5rem'
                  }}></div>
                  <span style={{ fontSize: '0.8rem', fontWeight: index <= currentStatusIndex ? 'bold' : 'normal', color: index <= currentStatusIndex ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {step.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'block' }}>Category</span>
            <strong>{issue.category}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'block' }}>Department</span>
            <strong>{issue.department?.name || 'Unassigned'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'block' }}>Priority</span>
            <strong>{issue.priority || 'Not Set'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'block' }}>Ward</span>
            <strong>{issue.ward || 'Unknown'}</strong>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
          <h4 style={{ marginTop: 0 }}>Grievance Summary</h4>
          <p style={{ background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)', margin: 0 }}>
            {issue.ai_summary || "No summary generated."}
          </p>
        </div>

        {issue.transcript && issue.transcript !== issue.ai_summary && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <h4 style={{ marginTop: 0 }}>Original Transcript / Submission</h4>
            <p style={{ background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)', margin: 0, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
              "{issue.transcript}"
            </p>
          </div>
        )}

      </div>
      
      {/* History Timeline */}
      {issue.status_history && issue.status_history.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Update History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {issue.status_history.map((history, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary-blue)', marginTop: '4px' }}></div>
                  {idx < issue.status_history.length - 1 && (
                    <div style={{ flex: 1, width: '2px', background: 'var(--border)', margin: '4px 0' }}></div>
                  )}
                </div>
                <div style={{ paddingBottom: idx < issue.status_history.length - 1 ? '0' : '0' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    {new Date(history.changed_at).toLocaleString()}
                  </div>
                  <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
                    Changed to {history.status.replace('_', ' ')}
                  </strong>
                  {history.notes && (
                    <div style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: 'var(--radius)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                      {history.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintDetails;
