import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Shield, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://voice-distress-system.onrender.com');

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

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
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user, data.tokens);
        setSuccess(true);
        
        // Navigate after showing success animation
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setError(data.error || 'Invalid email or password');
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
        <div className="auth-success">
          <CheckCircle size={48} className="success-icon" />
          <h2>Authentication Successful</h2>
          <p>Welcome back, {formData.email.split('@')[0]}</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Preparing AI monitoring...</p>
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
              <h2>Welcome Back</h2>
              <p className="auth-description">Sign in to continue monitoring your safety.</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}

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
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
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
                {validationErrors.password && (
                  <span className="field-error">{validationErrors.password}</span>
                )}
              </div>

              <div className="auth-options">
                <label className="auth-remember">
                  <input type="checkbox" className="auth-checkbox" id="remember" />
                  Remember me
                </label>
                <Link to="/forgot-password" className="auth-forgot">
                  Forgot Password?
                </Link>
              </div>

              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? (
                  <div className="auth-spinner" />
                ) : (
                  <>
                    <LogIn size={18} />
                    Login
                  </>
                )}
              </button>

              <div className="auth-divider">
                <span>OR</span>
              </div>

              <button type="button" className="auth-button-secondary" disabled>
                Continue with Google
              </button>

              <div className="auth-footer">
                <span>Don't have an account? </span>
                <Link to="/register" className="auth-link">
                  Create Account
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
