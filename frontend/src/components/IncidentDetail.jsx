import React from 'react';
import { X, CheckCircle, AlertCircle, Clock, Users, MessageSquare, Activity, BarChart3 } from 'lucide-react';

function IncidentDetail({ incident, onClose, onResolve, onFalseAlarm }) {
  if (!incident) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="incident-detail-overlay">
      <div className="incident-detail-card">
        <div className="incident-detail-header">
          <h2>Incident Details</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="incident-detail-content">
          {/* Transcript Section */}
          <div className="detail-section">
            <div className="section-title">
              <MessageSquare size={18} />
              <span>Transcript</span>
            </div>
            <p className="transcript-text">{incident.transcript || 'No transcript available'}</p>
          </div>

          {/* Audio Player */}
          {incident.audioUrl && (
            <div className="detail-section">
              <div className="section-title">
                <Activity size={18} />
                <span>Audio Recording</span>
              </div>
              <audio controls src={incident.audioUrl} className="audio-player-detail" />
            </div>
          )}

          {/* Risk Analysis */}
          <div className="detail-section">
            <div className="section-title">
              <BarChart3 size={18} />
              <span>Risk Analysis</span>
            </div>
            <div className="risk-metrics">
              <div className="risk-metric">
                <span className="metric-label">Risk Score</span>
                <span className="metric-value">{incident.risk_score || 0}%</span>
              </div>
              <div className="risk-metric">
                <span className="metric-label">Confidence</span>
                <span className="metric-value">{incident.confidence_score || 0}%</span>
              </div>
              <div className="risk-metric">
                <span className="metric-label">Classification</span>
                <span className={`classification-badge ${incident.classification?.toLowerCase()}`}>
                  {incident.classification}
                </span>
              </div>
            </div>
          </div>

          {/* Voice Features */}
          {incident.voiceFeatures && (
            <div className="detail-section">
              <div className="section-title">
                <Activity size={18} />
                <span>Voice Features</span>
              </div>
              <div className="voice-features-grid">
                <div className="feature-item">
                  <span className="feature-label">Pitch</span>
                  <span className="feature-value">{incident.voiceFeatures.pitch?.toFixed(2) || 0}</span>
                </div>
                <div className="feature-item">
                  <span className="feature-label">Energy</span>
                  <span className="feature-value">{incident.voiceFeatures.energy?.toFixed(2) || 0}</span>
                </div>
                <div className="feature-item">
                  <span className="feature-label">Speech Rate</span>
                  <span className="feature-value">{incident.voiceFeatures.speech_rate?.toFixed(2) || 0}</span>
                </div>
                <div className="feature-item">
                  <span className="feature-label">Pause Ratio</span>
                  <span className="feature-value">{incident.voiceFeatures.pause_ratio?.toFixed(2) || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* AI Summary */}
          {incident.summary && (
            <div className="detail-section">
              <div className="section-title">
                <MessageSquare size={18} />
                <span>AI Summary</span>
              </div>
              <p className="summary-text">{incident.summary}</p>
            </div>
          )}

          {/* Recommendations */}
          {incident.recommendations && incident.recommendations.length > 0 && (
            <div className="detail-section">
              <div className="section-title">
                <CheckCircle size={18} />
                <span>Recommendations</span>
              </div>
              <ul className="recommendations-list">
                {incident.recommendations.map((rec, idx) => (
                  <li key={idx} className="recommendation-item">{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Telegram Delivery Status */}
          <div className="detail-section">
            <div className="section-title">
              <AlertCircle size={18} />
              <span>Alert Status</span>
            </div>
            <div className="alert-status-detail">
              <span className={`status-badge ${incident.send_alert || incident.alert_triggered ? 'sent' : 'not-sent'}`}>
                {incident.send_alert || incident.alert_triggered ? 'Alert Sent' : 'No Alert'}
              </span>
              {incident.telegram_sent && (
                <span className="telegram-status">Telegram: Delivered</span>
              )}
            </div>
          </div>

          {/* Emergency Contacts Notified */}
          {incident.recipients && (
            <div className="detail-section">
              <div className="section-title">
                <Users size={18} />
                <span>Contacts Notified</span>
              </div>
              <div className="contacts-notified">
                {incident.recipients.map((contact, idx) => (
                  <span key={idx} className="contact-tag">{contact.name || contact}</span>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="detail-section">
            <div className="section-title">
              <Clock size={18} />
              <span>Timeline</span>
            </div>
            <div className="timeline-detail">
              <div className="timeline-item">
                <span className="timeline-dot" />
                <span>Incident created: {formatDate(incident.created_at)}</span>
              </div>
              {incident.sent_at && (
                <div className="timeline-item">
                  <span className="timeline-dot" />
                  <span>Alert sent: {formatDate(incident.sent_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="detail-actions">
            <button className="resolve-btn" onClick={onResolve}>
              <CheckCircle size={16} />
              Resolve Incident
            </button>
            <button className="false-alarm-btn" onClick={onFalseAlarm}>
              <AlertCircle size={16} />
              False Alarm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IncidentDetail;