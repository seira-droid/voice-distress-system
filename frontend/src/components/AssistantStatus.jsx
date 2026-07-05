import React from 'react';

function AssistantStatus({ config, microphoneStatus, wakeWordStatus }) {
  const pulseClass = config.animated ? 'pulse-animation' : '';

  return (
    <div className="assistant-status" role="status" aria-live="polite">
      <div
        className={`status-indicator ${pulseClass}`}
        style={{
          '--status-color': config.color,
          backgroundColor: config.color,
        }}
      >
        <span className="status-icon" aria-hidden="true">{config.icon}</span>
      </div>

      <div className="status-text">
        <span className="status-label" style={{ color: config.color }}>
          {config.label}
        </span>
        <span className="status-message">{config.message}</span>
      </div>

      <div className="debug-status" aria-hidden="true">
        <span className="debug-item">{microphoneStatus}</span>
        <span className="debug-item">{wakeWordStatus}</span>
      </div>
    </div>
  );
}

export default AssistantStatus;