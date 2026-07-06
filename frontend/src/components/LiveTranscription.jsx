import React, { useEffect, useRef } from 'react';

/**
 * LiveTranscription Component
 *
 * Displays the user's speech progressively during recording:
 * - Shows interim (partial) results in real-time with a pulsing cursor
 * - Shows final (committed) results with a distinct style
 * - Auto-scrolls to keep the latest text visible
 * - Handles silence detection with a visual cue
 * - Handles recognition errors gracefully
 * - Differentiates between user speech and AI responses via className
 *
 * Props:
 *   interimTranscript  - Current partial transcript text
 *   finalTranscript    - Accumulated final transcript text
 *   displayTranscript  - Combined text for display
 *   isListening        - Whether speech recognition is active
 *   isSilent           - Whether no speech has been detected recently
 *   recognitionError   - Error message if recognition failed
 *   isRecording        - Whether MediaRecorder is active (to show placeholder)
 *   onClear            - Callback to clear transcript
 *   aiResponse         - AI response text to show after analysis
 *   aiResponseType     - Type of AI response: 'safe', 'moderate', 'emergency'
 */

function LiveTranscription({
  interimTranscript,
  finalTranscript,
  displayTranscript,
  isListening,
  isSilent,
  recognitionError,
  isRecording,
  onClear,
  aiResponse,
  aiResponseType,
}) {
  const scrollRef = useRef(null);
  const hasTranscript = displayTranscript && displayTranscript.length > 0;

  // Auto-scroll to bottom when new transcript comes in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayTranscript, interimTranscript, aiResponse]);

  // Nothing to show: not recording, no transcript, no error
  if (!isRecording && !hasTranscript && !recognitionError && !aiResponse) {
    return null;
  }

  const getAiResponseClass = () => {
    switch (aiResponseType) {
      case 'emergency': return 'ai-response-emergency';
      case 'moderate':  return 'ai-response-moderate';
      case 'safe':      return 'ai-response-safe';
      default:          return '';
    }
  };

  return (
    <div className="live-transcription" role="log" aria-live="polite" aria-label="Live transcription">
      {/* Header */}
      <div className="transcription-header">
        <span className="transcription-title">
          {isRecording ? '🎤 Live Transcription' : '📝 Transcript'}
        </span>
        {hasTranscript && (
          <button
            className="transcription-clear-btn"
            onClick={onClear}
            type="button"
            aria-label="Clear transcript"
            title="Clear transcript"
          >
            ✕
          </button>
        )}
      </div>

      {/* Transcript body */}
      <div className="transcription-body" ref={scrollRef}>

        {/* User speech area */}
        {hasTranscript && (
          <div className="transcript-user">
            <div className="transcript-label-row">
              <span className="transcript-speaker-label">You said</span>
            </div>
            <div className="transcript-text">
              {/* Final text */}
              {finalTranscript && (
                <span className="transcript-final">{finalTranscript} </span>
              )}
              {/* Interim text with cursor */}
              {interimTranscript && (
                <span className="transcript-interim">
                  {interimTranscript}
                  <span className="interim-cursor" aria-hidden="true">|</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Silence indicator */}
        {isRecording && isSilent && !interimTranscript && (
          <div className="transcript-silence">
            <span className="silence-dot" aria-hidden="true" />
            <span>No speech detected...</span>
          </div>
        )}

        {/* Recording placeholder when no words yet */}
        {isRecording && !hasTranscript && !isSilent && (
          <div className="transcript-listening">
            <span className="listening-dots" aria-hidden="true">
              <span className="ldot" /><span className="ldot" /><span className="ldot" />
            </span>
            <span>Listening...</span>
          </div>
        )}

        {/* Recognition error */}
        {recognitionError && (
          <div className="transcript-error" role="alert">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{recognitionError}</span>
          </div>
        )}

        {/* AI Response */}
        {aiResponse && (
          <div className={`transcript-ai-response ${getAiResponseClass()}`}>
            <div className="transcript-label-row">
              <span className="transcript-ai-label">Assistant</span>
            </div>
            <p className="transcript-ai-text">{aiResponse}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveTranscription;
