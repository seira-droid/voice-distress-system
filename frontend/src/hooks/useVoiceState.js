/**
 * UI State Machine for the Voice Distress Assistant
 *
 * States: idle, wake_word, recording, uploading, processing, safe, emergency, alert_sent, error
 *
 * Transitions:
 *   idle -> wake_word (wake word detected)
 *   wake_word -> recording (auto-start recording)
 *   recording -> uploading (recording stopped)
 *   uploading -> processing (file uploaded)
 *   processing -> safe (low risk)
 *   processing -> emergency (high risk)
 *   safe -> idle (auto-return after delay)
 *   emergency -> alert_sent (alert triggered)
 *   alert_sent -> idle (auto-return after delay)
 *   any -> error (on failure)
 *   error -> idle (manual reset)
 */

import { useState, useCallback, useRef } from 'react';

const STATE_CONFIG = {
  idle: {
    icon: '🎧',
    label: 'Listening',
    message: 'Say the wake word to begin',
    color: '#6b7280',
    animated: false,
  },
  wake_word: {
    icon: '🔊',
    label: 'Wake Word Detected',
    message: 'I heard you — recording now...',
    color: '#f59e0b',
    animated: true,
  },
  recording: {
    icon: '🎙️',
    label: 'Recording',
    message: 'Listening... speak clearly',
    color: '#ef4444',
    animated: true,
  },
  uploading: {
    icon: '📤',
    label: 'Uploading',
    message: 'Sending audio for analysis',
    color: '#3b82f6',
    animated: true,
  },
  processing: {
    icon: '🔄',
    label: 'Analyzing',
    message: 'AI is analyzing your voice',
    color: '#8b5cf6',
    animated: true,
  },
  safe: {
    icon: '🛡️',
    label: 'You Are Safe',
    message: 'No distress detected. I\'m here if you need me.',
    color: '#22c55e',
    animated: false,
  },
  emergency: {
    icon: '🚨',
    label: 'Distress Detected',
    message: 'High risk detected — preparing alert...',
    color: '#dc2626',
    animated: true,
  },
  alert_sent: {
    icon: '✅',
    label: 'Alert Sent',
    message: 'Emergency contacts have been notified.',
    color: '#dc2626',
    animated: false,
  },
  error: {
    icon: '❌',
    label: 'Error',
    message: 'Something went wrong. Tap to retry.',
    color: '#dc2626',
    animated: false,
  },
};

const AUTO_RETURN_DELAY = 8000; // ms before returning to idle from safe/alert_sent

export function useVoiceState() {
  const [state, setState] = useState('idle');
  const [previousState, setPreviousState] = useState(null);
  const autoReturnTimer = useRef(null);

  const clearAutoReturn = useCallback(() => {
    if (autoReturnTimer.current) {
      clearTimeout(autoReturnTimer.current);
      autoReturnTimer.current = null;
    }
  }, []);

  const transitionTo = useCallback((newState) => {
    clearAutoReturn();
    setPreviousState((prev) => {
      // Don't track if same as new state
      return prev !== newState ? prev : null;
    });
    setState(newState);

    // Auto-return to idle for terminal states
    if (newState === 'safe' || newState === 'alert_sent') {
      autoReturnTimer.current = setTimeout(() => {
        setState('idle');
        setPreviousState(null);
      }, AUTO_RETURN_DELAY);
    }
  }, [clearAutoReturn]);

  const reset = useCallback(() => {
    clearAutoReturn();
    setPreviousState(state);
    setState('idle');
  }, [clearAutoReturn, state]);

  const canTransition = useCallback((targetState) => {
    const validTransitions = {
      idle: ['wake_word', 'error'],
      wake_word: ['recording', 'error'],
      recording: ['uploading', 'error'],
      uploading: ['processing', 'error'],
      processing: ['safe', 'emergency', 'error'],
      safe: ['idle', 'error'],
      emergency: ['alert_sent', 'error'],
      alert_sent: ['idle', 'error'],
      error: ['idle'],
    };
    return validTransitions[state]?.includes(targetState) ?? false;
  }, [state]);

  const config = STATE_CONFIG[state] || STATE_CONFIG.idle;

  return {
    state,
    previousState,
    config,
    transitionTo,
    reset,
    canTransition,
    STATE_CONFIG,
  };
}

export default useVoiceState;
