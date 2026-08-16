import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './context/AppContext';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterOfficer from './pages/auth/RegisterOfficer';

// Officer Dashboard Pages
import OfficerLayout from './pages/officer/OfficerLayout';
import OfficerDashboard from './pages/officer/OfficerDashboard';
import IncomingComplaints from './pages/officer/IncomingComplaints';
import MyCases from './pages/officer/MyCases';
import OfficerComplaintDetail from './pages/officer/OfficerComplaintDetail';

const ProtectedOfficerRoute = ({ children }) => {
  const { user, loading } = useApp();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#080C14', color: '#38bdf8' }}>
      <div style={{ width: 32, height: 32, border: '3px solid rgba(56, 189, 248, 0.2)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useApp();
  if (user && user.role === 'officer') {
    return <Navigate to="/officer" replace />;
  }
  return children;
};

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0D1B35',
              color: '#F0F6FF',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '10px',
              fontSize: '13.5px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#000' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />

        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterOfficer /></PublicRoute>} />

          {/* Officer Dashboard Routes */}
          <Route path="/officer" element={<ProtectedOfficerRoute><OfficerLayout /></ProtectedOfficerRoute>}>
            <Route index element={<OfficerDashboard />} />
            <Route path="incoming" element={<IncomingComplaints />} />
            <Route path="cases" element={<MyCases />} />
            <Route path="complaints/:id" element={<OfficerComplaintDetail />} />
          </Route>

          {/* Default Redirect */}
          <Route path="*" element={<Navigate to="/officer" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
