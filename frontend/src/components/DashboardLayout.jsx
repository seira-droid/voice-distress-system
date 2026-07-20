import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mic, BarChart3, History, Users, Settings, LogOut, Home, Shield, Activity } from 'lucide-react';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
  { id: 'voice', label: 'Voice Assistant', icon: Mic, path: '/voice' },
  { id: 'incidents', label: 'Incidents', icon: History, path: '/incidents' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
  { id: 'contacts', label: 'Contacts', icon: Users, path: '/contacts' },
  { id: 'safety', label: 'Safety Settings', icon: Shield, path: '/safety' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

function DashboardLayout({ children, voiceState, onLogout }) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="app">
      {/* Top Navigation */}
      <nav className="top-nav">
        <div className="nav-logo">
          <span className="nav-logo-icon">🛡️</span>
          <span className="nav-logo-text">Voice Distress Guardian</span>
        </div>
        
        <div className="nav-status">
          <div className={`assistant-halo ${voiceState?.state === 'listening' ? 'listening' : ''}`}>
            <div className={`assistant-orb ${voiceState?.state || ''}`}></div>
          </div>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {voiceState?.state === 'idle' ? 'Ready' : 
             voiceState?.state === 'recording' ? 'Recording' :
             voiceState?.state === 'processing' ? 'Processing' :
             voiceState?.state === 'emergency' ? 'Emergency' :
             voiceState?.state === 'alert_sent' ? 'Alert Sent' :
             voiceState?.state === 'safe' ? 'Safe' : 'Error'}
          </span>
        </div>
        
        <div className="nav-actions">
          <button className="nav-btn" aria-label="Notifications">
            🔔
          </button>
          <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <span>👤</span>
            <span style={{ fontSize: '0.875rem' }}>Admin</span>
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Left Sidebar */}
        <aside className="left-sidebar">
          <nav className="sidebar-nav">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          
          <div style={{ marginTop: 'auto' }}>
            <button className="nav-item" onClick={onLogout} style={{ width: '100%', cursor: 'pointer' }}>
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Workspace */}
        <div className="workspace">
          <main className="main-content">
            {children}
          </main>

          {/* Right Context Panel */}
          <aside className="context-panel">
            <div className="panel-section">
              <div className="panel-title">System Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={16} style={{ color: 'var(--color-emerald)' }} />
                <span style={{ fontSize: '0.875rem' }}>All systems operational</span>
              </div>
            </div>
            
            <div className="panel-section">
              <div className="panel-title">Quick Actions</div>
              <button className="btn btn-primary" style={{ width: '100%' }}>
                Test Alert
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
