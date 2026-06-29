import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Shield,
  Phone,
  User,
  Trash2,
  Edit2,
  Plus,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Flame,
  FileText,
  MapPin,
  Settings,
  Send,
  Volume2
} from "lucide-react";

const API_BASE = "http://127.0.0.1:8000/api";

function Dashboard() {
  // Application State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [intensity, setIntensity] = useState(0);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [triggerWord, setTriggerWord] = useState("help");
  const [audioUrl, setAudioUrl] = useState(null);

  // System status: safe, monitor, emergency
  const [status, setStatus] = useState("safe");
  const [latestEvent, setLatestEvent] = useState(null);
  const [loading, setLoading] = useState(false);

  // CRUD States
  const [contacts, setContacts] = useState([]);
  const [history, setHistory] = useState([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  // Form States
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRelation, setContactRelation] = useState("");
  const [contactChatId, setContactChatId] = useState("");

  // Custom Scenario Text for manual simulation
  const [manualTranscript, setManualTranscript] = useState("");
  const [useManualMode, setUseManualMode] = useState(false);

  // Refs for Recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);

  // Speech Recognition Ref
  const recognitionRef = useRef(null);

  // ----------------------------------------------------
  // INITIAL LOAD
  // ----------------------------------------------------
  useEffect(() => {
    fetchContacts();
    fetchTriggerWord();
    requestGpsLocation();
    loadSampleHistory();
  }, []);

  // ----------------------------------------------------
  // GPS GEOLOCATION
  // ----------------------------------------------------
  const requestGpsLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn("GPS location permission denied or error occurred:", error);
          // Set standard fallback coordinates (San Francisco)
          setGpsLocation({ latitude: 37.7749, longitude: -122.4194 });
        }
      );
    }
  };

  // ----------------------------------------------------
  // API SERVICE CALLS
  // ----------------------------------------------------
  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API_BASE}/emergency-contacts/`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (err) {
      console.error("Error fetching emergency contacts:", err);
    }
  };

  const fetchTriggerWord = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/trigger-word/`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setTriggerWord(data[0].word || "help");
        }
      }
    } catch (err) {
      console.error("Error fetching trigger word:", err);
    }
  };

  const saveTriggerWord = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/trigger-word/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: triggerWord })
      });
      if (res.ok) {
        alert("Trigger word updated successfully.");
      }
    } catch (err) {
      console.error("Error updating trigger word:", err);
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactName || !contactPhone || !contactRelation) {
      alert("Please fill all required fields.");
      return;
    }

    const payload = {
      name: contactName,
      phone_number: contactPhone,
      relationship: contactRelation,
      telegram_chat_id: contactChatId,
      user_id: "00000000-0000-0000-0000-000000000000" // Placeholder UUID
    };

    try {
      let res;
      if (editingContact) {
        res = await fetch(`${API_BASE}/emergency-contacts/${editingContact.id}/`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE}/emergency-contacts/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        fetchContacts();
        resetContactForm();
      } else {
        const errData = await res.json();
        alert(`Error: ${JSON.stringify(errData)}`);
      }
    } catch (err) {
      console.error("Error saving emergency contact:", err);
    }
  };

  const deleteContact = async (id) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      const res = await fetch(`${API_BASE}/emergency-contacts/${id}/`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchContacts();
      }
    } catch (err) {
      console.error("Error deleting contact:", err);
    }
  };

  const startEditContact = (c) => {
    setEditingContact(c);
    setContactName(c.name);
    setContactPhone(c.phone_number);
    setContactRelation(c.relationship);
    setContactChatId(c.telegram_chat_id || "");
    setShowContactModal(true);
  };

  const resetContactForm = () => {
    setEditingContact(null);
    setContactName("");
    setContactPhone("");
    setContactRelation("");
    setContactChatId("");
    setShowContactModal(false);
  };

  const loadSampleHistory = () => {
    const saved = localStorage.getItem("distress_history");
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  };

  const addEventToHistory = (event) => {
    const updated = [event, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem("distress_history", JSON.stringify(updated));
  };

  // ----------------------------------------------------
  // RECORDING & WEB AUDIO API ANALYZER
  // ----------------------------------------------------
  const startRecording = async () => {
    audioChunksRef.current = [];
    setTranscript("");
    setIntensity(0);
    setRecordingDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      drawCanvasWave();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        await handleAudioUploadAndAnalysis(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
        calculateVoiceIntensity();
      }, 1000);

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = "en-US";
        rec.onresult = (event) => {
          const latest = event.results[event.results.length - 1][0].transcript;
          setTranscript((prev) => (prev ? prev + " " + latest : latest));
        };
        rec.start();
        recognitionRef.current = rec;
      }
    } catch (err) {
      console.error("Failed to access microphone:", err);
      alert("Error: Microphone access is required to capture voice distress cues.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsRecording(false);
  };

  // Real-time voice amplitude analysis
  const calculateVoiceIntensity = () => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const score = Math.min(100, Math.round((rms / 128) * 100));
    setIntensity(score);
  };

  // Soundwave visualizer using canvas API
  const drawCanvasWave = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "rgba(8, 10, 16, 0.2)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 3;
      ctx.strokeStyle = isRecording ? "#ef4444" : "#6366f1";
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    draw();
  };

  // ----------------------------------------------------
  // DISTRESS PIPELINE EXECUTION
  // ----------------------------------------------------
  const handleAudioUploadAndAnalysis = async (audioBlob) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.wav");

      let audioUrlVal = null;
      try {
        const uploadRes = await fetch(`${API_BASE}/v1/upload-file/`, {
          method: "POST",
          body: formData
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          audioUrlVal = uploadData.url;
          setAudioUrl(audioUrlVal);
        }
      } catch (uploadErr) {
        console.warn("Supabase upload failed (continuing with local analysis):", uploadErr);
      }

      const finalTranscript = useManualMode ? manualTranscript : transcript;

      const analysisPayload = {
        trigger_phrase_detected: finalTranscript.toLowerCase().includes(triggerWord.toLowerCase()),
        transcript: finalTranscript || "Silent recording / No verbal content detected.",
        intensity_score: intensity || Math.floor(Math.random() * 40) + 15,
        base_risk_score: 50,
        user_id: "00000000-0000-0000-0000-000000000000",
        audio_file: audioUrlVal || "recording.wav",
        latitude: gpsLocation?.latitude || null,
        longitude: gpsLocation?.longitude || null
      };

      const analysisRes = await fetch(`${API_BASE}/v1/voice/analyze/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analysisPayload)
      });

      if (analysisRes.ok) {
        const analysisResult = await analysisRes.json();
        setLatestEvent(analysisResult);
        if (analysisResult.risk_score >= 80) {
          setStatus("emergency");
        } else if (analysisResult.risk_score >= 40) {
          setStatus("monitor");
        } else {
          setStatus("safe");
        }
        addEventToHistory({
          id: analysisResult.event_id || Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          transcript: analysisPayload.transcript,
          risk_score: analysisResult.risk_score,
          classification: analysisResult.classification,
          summary: analysisResult.summary,
          location: gpsLocation
        });
      }
    } catch (err) {
      console.error("Distress analysis error:", err);
      alert("Error occurred during distress processing pipeline.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Simulation
  const triggerManualSimulation = async () => {
    if (!manualTranscript) {
      alert("Please input a scenario script text for manual simulation.");
      return;
    }
    setLoading(true);
    const dummyBlob = new Blob([new Uint8Array(100)], { type: "audio/wav" });
    await handleAudioUploadAndAnalysis(dummyBlob);
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="brand-section">
          <div className="brand-logo">
            <Shield className="text-white" size={24} />
          </div>
          <div>
            <h1 className="brand-name">GuardianVoice</h1>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Voice Distress Safety Network
            </p>
          </div>
        </div>

        {/* Global GPS & Status Badge */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {gpsLocation && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--status-safe)", fontSize: "0.85rem" }}>
              <MapPin size={16} />
              <span>
                {gpsLocation.latitude.toFixed(4)}, {gpsLocation.longitude.toFixed(4)}
              </span>
            </div>
          )}
          <span className={`badge ${status}`}>
            SYSTEM: {status}
          </span>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid-layout">
        {/* LEFT COLUMN: Controls & Settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Active Status Display banner */}
          <div className={`status-banner ${status}`}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {status === "safe" && <CheckCircle size={20} />}
              {status === "monitor" && <AlertTriangle size={20} />}
              {status === "emergency" && <Flame size={20} />}
              <span>
                {status === "safe" && "Environment Secure"}
                {status === "monitor" && "Suspicious Cues Detected"}
                {status === "emergency" && "CRITICAL DISTRESS SIGNAL - ALERTS DISPATCHED"}
              </span>
            </div>
          </div>

          {/* Core Recording Widget */}
          <section className="glass-panel recorder-card">
            <h2 className="card-title">
              <Mic size={18} className="text-gradient" /> Record Distress Voice
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "20px" }}>
              Speak or simulate a distress phrase below.
            </p>

            <div
              className={`pulse-circle ${isRecording ? "recording" : "idle"}`}
              onClick={isRecording ? stopRecording : startRecording}
            >
              <Mic size={42} className="text-white" />
            </div>

            <canvas
              ref={canvasRef}
              className="canvas-wave"
              width={250}
              height={60}
            />

            <div style={{ marginTop: "12px" }}>
              {isRecording ? (
                <div style={{ color: "var(--status-emergency)", fontWeight: 600 }}>
                  Recording... {recordingDuration}s
                </div>
              ) : (
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Click microphone icon to record
                </span>
              )}
            </div>

            {/* Display Amplitude Score */}
            {isRecording && (
              <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Volume2 size={16} />
                <div style={{ width: "100px", height: "6px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "4px" }}>
                  <div style={{ width: `${intensity}%`, height: "100%", backgroundColor: "var(--primary)", borderRadius: "4px" }} />
                </div>
                <span style={{ fontSize: "0.75rem" }}>{intensity}%</span>
              </div>
            )}
          </section>

          {/* Trigger Word Settings */}
          <section className="glass-panel" style={{ padding: "20px" }}>
            <h2 className="card-title">
              <Settings size={18} /> Safety Settings
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>
                  SOS Alert Trigger Word
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    className="input-field"
                    value={triggerWord}
                    onChange={(e) => setTriggerWord(e.target.value)}
                    placeholder="e.g. help, emergency"
                  />
                  <button className="btn btn-primary" onClick={saveTriggerWord}>
                    Save
                  </button>
                </div>
              </div>
              {/* Bot Registration Hint */}
              <div style={{ backgroundColor: "rgba(99, 102, 241, 0.05)", border: "1px dashed rgba(99, 102, 241, 0.2)", padding: "12px", borderRadius: "10px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                <strong>Telegram bot configuration:</strong> Create contacts with their Telegram Chat ID to automatically broadcast distress signals. Ask contacts to start the Guardian Bot to receive instant SOS coordinates.
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Results, CRUD, and History */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Simulated Mode Selector */}
          <section className="glass-panel" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="card-title" style={{ marginBottom: 0 }}>
                <Send size={18} /> Test Scenario Simulator
              </h2>
              <button
                className="btn btn-secondary"
                style={{ fontSize: "0.75rem", padding: "6px 12px" }}
                onClick={() => setUseManualMode(!useManualMode)}
              >
                Switch to {useManualMode ? "Microphone Mode" : "Script Mode"}
              </button>
            </div>

            {useManualMode && (
              <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <textarea
                  className="input-field"
                  rows={2}
                  value={manualTranscript}
                  onChange={(e) => setManualTranscript(e.target.value)}
                  placeholder="Type a distress statement, e.g. 'I am lost in the woods and in danger. Someone is following me, please send help!'"
                  style={{ resize: "none" }}
                />
                <button
                  className="btn btn-primary"
                  onClick={triggerManualSimulation}
                  disabled={loading}
                  style={{ width: "fit-content", alignSelf: "flex-end" }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Run AI Simulation Pipeline"}
                </button>
              </div>
            )}
          </section>

          {/* Latest Assessment Results */}
          {latestEvent && (
            <section className="glass-panel" style={{ padding: "24px" }}>
              <h2 className="card-title">
                <FileText size={18} /> Live Assessment Output
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                <div style={{ padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>AI RISK RATING</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 700, color: latestEvent.risk_score >= 80 ? "var(--status-emergency)" : latestEvent.risk_score >= 40 ? "var(--status-monitor)" : "var(--status-safe)" }}>
                    {latestEvent.risk_score}%
                  </div>
                </div>
                <div style={{ padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>CLASSIFICATION</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 600, marginTop: "6px" }}>
                    {latestEvent.classification}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <strong>Context Summary:</strong>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>
                    {latestEvent.summary}
                  </p>
                </div>

                {latestEvent.recommendations && latestEvent.recommendations.length > 0 && (
                  <div>
                    <strong>Action Recommendations:</strong>
                    <ul style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px", paddingLeft: "16px" }}>
                      {latestEvent.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {latestEvent.alert_triggered && (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", color: "var(--status-emergency)", fontSize: "0.85rem", marginTop: "8px" }}>
                    <Flame size={16} />
                    <span>Emergency contacts notified automatically via Telegram channel.</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Emergency Contacts Section */}
          <section className="glass-panel" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 className="card-title" style={{ marginBottom: 0 }}>
                <Phone size={18} /> Emergency Contacts
              </h2>
              <button className="btn btn-secondary" style={{ padding: "6px 12px" }} onClick={() => setShowContactModal(true)}>
                <Plus size={16} /> Add Contact
              </button>
            </div>

            {contacts.length === 0 ? (
              <div className="empty-state">
                <Phone size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
                <p>No emergency contacts registered yet.</p>
              </div>
            ) : (
              <div className="contacts-list">
                {contacts.map((c) => (
                  <div key={c.id} className="contact-item">
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {c.relationship} • {c.phone_number}
                      </div>
                      {c.telegram_chat_id && (
                        <div style={{ fontSize: "0.75rem", color: "var(--primary)" }}>
                          Telegram ID: {c.telegram_chat_id}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="btn btn-secondary" style={{ padding: "6px" }} onClick={() => startEditContact(c)}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-danger" style={{ padding: "6px" }} onClick={() => deleteContact(c.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Incident Log / History */}
          <section className="glass-panel" style={{ padding: "20px", overflowX: "auto" }}>
            <h2 className="card-title">
              <FileText size={18} /> Distress Incident Log
            </h2>

            {history.length === 0 ? (
              <div className="empty-state">
                <FileText size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
                <p>No incidents recorded in the current session.</p>
              </div>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Transcript</th>
                    <th>Risk Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td>{h.timestamp}</td>
                      <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.transcript}</td>
                      <td style={{ fontWeight: 600 }}>{h.risk_score}%</td>
                      <td>
                        <span className={`badge ${h.risk_score >= 80 ? "emergency" : h.risk_score >= 40 ? "monitor" : "safe"}`}>
                          {h.classification}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>

      {/* MODAL FOR CONTACTS CRUD */}
      {showContactModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel" style={{ width: "450px", padding: "28px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color-active)" }}>
            <h3 className="card-title">
              <User size={18} /> {editingContact ? "Edit Contact" : "Add Emergency Contact"}
            </h3>
            <form onSubmit={handleContactSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Contact Name *</label>
                <input type="text" className="input-field" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. John Doe" />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Phone Number *</label>
                <input type="text" className="input-field" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="e.g. +1234567890" />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Relationship *</label>
                <input type="text" className="input-field" value={contactRelation} onChange={(e) => setContactRelation(e.target.value)} placeholder="e.g. Mother, Spouse, Guardian" />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Telegram Chat ID</label>
                <input type="text" className="input-field" value={contactChatId} onChange={(e) => setContactChatId(e.target.value)} placeholder="e.g. 523495818 (optional)" />
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "12px", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={resetContactForm}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingContact ? "Save Changes" : "Register Contact"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
