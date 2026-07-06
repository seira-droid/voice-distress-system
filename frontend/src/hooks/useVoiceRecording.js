import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import microphoneService from '../services/microphoneService';
import useSpeechRecognition from './useSpeechRecognition';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');
const API_TIMEOUT_MS = 30000; // 30 second timeout for API requests

let conversationIdCounter = 0;

// Check if browser supports required APIs
const checkBrowserSupport = () => {
  const support = {
    mediaRecorder: !!(window.MediaRecorder && window.MediaRecorder.isTypeSupported('audio/webm')),
    speechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
  };
  return support;
};

export function useVoiceRecording({ onStateChange, speakResponse }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcription, setTranscription] = useState('');
  const [riskScore, setRiskScore] = useState(null);
  const [alertSent, setAlertSent] = useState(false);
  const [voiceFeatures, setVoiceFeatures] = useState(null);
  const [aiResponse, setAiResponse] = useState('');
  const [aiResponseType, setAiResponseType] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const currentAudioUrlRef = useRef(null);
  const currentStreamRef = useRef(null);
  const isAnalyzingRef = useRef(false);
  const previousAudioUrlRef = useRef(null);
  const timeoutRef = useRef(null);

  // Live speech recognition for progressive transcription
  const speechRec = useSpeechRecognition({ continuous: false, interimResults: true });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up useVoiceRecording...');
      
      // Stop MediaRecorder
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
          if (mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          }
        } catch (err) {
          console.warn('Error cleaning up MediaRecorder:', err);
        }
        mediaRecorderRef.current = null;
      }

      // Stop stored stream
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach(track => track.stop());
        currentStreamRef.current = null;
      }

      // Clear audio chunks
      audioChunksRef.current = [];

      // Revoke audio URLs
      if (previousAudioUrlRef.current) {
        URL.revokeObjectURL(previousAudioUrlRef.current);
      }
      if (currentAudioUrlRef.current) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
      }

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Reset analyzing flag
      isAnalyzingRef.current = false;
    };
  }, []);

  // Cleanup previous audio URL when new one is set
  useEffect(() => {
    if (audioUrl && audioUrl !== previousAudioUrlRef.current) {
      if (previousAudioUrlRef.current) {
        URL.revokeObjectURL(previousAudioUrlRef.current);
      }
      previousAudioUrlRef.current = audioUrl;
    }
  }, [audioUrl]);

  // Memoize derived values to prevent unnecessary re-renders
  const alertStatus = useMemo(() => {
    if (!analysisResult) return null;
    return (analysisResult.send_alert || analysisResult.alert_triggered) ? 'success' : 'no-alert';
  }, [analysisResult]);

  const alertSentAt = useMemo(() => {
    return analysisResult?.sent_at || analysisResult?.timestamp || null;
  }, [analysisResult]);

  const alertRecipients = useMemo(() => {
    return analysisResult?.recipients || null;
  }, [analysisResult]);

  const alertIncident = useMemo(() => {
    if (!analysisResult) return null;
    return {
      classification: analysisResult.classification,
      riskScore: analysisResult.risk_score,
      category: analysisResult.category,
      summary: analysisResult.summary,
    };
  }, [analysisResult]);

  const alertDeliveryError = useMemo(() => {
    return analysisResult?.delivery_error || null;
  }, [analysisResult]);

  // --- Conversation History ---
  const addConversation = useCallback((result, transcriptText, audioUrlValue) => {
    const entry = {
      id: ++conversationIdCounter,
      timestamp: new Date().toISOString(),
      transcript: transcriptText || result.transcription || '',
      classification: result.classification || '',
      risk_score: result.risk_score ?? 0,
      confidence_score: result.confidence_score ?? null,
      category: result.category || '',
      summary: result.summary || '',
      recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
      send_alert: result.send_alert || result.alert_triggered || false,
      alert_status: (result.send_alert || result.alert_triggered) ? 'success' : 'no-alert',
      audioUrl: audioUrlValue || null,
    };

    setConversationHistory(prev => [entry, ...prev]);
  }, []);

  const clearHistory = useCallback(() => {
    setConversationHistory([]);
  }, []);

  const exportHistory = useCallback(() => {
    if (conversationHistory.length === 0) {
      setError('No conversation history to export.');
      return;
    }
    
    try {
      const data = JSON.stringify(conversationHistory, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      
      if (!blob || blob.size === 0) {
        setError('Failed to create export file. Please try again.');
        return;
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-history-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export history error:', err);
      setError('Failed to export conversation history. Please try again.');
    }
  }, [conversationHistory]);

  const clearResults = useCallback(() => {
    setAudioUrl(null);
    setTranscription('');
    setRiskScore(null);
    setAlertSent(false);
    setError('');
    setAiResponse('');
    setAiResponseType('');
    setAnalysisResult(null);
    speechRec.resetTranscript();
  }, [speechRec]);

  // Internal stop function - not exposed as dependency
  const internalStopRecording = useCallback(() => {
    console.log('🛑 Stopping recording and releasing all resources...');
    
    // Clear the timeout timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Stop MediaRecorder
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        // Stop all MediaStreamTracks from the MediaRecorder's stream
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => {
            console.log('Stopping MediaStreamTrack:', track.kind);
            track.stop();
          });
        }
      } catch (err) {
        console.warn('Error stopping MediaRecorder:', err);
      }
      // Don't set to null - let onstop callback handle it
    }

    // Stop all tracks from the stored stream reference
    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach(track => {
        console.log('Stopping stored MediaStreamTrack:', track.kind);
        track.stop();
      });
      currentStreamRef.current = null;
    }

    // Stop speech recognition immediately with abort
    if (speechRec.isListening) {
      console.log('Stopping speech recognition...');
      speechRec.stopListening();
    }

    // Update recording state (but NOT loading - onstop will handle that)
    setIsRecording(false);
    
    console.log('✅ Recording stopped, microphone released');
  }, [speechRec]);

  const startRecording = useCallback(async () => {
    // Prevent duplicate recording sessions
    if (isRecording || loading || isAnalyzingRef.current) {
      console.log('⚠️ Already recording or processing, ignoring start request');
      return;
    }

    // Check browser support
    const support = checkBrowserSupport();
    if (!support.getUserMedia) {
      setError('Microphone is not supported in this browser.');
      onStateChange?.('error');
      return;
    }
    if (!support.mediaRecorder) {
      setError('Audio recording is not supported in this browser.');
      onStateChange?.('error');
      return;
    }

    console.log('🎙️ Starting recording...');
    setError('');
    setAiResponse('');
    setAiResponseType('');
    setAnalysisResult(null);
    speechRec.resetTranscript();
    onStateChange?.('recording');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Check if MediaRecorder is available
      if (!window.MediaRecorder) {
        setError('Audio recording is not supported in this browser.');
        stream.getTracks().forEach(track => track.stop());
        onStateChange?.('error');
        return;
      }
      
      // Store stream reference for cleanup
      currentStreamRef.current = stream;
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        console.log('📦 Audio chunk received:', event.data.size, 'bytes');
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log('✅ MediaRecorder onstop callback executed');
        // Clean up the mediaRecorderRef
        mediaRecorderRef.current = null;
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log('📊 Audio blob created:', audioBlob.size, 'bytes');
          const url = URL.createObjectURL(audioBlob);
          currentAudioUrlRef.current = url;
          setAudioUrl(url);
          await analyzeAudio(audioBlob);
        } catch (blobErr) {
          console.error('Audio processing error:', blobErr);
          setError('Failed to process audio recording. Please try again.');
          onStateChange?.('error');
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      console.log('✅ MediaRecorder started');

      // Start live speech recognition for progressive transcription
      speechRec.startListening();

      // Set timeout to automatically stop recording after 10 seconds
      timeoutRef.current = setTimeout(() => {
        console.log('⏰ Recording timeout fired (10s max)');
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          internalStopRecording();
        }
      }, 10000);
    } catch (err) {
      console.error("Microphone error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission was denied. Please allow microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No microphone was found. Please connect a microphone and try again.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Microphone is already in use by another application.');
      } else {
        setError('Unable to access microphone. Please check your settings and try again.');
      }
      onStateChange?.('error');
    }
  }, [isRecording, loading, onStateChange, speechRec]);

  // Exposed stopRecording function
  const stopRecording = useCallback(() => {
    internalStopRecording();
  }, [internalStopRecording]);

  // Auto-stop recording on silence detection
  useEffect(() => {
    if (isRecording && speechRec.isSilent) {
      console.log('🔇 Silence detected, auto-stopping recording...');
      const silenceTimer = setTimeout(() => {
        if (isRecording && mediaRecorderRef.current?.state !== 'inactive') {
          internalStopRecording();
        }
      }, 1000); // Wait 1 second after silence to confirm
      return () => clearTimeout(silenceTimer);
    }
  }, [isRecording, speechRec.isSilent, internalStopRecording]);

  const analyzeAudio = useCallback(async (audioBlob) => {
    // Prevent duplicate API requests
    if (isAnalyzingRef.current) {
      return;
    }
    isAnalyzingRef.current = true;

    setLoading(true);
    setError('');
    onStateChange?.('uploading');

    // Validate audio blob
    if (!audioBlob || audioBlob.size === 0) {
      setError('No audio data available. Please try recording again.');
      onStateChange?.('error');
      setLoading(false);
      isAnalyzingRef.current = false;
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('trigger_phrase_detected', 'true');
    formData.append('transcript', speechRec.finalTranscript || speechRec.interimTranscript || '');

    try {
      onStateChange?.('processing');
      
      // Create timeout controller
      const controller = new AbortController();
      timeoutRef.current = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      
      const response = await fetch(`${API_BASE}/api/v1/voice/record-analyze/`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;

      if (!response.ok) {
        let errorMessage = `Server Error ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errorMessage = errorData.error;
          }
        } catch (parseErr) {
          // Response body couldn't be parsed, use default message
        }
        setError(errorMessage);
        onStateChange?.('error');
        return;
      }

      const result = await response.json();

      // Validate response structure
      if (!result || typeof result !== 'object') {
        setError('Invalid response from server. Please try again.');
        onStateChange?.('error');
        return;
      }

      // Store the full backend analysis result for AiResponseDisplay
      setAnalysisResult(result);

      // Update UI with ONLY backend response values
      setTranscription(result.transcription || 'No transcription available');
      setRiskScore(result.risk_score || 0);
      setAlertSent(result.alert_triggered || result.send_alert || false);
      setVoiceFeatures(result.voice_features || null);

      // Add to conversation history with the live transcript that was accumulated
      addConversation(result, speechRec.finalTranscript || result.transcription, currentAudioUrlRef.current);

      // Voice response based on risk assessment
      const risk = result.risk_score || 0;
      const isAlert = result.alert_triggered || result.send_alert || false;

      if (isAlert) {
        onStateChange?.('emergency');
        setAiResponseType('emergency');
        setAiResponse("I detected a high-risk situation. Emergency protocols may be activated.");
        // Short delay to show emergency state before transitioning
        setTimeout(() => {
          onStateChange?.('alert_sent');
          speakResponse?.("I detected a high-risk situation. Emergency protocols may be activated.");
        }, 1500);
      } else if (risk >= 40 && risk < 70) {
        onStateChange?.('safe');
        setAiResponseType('moderate');
        setAiResponse("I hear distress in your voice. Are you okay?");
        speakResponse?.("I hear distress in your voice. Are you okay?");
      } else {
        onStateChange?.('safe');
        setAiResponseType('safe');
        setAiResponse("You are safe. I'm here if you need anything.");
        speakResponse?.("You are safe. I'm here if you need anything.");
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Request timed out. The server is taking too long to respond. Please try again.');
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Unable to connect to server. Please check your network connection.');
      } else {
        setError('Connection failed. Please check your network and try again.');
      }
      onStateChange?.('error');
    } finally {
      setLoading(false);
      isAnalyzingRef.current = false;
    }
  }, [onStateChange, speakResponse, addConversation, speechRec]);

  const restartListeningCycle = useCallback(() => {
    console.log('🔄 Restarting listening cycle...');
    
    if (isRecording) {
      setIsRecording(false);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.warn('Error stopping MediaRecorder during restart:', err);
      }
      mediaRecorderRef.current = null;
    }

    // Clear stored stream
    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach(track => track.stop());
      currentStreamRef.current = null;
    }

    audioChunksRef.current = [];
    speechRec.resetTranscript();
  }, [isRecording, speechRec]);

  return {
    isRecording,
    audioUrl,
    loading,
    error,
    transcription,
    riskScore,
    alertSent,
    voiceFeatures,
    aiResponse,
    aiResponseType,
    analysisResult,
    alertStatus,
    alertSentAt,
    alertRecipients,
    alertIncident,
    alertDeliveryError,
    startRecording,
    stopRecording,
    clearResults,
    restartListeningCycle,
    setError,
    // Conversation history
    conversationHistory,
    addConversation,
    clearHistory,
    exportHistory,
    // Live transcription
    interimTranscript: speechRec.interimTranscript,
    finalTranscript: speechRec.finalTranscript,
    displayTranscript: speechRec.displayTranscript,
    isSpeechListening: speechRec.isListening,
    isSilent: speechRec.isSilent,
    recognitionError: speechRec.recognitionError,
  };
}

export default useVoiceRecording;
