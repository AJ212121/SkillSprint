// Login.js
import React, { useRef, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const emailRef = useRef();
  const passwordRef = useRef();
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, emailRef.current.value, passwordRef.current.value);
      navigate('/dashboard');
    } catch (err) {
      // Show a user-friendly error for invalid credentials
      if (err.code === 'auth/invalid-login-credentials' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError('Failed to log in. Please try again.');
      }
    }
  };

  return (
    <div className="login-bg">
      <div className="login-container">
        <div className="login-lock">
          <img src="/logo.jpg" alt="SkillSprint Logo" style={{ width: 56, height: 56, borderRadius: 14, boxShadow: '0 2px 8px #2563eb44', objectFit: 'cover', display: 'block', margin: '0 auto' }} />
        </div>
        <h2 className="login-title">Welcome Back to <br/>SkillSprint!</h2>
        <p className="login-subtitle">Get back to mastering new skills — faster than ever.</p>
        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error" style={{
            background: '#ffeded',
            color: '#d32f2f',
            border: '1.5px solid #d32f2f',
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 14,
            fontWeight: 600,
            fontSize: 15,
            textAlign: 'center',
            boxShadow: '0 1px 4px 0 rgba(211,47,47,0.08)'
          }}>{error}</div>}
          <label className="login-label">Email Address
            <input ref={emailRef} type="email" placeholder="Enter your email" className="login-input" required />
          </label>
          <label className="login-label">Password
            <input ref={passwordRef} type="password" placeholder="Enter your password" className="login-input" required />
          </label>
          <div className="login-forgot">
            <Link to="#" className="login-forgot-link">Forgot Password?</Link>
          </div>
          <button type="submit" className="login-btn primary">Log In</button>
          <button type="button" className="login-btn secondary" onClick={() => navigate('/signup')}>Sign Up</button>
        </form>
        <div className="login-bottom-text">
          New here? <Link to="/signup" className="login-signup-link">Sign up now</Link> and start learning instantly!
        </div>
      </div>
      <footer className="login-footer">
        <span>© 2025 SkillSprint. All rights reserved.</span>
      </footer>
    </div>
  );
} 