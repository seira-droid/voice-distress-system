import wakeWordService from "./services/wakeWordService";
import { useState, useRef, useEffect } from 'react';
import microphoneService from './services/microphoneService';

const API_BASE = 'https://voice-distress-system.onrender.com';

function App() {
  const [activeTab, setActiveTab] = useState('record');

  // Recording states
  const [wakeWordStatus, setWakeWordStatus] = useState("🟢 Waiting for wake word...");
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [riskScore, setRiskScore] = useState(null);
  const [alertSent, setAlertSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [microphoneStatus, setMicrophoneStatus] = useState('');
  const [voiceFeatures, setVoiceFeatures] = useState(null);

  // Other data
  const [contacts, setContacts] = useState([]);
  const [triggerWord, setTriggerWord] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const wakeWordCooldownRef = useRef(0);
  const speechUtteranceRef = useRef(null);

  // Restart listening cycle after TTS completes
  const restartListeningCycle = () => {
    // Reset recording state safely
    if (isRecording) {
      setIsRecording(false);
    }

    // Ensure MediaRecorder is not active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.warn('Error stopping MediaRecorder during restart:', err);
      }
    }

    // Clear audio chunks for next recording
    audioChunksRef.current = [];

    // Restart wake word service
    try {
      if (wakeWordService && !wakeWordService.isRunning) {
        wakeWordService.start();
        setWakeWordStatus("🟢 Waiting for wake word...");
      }
    } catch (err) {
      console.error('Failed to restart wake word service:', err);
    }

    // Ensure microphone permissions are still active
    if (microphoneService && !microphoneService.isListening()) {
      microphoneService.startListening().then(() => {
        setMicrophoneStatus('🟢 Waiting for wake word...');
      }).catch((err) => {
        console.error('Microphone re-initialization failed:', err);
        setMicrophoneStatus('🔴 Microphone unavailable.');
      });
    }
  };

  // Text-to-Speech function for voice responses
  const speakResponse = (text) => {
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported in this browser');
      return;
    }

    // Cancel any ongoing speech to prevent overlapping
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    // When speech ends, automatically return to wake-word listening
    utterance.onend = () => {
      console.log('✅ TTS completed, returning to wake-word listening...');
      restartListeningCycle();
    };

    // Handle speech errors
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      // Still restart listening even if TTS fails
      restartListeningCycle();
    };

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Fetch initial data
  useEffect(() => {
    fetchContacts();
    fetchTriggerWord();

    const initializeWakeWord = async () => {
      try {
        const currentTriggerWord = triggerWord || "hey guardian";
        
        wakeWordService.initialize(currentTriggerWord, () => {
          // Cooldown check: prevent duplicate triggering within 5 seconds
          const now = Date.now();
          if (now - wakeWordCooldownRef.current < 5000) {
            console.log('Wake word detected but in cooldown period');
            return;
          }
          
          console.log('✅ Wake word detected! Starting recording...');
          wakeWordCooldownRef.current = now;
          setWakeWordStatus("✅ Wake word detected!");
          
          // Automatically trigger recording
          startRecording();
        });

        wakeWordService.start();
        setWakeWordStatus("🟢 Waiting for wake word...");
      } catch (err) {
        console.error(err);
        setWakeWordStatus("❌ Speech recognition unavailable");
      }
    };

    const initializeMicrophone = async () => {
      try {
        await microphoneService.startListening();
        setMicrophoneStatus('🟢 Waiting for wake word...');
      } catch (err) {
        console.error('Microphone initialization failed:', err);
        setMicrophoneStatus('🔴 Microphone unavailable.');
      }
    };

    initializeWakeWord();
    initializeMicrophone();

    return () => {
      wakeWordService.stop();
      microphoneService.stopListening();
    };
  }, []);

  // Re-initialize wake word when trigger word changes
  useEffect(() => {
    if (!triggerWord) {
      return;
    }

    const updateWakeWord = async () => {
      try {
        wakeWordService.stop();
        
        wakeWordService.initialize(triggerWord, () => {
          // Cooldown check: prevent duplicate triggering within 5 seconds
          const now = Date.now();
          if (now - wakeWordCooldownRef.current < 5000) {
            console.log('Wake word detected but in cooldown period');
            return;
          }
          
          console.log('✅ Wake word detected! Starting recording...');
          wakeWordCooldownRef.current = now;
          setWakeWordStatus("✅ Wake word detected!");
          
          // Automatically trigger recording
          startRecording();
        });

        wakeWordService.start();
        setWakeWordStatus("🟢 Waiting for wake word...");
      } catch (err) {
        console.error('Failed to update wake word:', err);
        setWakeWordStatus("❌ Speech recognition unavailable");
      }
    };

    updateWakeWord();
  }, [triggerWord]);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/emergency-contacts/`);
      const data = await response.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch contacts", err);
    }
  };

  const fetchTriggerWord = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/trigger-word/`);
      const data = await response.json();
      setTriggerWord(data.trigger_word || 'Not set');
    } catch (err) {
      console.error("Failed to fetch trigger word", err);
    }
  };

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        await analyzeAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone error:", err);
      setError("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const analyzeAudio = async (audioBlob) => {
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('trigger_phrase_detected', 'true');

    try {
      const response = await fetch(`${API_BASE}/api/v1/voice/record-analyze/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Backend Error:", errorData);
        setError(`Server Error ${response.status}`);
        return;
      }

      const result = await response.json();
      
      // Update UI with ONLY backend response values
      setTranscription(result.transcription || 'No transcription available');
      setRiskScore(result.risk_score || 0);
      setAlertSent(result.alert_triggered || result.send_alert || false);
      setVoiceFeatures(result.voice_features || null);

      // Voice response based on risk assessment
      const risk = result.risk_score || 0;
      const isAlert = result.alert_triggered || result.send_alert || false;
      
      if (isAlert) {
        speakResponse("I detected a high-risk situation. Emergency protocols may be activated.");
      } else if (risk >= 40 && risk < 70) {
        speakResponse("I hear distress in your voice. Are you okay?");
      } else if (risk < 40) {
        speakResponse("You are safe. I'm here if you need anything.");
      }

    } catch (err) {
      console.error(err);
      setError("Connection failed.");
    } finally {
      setLoading(false);
    }
  };
  const clearResults = () => {
    setAudioUrl(null);
    setTranscription('');
    setRiskScore(null);
    setAlertSent(false);
    setError('');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚨 Voice Distress System</h1>
      <p>AI-Powered Emergency Voice Alert</p>
      <p style={{ margin: '8px 0 0' }}>{microphoneStatus}</p>

      <div style={{ margin: '20px 0', display: 'flex', gap: '10px', borderBottom: '1px solid #ccc' }}>
        <button onClick={() => setActiveTab('record')} style={activeTab === 'record' ? tabStyleActive : tabStyle}>🎤 Record Voice</button>
        <button onClick={() => setActiveTab('contacts')} style={activeTab === 'contacts' ? tabStyleActive : tabStyle}>👥 Emergency Contacts ({contacts.length})</button>
        <button onClick={() => setActiveTab('trigger')} style={activeTab === 'trigger' ? tabStyleActive : tabStyle}>🔑 Trigger Word</button>
      </div>

      {activeTab === 'record' && (
        <div>
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            style={{
              padding: '15px 40px',
              fontSize: '20px',
              background: isRecording ? '#d32f2f' : '#388e3c',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              cursor: 'pointer',
              margin: '20px 0'
            }}
          >
            {isRecording ? '⏹️ Stop Recording' : '🎙️ Start Recording'}
          </button>

          {audioUrl && (
            <div style={{ margin: '15px 0' }}>
              <h3>Recording Preview</h3>
              <audio src={audioUrl} controls />
            </div>
          )}

          {loading && <p>🔄 Analyzing...</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}

          {riskScore !== null && (
            <div style={{ marginTop: '20px', padding: '20px', background: '#f0f8ff', borderRadius: '12px', border: '1px solid #90caf9' }}>
              <h2>Risk Score: <span style={{ color: riskScore > 80 ? 'red' : 'green', fontSize: '2em' }}>{riskScore}</span>/100</h2>
              <p><strong>Transcription:</strong> {transcription}</p>
              {alertSent && <p style={{ color: 'red', fontWeight: 'bold' }}>🚨 EMERGENCY ALERT SENT!</p>}
              <button onClick={clearResults}>Clear Results</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'contacts' && (
        <div>
          <h2>Emergency Contacts</h2>
          {contacts.length === 0 ? <p>No contacts yet.</p> : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {contacts.map((c, i) => (
                <li key={i} style={{ padding: '10px', background: '#f9f9f9', margin: '5px 0', borderRadius: '6px' }}>
                  {c.name || 'Contact'} — {c.phone || c.email}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'trigger' && (
        <div>
          <h2>Current Trigger Phrase</h2>
          <p style={{ fontSize: '1.3em', fontWeight: 'bold' }}>{triggerWord}</p>
        </div>
      )}
    </div>
  );
}

const tabStyle = { padding: '10px 20px', cursor: 'pointer', background: '#f0f0f0', border: 'none', borderRadius: '6px 6px 0 0' };
const tabStyleActive = { ...tabStyle, background: '#1976d2', color: 'white' };

export default App;