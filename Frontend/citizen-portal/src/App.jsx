import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import ReportComplaint from './pages/ReportComplaint';
import MyComplaints from './pages/MyComplaints';
import ComplaintDetails from './pages/ComplaintDetails';
import AIChatbot from './pages/AIChatbot';
import CallAgent from './pages/CallAgent';
import Emergency from './pages/Emergency';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  };

  return (
    <Router>
      <div className="app-container">
        <header className="header">
          <div className="brand">
            <Link to="/" style={{color: 'white', textDecoration: 'none'}}><h1>Citizen Portal</h1></Link>
          </div>
          <nav>
            {localStorage.getItem('access_token') ? (
              <>
                <Link to="/dashboard" style={{color: 'white', marginRight: '1rem'}}>Dashboard</Link>
                <Link to="/report" style={{color: 'white', marginRight: '1rem'}}>Report</Link>
                <Link to="/my-complaints" style={{color: 'white', marginRight: '1rem'}}>My Complaints</Link>
                <Link to="/assistant" style={{color: 'white', marginRight: '1rem'}}>Chatbot</Link>
                <Link to="/call-agent" style={{color: 'white', marginRight: '1rem'}}>Call Agent</Link>
                <Link to="/emergency" style={{color: 'white', marginRight: '1rem'}}>Emergency</Link>
                <button onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <div>
                <Link to="/emergency" style={{color: 'white', marginRight: '1rem'}}>Emergency</Link>
                <Link to="/login" style={{color: 'white', marginRight: '1rem'}}>Login</Link>
                <Link to="/register" style={{color: 'white'}}>Sign Up</Link>
              </div>
            )}
          </nav>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/emergency" element={<Emergency />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute><ReportComplaint /></ProtectedRoute>} />
            <Route path="/my-complaints" element={<ProtectedRoute><MyComplaints /></ProtectedRoute>} />
            <Route path="/my-complaints/:id" element={<ProtectedRoute><ComplaintDetails /></ProtectedRoute>} />
            <Route path="/assistant" element={<ProtectedRoute><AIChatbot /></ProtectedRoute>} />
            <Route path="/call-agent" element={<ProtectedRoute><CallAgent /></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
