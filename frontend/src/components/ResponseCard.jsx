import React from 'react';

function ResponseCard({ riskScore, transcription, alertSent, audioUrl, voiceFeatures, onClear, isLoading, error }) {
  if (isLoading) {
    return (
      <div className="response-card loading-card">
        <div className="response-loading">
          <div className="loading-spinner" />
          <span>Analyzing your voice...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="response-card error-card" role="alert">
        <div className="response-header error-header">
          <span className="response-icon">⚠️</span>
          <span className="response-title">Error</span>
        </div>
        <p className="response-text">{error}</p>
      </div>
    );
  }

  if (riskScore === null && !alertSent) {
    return null;
  }

  const riskLevel = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'moderate' : 'low';
  const riskColor = riskScore >= 70 ? '#dc2626' : riskScore >= 40 ? '#f59e0b' : '#22c55e';

  return (
    <div className={`response-card ${riskLevel}-risk`}>
      {audioUrl && (
        <div className="response-audio">
          <h4 className="response-section-title">Recording Preview</h4>
          <audio src={audioUrl} controls className="audio-player" />
        </div>
      )}

      <div className="response-score">
        <div className="score-ring" style={{ '--score-color': riskColor }}>
          <svg viewBox="0 0 36 36" className="score-svg">
            <path
              className="score-bg"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="3"
            />
            <path
              className="score-fill"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={riskColor}
              strokeWidth="3"
              strokeDasharray={`${riskScore}, 100`}
            />
          </svg>
          <span className="score-value" style={{ color: riskColor }}>
            {riskScore}
          </span>
        </div>
        <div className="score-details">
          <h3 className="score-label" style={{ color: riskColor }}>
            Risk Score
          </h3>
          <p className="score-level">
            {riskLevel === 'high' ? '🚨 High Risk' : riskLevel === 'moderate' ? '⚡ Moderate Risk' : '✅ Low Risk'}
          </p>
        </div>
      </div>

      {transcription && (
        <div className="response-transcription">
          <h4 className="response-section-title">Transcription</h4>
          <p className="transcription-text">"{transcription}"</p>
        </div>
      )}

      {alertSent && (
        <div className="response-alert-banner" role="alert">
          <span className="alert-banner-icon">🚨</span>
          <span className="alert-banner-text">Emergency Alert Sent to Contacts!</span>
        </div>
      )}

      {voiceFeatures && (
        <div className="response-features">
          <h4 className="response-section-title">Voice Features</h4>
          <div className="features-grid">
            {Object.entries(voiceFeatures).slice(0, 4).map(([key, value]) => (
              <div key={key} className="feature-item">
                <span className="feature-key">{key.replace(/_/g, ' ')}</span>
                <span className="feature-value">{typeof value === 'number' ? value.toFixed(3) : String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="clear-button" onClick={onClear} type="button">
        Clear Results
      </button>
    </div>
  );
}

export default ResponseCard;