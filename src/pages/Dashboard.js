import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import Modal from '../components/Modal';
import PropTypes from 'prop-types';
import Toast from '../components/Toast';
import { useTheme } from '../contexts/ThemeContext';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [plans, setPlans] = useState([]);
  const [tasksByPlan, setTasksByPlan] = useState({});
  const [hovered, setHovered] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelPlanId, setCancelPlanId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [userStreak, setUserStreak] = useState(0);
  const [userBadges, setUserBadges] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchPlansAndTasks() {
      setLoading(true);
      // Fetch plans for user
      const plansQ = query(collection(db, 'plans'), where('userId', '==', currentUser.uid));
      const plansSnap = await getDocs(plansQ);
      const plansArr = [];
      const tasksMap = {};
      for (const planDoc of plansSnap.docs) {
        const plan = { id: planDoc.id, ...planDoc.data() };
        plansArr.push(plan);
        // Fetch tasks for this plan
        const tasksSnap = await getDocs(collection(db, 'plans', planDoc.id, 'tasks'));
        tasksMap[planDoc.id] = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      setPlans(plansArr);
      setTasksByPlan(tasksMap);
      setLoading(false);
    }
    fetchPlansAndTasks();

    // Streak logic: update streak and lastActive on dashboard open
    async function updateStreak() {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const today = new Date();
        today.setHours(0,0,0,0);
        let lastActive = userData.lastActive ? new Date(userData.lastActive.seconds ? userData.lastActive.seconds * 1000 : userData.lastActive) : null;
        if (lastActive) lastActive.setHours(0,0,0,0);
        let streak = userData.streak || 0;
        if (!lastActive || (today - lastActive) > 24*60*60*1000) {
          streak = 1;
        } else if ((today - lastActive) === 24*60*60*1000) {
          streak += 1;
        }
        if (!lastActive || (today - lastActive) >= 24*60*60*1000) {
          await updateDoc(userRef, {
            streak,
            lastActive: new Date()
          });
        }
        setUserStreak(streak);
        setUserBadges(userData.badges || []);
      }
    }
    updateStreak();
  }, [currentUser.uid]);

  // Helper: get the next task to do based on progress (across all milestones)
  function getNextTask(planId) {
    const tasks = tasksByPlan[planId] || [];
    if (!tasks.length) return null;
    // Sort tasks by milestone and day
    const sorted = [...tasks].sort((a, b) => {
      if (a.milestoneTitle === b.milestoneTitle) return a.day - b.day;
      return a.milestoneTitle.localeCompare(b.milestoneTitle);
    });
    // Find the first incomplete task
    const nextTask = sorted.find(t => !t.completed);
    if (nextTask) {
      const milestoneTasks = sorted.filter(t => t.milestoneTitle === nextTask.milestoneTitle);
      // Find the highest completed day in this milestone
      const completedTasks = milestoneTasks.filter(t => t.completed);
      let highestCompletedTask = null;
      if (completedTasks.length > 0) {
        highestCompletedTask = completedTasks.reduce((max, t) => (t.day > max.day ? t : max), completedTasks[0]);
      }
      const showTask = highestCompletedTask || milestoneTasks[0];
      const milestoneDay = milestoneTasks.findIndex(t => t.id === showTask.id) + 1;
      return {
        milestone: showTask.milestoneTitle,
        day: showTask.day,
        milestoneDay,
        completed: !!highestCompletedTask,
        task: showTask,
        milestoneTasks,
      };
    } else {
      // All complete, return last task as completed
      const last = sorted[sorted.length - 1];
      const milestoneTasks = sorted.filter(t => t.milestoneTitle === last.milestoneTitle);
      const milestoneDay = milestoneTasks.findIndex(t => t.id === last.id) + 1;
      return {
        milestone: last.milestoneTitle,
        day: last.day,
        milestoneDay,
        completed: true,
        task: last,
        milestoneTasks,
      };
    }
  }

  // Helper to delete a plan and its tasks
  async function handleCancelPlan(planId) {
    setShowCancelModal(true);
    setCancelPlanId(planId);
  }

  async function confirmCancelPlan() {
    if (!cancelPlanId) return;
    setCancelLoading(true);
    try {
      // Delete all tasks in the plan
      const tasksSnap = await getDocs(collection(db, 'plans', cancelPlanId, 'tasks'));
      for (const taskDoc of tasksSnap.docs) {
        await deleteDoc(doc(db, 'plans', cancelPlanId, 'tasks', taskDoc.id));
      }
      // Delete the plan itself
      await deleteDoc(doc(db, 'plans', cancelPlanId));
      // Remove from UI
      setPlans(plans => plans.filter(p => p.id !== cancelPlanId));
      setShowCancelModal(false);
      setCancelPlanId(null);
      setCancelLoading(false);
      setToastMessage('Plan cancelled successfully!');
      setToastType('success');
    } catch (err) {
      setToastMessage('Failed to cancel plan: ' + err.message);
      setToastType('error');
      setCancelLoading(false);
    }
  }

  return (
    <>
      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />
      <main className="dashboard-root" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        {/* Sidebar */}
        <nav className="dashboard-sidebar" style={{ background: 'var(--card)', color: 'var(--text)', borderRight: '1.5px solid var(--border)' }}>
          <div className="sidebar-logo-row">
            <img src="/logo.jpg" alt="SkillSprint Logo" style={{ width: 38, height: 38, borderRadius: 12, boxShadow: '0 0 16px 2px var(--accent)', marginRight: 12, objectFit: 'cover', background: 'var(--card)' }} tabIndex={0} aria-label="Go to Dashboard" onClick={() => navigate('/dashboard')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate('/dashboard'); }} />
            <span className="sidebar-logo-text" style={{ color: 'var(--primary)' }}>SkillSprint</span>
          </div>
          <nav className="sidebar-nav">
            <button className="sidebar-link active" style={{ background: 'none', color: theme === 'dark' ? '#2563eb' : '#b3b8c5', fontWeight: 700 }}>
              Dashboard
            </button>
            <button className="sidebar-link" style={{ background: 'none', color: theme === 'dark' ? '#2563eb' : '#b3b8c5', fontWeight: 700 }} onClick={() => navigate('/home')}>
              Add Skill
            </button>
            <button className="sidebar-link" style={{ background: 'none', color: 'var(--danger)', fontWeight: 700 }} onClick={logout}>
              Logout
            </button>
          </nav>
        </nav>
        {/* Main Content */}
        <section className="dashboard-main" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
          {/* Top Bar */}
          <header className="dashboard-topbar" style={{ background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="dashboard-welcome" style={{ color: 'var(--primary)' }}>Welcome back, {(() => {
                let name = currentUser.displayName;
                if (name) {
                  const parts = name.trim().split(/\s+/);
                  if (parts.length > 1) {
                    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
                  } else {
                    return name.charAt(0).toUpperCase() + name.slice(1);
                  }
                } else {
                  const emailName = currentUser.email.split('@')[0];
                  return emailName.charAt(0).toUpperCase() + emailName.slice(1);
                }
              })()}!
                <span style={{
                  marginLeft: 18,
                  fontSize: 18,
                  color: 'var(--success)',
                  fontWeight: 700,
                  verticalAlign: 'middle',
                  background: 'var(--card)',
                  borderRadius: 8,
                  padding: '4px 14px',
                  boxShadow: '0 1px 4px 0 var(--shadow)'
                }}
                title="Current streak"
                >🔥 {userStreak} day streak</span>
              </h1>
              <div className="dashboard-subtitle" style={{ color: 'var(--text-secondary)' }}>Ready to sprint through your skills?</div>
              <div className="dashboard-desc" style={{ color: 'var(--text-secondary)' }}>Here are your active skill journeys. Tap any to see your personalized learning plan.</div>
            </div>
            <div className="dashboard-topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <PrimaryButton
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                style={{ background: 'var(--card)', color: 'var(--primary)', border: '2px solid var(--border)', fontSize: 28, padding: '8px 14px' }}
                onMouseEnter={e => { e.target.style.background = 'var(--accent)'; e.target.style.color = '#fff'; }}
                onMouseLeave={e => { e.target.style.background = 'var(--card)'; e.target.style.color = 'var(--primary)'; }}
              >
                {theme === 'dark' ? '🌞 Light' : '🌙 Dark'}
              </PrimaryButton>
            </div>
          </header>
          {/* Skill Sprints */}
          <h2 className="dashboard-section-title" style={{ color: 'var(--text-secondary)' }}>Your Skill Sprints</h2>
          {loading ? (
            <div className="dashboard-loading" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
          ) : plans.length === 0 ? (
            <div className="dashboard-empty" style={{ color: 'var(--text-secondary)' }}>No skill sprints yet. Click "Add New Skill" to get started!</div>
          ) : (
            <div className="dashboard-sprints-grid">
              {plans.map(plan => {
                const tasks = tasksByPlan[plan.id] || [];
                const progress = plan.progress || 0;
                const current = getNextTask(plan.id);
                const isComplete = progress === 100;
                const milestoneTitles = Array.from(new Set(tasks.map(t => t.milestoneTitle)));
                const milestonesCompleted = milestoneTitles.filter(title => tasks.filter(t => t.milestoneTitle === title).every(t => t.completed)).length;
                const milestonesTotal = 5;
                return (
                  <Card
                    key={plan.id}
                    className={`dashboard-sprint-card${hovered === plan.id ? ' hovered' : ''}`}
                    style={{ color: 'var(--text)', border: '1.5px solid var(--border)', transition: 'box-shadow 0.18s, border 0.18s', cursor: 'pointer', minHeight: 170, overflow: 'visible', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}
                    onMouseEnter={() => setHovered(plan.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => navigate(`/plan/${plan.id}`)}
                    tabIndex={0}
                    aria-label={`View plan for ${plan.skill}`}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/plan/${plan.id}`); }}
                  >
                    <div className="sprint-title-row">
                      <span className="sprint-title" style={{ color: 'var(--primary)' }}>{plan.skill}</span>
                      {/* Badge display: show badge for this skill's progress */}
                      {(() => {
                        const badgeTypes = ['stone', 'bronze', 'silver', 'gold', 'platinum'];
                        const badgeEmojis = {
                          stone: '🪨',
                          bronze: '🥉',
                          silver: '🥈',
                          gold: '🥇',
                          platinum: '🏆'
                        };
                        if (milestonesCompleted > 0) {
                          const badge = badgeTypes[Math.min(milestonesCompleted - 1, 4)];
                          return (
                            <span style={{
                              marginLeft: 10,
                              fontSize: 22,
                              verticalAlign: 'middle',
                              background: 'var(--card)',
                              borderRadius: 8,
                              padding: '2px 10px',
                              color: 'var(--primary)',
                              fontWeight: 700,
                              boxShadow: '0 1px 4px 0 var(--shadow)'
                            }}
                            title={`Badge: ${badge.charAt(0).toUpperCase() + badge.slice(1)}`}
                            >{badgeEmojis[badge]}</span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="sprint-progress-label" style={{ color: 'var(--text-secondary)' }}>Progress</div>
                    <div className={`sprint-progress-bar${isComplete ? ' complete' : ''}`} style={{ background: 'var(--bg)', borderRadius: 10 }}>
                      <div className="sprint-progress-fill" style={{ width: `${progress}%`, height: '100%', background: isComplete ? 'var(--success)' : 'var(--accent)', borderRadius: 10, transition: 'width 0.3s' }} />
                    </div>
                    <div className="sprint-progress-pct" style={{ color: 'var(--text-secondary)' }}>{progress}%</div>
                    <div className="sprint-milestone-row" style={{ color: 'var(--text-secondary)' }}>
                      {isComplete ? (
                        <span className="sprint-complete" style={{ color: 'var(--success)' }}>Completed!</span>
                      ) : null}
                    </div>
                    {/* Hover expand: show the next task to do */}
                    {hovered === plan.id && current && !isComplete && (
                      <Card className="sprint-hover-expand" style={{ background: 'var(--card)', color: 'var(--text)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: '1.5px solid var(--border)', zIndex: 20, position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, padding: '24px 20px 20px 20px', margin: 0, maxHeight: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
                        <div className="sprint-hover-title" style={{ color: 'var(--primary)', fontWeight: 700 }}>{plan.skill}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 6 }}>
                          Tasks completed: {tasks.filter(t => t.completed).length} of {tasks.length}
                        </div>
                        {current.task && (
                          <div style={{ color: 'var(--text)', fontWeight: 500, fontSize: 15, marginTop: 8 }}>
                            Next up: {current.task.taskDescription}
                          </div>
                        )}
                        <div style={{ color: 'var(--text-secondary)', fontSize: 15, marginTop: 8 }}>
                          Milestones completed: {milestonesCompleted} of {milestonesTotal}
                        </div>
                        <PrimaryButton
                          className="sprint-cancel-btn"
                          style={{ marginTop: 18, background: '#fff', color: 'var(--danger)', border: '2px solid var(--danger)', width: '100%' }}
                          onMouseEnter={e => { e.target.style.background = 'var(--danger)'; e.target.style.color = '#fff'; }}
                          onMouseLeave={e => { e.target.style.background = '#fff'; e.target.style.color = 'var(--danger)'; }}
                          onClick={e => { e.stopPropagation(); handleCancelPlan(plan.id); }}
                          aria-label="Cancel Plan"
                        >
                          Cancel Plan
                        </PrimaryButton>
                      </Card>
                    )}
                    {/* Always show View Plan button */}
                    <PrimaryButton className="sprint-view-btn"
                      style={{
                        background: theme === 'dark' ? 'var(--primary)' : '#fff',
                        color: theme === 'dark' ? '#fff' : 'var(--primary)',
                        border: '2px solid var(--primary)',
                        marginTop: 10
                      }}
                      onMouseEnter={e => {
                        if (theme === 'dark') {
                          e.target.style.background = 'var(--accent)';
                          e.target.style.color = '#fff';
                        } else {
                          e.target.style.background = 'var(--primary)';
                          e.target.style.color = '#fff';
                        }
                      }}
                      onMouseLeave={e => {
                        if (theme === 'dark') {
                          e.target.style.background = 'var(--primary)';
                          e.target.style.color = '#fff';
                        } else {
                          e.target.style.background = '#fff';
                          e.target.style.color = 'var(--primary)';
                        }
                      }}
                      onClick={e => { e.stopPropagation(); navigate(`/plan/${plan.id}`); }}
                      aria-label={`View plan for ${plan.skill}`}
                    >View Plan</PrimaryButton>
                  </Card>
                );
              })}
            </div>
          )}
          <footer className="dashboard-footer" style={{ color: 'var(--text-secondary)' }}>Keep pushing! Every sprint counts.</footer>
        </section>
        {/* Modal for cancel confirmation */}
        <Modal open={showCancelModal} onClose={() => { setShowCancelModal(false); setCancelPlanId(null); }} onConfirm={confirmCancelPlan} title="Cancel Plan?" message="Are you sure you want to cancel this plan? This cannot be undone." confirmText="Confirm" cancelText="Cancel" loading={cancelLoading} />
        {/* Floating mobile nav button for small screens */}
        <button
          className="mobile-nav-btn"
          style={{
            display: 'none',
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 2000,
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 56,
            height: 56,
            boxShadow: '0 2px 8px 0 var(--shadow)',
            fontSize: 32,
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.18s, color 0.18s',
          }}
          aria-label="Open navigation menu"
          onClick={() => document.querySelector('.dashboard-sidebar').style.display = 'flex'}
        >
          ☰
        </button>
        <style>{`
          @media (max-width: 900px) {
            .mobile-nav-btn { display: flex !important; }
            .dashboard-sidebar { display: none !important; }
          }
        `}</style>
      </main>
    </>
  );
}

Dashboard.propTypes = {};
// Add PropTypes as needed for props if Dashboard ever receives any.
// Note: API keys should be stored in .env and accessed via process.env. 