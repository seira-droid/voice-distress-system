import React, { useState, useEffect } from 'react';
import VoiceAssistant from '../components/VoiceAssistant';
import { Shield, Activity, AlertTriangle, BarChart3, Clock, Users } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');

function DashboardHome() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    alertsSent: 0,
    incidents: 0,
    avgRisk: 0,
  });

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/v1/events/`);
        const data = await response.json();
        setEvents(Array.isArray(data) ? data : []);
        
        const total = data.length;
        const alerts = data.filter(e => e.alert_triggered || e.send_alert).length;
        const incidents = data.filter(e => e.classification === 'Emergency').length;
        const avgRisk = total > 0 
          ? Math.round(data.reduce((sum, e) => sum + (e.risk_score || 0), 0) / total) 
          : 0;
        
        setStats({
          totalAnalyses: total,
          alertsSent: alerts,
          incidents: incidents,
          avgRisk: avgRisk,
        });
      } catch (err) {
        console.error('Failed to fetch events:', err);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Your personal safety assistant is always listening
        </p>
      </div>

      {/* Statistics - Minimal Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <Activity size={24} style={{ color: 'var(--color-safety-blue)', marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats.totalAnalyses}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Analyses
          </div>
        </div>
        
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <AlertTriangle size={24} style={{ color: 'var(--color-danger)', marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats.alertsSent}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Alerts
          </div>
        </div>
        
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <Shield size={24} style={{ color: 'var(--color-emerald)', marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats.incidents}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Incidents
          </div>
        </div>
        
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <BarChart3 size={24} style={{ color: 'var(--color-amber)', marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats.avgRisk}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Avg Risk
          </div>
        </div>
      </div>

      {/* Voice Assistant - Signature Experience */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Voice Assistant
        </h2>
        <VoiceAssistant triggerWord="hey guardian" />
      </div>

      {/* Recent Activity */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Recent Activity
        </h2>
        <div className="card">
          {events.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
              No activity recorded yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {events.slice(0, 5).map((event, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      {event.classification}
                    </span>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: 'var(--radius-sm)', 
                      fontSize: '0.75rem',
                      background: event.risk_score > 70 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: event.risk_score > 70 ? 'var(--color-danger)' : 'var(--color-emerald)'
                    }}>
                      Risk: {event.risk_score}%
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {new Date(event.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardHome;
