import React, { useState, memo } from 'react';

function ConversationCard({ entry }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="conversation-card">
      <div className="conversation-header" onClick={toggleExpand} style={{ cursor: 'pointer' }}>
        <span className="conversation-timestamp">
          {new Date(entry.timestamp).toLocaleString()}
        </span>
        <span className={`alert-status ${entry.alert_status}`}>
          {entry.alert_status === 'success' ? 'Alert Sent' : 'No Alert'}
        </span>
      </div>
      
      <div className="conversation-content">
        <p className="conversation-transcript">"{entry.transcript}"</p>
        <div className="conversation-meta">
          <span className="conversation-classification">{entry.classification}</span>
          <span className="conversation-risk">Risk: {entry.risk_score}</span>
        </div>
        
        {isExpanded && (
          <div className="conversation-expanded">
            {entry.summary && (
              <p className="conversation-summary">{entry.summary}</p>
            )}
            {entry.recommendations && entry.recommendations.length > 0 && (
              <ul className="conversation-recommendations">
                {entry.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            )}
            {entry.confidence_score !== null && (
              <p className="conversation-confidence">Confidence: {entry.confidence_score}</p>
            )}
            {entry.category && (
              <p className="conversation-category">Category: {entry.category}</p>
            )}
            {entry.audioUrl && (
              <div className="conversation-audio">
                <audio src={entry.audioUrl} controls className="audio-player" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ConversationCard);
