import React from 'react';
import { Link } from 'react-router-dom';
import './Welcome.css';

export default function Welcome() {
  return (
    <div className="welcome-bg">
      <header className="welcome-header">
        <div className="logo-row">
          <div className="logo-icon">
            <img src="/logo.jpg" alt="SkillSprint Logo" style={{ width: 32, height: 32, borderRadius: 8 }} />
          </div>
          <span className="logo-text">SkillSprint</span>
        </div>
      </header>
      <main className="welcome-main">
        <div className="welcome-icon">
          <img src="/logo.jpg" alt="SkillSprint Logo Large" style={{ width: 64, height: 64, borderRadius: 16 }} />
        </div>
        <h1 className="welcome-title">Welcome to <span>SkillSprint!</span></h1>
        <p className="welcome-subtitle">Learn anything fast with AI-powered skill plans.</p>
        <div className="welcome-buttons">
          <Link to="/login" className="welcome-btn primary"> <span role="img" aria-label="login">🔑</span> Login</Link>
          <Link to="/signup" className="welcome-btn"> <span role="img" aria-label="signup">👤</span> Sign Up</Link>
        </div>
        <div className="welcome-features">
          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <div className="feature-title">Rapid Learning</div>
            <div className="feature-desc">Master new skills in record time</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <div className="feature-title">AI-Powered</div>
            <div className="feature-desc">Personalized learning paths</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <div className="feature-title">Track Progress</div>
            <div className="feature-desc">Monitor your skill development</div>
          </div>
        </div>
      </main>
      <footer className="welcome-footer">
        <span>© 2025 SkillSprint. All rights reserved.</span>
      </footer>
    </div>
  );
} 