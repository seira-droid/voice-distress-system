import React, { useState, useEffect } from 'react';
import VoiceAssistant from '../components/VoiceAssistant';
import { apiClient } from '../utils/api';
import wakeWordService from '../services/wakeWordService';

function VoiceAssistantPage() {
  const [triggerWords, setTriggerWords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTriggerWords();
    
    // Listen for trigger words changes from other components
    const handleTriggerWordsChanged = () => {
      console.log('Trigger words changed event received, refreshing...');
      fetchTriggerWords();
    };
    
    window.addEventListener('triggerWordsChanged', handleTriggerWordsChanged);
    
    return () => {
      window.removeEventListener('triggerWordsChanged', handleTriggerWordsChanged);
    };
  }, []);

  const fetchTriggerWords = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/trigger-words/');
      const data = await response.json();
      const activeWords = data.filter(w => w.is_active).map(w => w.word);
      console.log("Fetched active trigger:", activeWords);
      setTriggerWords(activeWords);
    } catch (err) {
      console.error('Failed to fetch trigger words:', err);
      // No fallback - use empty array to indicate no trigger words
      setTriggerWords([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle trigger words changes - restart wake word listener
  useEffect(() => {
    if (!triggerWords || triggerWords.length === 0) return;
    
    console.log('Trigger words changed, restarting wake-word listener with:', triggerWords);
    
    try {
      wakeWordService.restartWithWakeWords(triggerWords);
    } catch (err) {
      console.error('Failed to update wake word:', err);
    }
  }, [triggerWords]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Voice Assistant</h1>
          <p>Interact with the AI-powered distress detection system</p>
        </div>
        <div className="voice-page-content">
          <p>Loading trigger words...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Voice Assistant</h1>
        <p>Interact with the AI-powered distress detection system</p>
      </div>
      <div className="voice-page-content">
        <VoiceAssistant triggerWords={triggerWords} onTriggerWordsChange={fetchTriggerWords} />
      </div>
    </div>
  );
}

export default VoiceAssistantPage;