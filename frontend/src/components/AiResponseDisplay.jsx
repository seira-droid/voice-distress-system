import React from 'react';

/**
 * AiResponseDisplay
 *
 * Transforms backend analysis into a conversational assistant experience.
 * Displays classification, risk score, confidence, category, summary,
 * recommendations as checklist items, and alert status.
 *
 * Props:
 *   analysisResult  - Full backend response object with fields:
 *     classification, confidence_score, risk_score, category, summary,
 *     recommendations[], send_alert, transcription, voice_features
 *   isLoading       - Whether analysis is in progress
 *   error           - Error message if something failed
 *   onClear         - Callback to dismiss results
 *   audioUrl        - URL for audio playback preview
 */

const CLASSIFICATION_CONFIG = {
  Emergency: {
    icon: '🚨',
    label: 'Emergency',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    description: 'Immediate attention required',
  },
  Distress: {
    icon: '⚡',
    label: 'Distress',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    description: 'Signs of distress detected',
  },
  Concern: {
    icon: '💭',
    label: 'Concern',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    description: 'Some concern detected',
  },
  Neutral: {
    icon: '✅',
    label: 'Neutral',
    color: '#22c55e',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    description: 'No distress detected',
  },
  Safe: {
    icon: '🛡️',
    label: 'Safe',
    color: '#22c55e',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    description: 'Voice indicates safety',
  },
};

const CATEGORY_ICONS = {
  'Personal Safety': '🛡️',
  'Medical': '🏥',
  'Mental Health': '🧠',
  'Domestic': '🏠',
  'Accident': '💥',
  'Harassment': '⚠️',
  'Natural Disaster': '🌊',
  'Fire': '🔥',
  'Violence': '⚔️',
  'Other': '📋',
};

function getClassificationConfig(classification) {
  if (!classification) return CLASSIFICATION_CONFIG.Neutral;
  const key = Object.keys(CLASSIFICATION_CONFIG).find(
    k => k.toLowerCase() === classification.toLowerCase()
  );
  return CLASSIFICATION_CONFIG[key] || {
    icon: '📋',
    label: classification,
    color: '#6b7280',
    bgColor: '#f9fafb',
    borderColor: '#e5e7eb',
    description: 'Analysis complete',
  };
}

function getRiskLevel(score) {
  if (score >= 70) return { label: 'High Risk', color: '#dc2626', bgColor: '#fef2f2' };
  if (score >= 40) return { label: 'Moderate Risk', color: '#f59e0b', bgColor: '#fffbeb' };
  return { label: 'Low Risk', color: '#22c55e', bgColor: '#f0fdf4' };
}

function getConfidenceLabel(score) {
  if (score >= 80) return 'High Confidence';
  if (score >= 50) return 'Medium Confidence';
  return 'Low Confidence';
}

function getConfidenceColor(score) {
  if (score >= 80) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#dc2626';
}

