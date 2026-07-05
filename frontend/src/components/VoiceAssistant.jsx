import React, { useEffect, useRef, useCallback, useState } from 'react';
import wakeWordService from '../services/wakeWordService';
import microphoneService from '../services/microphoneService';
import LiveTranscription from './LiveTranscription';
import AlertStatus from './AlertStatus';
import ConversationHistory from './ConversationHistory';
import useVoiceState from '../hooks/useVoiceState';
import useVoiceRecording from '../hooks/useVoiceRecording';

function VoiceAssistant({ triggerWords, onTriggerWordsChange }) {
  const voiceState = useVoiceState();
  const wakeWordCooldownRef = useRef(0);
  const speechUtteranceRef = useRef(null);
  const permissionRequestedRef = useRef(false);
  const isInitializedRef = useRef(false);
  const manualStopRef = useRef(false); // Track if user manually stopped recording
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const recordingRef = useRef(null);
  const onWakeWordDetectedRef = useRef(null);
  const restartWakeWordRef = useRef(null);

  // Define onWakeWordDetected BEFORE useVoiceRecording to avoid circular dependency
  const onWakeWordDetected = useCallback(() => {
    const now = Date.now();
    if (now - wakeWordCooldownRef.current < 5000) {
      console.log('Wake word detected but in cooldown period');
      return;
    }

    console.log('✅ Wake word detected! Starting recording...');
    wakeWordCooldownRef.current = now;
    
    // Stop wake word service immediately to prevent re-detection
    wakeWordService.stop();
    
    voiceState.transitionTo('wake_word');

    setTimeout(() => {
      recordingRef.current?.startRecording();
    }, 500);
  }, [voiceState]);

  // Update the ref whenever onWakeWordDetected changes
  useEffect(() => {
    onWakeWordDetectedRef.current = onWakeWordDetected;
    console.log('🔄 onWakeWordDetected ref updated');
  }, [onWakeWordDetected]);

  const speakResponse = useCallback((text) => {
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported in this browser');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      console.log('✅ TTS completed, returning to wake-word listening...');
      restartWakeWordRef.current?.();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      restartWakeWordRef.current?.();
    };

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const recording = useVoiceRecording({
    onStateChange: voiceState.transitionTo,
    speakResponse,
  });
  
  // Keep recording ref updated
  useEffect(() => {
    recordingRef.current = recording;
    console.log('🔄 recording ref updated');
  }, [recording]);

  const requestPermission = useCallback(async () => {
    if (permissionRequestedRef.current) return;
    
    try {
      permissionRequestedRef.current = true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionStatus('granted');
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setPermissionStatus('denied');
      voiceState.transitionTo('error');
    }
  }, [voiceState]);

  const initContinuousListening = useCallback(async () => {
    if (isInitializedRef.current) return;
    
    // Get active trigger words - must come from backend, no fallback
    const activeWords = triggerWords && triggerWords.length > 0 
      ? triggerWords 
      : [];
    
    if (activeWords.length === 0) {
      console.log('No trigger words available, skipping initialization');
      return;
    }

    try {
      // Use the callback directly, not the ref
      wakeWordService.initialize(activeWords, onWakeWordDetected);
      wakeWordService.start();
      isInitializedRef.current = true;
      console.log('✅ Wake word service started');
    } catch (err) {
      console.error('Wake word init error:', err);
      voiceState.transitionTo('error');
    }
  }, [triggerWords, onWakeWordDetected, voiceState]);

  const restartWakeWord = useCallback(() => {
    console.log('🔄 Restarting wake word service...');
    recordingRef.current?.restartListeningCycle();

    try {
      if (wakeWordService && !wakeWordService.isRunning) {
        wakeWordService.start();
      }
    } catch (err) {
      console.error('Failed to restart wake word service:', err);
    }
  }, []);

  // Update the ref whenever restartWakeWord changes
  useEffect(() => {
    restartWakeWordRef.current = restartWakeWord;
  }, [restartWakeWord]);

  useEffect(() => {
    requestPermission();
    
    if (permissionStatus === 'granted') {
      initContinuousListening();
    }

    return () => {
      console.log('🧹 Cleaning up VoiceAssistant...');
      wakeWordService.stop();
      wakeWordService.abort();
      window.speechSynthesis?.cancel();
      manualStopRef.current = false;
    };
  }, [permissionStatus, initContinuousListening, requestPermission]);

  // Note: Trigger words are now managed by VoiceAssistantPage.jsx
  // The wakeWordService is initialized and restarted there

  const handleMicClick = () => {
    if (recording.isRecording) {
      // User manually stopped recording
      manualStopRef.current = true;
      recording.stopRecording();
    } else {
      // User started recording, reset manual stop flag
      manualStopRef.current = false;
      recording.startRecording();
    }
  };

  const isMicDisabled = voiceState.state === 'processing' ||
    voiceState.state === 'uploading' ||
    voiceState.state === 'alert_sent';

  const getHintText = () => {
    if (permissionStatus === 'denied') {
      return 'Microphone permission denied. Please allow access in browser settings.';
    }
    if (permissionStatus === 'unknown') {
      return 'Requesting microphone permission...';
    }
    if (recording.isRecording) {
      return 'Listening... Tap to stop';
    }
    if (voiceState.state === 'idle') {
      const words = triggerWords && triggerWords.length > 0 ? triggerWords : [];
      const displayedTrigger = words.length > 0 ? words[0] : 'No trigger set';
      console.log("Displayed trigger:", displayedTrigger);
      if (words.length === 0) {
        return 'No trigger word configured. Go to Safety Settings to add one.';
      }
      return `Listening... Waiting for "${words.join('" or "')}"`;
    }
    if (voiceState.state === 'wake_word') {
      return 'Wake word detected! Recording...';
    }
    if (voiceState.state === 'uploading') {
      return 'Uploading audio...';
    }
    if (voiceState.state === 'processing') {
      return 'AI is analyzing...';
    }
    if (voiceState.state === 'safe') {
      return 'You are safe ✓';
    }
    if (voiceState.state === 'emergency') {
      return '🚨 Distress detected!';
    }
    if (voiceState.state === 'alert_sent') {
      return 'Alert sent ✓';
    }
    if (voiceState.state === 'error') {
      return 'Error occurred. Please refresh the page.';
    }
    return 'Processing...';
  };

  return (
    <div className="voice-assistant">
      {/* Signature Experience - Assistant Orb */}
      <div className="assistant-display">
        <div className={`assistant-core ${voiceState.state || 'idle'}`}>
          <span className="assistant-icon">
            {voiceState.state === 'idle' && '🛡️'}
            {voiceState.state === 'listening' && '👂'}
            {voiceState.state === 'wake_word' && '⚡'}
            {voiceState.state === 'recording' && '🔴'}
            {voiceState.state === 'processing' && '🧠'}
            {voiceState.state === 'safe' && '✓'}
            {voiceState.state === 'emergency' && '🚨'}
            {voiceState.state === 'alert_sent' && '✅'}
            {voiceState.state === 'error' && '!'}
          </span>
        </div>
        <span className="assistant-status-text">{getHintText()}</span>
      </div>

      {/* Live Transcription */}
      <LiveTranscription
        interimTranscript={recording.interimTranscript}
        finalTranscript={recording.finalTranscript}
        displayTranscript={recording.displayTranscript}
        isListening={recording.isSpeechListening}
        isSilent={recording.isSilent}
        recognitionError={recording.recognitionError}
        isRecording={recording.isRecording}
        onClear={recording.clearResults}
        aiResponse={recording.aiResponse}
        aiResponseType={recording.aiResponseType}
      />

      {/* Loading State */}
      {recording.loading && voiceState.state === 'processing' && (
        <div className="loading-indicator">
          <div className="loading-dots">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
          <span>AI Analysis in progress</span>
        </div>
      )}

      {/* Alert Status Banner */}
      <AlertStatus
        status={recording.alertStatus}
        sentAt={recording.alertSentAt}
        recipients={recording.alertRecipients}
        incidentInfo={recording.alertIncident}
        deliveryError={recording.alertDeliveryError}
        onDismiss={recording.clearResults}
      />

      {/* Conversation History */}
      <ConversationHistory 
        history={recording.conversationHistory}
        onExport={recording.exportHistory}
        onClear={recording.clearHistory}
      />
    </div>
  );
}

export default VoiceAssistant;