import React from 'react';

/**
 * AlertStatus Component
 *
 * Presents the complete emergency notification workflow after AI analysis.
 * Shows a visual timeline, delivery status, recipients, and incident info.
 *
 * Three states:
 *   - success: Alert was triggered and sent successfully
 *   - failure: Alert was triggered but delivery failed
 *   - no-alert: No alert required (safe / low risk)
 *
 * Props:
 *   status        - 'success' | 'failure' | 'no-alert' | null
 *   sentAt        - ISO timestamp string when alert was sent
 *   recipients    - Array of { name, phone, email, delivered }
 *   incidentInfo  - { classification, riskScore, category, summary }
 *   deliveryError - Error message if delivery failed
 *   onDismiss     - Callback to dismiss the alert status
 */

const TIMELINE_STEPS = [
  { key: 'recorded', label: 'Voice Recorded', icon: '🎤' },
  { key: 'analysis', label: 'AI Analysis', icon: '🤖' },
  { key: 'assessment', label: 'Risk Assessment', icon: '📊' },
  { key: 'sending', label: 'Telegram Sending', icon: '📨' },
  { key: 'delivered', label: 'Delivered', icon: '✅' },
];

function AlertStatus({ status, sentAt, recipients, incidentInfo, deliveryError, onDismiss }) {
  // --- No alert required state ---
  if (status === 'no-alert') {
    return (
      <div className="alert-workflow alert-no-alert" role="status">
        <div className="alert-workflow-header">
          <span className="alert-workflow-icon">🛡️</span>
          <div className="alert-workflow-title-group">
            <span className="alert-workflow-title">No Alert Required</span>
            <span className="alert-workflow-subtitle">
              Voice analysis indicates no emergency situation
            </span>
          </div>
        </div>

        {/* Timeline showing steps up to assessment */}
        <div className="alert-timeline">
          {TIMELINE_STEPS.slice(0, 3).map((step, i) => (
            <div key={step.key} className="timeline-step completed">
              <div className="timeline-marker">
                <span className="timeline-icon">{step.icon}</span>
                <div className="timeline-line" />
              </div>
              <div className="timeline-content">
                <span className="timeline-label">{step.label}</span>
                <span className="timeline-status">Complete</span>
              </div>
            </div>
          ))}
          {/* Sending and Delivered — skipped */}
          <div className="timeline-step skipped">
            <div className="timeline-marker">
              <span className="timeline-icon">⏭️</span>
              <div className="timeline-line" />
            </div>
            <div className="timeline-content">
              <span className="timeline-label">Alert Dispatch</span>
              <span className="timeline-status">Skipped — not required</span>
            </div>
          </div>
        </div>

        {onDismiss && (
          <button className="alert-dismiss-btn" onClick={onDismiss} type="button">
            Dismiss
          </button>
        )}
      </div>
    );
  }

  // --- Failure state ---
  if (status === 'failure') {
    return (
      <div className="alert-workflow alert-failure" role="alert">
        <div className="alert-workflow-header">
          <span className="alert-workflow-icon">⚠️</span>
          <div className="alert-workflow-title-group">
            <span className="alert-workflow-title">Alert Delivery Failed</span>
            <span className="alert-workflow-subtitle">
              {deliveryError || 'Unable to deliver emergency notification via Telegram.'}
            </span>
          </div>
        </div>

        {/* Timeline showing failure at sending step */}
        <div className="alert-timeline">
          {TIMELINE_STEPS.map((step, i) => {
            let stepStatus = 'completed';
            if (step.key === 'sending') stepStatus = 'failed';
            if (step.key === 'delivered') stepStatus = 'pending';
            return (
              <div key={step.key} className={`timeline-step ${stepStatus}`}>
                <div className="timeline-marker">
                  <span className="timeline-icon">
                    {stepStatus === 'failed' ? '❌' : step.icon}
                  </span>
                  {i < TIMELINE_STEPS.length - 1 && <div className="timeline-line" />}
                </div>
                <div className="timeline-content">
                  <span className="timeline-label">{step.label}</span>
                  <span className="timeline-status">
                    {step.key === 'delivered' ? (alertSent ? 'Complete' : 'Pending/Failed') : (stepStatus === 'failed' ? 'Failed' : stepStatus === 'pending' ? 'Pending' : 'Complete')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {onDismiss && (
          <button className="alert-dismiss-btn" onClick={onDismiss} type="button">
            Dismiss
          </button>
        )}
      </div>
    );
  }

  // --- Success state (or null/undefined — show nothing) ---
  if (status !== 'success') {
    return null;
  }

  // Format timestamp
  const formattedTime = sentAt
    ? new Date(sentAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
    : new Date().toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });

  const hasRecipients = Array.isArray(recipients) && recipients.length > 0;
  const hasIncident = incidentInfo && (incidentInfo.classification || incidentInfo.riskScore);

  return (
    <div className="alert-workflow alert-success" role="alert">
      {/* Header */}
      <div className="alert-workflow-header">
        <span className="alert-workflow-icon">🚨</span>
        <div className="alert-workflow-title-group">
          <span className="alert-workflow-title">Emergency Alert Sent</span>
          <span className="alert-workflow-subtitle">
            Emergency contacts have been notified via Telegram
          </span>
        </div>
      </div>

      {/* Timestamp */}
      <div className="alert-timestamp">
        <span className="alert-timestamp-icon">🕐</span>
        <span className="alert-timestamp-text">Sent at {formattedTime}</span>
      </div>

      {/* Incident Info */}
      {hasIncident && (
        <div className="alert-incident-card">
          <span className="alert-incident-title">Incident Details</span>
          <div className="alert-incident-grid">
            {incidentInfo.classification && (
              <div className="alert-incident-item">
                <span className="alert-incident-label">Classification</span>
                <span className="alert-incident-value">{incidentInfo.classification}</span>
              </div>
            )}
            {incidentInfo.riskScore !== undefined && incidentInfo.riskScore !== null && (
              <div className="alert-incident-item">
                <span className="alert-incident-label">Risk Score</span>
                <span className="alert-incident-value">{incidentInfo.riskScore}/100</span>
              </div>
            )}
            {incidentInfo.category && (
              <div className="alert-incident-item">
                <span className="alert-incident-label">Category</span>
                <span className="alert-incident-value">{incidentInfo.category}</span>
              </div>
            )}
            {incidentInfo.summary && (
              <div className="alert-incident-item alert-incident-full">
                <span className="alert-incident-label">Summary</span>
                <span className="alert-incident-value">{incidentInfo.summary}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recipients */}
      {hasRecipients && (
        <div className="alert-recipients">
          <span className="alert-recipients-title">
            Notified Contacts ({recipients.length})
          </span>
          <div className="alert-recipients-list">
            {recipients.map((r, i) => (
              <div key={i} className="alert-recipient-item">
                <span className="alert-recipient-avatar">👤</span>
                <div className="alert-recipient-info">
                  <span className="alert-recipient-name">{r.name || 'Contact'}</span>
                  <span className="alert-recipient-detail">{r.phone || r.email || ''}</span>
                </div>
                <span
                  className={`alert-recipient-status ${r.delivered !== false ? 'delivered' : 'pending'}`}
                  title={r.delivered !== false ? 'Delivered' : 'Pending'}
                >
                  {r.delivered !== false ? '✓' : '⏳'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="alert-timeline">
        <span className="alert-timeline-title">Workflow</span>
        {TIMELINE_STEPS.map((step, i) => (
          <div key={step.key} className="timeline-step completed">
            <div className="timeline-marker">
              <span className="timeline-icon">{step.icon}</span>
              {i < TIMELINE_STEPS.length - 1 && <div className="timeline-line" />}
            </div>
            <div className="timeline-content">
              <span className="timeline-label">{step.label}</span>
              <span className="timeline-status">Complete</span>
            </div>
          </div>
        ))}
      </div>

      {onDismiss && (
        <button className="alert-dismiss-btn" onClick={onDismiss} type="button">
          Dismiss
        </button>
      )}
    </div>
  );
}

export default AlertStatus;
