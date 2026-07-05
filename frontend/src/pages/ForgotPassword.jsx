import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Key, CheckCircle } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // UI only - no backend implementation yet
    setTimeout(() => {
      setSuccess(true);
      setLoading(false);
    }, 1000);
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-success">
            <CheckCircle size={48} className="success-icon" />
            <h2>Password Reset Email Sent</h2>
            <p>Check your email for reset instructions.</p>
            <Link to="/login" className="auth-link">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="auth-logo-icon">🛡️</span>
            <span className="auth-logo-text">Voice Distress Guardian</span>
          </div>
          <p className="auth-subtitle">Reset your password</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="Enter your email"
              required
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? (
              <div className="auth-spinner" />
            ) : (
              <>
                <Key size={18} />
                Reset Password
              </>
            )}
          </button>

          <div className="auth-footer">
            <span>Remember your password? </span>
            <Link to="/login" className="auth-link">
              Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;