import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import VoiceAssistantPage from './pages/VoiceAssistantPage';
import IncidentHistoryPage from './pages/IncidentHistoryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ContactsPage from './pages/ContactsPage';
import SettingsPage from './pages/SettingsPage';
import SafetySettings from './pages/SafetySettings';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import useVoiceState from './hooks/useVoiceState';
import './App.css';

const API_BASE = 'http://localhost:8000';

// Protected Route component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.25rem',
        color: 'var(--text-secondary)'
      }}>
        Loading...
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Public Route component (redirects to dashboard if authenticated)
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.25rem',
        color: 'var(--text-secondary)'
      }}>
        Loading...
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AppContent() {
  const voiceState = useVoiceState();
  const { logout } = useAuth();
  const [triggerWord, setTriggerWord] = useState('');

  // Fetch trigger word
  useEffect(() => {
    const fetchTriggerWord = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/v1/trigger-word/`);
        const data = await response.json();
        setTriggerWord(data.trigger_word || 'Not set');
      } catch (err) {
        console.error("Failed to fetch trigger word", err);
      }
    };
    fetchTriggerWord();
  }, []);

  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          <Route path="/forgot-password" element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          } />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout voiceState={voiceState} onLogout={logout}>
                <DashboardHome />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout voiceState={voiceState} onLogout={logout}>
                <DashboardHome />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/voice" element={
            <ProtectedRoute>
              <DashboardLayout voiceState={voiceState} onLogout={logout}>
                <VoiceAssistantPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/incidents" element={
            <ProtectedRoute>
              <DashboardLayout voiceState={voiceState} onLogout={logout}>
                <IncidentHistoryPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute>
              <DashboardLayout voiceState={voiceState} onLogout={logout}>
                <AnalyticsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/contacts" element={
            <ProtectedRoute>
              <DashboardLayout voiceState={voiceState} onLogout={logout}>
                <ContactsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <DashboardLayout voiceState={voiceState} onLogout={logout}>
                <SettingsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/safety" element={
            <ProtectedRoute>
              <DashboardLayout voiceState={voiceState} onLogout={logout}>
                <SafetySettings />
              </DashboardLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;