import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, Shield, CheckCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const passwordStrength = formData.password.length >= 8 ? (
    formData.password.length >= 12 ? 'strong' : 'medium'
  ) : 'weak';

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setValidationErrors({});

    // Client-side validation
    const errors = {};
    
    if (!formData.full_name || formData.full_name.trim().length < 2) {
      errors.full_name = 'Full name is required (minimum 2 characters)';
    }
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }
    
    if (!formData.confirm_password) {
      errors.confirm_password = 'Please confirm your password';
    } else if (formData.password !== formData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        // Handle field-specific errors from backend
        const backendErrors = {};
        if (data.email) {
          backendErrors.email = Array.isArray(data.email) ? data.email[0] : data.email;
        }
        if (data.password) {
          backendErrors.password = Array.isArray(data.password) ? data.password[0] : data.password;
        }
        if (data.full_name) {
          backendErrors.full_name = Array.isArray(data.full_name) ? data.full_name[0] : data.full_name;
        }
        
        setError(data.error || data.detail || 'Registration failed. Please try again.');
        setValidationErrors(backendErrors);
      }
    } catch (err) {
      setError('Network unavailable. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-hero">
            <div className="hero-content">
              <div className="hero-shield">
                <Shield size={64} className="shield-icon" />
                <div className="listening-orb"></div>
              </div>
              <h1 className="hero-title">Voice Distress Guardian</h1>
              <p className="hero-subtitle">Your safety is our priority.</p>
            </div>
          </div>
          
          <div className="auth-panel">
            <div className="auth-success">
              <CheckCircle size={48} className="success-icon" />
              <h2>Account Created Successfully</h2>
              <p>Redirecting to login...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Left Hero Panel */}
        <div className="auth-hero">
          <div className="hero-content">
            <div className="hero-shield">
              <Shield size={64} className="shield-icon" />
              <div className="listening-orb"></div>
            </div>
            
            <h1 className="hero-title">Voice Distress Guardian</h1>
            <p className="hero-subtitle">
              AI-powered personal safety monitoring that listens for emergencies and protects you in real time.
            </p>
            
            <div className="feature-grid">
              <div className="feature-card">
                <span className="feature-icon">🛡️</span>
                <span className="feature-text">AI Distress Detection</span>
              </div>
              <div className="feature-card">
                <span className="feature-icon">📍</span>
                <span className="feature-text">Live Emergency Alerts</span>
              </div>
              <div className="feature-card">
                <span className="feature-icon">🤖</span>
                <span className="feature-text">Continuous Voice Monitoring</span>
              </div>
            </div>
            
            <div className="trust-indicators">
              <span>256-bit Encryption</span>
              <span>Privacy First</span>
              <span>AI Powered</span>
              <span>99.9% Availability</span>
            </div>
          </div>
        </div>

        {/* Right Auth Panel */}
        <div className="auth-panel">
          <div className="auth-card">
            <div className="auth-header">
              <div className="auth-logo">
                <Shield size={32} />
                <span>Voice Distress Guardian</span>
              </div>
              <h2>Create your account</h2>
              <p className="auth-description">Join thousands staying safe with AI monitoring.</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}

              <div className="auth-field">
                <label htmlFor="full_name" className="auth-label">Full Name</label>
                <input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className={`auth-input ${validationErrors.full_name ? 'input-error' : ''}`}
                  placeholder="Enter your full name"
                  required
                  autoComplete="name"
                />
                {validationErrors.full_name && (
                  <span className="field-error">{validationErrors.full_name}</span>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="email" className="auth-label">Email</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`auth-input ${validationErrors.email ? 'input-error' : ''}`}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                />
                {validationErrors.email && (
                  <span className="field-error">{validationErrors.email}</span>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="password" className="auth-label">Password</label>
                <div className="auth-password-container">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`auth-input ${validationErrors.password ? 'input-error' : ''}`}
                    placeholder="Create a password"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {/* Password Strength Meter */}
                {formData.password && (
                  <div className="password-strength">
                    <div className={`strength-bar ${passwordStrength}`}></div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {passwordStrength === 'strong' ? 'Strong password' : 
                       passwordStrength === 'medium' ? 'Medium password' : 'Weak password'}
                    </span>
                  </div>
                )}
                
                {validationErrors.password && (
                  <span className="field-error">{validationErrors.password}</span>
                )}
                
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Minimum 8 characters required
                </p>
              </div>

              <div className="auth-field">
                <label htmlFor="confirm_password" className="auth-label">Confirm Password</label>
                <div className="auth-password-container">
                  <input
                    id="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    className={`auth-input ${validationErrors.confirm_password ? 'input-error' : ''}`}
                    placeholder="Confirm your password"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {validationErrors.confirm_password && (
                  <span className="field-error">{validationErrors.confirm_password}</span>
                )}
              </div>

              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? (
                  <div className="auth-spinner" />
                ) : (
                  <>
                    <UserPlus size={18} />
                    Create Account
                  </>
                )}
              </button>

              <div className="auth-footer">
                <span>Already have an account? </span>
                <Link to="/login" className="auth-link">
                  Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;