function AiResponseDisplay({ analysisResult, isLoading, error, onClear, audioUrl }) {
  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="ai-response-card ai-loading" role="status" aria-label="Analyzing">
        <div className="ai-thinking">
          <div className="ai-thinking-orb" />
          <div className="ai-thinking-orb" style={{ animationDelay: '0.2s' }} />
          <div className="ai-thinking-orb" style={{ animationDelay: '0.4s' }} />
        </div>
        <div className="ai-thinking-text">
          <span className="ai-thinking-label">AI is analyzing your voice</span>
          <span className="ai-thinking-sub">Evaluating distress indicators...</span>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="ai-response-card ai-error" role="alert">
        <div className="ai-error-header">
          <span className="ai-error-icon">⚠️</span>
          <span className="ai-error-title">Analysis Failed</span>
        </div>
        <p className="ai-error-message">
          We couldn't complete the voice analysis. Please try again.
        </p>
        {onClear && (
          <button className="ai-retry-button" onClick={onClear} type="button">
            Try Again
          </button>
        )}
      </div>
    );
  }

  // --- No data ---
  if (!analysisResult && !audioUrl) {
    return null;
  }

  const result = analysisResult || {};
  const classification = result.classification || '';
  const riskScore = result.risk_score ?? 0;
  const confidenceScore = result.confidence_score ?? null;
  const category = result.category || '';
  const summary = result.summary || '';
  const recommendations = Array.isArray(result.recommendations) ? result.recommendations : [];
  const sendAlert = result.send_alert || result.alert_triggered || false;
  const transcription = result.transcription || '';

  const classConfig = getClassificationConfig(classification);
  const riskLevel = getRiskLevel(riskScore);
  const categoryIcon = CATEGORY_ICONS[category] || '📋';

  return (
    <div className="ai-response-card" role="region" aria-label="AI Analysis Results">
      {/* Audio Preview */}
      {audioUrl && (
        <div className="ai-audio-preview">
          <span className="ai-audio-label">Recording</span>
          <audio src={audioUrl} controls className="ai-audio-player" />
        </div>
      )}

      {/* Classification Badge */}
      <div
        className="ai-classification-badge"
        style={{
          backgroundColor: classConfig.bgColor,
          borderColor: classConfig.borderColor,
          color: classConfig.color,
        }}
      >
        <span className="ai-classification-icon">{classConfig.icon}</span>
        <div className="ai-classification-text">
          <span className="ai-classification-label">{classConfig.label}</span>
          <span className="ai-classification-desc">{classConfig.description}</span>
        </div>
      </div>

      {/* Risk Score + Confidence Row */}
      <div className="ai-metrics-row">
        {/* Risk Score Gauge */}
        <div className="ai-metric-card ai-risk-gauge">
          <div className="ai-gauge-ring" style={{ '--gauge-color': riskLevel.color }}>
            <svg viewBox="0 0 36 36" className="ai-gauge-svg">
              <path
                className="ai-gauge-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="#e5e7eb" strokeWidth="3"
              />
              <path
                className="ai-gauge-fill"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke={riskLevel.color} strokeWidth="3"
                strokeDasharray={`${riskScore}, 100`}
              />
            </svg>
            <span className="ai-gauge-value" style={{ color: riskLevel.color }}>
              {riskScore}
            </span>
          </div>
          <div className="ai-metric-info">
            <span className="ai-metric-label">Risk Score</span>
            <span className="ai-metric-badge" style={{ backgroundColor: riskLevel.bgColor, color: riskLevel.color }}>
              {riskLevel.label}
            </span>
          </div>
        </div>

        {/* Confidence Score */}
        {confidenceScore !== null && (
          <div className="ai-metric-card ai-confidence">
            <div className="ai-confidence-bar-container">
              <div
                className="ai-confidence-bar"
                style={{
                  width: `${confidenceScore}%`,
                  backgroundColor: getConfidenceColor(confidenceScore),
                }}
              />
            </div>
            <div className="ai-metric-info">
              <span className="ai-metric-label">Confidence</span>
              <span className="ai-metric-value" style={{ color: getConfidenceColor(confidenceScore) }}>
                {confidenceScore}%
              </span>
              <span className="ai-metric-sub">{getConfidenceLabel(confidenceScore)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Category */}
      {category && (
        <div className="ai-category-row">
          <span className="ai-category-icon">{categoryIcon}</span>
          <div className="ai-category-info">
            <span className="ai-category-label">Category</span>
            <span className="ai-category-value">{category}</span>
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="ai-summary">
          <span className="ai-summary-icon">💬</span>
          <p className="ai-summary-text">{summary}</p>
        </div>
      )}

      {/* Transcription */}
      {transcription && (
        <div className="ai-transcription">
          <span className="ai-section-label">What was said</span>
          <p className="ai-transcription-text">"{transcription}"</p>
        </div>
      )}

      {/* Recommendations Checklist */}
      {recommendations.length > 0 && (
        <div className="ai-recommendations">
          <span className="ai-section-label">Recommendations</span>
          <ul className="ai-checklist">
            {recommendations.map((rec, i) => (
              <li key={i} className="ai-checklist-item">
                <span className="ai-check-icon" aria-hidden="true">✓</span>
                <span className="ai-check-text">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alert Status */}
      {sendAlert && (
        <div className="ai-alert-banner" role="alert">
          <div className="ai-alert-banner-inner">
            <span className="ai-alert-icon">🚨</span>
            <div className="ai-alert-content">
              <span className="ai-alert-title">Emergency Alert Sent</span>
              <span className="ai-alert-desc">
                Your emergency contacts have been notified via Telegram.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Clear Button */}
      {onClear && (
        <button className="ai-clear-button" onClick={onClear} type="button">
          Dismiss Results
        </button>
      )}
    </div>
  );
}

export default AiResponseDisplay;