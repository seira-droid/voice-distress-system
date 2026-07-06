import React from 'react';

function AnimatedMic({ state, isRecording, onClick, disabled }) {
  const buttonClass = [
    'mic-button',
    `state-${state}`,
    isRecording ? 'recording' : '',
    disabled ? 'disabled' : '',
  ].filter(Boolean).join(' ');

  const renderIcon = () => {
    switch (state) {
      case 'idle':
        return '🎙️';
      case 'wake_word':
        return '🔊';
      case 'recording':
        return '⏹️';
      case 'uploading':
        return '📤';
      case 'processing':
        return '🔄';
      case 'safe':
        return '✅';
      case 'emergency':
        return '🚨';
      case 'alert_sent':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '🎙️';
    }
  };

  return (
    <button
      className={buttonClass}
      onClick={onClick}
      disabled={disabled}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      aria-pressed={isRecording}
      type="button"
    >
      {/* Expanding ripple rings - shown during wake_word, recording, emergency */}
      {(state === 'wake_word' || state === 'recording' || state === 'emergency') && (
        <div className="mic-ripples" aria-hidden="true">
          <div className="ripple-ring" style={{ animationDelay: '0s' }} />
          <div className="ripple-ring" style={{ animationDelay: '0.6s' }} />
          <div className="ripple-ring" style={{ animationDelay: '1.2s' }} />
        </div>
      )}

      {/* Sound wave bars - shown during recording */}
      {state === 'recording' && (
        <div className="sound-waves" aria-hidden="true">
          <span className="wave-bar" style={{ animationDelay: '0s' }} />
          <span className="wave-bar" style={{ animationDelay: '0.1s' }} />
          <span className="wave-bar" style={{ animationDelay: '0.2s' }} />
          <span className="wave-bar" style={{ animationDelay: '0.3s' }} />
          <span className="wave-bar" style={{ animationDelay: '0.4s' }} />
          <span className="wave-bar" style={{ animationDelay: '0.5s' }} />
          <span className="wave-bar" style={{ animationDelay: '0.6s' }} />
        </div>
      )}

      {/* Spinning ring - shown during uploading/processing */}
      {(state === 'uploading' || state === 'processing') && (
        <div className="mic-spinner-ring" aria-hidden="true">
          <div className="spinner-segment" />
          <div className="spinner-segment" />
          <div className="spinner-segment" />
        </div>
      )}

      {/* Success burst - shown during safe/alert_sent */}
      {(state === 'safe' || state === 'alert_sent') && (
        <div className="success-burst" aria-hidden="true">
          <div className="burst-particle" style={{ '--angle': '0deg' }} />
          <div className="burst-particle" style={{ '--angle': '45deg' }} />
          <div className="burst-particle" style={{ '--angle': '90deg' }} />
          <div className="burst-particle" style={{ '--angle': '135deg' }} />
          <div className="burst-particle" style={{ '--angle': '180deg' }} />
          <div className="burst-particle" style={{ '--angle': '225deg' }} />
          <div className="burst-particle" style={{ '--angle': '270deg' }} />
          <div className="burst-particle" style={{ '--angle': '315deg' }} />
        </div>
      )}

      {/* Error shake overlay */}
      {state === 'error' && (
        <div className="error-overlay" aria-hidden="true">
          <div className="error-lightning" />
        </div>
      )}

      {/* Main icon */}
      <span className="mic-icon" role="img" aria-hidden="true">
        {renderIcon()}
      </span>
    </button>
  );
}

export default AnimatedMic;
