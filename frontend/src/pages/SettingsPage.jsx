import React, { useState, useEffect } from 'react';
import { Settings, Bell, Shield, Key, Mic, Volume2, Palette, Globe, User, Lock, Users, Send } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');

function SettingsPage() {
  const [settings, setSettings] = useState({
    wakeWord: 'hey guardian',
    voiceLanguage: 'en-US',
    theme: 'dark',
    riskThreshold: 70,
    notifications: true,
    autoAlert: true,
    telegramEnabled: false,
    telegramBotToken: '',
    telegramChatId: '',
  });
  const [profile, setProfile] = useState({
    name: 'Admin',
    email: 'admin@example.com',
  });
  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [audioDevices, setAudioDevices] = useState({
    microphones: [],
    speakers: [],
    selectedMic: '',
    selectedSpeaker: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchProfile();
    fetchAudioDevices();
  }, []);

  const fetchSettings = async () => {
    try {
      const [triggerWordRes, thresholdRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/trigger-word/`),
        fetch(`${API_BASE}/api/v1/risk-threshold/`),
      ]);
      
      const triggerWordData = await triggerWordRes.json();
      const thresholdData = await thresholdRes.json();
      
      setSettings(prev => ({
        ...prev,
        wakeWord: triggerWordData.trigger_word || 'hey guardian',
        riskThreshold: thresholdData.threshold || 70,
      }));
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/profile/`);
      if (response.ok) {
        const data = await response.json();
        setProfile({
          name: data.name || 'Admin',
          email: data.email || 'admin@example.com',
        });
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const fetchAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const microphones = devices.filter(d => d.kind === 'audioinput');
      const speakers = devices.filter(d => d.kind === 'audiooutput');
      
      setAudioDevices({
        microphones,
        speakers,
        selectedMic: microphones[0]?.deviceId || '',
        selectedSpeaker: speakers[0]?.deviceId || '',
      });
    } catch (err) {
      console.error('Failed to fetch audio devices:', err);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Save trigger word
      await fetch(`${API_BASE}/api/v1/trigger-word/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger_word: settings.wakeWord }),
      });
      
      // Save risk threshold
      await fetch(`${API_BASE}/api/v1/risk-threshold/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: settings.riskThreshold }),
      });
      
      // Save profile
      await fetch(`${API_BASE}/api/v1/profile/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (password.new !== password.confirm) {
      alert('New passwords do not match');
      return;
    }
    try {
      await fetch(`${API_BASE}/api/v1/password/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(password),
      });
      setPassword({ current: '', new: '', confirm: '' });
    } catch (err) {
      console.error('Failed to save password:', err);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure your Voice Distress Guardian preferences</p>
      </div>
      
      <div className="settings-content">
        {/* Wake Word Settings */}
        <div className="settings-card">
          <div className="card-header">
            <h2><Key size={18} /> Wake Word</h2>
          </div>
          <div className="card-content">
            <div className="setting-item">
              <div className="setting-info">
                <label>Activation Phrase</label>
                <p>Say this phrase to activate the voice assistant</p>
              </div>
              <input
                type="text"
                value={settings.wakeWord}
                onChange={(e) => setSettings({ ...settings, wakeWord: e.target.value })}
                className="contact-input"
                placeholder="Enter wake word"
              />
            </div>
          </div>
        </div>

        {/* Voice Settings */}
        <div className="settings-card">
          <div className="card-header">
            <h2><Globe size={18} /> Voice Settings</h2>
          </div>
          <div className="card-content">
            <div className="setting-item">
              <div className="setting-info">
                <label>Voice Language</label>
                <p>Language for speech recognition and synthesis</p>
              </div>
              <select
                value={settings.voiceLanguage}
                onChange={(e) => setSettings({ ...settings, voiceLanguage: e.target.value })}
                className="filter-select"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-ES">Spanish</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
              </select>
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <label>Microphone</label>
                <p>Select input device for voice detection</p>
              </div>
              <select
                value={audioDevices.selectedMic}
                onChange={(e) => setAudioDevices({ ...audioDevices, selectedMic: e.target.value })}
                className="filter-select"
              >
                {audioDevices.microphones.map(mic => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microphone ${audioDevices.microphones.indexOf(mic) + 1}`}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <label>Speaker</label>
                <p>Select output device for voice responses</p>
              </div>
              <select
                value={audioDevices.selectedSpeaker}
                onChange={(e) => setAudioDevices({ ...audioDevices, selectedSpeaker: e.target.value })}
                className="filter-select"
              >
                {audioDevices.speakers.map(speaker => (
                  <option key={speaker.deviceId} value={speaker.deviceId}>
                    {speaker.label || `Speaker ${audioDevices.speakers.indexOf(speaker) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="settings-card">
          <div className="card-header">
            <h2><Palette size={18} /> Theme</h2>
          </div>
          <div className="card-content">
            <div className="setting-item">
              <div className="setting-info">
                <label>Color Theme</label>
                <p>Choose your preferred color scheme</p>
              </div>
              <select
                value={settings.theme}
                onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                className="filter-select"
              >
                <option value="dark">Dark (Default)</option>
                <option value="light">Light</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Alert Settings */}
        <div className="settings-card">
          <div className="card-header">
            <h2><Bell size={18} /> Alert Settings</h2>
          </div>
          <div className="card-content">
            <div className="setting-item">
              <div className="setting-info">
                <label>Risk Threshold</label>
                <p>Minimum risk score to trigger an alert</p>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.riskThreshold}
                onChange={(e) => setSettings({ ...settings, riskThreshold: parseInt(e.target.value) })}
                className="setting-slider"
              />
              <span className="setting-value">{settings.riskThreshold}%</span>
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <label>Enable Notifications</label>
                <p>Receive alerts when distress is detected</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <label>Auto Alert</label>
                <p>Automatically send alerts for high-risk situations</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.autoAlert}
                  onChange={(e) => setSettings({ ...settings, autoAlert: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Telegram Settings */}
        <div className="settings-card">
          <div className="card-header">
            <h2><Send size={18} /> Telegram Settings</h2>
          </div>
          <div className="card-content">
            <div className="setting-item">
              <div className="setting-info">
                <label>Enable Telegram Alerts</label>
                <p>Send alerts via Telegram messaging</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.telegramEnabled}
                  onChange={(e) => setSettings({ ...settings, telegramEnabled: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            {settings.telegramEnabled && (
              <>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Bot Token</label>
                    <p>Your Telegram bot API token</p>
                  </div>
                  <input
                    type="password"
                    value={settings.telegramBotToken}
                    onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
                    className="contact-input"
                    placeholder="Enter bot token"
                  />
                </div>
                
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Chat ID</label>
                    <p>Your Telegram chat ID</p>
                  </div>
                  <input
                    type="text"
                    value={settings.telegramChatId}
                    onChange={(e) => setSettings({ ...settings, telegramChatId: e.target.value })}
                    className="contact-input"
                    placeholder="Enter chat ID"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Profile Settings */}
        <div className="settings-card">
          <div className="card-header">
            <h2><User size={18} /> Profile</h2>
          </div>
          <div className="card-content">
            <div className="setting-item">
              <div className="setting-info">
                <label>Name</label>
                <p>Your display name</p>
              </div>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="contact-input"
                placeholder="Enter your name"
              />
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <label>Email</label>
                <p>Your email address</p>
              </div>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="contact-input"
                placeholder="Enter your email"
              />
            </div>
          </div>
        </div>

        {/* Password Settings */}
        <div className="settings-card">
          <div className="card-header">
            <h2><Lock size={18} /> Password</h2>
          </div>
          <div className="card-content">
            <div className="setting-item">
              <div className="setting-info">
                <label>Current Password</label>
                <p>Enter your current password</p>
              </div>
              <input
                type="password"
                value={password.current}
                onChange={(e) => setPassword({ ...password, current: e.target.value })}
                className="contact-input"
                placeholder="Current password"
              />
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <label>New Password</label>
                <p>Enter your new password</p>
              </div>
              <input
                type="password"
                value={password.new}
                onChange={(e) => setPassword({ ...password, new: e.target.value })}
                className="contact-input"
                placeholder="New password"
              />
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <label>Confirm Password</label>
                <p>Re-enter your new password</p>
              </div>
              <input
                type="password"
                value={password.confirm}
                onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                className="contact-input"
                placeholder="Confirm password"
              />
            </div>
          </div>
        </div>

        <button className="save-settings-btn" onClick={saveSettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

export default SettingsPage;
