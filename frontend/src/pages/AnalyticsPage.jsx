import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');

function AnalyticsPage() {
  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState({
    dailyAnalyses: [],
    riskDistribution: { low: 0, medium: 0, high: 0 },
    weeklyTrend: [],
  });

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/v1/events/`);
        const data = await response.json();
        setEvents(Array.isArray(data) ? data : []);
        
        // Calculate analytics
        const low = data.filter(e => (e.risk_score || 0) < 40).length;
        const medium = data.filter(e => (e.risk_score || 0) >= 40 && (e.risk_score || 0) < 70).length;
        const high = data.filter(e => (e.risk_score || 0) >= 70).length;
        
        setAnalytics({
          riskDistribution: { low, medium, high },
        });
      } catch (err) {
        console.error('Failed to fetch events:', err);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Analytics</h1>
        <p>View detailed statistics and trends</p>
      </div>
      
      <div className="analytics-grid">
        {/* Risk Distribution Chart */}
        <div className="analytics-card">
          <div className="card-header">
            <h2>Risk Distribution</h2>
          </div>
          <div className="card-content">
            <div className="pie-chart">
              <div className="pie-legend">
                <div className="legend-item">
                  <span className="legend-color low"></span>
                  <span>Low Risk (0-39%): {analytics.riskDistribution.low}</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color medium"></span>
                  <span>Medium Risk (40-69%): {analytics.riskDistribution.medium}</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color high"></span>
                  <span>High Risk (70%+): {analytics.riskDistribution.high}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Analyses Chart */}
        <div className="analytics-card">
          <div className="card-header">
            <h2>Daily Analyses</h2>
          </div>
          <div className="card-content">
            <div className="bar-chart">
              {events.slice(0, 7).map((event, idx) => (
                <div key={idx} className="bar-column-container">
                  <div 
                    className="bar-column"
                    style={{ height: `${Math.min(100, (event.risk_score || 0))}%` }}
                  ></div>
                  <span className="bar-label">
                    {new Date(event.created_at).toLocaleDateString().slice(0, 3)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly Alerts Chart */}
        <div className="analytics-card">
          <div className="card-header">
            <h2>Weekly Alerts</h2>
          </div>
          <div className="card-content">
            <div className="line-chart">
              {events
                .filter(e => e.alert_triggered || e.send_alert)
                .slice(0, 7)
                .map((event, idx) => (
                  <div key={idx} className="line-point-container">
                    <div 
                      className="line-point"
                      style={{ height: `${Math.min(100, (event.risk_score || 0))}%` }}
                    ></div>
                    <span className="line-label">
                      {new Date(event.created_at).toLocaleDateString().slice(0, 3)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="analytics-card">
          <div className="card-header">
            <h2>Performance Metrics</h2>
          </div>
          <div className="card-content">
            <div className="metrics-grid">
              <div className="metric-item">
                <span className="metric-value">{events.length}</span>
                <span className="metric-label">Total Events</span>
              </div>
              <div className="metric-item">
                <span className="metric-value">
                  {events.length > 0 
                    ? Math.round(events.reduce((sum, e) => sum + (e.risk_score || 0), 0) / events.length)
                    : 0}%
                </span>
                <span className="metric-label">Avg Risk Score</span>
              </div>
              <div className="metric-item">
                <span className="metric-value">
                  {events.filter(e => e.alert_triggered || e.send_alert).length}
                </span>
                <span className="metric-label">Alerts Sent</span>
              </div>
              <div className="metric-item">
                <span className="metric-value">99.9%</span>
                <span className="metric-label">Uptime</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
