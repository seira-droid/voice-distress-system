import React, { useState, useEffect } from 'react';
import { Shield, Mic, Plus, Trash2, Edit, Check, X, RefreshCw, Volume2, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { apiClient } from '../utils/api';
import './SafetySettings.css';

function SafetySettings() {
  const [triggerWords, setTriggerWords] = useState([]);
  const [newWord, setNewWord] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingWord, setEditingWord] = useState('');
  const [sensitivity, setSensitivity] = useState(75);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [wordToDelete, setWordToDelete] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchTriggerWords();
  }, []);

  const fetchTriggerWords = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/trigger-words/');
      const data = await response.json();
      console.log('Trigger words loaded:', data);
      setTriggerWords(data);
    } catch (err) {
      console.error('Failed to fetch trigger words:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const validateWord = (word, existingId = null) => {
    const errors = {};
    const trimmed = word.trim();
    
    if (!trimmed) {
      errors.word = 'Trigger word is required';
    } else if (trimmed.length < 2) {
      errors.word = 'Trigger word must be at least 2 characters';
    } else if (trimmed.length > 40) {
      errors.word = 'Trigger word must be at most 40 characters';
    } else {
      // Check for duplicates (case-insensitive)
      const isDuplicate = triggerWords.some(w => 
        w.word.toLowerCase() === trimmed.toLowerCase() && 
        w.id !== existingId
      );
      if (isDuplicate) {
        errors.word = 'This trigger word already exists';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addTriggerWord = async (e) => {
    e.preventDefault();
    
    if (!validateWord(newWord)) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await apiClient.post('/api/v1/trigger-words/add/', {
        word: newWord.trim().toLowerCase()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Trigger saved:', data);
        setTriggerWords([...triggerWords, data]);
        setNewWord('');
        setValidationErrors({});
        showToast('Trigger word added successfully');
        // Notify other components that trigger words changed
        window.dispatchEvent(new CustomEvent('triggerWordsChanged'));
      } else {
        const data = await response.json();
        const errorMsg = data.error || data.detail || 'Failed to add trigger word';
        setValidationErrors({ word: errorMsg });
        showToast(errorMsg, 'error');
      }
    } catch (err) {
      showToast('Network error. Please check your connection.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (word) => {
    setEditingId(word.id);
    setEditingWord(word.word);
    setValidationErrors({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingWord('');
    setValidationErrors({});
  };

  const updateTriggerWord = async (id) => {
    if (!validateWord(editingWord, id)) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await apiClient.put(`/api/v1/trigger-words/${id}/update/`, {
        word: editingWord.trim().toLowerCase()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Trigger updated:', data);
        setTriggerWords(triggerWords.map(w => w.id === id ? data : w));
        setEditingId(null);
        setEditingWord('');
        setValidationErrors({});
        showToast('Trigger word updated successfully');
        // Notify other components that trigger words changed
        window.dispatchEvent(new CustomEvent('triggerWordsChanged'));
      } else {
        const data = await response.json();
        const errorMsg = data.error || data.detail || 'Failed to update trigger word';
        setValidationErrors({ word: errorMsg });
        showToast(errorMsg, 'error');
      }
    } catch (err) {
      showToast('Network error. Please check your connection.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (word) => {
    setWordToDelete(word);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!wordToDelete) return;
    
    setSubmitting(true);
    setShowDeleteConfirm(false);
    
    try {
      const response = await apiClient.delete(`/api/v1/trigger-words/${wordToDelete.id}/delete/`);
      
      if (response.ok) {
        console.log('Trigger deleted:', wordToDelete.word);
        setTriggerWords(triggerWords.filter(w => w.id !== wordToDelete.id));
        showToast('Trigger word deleted successfully');
        // Notify other components that trigger words changed
        window.dispatchEvent(new CustomEvent('triggerWordsChanged'));
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to delete trigger word', 'error');
      }
    } catch (err) {
      showToast('Network error. Please check your connection.', 'error');
    } finally {
      setSubmitting(false);
      setWordToDelete(null);
    }
  };

  const toggleTriggerWord = async (id) => {
    setSubmitting(true);
    try {
      const response = await apiClient.post(`/api/v1/trigger-words/${id}/toggle/`);
      
      if (response.ok) {
        const data = await response.json();
        setTriggerWords(triggerWords.map(w => w.id === id ? data : w));
        showToast(`Trigger word ${data.is_active ? 'enabled' : 'disabled'}`);
        // Notify other components that trigger words changed
        window.dispatchEvent(new CustomEvent('triggerWordsChanged'));
      } else {
        showToast('Failed to toggle trigger word', 'error');
      }
    } catch (err) {
      showToast('Network error. Please check your connection.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetTriggerWords = async () => {
    if (!window.confirm('Reset all trigger words to default? This will remove custom words.')) {
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await apiClient.post('/api/v1/trigger-words/reset/');
      
      if (response.ok) {
        const data = await response.json();
        setTriggerWords(data);
        showToast('Reset to default trigger words');
        // Notify other components that trigger words changed
        window.dispatchEvent(new CustomEvent('triggerWordsChanged'));
      } else {
        showToast('Failed to reset trigger words', 'error');
      }
    } catch (err) {
      showToast('Network error. Please check your connection.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getSensitivityLabel = () => {
    if (sensitivity < 33) return 'Low';
    if (sensitivity < 66) return 'Medium';
    return 'High';
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <Loader className="spinner" size={48} />
          <p>Loading trigger words...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="safety-settings">
      {/* Page Header */}
      <div className="page-header">
        <h1>Safety Settings</h1>
        <p>Configure your personal safety monitoring preferences</p>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`} role="alert">
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Trigger Word Management */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Mic size={24} />
            <h2>Trigger Words</h2>
          </div>
          <button 
            className="btn btn-ghost" 
            onClick={resetTriggerWords}
            disabled={submitting}
          >
            <RefreshCw size={16} />
            Reset to Default
          </button>
        </div>

        <div className="card-content">
          {/* Add New Trigger Word */}
          <form onSubmit={addTriggerWord} className="trigger-word-form">
            <div className="form-group">
              <label htmlFor="newWord">Add New Trigger Word</label>
              <div className="input-with-button">
                <input
                  id="newWord"
                  type="text"
                  value={newWord}
                  onChange={(e) => {
                    setNewWord(e.target.value);
                    setValidationErrors({});
                  }}
                  className={`contact-input ${validationErrors.word ? 'input-error' : ''}`}
                  placeholder="Enter trigger word..."
                  disabled={submitting}
                />
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !newWord.trim()}
                >
                  {submitting ? (
                    <Loader className="spinner" size={18} />
                  ) : (
                    <Plus size={18} />
                  )}
                </button>
              </div>
              {validationErrors.word && (
                <span className="field-error">{validationErrors.word}</span>
              )}
              <p className="field-hint">
                Trigger words activate the voice assistant when detected (2-40 characters)
              </p>
            </div>
          </form>

          {/* Trigger Words List */}
          <div className="trigger-words-list">
            {triggerWords.length === 0 ? (
              <div className="empty-state">
                <Mic size={48} />
                <p>No trigger words configured</p>
                <p className="empty-subtitle">Add your first trigger word above to get started</p>
              </div>
            ) : (
              <div className="trigger-words-grid">
                {triggerWords.map((tw) => (
                  <div 
                    key={tw.id} 
                    className={`trigger-word-card ${!tw.is_active ? 'inactive' : ''}`}
                  >
                    {editingId === tw.id ? (
                      <div className="trigger-word-edit">
                        <input
                          type="text"
                          value={editingWord}
                          onChange={(e) => {
                            setEditingWord(e.target.value);
                            setValidationErrors({});
                          }}
                          className={`contact-input ${validationErrors.word ? 'input-error' : ''}`}
                          placeholder="Trigger word"
                          autoFocus
                          disabled={submitting}
                        />
                        {validationErrors.word && (
                          <span className="field-error">{validationErrors.word}</span>
                        )}
                        <div className="trigger-word-actions">
                          <button 
                            className="btn btn-save"
                            onClick={() => updateTriggerWord(tw.id)}
                            disabled={submitting}
                          >
                            {submitting ? <Loader className="spinner" size={16} /> : <Check size={16} />}
                          </button>
                          <button 
                            className="btn btn-cancel"
                            onClick={cancelEdit}
                            disabled={submitting}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="trigger-word-info">
                          <span className="trigger-word-text">{tw.word}</span>
                          <span className={`trigger-word-status ${tw.is_active ? 'active' : 'inactive'}`}>
                            {tw.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="trigger-word-actions">
                          <button 
                            className="btn btn-ghost"
                            onClick={() => startEdit(tw)}
                            disabled={submitting}
                            aria-label="Edit trigger word"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            className={`btn btn-ghost ${tw.is_active ? 'btn-active' : ''}`}
                            onClick={() => toggleTriggerWord(tw.id)}
                            disabled={submitting}
                            aria-label={tw.is_active ? 'Disable' : 'Enable'}
                          >
                            <Volume2 size={16} />
                          </button>
                          <button 
                            className="btn btn-delete"
                            onClick={() => handleDeleteClick(tw)}
                            disabled={submitting}
                            aria-label="Delete trigger word"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detection Sensitivity */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Shield size={24} />
            <h2>Detection Sensitivity</h2>
          </div>
        </div>

        <div className="card-content">
          <div className="sensitivity-control">
            <div className="sensitivity-header">
              <span className="sensitivity-label">Sensitivity Level</span>
              <span className="sensitivity-value">{getSensitivityLabel()}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseInt(e.target.value))}
              className="sensitivity-slider"
            />
            <div className="sensitivity-labels">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
            <p className="field-hint">
              Higher sensitivity detects trigger words more easily but may have more false positives
            </p>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Mic size={24} />
            <h2>System Status</h2>
          </div>
        </div>

        <div className="card-content">
          <div className="status-grid">
            <div className="status-item">
              <div className="status-indicator active"></div>
              <span>Trigger words loaded: {triggerWords.length}</span>
            </div>
            <div className="status-item">
              <div className="status-indicator active"></div>
              <span>Listening: Active</span>
            </div>
            <div className="status-item">
              <div className="status-indicator warning"></div>
              <span>Last trigger detected: None</span>
            </div>
            <div className="status-item">
              <div className="status-indicator active"></div>
              <span>Active trigger words: {triggerWords.filter(w => w.is_active).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && wordToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <AlertCircle size={24} />
              <h3>Delete Trigger Word</h3>
            </div>
            <p>Are you sure you want to delete <strong>"{wordToDelete.word}"</strong>?</p>
            <p className="modal-warning">This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                className="btn btn-cancel"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setWordToDelete(null);
                }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                className="btn btn-delete-confirm"
                onClick={handleDeleteConfirm}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader className="spinner" size={16} />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SafetySettings;