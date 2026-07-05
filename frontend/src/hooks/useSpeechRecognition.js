/**
 * useSpeechRecognition Hook
 *
 * Provides live (interim) transcription during recording using the Web Speech API.
 * Runs independently from the wake word service — this is for capturing the user's
 * speech progressively while they are recording.
 *
 * States: idle, listening (interim results flowing), finalizing, error
 *
 * Designed for future conversation history integration (Step 21).
 */

import { useState, useRef, useCallback, useEffect } from 'react';

const SILENCE_TIMEOUT_MS = 3000; // ms of no new speech before showing "silence detected" hint

export function useSpeechRecognition({ lang = 'en-US', continuous = false, interimResults = true } = {}) {
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState('');
  const [isSilent, setIsSilent] = useState(false);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const lastTranscriptRef = useRef('');

  // Clear silence timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setIsSilent(false);
  }, []);

  // Reset silence timer on new speech activity
  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      setIsSilent(true);
    }, SILENCE_TIMEOUT_MS);
  }, [clearSilenceTimer]);

  // Get browser SpeechRecognition
  const getSpeechRecognition = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      throw new Error('Speech Recognition is not supported in this browser.');
    }
    return SpeechRecognitionAPI;
  }, []);

  // Start listening for speech
  const startListening = useCallback(() => {
    setRecognitionError('');
    setInterimTranscript('');
    setIsSilent(false);
    lastTranscriptRef.current = '';

    try {
      const SpeechRecognitionAPI = getSpeechRecognition();
      const recognition = new SpeechRecognitionAPI();

      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = lang;

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript + ' ';
          } else {
            interim += result[0].transcript;
          }
        }

        // Build up final transcript progressively
        if (final) {
          setFinalTranscript(prev => {
            const updated = (prev + ' ' + final.trim()).trim();
            lastTranscriptRef.current = updated;
            return updated;
          });
        }

        // Show interim text
        if (interim) {
          setInterimTranscript(interim);
          resetSilenceTimer();
          setIsSilent(false);
        } else if (!final) {
          // No speech detected in this result
          resetSilenceTimer();
        }

        // Update the combined visible transcript
        lastTranscriptRef.current = final
          ? (lastTranscriptRef.current + ' ' + final).trim()
          : lastTranscriptRef.current;
      };

      recognition.onerror = (event) => {
        console.error('Live speech recognition error:', event.error);
        const errorMessages = {
          'no-speech': 'No speech detected. Please try again.',
          'aborted': 'Speech recognition was aborted.',
          'audio-capture': 'No microphone was found.',
          'network': 'Network error occurred.',
          'not-allowed': 'Microphone permission was denied.',
          'service-not-allowed': 'Speech service is not allowed.',
          'bad-grammar': 'Speech recognition grammar error.',
          'language-not-supported': 'Language is not supported.',
        };
        setRecognitionError(errorMessages[event.error] || `Recognition error: ${event.error}`);
      };

      recognition.onend = () => {
        // Recognition ended. If we have final text, commit it.
        // The service may auto-restart if continuous, but we let the parent control lifecycle.
        setIsListening(false);
        clearSilenceTimer();
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      resetSilenceTimer();

    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setRecognitionError(err.message || 'Failed to start speech recognition.');
      setIsListening(false);
    }
  }, [continuous, interimResults, lang, getSpeechRecognition, resetSilenceTimer, clearSilenceTimer]);

  // Stop listening and return the accumulated final transcript
  const stopListening = useCallback(() => {
    clearSilenceTimer();

    if (recognitionRef.current) {
      try {
        // Try abort first for immediate cessation
        if (typeof recognitionRef.current.abort === 'function') {
          recognitionRef.current.abort();
        }
        // Then stop
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Error stopping speech recognition:', err);
      }
      recognitionRef.current = null;
    }

    setIsListening(false);
    setInterimTranscript('');

    // Return the accumulated final transcript
    return lastTranscriptRef.current;
  }, [clearSilenceTimer]);

  // Reset all transcript state
  const resetTranscript = useCallback(() => {
    setInterimTranscript('');
    setFinalTranscript('');
    setRecognitionError('');
    setIsSilent(false);
    lastTranscriptRef.current = '';
  }, []);

  // Combined transcript (interim + final) for display
  const displayTranscript = interimTranscript
    ? (finalTranscript + ' ' + interimTranscript).trim()
    : finalTranscript;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        try { 
          if (typeof recognitionRef.current.abort === 'function') {
            recognitionRef.current.abort();
          }
          recognitionRef.current.stop(); 
        } catch (e) { /* ignore */ }
        recognitionRef.current = null;
      }
    };
  }, [clearSilenceTimer]);

  return {
    interimTranscript,
    finalTranscript,
    displayTranscript,
    isListening,
    isSilent,
    recognitionError,
    startListening,
    stopListening,
    resetTranscript,
  };
}

export default useSpeechRecognition;