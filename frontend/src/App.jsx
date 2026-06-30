import { useState, useRef, useEffect } from 'react';

const API_BASE = 'https://voice-distress-system.onrender.com';

function App() {
  const [activeTab, setActiveTab] = useState('record');

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [riskScore, setRiskScore] = useState(null);
  const [alertSent, setAlertSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Other data
  const [contacts, setContacts] = useState([]);
  const [triggerWord, setTriggerWord] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Fetch initial data
  useEffect(() => {
    fetchContacts();
    fetchTriggerWord();
  }, []);

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
    formData.append('file', audioBlob, 'recording.webm');

    try {
      const response = await fetch(`${API_BASE}/api/v1/voice/analyze/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Backend Error:", errorData);
        setError(`Server Error: ${response.status}. Check backend.`);
        return;
      }

      const result = await response.json();
      setTranscription(result.transcription || result.text || 'No transcription');
      setRiskScore(result.risk_score || result.score || 0);
      setAlertSent(!!result.alert_sent);

    } catch (err) {
      console.error("Error:", err);
      setError("Failed to connect to backend.");
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