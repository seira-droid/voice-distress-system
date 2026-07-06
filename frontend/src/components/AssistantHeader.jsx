import React from 'react';

function AssistantHeader({ triggerWord, onTabChange, activeTab }) {
  return (
    <header className="assistant-header">
      <div className="header-brand">
        <span className="header-logo" role="img" aria-label="Voice Distress System">🛡️</span>
        <div className="header-titles">
          <h1 className="header-title">Voice Distress System</h1>
          <p className="header-subtitle">AI-Powered Emergency Voice Assistant</p>
        </div>
      </div>

      <nav className="header-tabs" role="tablist" aria-label="Main navigation">
        <button
          role="tab"
          aria-selected={activeTab === 'record'}
          onClick={() => onTabChange('record')}
          className={`tab-button ${activeTab === 'record' ? 'active' : ''}`}
        >
          <span className="tab-icon">🎤</span>
          <span className="tab-label">Voice Assistant</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'contacts'}
          onClick={() => onTabChange('contacts')}
          className={`tab-button ${activeTab === 'contacts' ? 'active' : ''}`}
        >
          <span className="tab-icon">👥</span>
          <span className="tab-label">Emergency Contacts</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'trigger'}
          onClick={() => onTabChange('trigger')}
          className={`tab-button ${activeTab === 'trigger' ? 'active' : ''}`}
        >
          <span className="tab-icon">🔑</span>
          <span className="tab-label">Wake Word</span>
        </button>
      </nav>
    </header>
  );
}

export default AssistantHeader;
