import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, X, Check, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { apiClient } from '../utils/api';
import './ContactsPage.css';

function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: '',
    telegram_chat_id: ''
  });
  
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: '',
    telegram_chat_id: ''
  });
  
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/emergency-contacts/');
      const data = await response.json();
      console.log("Fetched contacts:", data);
      // Handle both array and object with data property
      const contactsArray = Array.isArray(data) 
        ? data 
        : (data && Array.isArray(data.results)) 
          ? data.results 
          : (data && data.data) 
            ? (Array.isArray(data.data) ? data.data : [data.data])
            : [];
      // Sort by created_at descending (newest first)
      const sortedContacts = contactsArray.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
      console.log("Recent contacts after sort:", sortedContacts);
      setContacts(sortedContacts);
      console.log("Current contacts state:", sortedContacts);
      if (sortedContacts.length > 0) {
        console.log("Newest contact:", sortedContacts[sortedContacts.length - 1]);
      }
      // Log the actual newest contact (first in sorted array)
      if (sortedContacts.length > 0) {
        console.log("First contact (newest):", sortedContacts[0]);
      }
      setError('');
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
      setError('Failed to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Email validation
  const validateEmail = (email) => {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone validation
  const validatePhone = (phone) => {
    const digits = phone.replace("+", "").replace(" ", "").replace("-", "");
    if (!digits) return true; // Phone is optional
    if (!digits.match(/^\d+$/)) return 'Phone number must contain only digits';
    if (digits.length < 10 || digits.length > 15) return 'Phone number must be between 10 and 15 digits';
    return null;
  };

  const validateForm = (data) => {
    const errors = {};
    
    if (!data.name || data.name.trim().length < 2) {
      errors.name = 'Name is required (minimum 2 characters)';
    }
    
    if (!data.relationship || data.relationship.trim().length < 2) {
      errors.relationship = 'Relationship is required (minimum 2 characters)';
    }
    
    const phoneError = validatePhone(data.phone);
    if (phoneError) {
      errors.phone = phoneError;
    }
    
    if (data.email && !validateEmail(data.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateForm(formData)) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await apiClient.post('/api/v1/emergency-contacts/', {
        name: formData.name.trim(),
        phone_number: formData.phone.trim(),
        email: formData.email.trim(),
        relationship: formData.relationship.trim(),
        telegram_chat_id: formData.telegram_chat_id.trim()
      });
      
      if (response.ok) {
        const createdContact = await response.json();
        console.log("Contact saved:", createdContact);
        setFormData({ name: '', phone: '', email: '', relationship: '', telegram_chat_id: '' });
        setValidationErrors({});
        setSuccess('Contact added successfully!');
        console.log("Refreshing contacts...");
        await fetchContacts();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || data.detail || 'Failed to add contact');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateContact = async (id) => {
    setError('');
    setSuccess('');
    
    if (!validateForm(editFormData)) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await apiClient.put(`/api/v1/emergency-contacts/${id}/`, {
        name: editFormData.name.trim(),
        phone_number: editFormData.phone.trim(),
        email: editFormData.email.trim(),
        relationship: editFormData.relationship.trim(),
        telegram_chat_id: editFormData.telegram_chat_id.trim()
      });
      
      if (response.ok) {
        setEditingId(null);
        setEditFormData({ name: '', phone: '', email: '', relationship: '', telegram_chat_id: '' });
        setValidationErrors({});
        setSuccess('Contact updated successfully!');
        await fetchContacts();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || data.detail || 'Failed to update contact');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (contact) => {
    setContactToDelete(contact);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contactToDelete) return;
    
    setSubmitting(true);
    setShowDeleteConfirm(false);
    
    try {
      const response = await apiClient.delete(`/api/v1/emergency-contacts/${contactToDelete.id}/`);
      
      if (response.ok) {
        setSuccess('Contact deleted successfully!');
        await fetchContacts();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || data.detail || 'Failed to delete contact');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setSubmitting(false);
      setContactToDelete(null);
    }
  };

  const startEdit = (contact) => {
    setEditingId(contact.id);
    setEditFormData({
      name: contact.name,
      phone: contact.phone_number || '',
      email: contact.email || '',
      relationship: contact.relationship,
      telegram_chat_id: contact.telegram_chat_id || ''
    });
    setValidationErrors({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({ name: '', phone: '', email: '', relationship: '', telegram_chat_id: '' });
    setValidationErrors({});
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <Loader className="spinner" size={48} />
          <p>Loading contacts...</p>
        </div>
      </div>
    );
  }

  // Get the 3 most recent contacts for the "Recent Contacts" section
  const recentContacts = contacts.slice(0, 3);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Emergency Contacts</h1>
        <p>Manage your emergency contact list</p>
      </div>
      
      {/* Recent Contacts Section */}
      {recentContacts.length > 0 && (
        <div className="recent-contacts-section" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header" style={{ padding: '1rem', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1rem', margin: 0 }}>Recent Contacts (Newest First)</h2>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {recentContacts.map((contact) => (
              <div key={`recent-${contact.id}`} style={{ 
                padding: '0.75rem 1rem', 
                backgroundColor: 'var(--bg-primary)', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)',
                fontSize: '0.875rem'
              }}>
                <span style={{ fontWeight: 600 }}>{contact.name}</span>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>({contact.relationship})</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Success/Error Messages */}
      {success && (
        <div className="alert alert-success">
          <CheckCircle size={20} />
          <span>{success}</span>
        </div>
      )}
      
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
      
      <div className="contacts-content">
        {/* Add Contact Form */}
        <div className="contact-form-card">
          <div className="card-header">
            <h2>Add New Contact</h2>
          </div>
          <div className="card-content">
            <form onSubmit={handleAddContact} className="contact-form">
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`contact-input ${validationErrors.name ? 'input-error' : ''}`}
                />
                {validationErrors.name && (
                  <span className="field-error">{validationErrors.name}</span>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`contact-input ${validationErrors.phone ? 'input-error' : ''}`}
                />
                {validationErrors.phone && (
                  <span className="field-error">{validationErrors.phone}</span>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`contact-input ${validationErrors.email ? 'input-error' : ''}`}
                />
                {validationErrors.email && (
                  <span className="field-error">{validationErrors.email}</span>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="relationship">Relationship *</label>
                <input
                  id="relationship"
                  type="text"
                  placeholder="e.g., Family, Friend, Doctor"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className={`contact-input ${validationErrors.relationship ? 'input-error' : ''}`}
                />
                {validationErrors.relationship && (
                  <span className="field-error">{validationErrors.relationship}</span>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="telegram_chat_id">Telegram Chat ID (optional)</label>
                <input
                  id="telegram_chat_id"
                  type="text"
                  placeholder="e.g., 123456789"
                  value={formData.telegram_chat_id}
                  onChange={(e) => setFormData({ ...formData, telegram_chat_id: e.target.value })}
                  className="contact-input"
                />
                <span className="field-hint">Get your chat ID from @userinfobot on Telegram</span>
              </div>
              
              <button 
                type="submit" 
                className="add-contact-btn" 
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader className="spinner" size={16} />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add Contact
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Contacts List */}
        <div className="contacts-list-card">
          <div className="card-header">
            <h2>Your Contacts ({contacts.length})</h2>
          </div>
          <div className="card-content">
            {contacts.length === 0 ? (
              <div className="empty-state">
                <Users size={48} />
                <p>No contacts added yet.</p>
                <p className="empty-subtitle">Add your first emergency contact above</p>
              </div>
            ) : (
              <div className="contacts-grid">
                {contacts.map((contact) => (
                  <div key={contact.id} className="contact-card">
                    {editingId === contact.id ? (
                      // Edit Mode
                      <div className="contact-edit-form">
                        <div className="form-group">
                          <input
                            type="text"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            className={`contact-input ${validationErrors.name ? 'input-error' : ''}`}
                            placeholder="Name"
                          />
                          {validationErrors.name && (
                            <span className="field-error">{validationErrors.name}</span>
                          )}
                        </div>
                        <div className="form-group">
                          <input
                            type="tel"
                            value={editFormData.phone}
                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                            className={`contact-input ${validationErrors.phone ? 'input-error' : ''}`}
                            placeholder="Phone"
                          />
                          {validationErrors.phone && (
                            <span className="field-error">{validationErrors.phone}</span>
                          )}
                        </div>
                        <div className="form-group">
                          <input
                            type="email"
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                            className={`contact-input ${validationErrors.email ? 'input-error' : ''}`}
                            placeholder="Email"
                          />
                          {validationErrors.email && (
                            <span className="field-error">{validationErrors.email}</span>
                          )}
                        </div>
                        <div className="form-group">
                          <input
                            type="text"
                            value={editFormData.relationship}
                            onChange={(e) => setEditFormData({ ...editFormData, relationship: e.target.value })}
                            className={`contact-input ${validationErrors.relationship ? 'input-error' : ''}`}
                            placeholder="Relationship"
                          />
                          {validationErrors.relationship && (
                            <span className="field-error">{validationErrors.relationship}</span>
                          )}
                        </div>
                        
                        <div className="form-group">
                          <input
                            type="text"
                            value={editFormData.telegram_chat_id}
                            onChange={(e) => setEditFormData({ ...editFormData, telegram_chat_id: e.target.value })}
                            className="contact-input"
                            placeholder="Telegram Chat ID"
                          />
                        </div>
                        
                        <div className="contact-actions">
                          <button 
                            className="btn-save"
                            onClick={() => handleUpdateContact(contact.id)}
                            disabled={submitting}
                          >
                            {submitting ? <Loader className="spinner" size={16} /> : <Check size={16} />}
                          </button>
                          <button 
                            className="btn-cancel"
                            onClick={cancelEdit}
                            disabled={submitting}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <>
                        <div className="contact-info">
                          <div className="contact-header">
                            <span className="contact-name">{contact.name}</span>
                            <span className="contact-relationship">{contact.relationship}</span>
                          </div>
                          {contact.phone_number && (
                            <div className="contact-detail">
                              <span className="contact-label">Phone:</span>
                              {contact.phone_number}
                            </div>
                          )}
                          {contact.email && (
                            <div className="contact-detail">
                              <span className="contact-label">Email:</span>
                              {contact.email}
                            </div>
                          )}
                          {contact.telegram_chat_id && (
                            <div className="contact-detail">
                              <span className="contact-label">Telegram:</span>
                              <span className="telegram-connected">✅ Connected</span>
                            </div>
                          )}
                        </div>
                        <div className="contact-actions">
                          <button 
                            className="btn-edit"
                            onClick={() => startEdit(contact)}
                            aria-label="Edit contact"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="btn-delete"
                            onClick={() => handleDeleteClick(contact)}
                            aria-label="Delete contact"
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
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && contactToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <AlertCircle size={24} />
              <h3>Delete Contact</h3>
            </div>
            <p>Are you sure you want to delete <strong>{contactToDelete.name}</strong>?</p>
            <p className="modal-warning">This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                className="btn-cancel"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setContactToDelete(null);
                }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                className="btn-delete-confirm"
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

export default ContactsPage;