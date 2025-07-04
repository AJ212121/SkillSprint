// Signup.js
import React, { useRef, useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import './Signup.css';

export default function Signup() {
  const nameRef = useRef();
  const surnameRef = useRef();
  const emailRef = useRef();
  const passwordRef = useRef();
  const confirmPasswordRef = useRef();
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (passwordRef.current.value !== confirmPasswordRef.current.value) {
      setError('Passwords do not match.');
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        emailRef.current.value,
        passwordRef.current.value
      );
      // Create user doc in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: emailRef.current.value,
        fullName: nameRef.current.value,
        surname: surnameRef.current.value,
        createdAt: new Date(),
        xp: 0,
        level: 1,
        badges: [],
        streak: 0,
        lastActive: null,
      });
      navigate('/dashboard');
    } catch (err) {
      // Show a user-friendly error for email already in use
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please log in or use a different email.');
      } else {
        setError('Failed to sign up. Please try again.');
      }
    }
  };

  return (
    <div className="signup-bg">
      <div className="signup-container">
        <div className="signup-lock">
          <img src="/logo.jpg" alt="SkillSprint Logo" style={{ width: 56, height: 56, borderRadius: 14, boxShadow: '0 2px 8px #2563eb44', objectFit: 'cover', display: 'block', margin: '0 auto' }} />
        </div>
        <h2 className="signup-title">Welcome to <br/>SkillSprint!</h2>
        <p className="signup-subtitle">Start mastering new skills — faster than ever.</p>
        <form className="signup-form" onSubmit={handleSubmit}>
          {error && <div className="signup-error" style={{
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
          <label className="signup-label">Full Name
            <input ref={nameRef} type="text" placeholder="Enter your full name" className="signup-input" required />
          </label>
          <label className="signup-label">Surname
            <input ref={surnameRef} type="text" placeholder="Enter your surname" className="signup-input" required />
          </label>
          <label className="signup-label">Email Address
            <input ref={emailRef} type="email" placeholder="Enter your email" className="signup-input" required />
          </label>
          <label className="signup-label">Password
            <input ref={passwordRef} type="password" placeholder="Enter your password" className="signup-input" required />
          </label>
          <label className="signup-label">Confirm Password
            <input ref={confirmPasswordRef} type="password" placeholder="Confirm your password" className="signup-input" required />
          </label>
          <button type="submit" className="signup-btn primary">Sign Up</button>
        </form>
        <div className="signup-bottom-text">
          Already have an account? <Link to="/login" className="signup-login-link">Log in</Link>
        </div>
      </div>
      <footer className="signup-footer">
        <span>© 2025 SkillSprint. All rights reserved.</span>
      </footer>
    </div>
  );
} 