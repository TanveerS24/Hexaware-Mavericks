import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  UserX,
  Clock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Info,
  Calendar,
  ChevronRight,
  Send
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import StatusBadge from '../components/StatusBadge';

export const PendingOfficers = () => {
  const { pendingOfficers, approveOfficer, rejectOfficer, resetPendingOfficers } = useAdmin();
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  
  // Rejection modal state
  const [rejectingOfficer, setRejectingOfficer] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const pendingCount = pendingOfficers.filter(o => o.status === 'pending').length;
  const approvedCount = pendingOfficers.filter(o => o.status === 'active' || o.status === 'approved').length;
  const rejectedCount = pendingOfficers.filter(o => o.status === 'rejected').length;

  const filteredOfficers = useMemo(() => {
    return pendingOfficers.filter(officer => {
      // Tab filter
      if (activeTab === 'pending' && officer.status !== 'pending') return false;
      if (activeTab === 'approved' && officer.status !== 'active' && officer.status !== 'approved') return false;
      if (activeTab === 'rejected' && officer.status !== 'rejected') return false;

      // Department filter
      if (departmentFilter !== 'all' && !officer.department?.toLowerCase().includes(departmentFilter.toLowerCase())) {
        return false;
      }

      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = officer.name?.toLowerCase().includes(term);
        const matchesEmail = officer.email?.toLowerCase().includes(term);
        const matchesEmpId = officer.employee_id?.toLowerCase().includes(term);
        const matchesDept = officer.department?.toLowerCase().includes(term);
        const matchesRegion = officer.region?.toLowerCase().includes(term);
        return matchesName || matchesEmail || matchesEmpId || matchesDept || matchesRegion;
      }

      return true;
    });
  }, [pendingOfficers, activeTab, departmentFilter, searchTerm]);

  const handleApprove = (officer) => {
    approveOfficer(officer.id, officer.department_id);
  };

  const openRejectModal = (officer) => {
    setRejectingOfficer(officer);
    setRejectReason('Government employee credentials could not be verified in the municipal directory.');
  };

  const handleConfirmReject = () => {
    if (!rejectingOfficer) return;
    rejectOfficer(rejectingOfficer.id, rejectReason);
    setRejectingOfficer(null);
    setRejectReason('');
  };

  const REJECT_PRESETS = [
    'Government employee credentials could not be verified in municipal directory.',
    'Invalid or expired government service badge ID number.',
    'Department jurisdictional assignment mismatch.',
    'Official government email domain verification failed.',
    'Incomplete documentation submitted.'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Field Officer Verification & Approval</h1>
            {pendingCount > 0 && (
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#fbbf24',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Clock size={13} />
                <span>{pendingCount} Pending Review</span>
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>
            Authorise government personnel registration requests before allowing access to municipal grievance dispatch queues.
          </p>
        </div>

        {/* Action button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={resetPendingOfficers}
            className="btn btn-sm btn-secondary"
            title="Reload and populate all pending officer requests (including Inspector King)"
            style={{ fontSize: '12px', padding: '7px 14px', borderColor: 'rgba(56, 189, 248, 0.35)', color: '#38bdf8' }}
          >
            <span>🔄 Reload Pending Requests</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #fbbf24' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Pending Approvals
            </span>
            <Clock size={18} color="#fbbf24" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#fbbf24' }}>{pendingCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 4 }}>
            Awaiting credential verification
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Authorized Officers
            </span>
            <ShieldCheck size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>{approvedCount + 4}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 4 }}>
            Active in field dispatch
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #f43f5e' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Rejected Requests
            </span>
            <ShieldAlert size={18} color="#f43f5e" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f43f5e' }}>{rejectedCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 4 }}>
            Invalid or unverifiable credentials
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Avg Verification Turnaround
            </span>
            <Sparkles size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#38bdf8' }}>1.4 hrs</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 4 }}>
            Within 2-hour staff policy SLA
          </div>
        </div>
      </div>

      {/* Main List Section */}
      <div className="glass-card" style={{ padding: 24 }}>
        {/* Controls Bar: Tabs & Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('pending')}
              className={`btn btn-sm ${activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ position: 'relative' }}
            >
              <Clock size={13} />
              <span>Pending Requests</span>
              {pendingCount > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    padding: '2px 7px',
                    borderRadius: '9999px',
                    background: activeTab === 'pending' ? '#fff' : 'rgba(245, 158, 11, 0.25)',
                    color: activeTab === 'pending' ? '#000' : '#fbbf24',
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('approved')}
              className={`btn btn-sm ${activeTab === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <CheckCircle2 size={13} />
              <span>Approved</span>
            </button>

            <button
              onClick={() => setActiveTab('rejected')}
              className={`btn btn-sm ${activeTab === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <XCircle size={13} />
              <span>Rejected</span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <span>All ({pendingOfficers.length})</span>
            </button>
          </div>

          {/* Search & Department Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: 240 }}>
              <input
                type="text"
                className="input-control"
                placeholder="Search name, badge ID, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 34, fontSize: '13px' }}
              />
              <Search
                size={15}
                style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
            </div>

            <select
              className="input-control"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              style={{ width: 'auto', fontSize: '13px', padding: '7px 32px 7px 12px' }}
            >
              <option value="all">All Departments</option>
              <option value="Water">Water & Sanitation</option>
              <option value="Electricity">Electricity & Power</option>
              <option value="Roads">Roads & Infrastructure</option>
            </select>
          </div>
        </div>

        {/* Requests Cards List */}
        {filteredOfficers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <ShieldCheck size={44} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: 6 }}>No Officer Requests Found</h3>
            <p style={{ fontSize: '13px', marginBottom: 18 }}>
              {activeTab === 'pending'
                ? 'All submitted officer registrations have been reviewed, or pending requests need refreshing.'
                : 'No officer records found matching the current search criteria.'}
            </p>
            <button
              onClick={resetPendingOfficers}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                margin: '0 auto',
                padding: '9px 20px',
                fontSize: '13px',
                fontWeight: 700
              }}
            >
              <Clock size={14} />
              <span>Load Pending Verification Queue (Includes Inspector King)</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredOfficers.map((officer) => {
              const isPending = officer.status === 'pending';
              const isApproved = officer.status === 'active' || officer.status === 'approved';
              const isRejected = officer.status === 'rejected';

              return (
                <div
                  key={officer.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: `1px solid ${
                      isPending ? 'rgba(245, 158, 11, 0.35)' : isApproved ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'
                    }`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Top Row: Officer Identity & Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {/* Avatar */}
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: `2px solid ${isPending ? '#fbbf24' : isApproved ? '#10b981' : '#f43f5e'}`,
                          boxShadow: `0 0 14px ${isPending ? 'rgba(245, 158, 11, 0.4)' : isApproved ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
                          background: '#0B1426',
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src="/officer-avatar.jpg"
                          alt={officer.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{officer.name}</h3>
                          {officer.employee_id && (
                            <span
                              className="mono"
                              style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: 'rgba(56, 189, 248, 0.12)',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                color: '#38bdf8',
                                fontSize: '11px',
                                fontWeight: 700,
                              }}
                            >
                              {officer.employee_id}
                            </span>
                          )}
                          <StatusBadge status={officer.status} />
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 2 }}>
                          {officer.designation || 'Field Grievance Officer'} • <span style={{ color: '#fff' }}>{officer.department}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {isPending ? (
                        <>
                          <button
                            onClick={() => openRejectModal(officer)}
                            className="btn btn-sm btn-secondary"
                            style={{
                              borderColor: 'rgba(244, 63, 94, 0.35)',
                              color: '#fb7185',
                              padding: '8px 14px',
                            }}
                          >
                            <UserX size={14} />
                            <span>Reject Request</span>
                          </button>

                          <button
                            onClick={() => handleApprove(officer)}
                            className="btn btn-sm btn-primary"
                            style={{
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              borderColor: '#10b981',
                              boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)',
                              padding: '8px 16px',
                              fontWeight: 700,
                            }}
                          >
                            <UserCheck size={14} />
                            <span>Approve & Authorize</span>
                          </button>
                        </>
                      ) : isApproved ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: '#34d399',
                            fontSize: '12.5px',
                            fontWeight: 600,
                          }}
                        >
                          <CheckCircle2 size={15} />
                          <span>Active Login Access Granted</span>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'rgba(244, 63, 94, 0.12)',
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                            color: '#fb7185',
                            fontSize: '12.5px',
                            fontWeight: 600,
                          }}
                        >
                          <XCircle size={15} />
                          <span>Access Blocked (Rejected)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Contact & Detail Attributes */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 12,
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '12.5px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                      <Mail size={14} color="#38bdf8" />
                      <span>Email: <strong style={{ color: '#fff' }}>{officer.email}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                      <Phone size={14} color="#34d399" />
                      <span>Phone: <strong style={{ color: '#fff' }}>{officer.phone || '+91 98450 XXXXX'}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                      <MapPin size={14} color="#fbbf24" />
                      <span>Region: <strong style={{ color: '#fff' }}>{officer.region || 'City-Wide'}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                      <Calendar size={14} color="#c084fc" />
                      <span>Applied: <strong style={{ color: '#fff' }}>{officer.applied_at || 'Today'}</strong></span>
                    </div>
                  </div>

                  {/* Submission Notes / Rejection Reason Banner */}
                  {officer.notes && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={13} color="var(--text-dim)" />
                      <span>Verification Note: <i>"{officer.notes}"</i></span>
                    </div>
                  )}

                  {isRejected && officer.rejection_reason && (
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(244, 63, 94, 0.1)',
                        border: '1px solid rgba(244, 63, 94, 0.25)',
                        color: '#f87171',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <AlertCircle size={14} />
                      <span>Rejection Reason: <strong>{officer.rejection_reason}</strong></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rejection Reason Modal */}
      {rejectingOfficer && (
        <div
          className="modal-overlay"
          onClick={() => setRejectingOfficer(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(4, 7, 16, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 540,
              padding: '24px 28px',
              background: '#0E162B',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(244, 63, 94, 0.25)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'rgba(244, 63, 94, 0.18)',
                    border: '1px solid rgba(244, 63, 94, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f43f5e',
                  }}
                >
                  <UserX size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff' }}>Reject Officer Registration</h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {rejectingOfficer.name} <span className="mono" style={{ color: '#38bdf8' }}>({rejectingOfficer.employee_id || rejectingOfficer.email})</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectingOfficer(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.45 }}>
              Select or type the justification for disapproval. This reason will be stored in the audit log and displayed to the officer if they attempt to sign in.
            </p>

            {/* Presets */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                Quick Presets (Click to select)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {REJECT_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectReason(preset)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      justifyContent: 'flex-start',
                      fontSize: '12px',
                      padding: '8px 12px',
                      borderColor: rejectReason === preset ? '#f43f5e' : 'var(--border-subtle)',
                      background: rejectReason === preset ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      color: rejectReason === preset ? '#fff' : 'var(--text-secondary)',
                      textAlign: 'left',
                      lineHeight: 1.3
                    }}
                  >
                    <span style={{ color: rejectReason === preset ? '#f43f5e' : 'var(--text-dim)', marginRight: 6 }}>•</span>
                    <span>{preset}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Textarea */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Verification Remarks / Reason *
              </label>
              <textarea
                className="input-control"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter specific verification remarks..."
                style={{ resize: 'vertical', fontSize: '13px' }}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setRejectingOfficer(null)}
                className="btn btn-secondary"
                style={{ padding: '9px 16px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #be123c 100%)',
                  color: '#fff',
                  border: '1px solid #ef4444',
                  boxShadow: '0 0 16px rgba(239, 68, 68, 0.4)',
                  fontWeight: 700,
                  padding: '9px 18px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Confirm & Reject Registration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PendingOfficers;
