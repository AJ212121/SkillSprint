import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import AIQuestionBox from '../components/AIQuestionBox';
import PropTypes from 'prop-types';
import Toast from '../components/Toast';
import { useTheme } from '../contexts/ThemeContext';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';

export default function PlanDetails() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    async function fetchPlanAndTasks() {
      setLoading(true);
      setError('');
      try {
        const planRef = doc(db, 'plans', planId);
        const planSnap = await getDoc(planRef);
        if (!planSnap.exists()) {
          setError('Plan not found.');
          setLoading(false);
          return;
        }
        setPlan({ id: planSnap.id, ...planSnap.data() });
        const tasksSnap = await getDocs(collection(db, 'plans', planId, 'tasks'));
        const tasksArr = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTasks(tasksArr);
      } catch (err) {
        setError('Failed to load plan: ' + err.message);
      }
      setLoading(false);
    }
    fetchPlanAndTasks();
  }, [planId]);

  // Group tasks by milestone
  const milestones = React.useMemo(() => {
    const grouped = {};
    tasks.forEach(task => {
      if (!grouped[task.milestoneTitle]) grouped[task.milestoneTitle] = [];
      grouped[task.milestoneTitle].push(task);
    });
    return grouped;
  }, [tasks]);

  // Progress
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Find the next task to do (first incomplete, across all milestones)
  const nextTaskId = React.useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      if (a.milestoneTitle === b.milestoneTitle) return a.day - b.day;
      return a.milestoneTitle.localeCompare(b.milestoneTitle);
    });
    const next = sorted.find(t => !t.completed);
    return next ? next.id : null;
  }, [tasks]);

  // Toggle task completion
  async function handleToggleTask(taskId, checked) {
    setUpdatingTaskId(taskId);
    // Optimistically update UI
    setTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, completed: checked } : t));
    try {
      await updateDoc(doc(db, 'plans', planId, 'tasks', taskId), { completed: checked });
      // Update plan progress
      const newCompleted = checked ? completedTasks + 1 : completedTasks - 1;
      const newProgress = totalTasks > 0 ? Math.round((newCompleted / totalTasks) * 100) : 0;
      await updateDoc(doc(db, 'plans', planId), { progress: newProgress });
      if (plan) setPlan({ ...plan, progress: newProgress });
      setToastMessage('Task updated!');
      setToastType('success');
    } catch (err) {
      // Roll back UI
      setTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, completed: !checked } : t));
      setError('Failed to update task: ' + err.message);
      setToastMessage('Failed to update task: ' + err.message);
      setToastType('error');
    }
    setUpdatingTaskId(null);
  }

  return (
    <>
      <button
        onClick={toggleTheme}
        style={{
          position: 'fixed',
          top: 24,
          right: 24,
          background: 'var(--card)',
          border: '2px solid var(--border)',
          color: 'var(--primary)',
          fontSize: 28,
          cursor: 'pointer',
          zIndex: 1000,
          borderRadius: 'var(--radius)',
          boxShadow: '0 2px 8px 0 var(--shadow)',
          padding: '8px 14px',
          transition: 'background 0.2s, color 0.2s, border 0.2s',
        }}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        onMouseEnter={e => { e.target.style.background = 'var(--accent)'; e.target.style.color = '#fff'; }}
        onMouseLeave={e => { e.target.style.background = 'var(--card)'; e.target.style.color = 'var(--primary)'; }}
      >
        {theme === 'dark' ? '🌞 Light' : '🌙 Dark'}
      </button>
      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />
      <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, position: 'relative', overflow: 'auto' }}>
        <Card style={{ width: '100%', maxWidth: 540, margin: '48px auto', position: 'relative', animation: 'fadeInCard 0.7s' }}>
          {/* Logo with animated glow, now keyboard accessible */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18 }}>
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #2563eb 60%, #232a47 100%)',
                boxShadow: '0 0 32px 8px #2563eb55, 0 0 0 0 #fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
                animation: 'glowPulse 2.2s infinite alternate',
                cursor: 'pointer',
                outline: 'none',
              }}
              onClick={() => navigate('/dashboard')}
              title="Go to Dashboard"
              tabIndex={0}
              aria-label="Go to Dashboard"
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate('/dashboard'); }}
            >
              <img src="/logo.jpg" alt="SkillSprint Logo" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', boxShadow: '0 2px 8px #2563eb44' }} />
            </div>
          </div>
          {/* Skill title and progress */}
          {loading ? (
            <div style={{ color: 'var(--text)', fontSize: 20, textAlign: 'center', padding: 40 }}>Loading...</div>
          ) : error ? (
            <div style={{ color: 'red', fontSize: 18, textAlign: 'center', padding: 40 }}>{error}</div>
          ) : plan ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 8, letterSpacing: 0.5 }}>{plan.skill}</h1>
                <div style={{ color: 'var(--text-secondary)', fontSize: 18, marginBottom: 18 }}>Your personalized SkillSprint plan</div>
              </div>
              {/* Progress Bar */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 17, marginRight: 12 }}>Progress:</span>
                  <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: 16 }}>{progress}%</span>
                </div>
                <div style={{ width: '100%', height: 18, background: 'var(--bg)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px 0 rgba(16,24,42,0.10)' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? 'var(--success)' : 'linear-gradient(90deg, #4f8cff 0%, #2563eb 100%)', borderRadius: 10, transition: 'width 0.3s' }} />
                </div>
              </div>
              {/* Milestones and Tasks */}
              {Object.entries(milestones).map(([milestone, tasksArr], idx) => (
                <div key={milestone} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', padding: 24, marginBottom: 28, boxShadow: '0 2px 12px 0 rgba(37,99,235,0.08)', animation: 'fadeInCard 0.7s' }}>
                  <h3 style={{ color: 'var(--text)', marginBottom: 6, fontSize: 22 }}>Milestone {idx + 1}: {milestone}</h3>
                  <ul style={{ paddingLeft: 18, margin: 0 }}>
                    {[...tasksArr].sort((a, b) => a.day - b.day).map(task => (
                      <li key={task.id} style={{ marginBottom: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start' }}>
                        <input
                          type="checkbox"
                          checked={!!task.completed}
                          onChange={e => handleToggleTask(task.id, e.target.checked)}
                          style={{ marginRight: 10, marginTop: 2 }}
                          disabled={updatingTaskId === task.id}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 16 }}>Day {task.day}:</strong>
                          </div>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: 15 }}>
                            {task.taskDescription}
                          </span>
                          {task.resourceLink && (
                            <div style={{ marginTop: 4 }}>
                              <a href={task.resourceLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{task.resourceLink}</a>
                              <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
                                (AI-suggested resource; may not always be available)
                              </div>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          ) : null}
          {/* Dashboard button at bottom */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <PrimaryButton
              onClick={() => navigate('/dashboard')}
              style={{ background: theme === 'light' ? '#fff' : 'var(--button-bg)', color: theme === 'light' ? 'var(--primary)' : 'var(--button-text)', border: theme === 'light' ? '2px solid var(--primary)' : 'var(--button-border)' }}
              aria-label="Back to Dashboard"
              onMouseEnter={e => { if (theme === 'light') { e.target.style.background = 'var(--primary)'; e.target.style.color = '#fff'; } else { e.target.style.background = 'var(--button-hover)'; e.target.style.color = '#fff'; } e.target.style.transform = 'scale(1.06)'; }}
              onMouseLeave={e => { if (theme === 'light') { e.target.style.background = '#fff'; e.target.style.color = 'var(--primary)'; } else { e.target.style.background = 'var(--button-bg)'; e.target.style.color = 'var(--button-text)'; } e.target.style.transform = 'scale(1)'; }}
            >
              ← Back to Dashboard
            </PrimaryButton>
          </div>
          {/* AI Expert Q&A Section */}
          {plan && (
            <div style={{
              marginTop: 40,
              background: 'var(--card)',
              borderRadius: 'var(--radius)',
              padding: '32px 24px',
              boxShadow: 'var(--shadow)',
              animation: 'fadeInCard 0.7s',
              border: '1.5px solid var(--border)',
              backdropFilter: 'var(--glass)',
            }}>
              <h2 style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 22, marginBottom: 10, textAlign: 'center' }}>
                <span role="img" aria-label="ai">🤖</span> Ask the AI Expert
              </h2>
              <div style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 18, textAlign: 'center' }}>
                Have a question about <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{plan.skill || 'your skill'}</span>? Get a detailed, expert answer from the AI.
              </div>
              <AIQuestionBox skill={plan.skill} />
            </div>
          )}
          <style>{`
            @keyframes fadeInCard {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes glowPulse {
              0% { box-shadow: 0 0 32px 8px #2563eb55, 0 0 0 0 #fff; }
              100% { box-shadow: 0 0 48px 16px #4f8cff77, 0 0 0 0 #fff; }
            }
          `}</style>
        </Card>
      </main>
    </>
  );
}

PlanDetails.propTypes = {};
// Add PropTypes as needed for props if PlanDetails ever receives any. 