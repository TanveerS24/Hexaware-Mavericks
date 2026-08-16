import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AdminProvider, useAdmin } from './context/AdminContext';

// Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import BroadcastModal from './components/BroadcastModal';

// Pages
import AdminLogin from './pages/auth/AdminLogin';
import Overview from './pages/Overview';
import Slamonitoring from './pages/Slamonitoring';
import Heatmap from './pages/Heatmap';
import Trends from './pages/Trends';
import AuditLogs from './pages/AuditLogs';
import Predictive from './pages/Predictive';
import Clusters from './pages/Clusters';
import Broadcasts from './pages/Broadcasts';
import PendingOfficers from './pages/PendingOfficers';

const ProtectedAdminRoute = ({ children }) => {
  const { user, loading } = useAdmin();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#050811', color: '#38bdf8' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(56, 189, 248, 0.2)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AdminLayout = () => {
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Navbar onOpenBroadcast={() => setIsBroadcastOpen(true)} />
        <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1600, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      <BroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <AdminProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0E162B',
              color: '#F8FAFC',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '10px',
              fontSize: '13.5px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#000' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />

        <Routes>
          <Route path="/login" element={<AdminLogin />} />

          <Route
            path="/"
            element={
              <ProtectedAdminRoute>
                <AdminLayout />
              </ProtectedAdminRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="pending-officers" element={<PendingOfficers />} />
            <Route path="sla" element={<Slamonitoring />} />
            <Route path="heatmap" element={<Heatmap />} />
            <Route path="trends" element={<Trends />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="predictive" element={<Predictive />} />
            <Route path="clusters" element={<Clusters />} />
            <Route path="broadcasts" element={<Broadcasts />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AdminProvider>
  );
}

export default App;
