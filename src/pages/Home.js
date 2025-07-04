import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sendPrompt } from '../api/openai';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, writeBatch, getDocs, query, where, getDoc, increment } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import AIQuestionBox from '../components/AIQuestionBox';
import PropTypes from 'prop-types';
import Toast from '../components/Toast';
import useLinkValid from '../components/useLinkValid';
import ValidatedLink from '../components/ValidatedLink';
import { useTheme } from '../contexts/ThemeContext';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';

const SUGGESTED_SKILLS = [
  'Python Programming',
  'UI/UX Design',
  'React Development',
  'Machine Learning',
  'Artificial Intelligence',
  'Digital Marketing',
  'Data Analysis',
  'Public Speaking',
  'English Language',
  'Copywriting',
  'Photography',
  'Cooking',
  'Project Management',
  'Web Development',
  'Graphic Design',
  'Video Editing',
  'Social Media Management',
  'Social Media Marketing',
  'Entrepreneurship',
  'Sales',
  'Leadership',
  'Communication',
  'Finance',
  'Investing',
  'Stock Market',
  'Stock Trading',
  'Stock Analysis',
  'Stock Research',
  'Stock News',
  
];

export default function Home() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [skill, setSkill] = useState('');
  const [milestones, setMilestones] = useState([]);
  const [checked, setChecked] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rawResponse, setRawResponse] = useState('');
  const [planId, setPlanId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const { theme, toggleTheme } = useTheme();
  const [shareMessage, setShareMessage] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [confidence, setConfidence] = useState('');
  const confidenceOptions = [
    { value: '1', label: 'Not at all confident' },
    { value: '2', label: 'Slightly confident' },
    { value: '3', label: 'Moderate' },
    { value: '4', label: 'Confident' },
    { value: '5', label: 'Very confident' },
  ];

  // Progress calculation
  const totalTasks = milestones.reduce((sum, m) => sum + (m.tasks ? m.tasks.length : 0), 0);
  const checkedTasks = Object.values(checked).filter(Boolean).length;
  const progress = totalTasks > 0 ? Math.round((checkedTasks / totalTasks) * 100) : 0;

  const handleSend = async e => {
    e.preventDefault();
    if (!confidence) {
      setError('Please select your confidence level before starting the plan.');
      return;
    }
    setLoading(true);
    setError('');
    setMilestones([]);
    setChecked({});
    setRawResponse('');
    setPlanId(null);
    try {
      // Check for duplicate skill (case-insensitive)
      const plansQ = query(collection(db, 'plans'), where('userId', '==', currentUser.uid));
      const plansSnap = await getDocs(plansQ);
      const existing = plansSnap.docs.find(docSnap => (docSnap.data().skill || '').trim().toLowerCase() === skill.trim().toLowerCase());
      if (existing) {
        const progress = existing.data().progress || 0;
        setError(`You're already learning this skill. You are ${progress}% through it.`);
        setToastMessage(`You're already learning this skill. You are ${progress}% through it.`);
        setToastType('error');
        setLoading(false);
        return;
      }
      const confidenceLabel = confidenceOptions.find(opt => opt.value === confidence)?.label || '';
      const prompt = `You are an expert coach. Help a user master the skill: "${skill}".
The user rated their confidence in this skill as: ${confidenceLabel}.
Please adapt the milestones and tasks accordingly:
- If confidence is low, include more foundational explanations, slower pacing, and extra beginner resources.
- If confidence is high, focus on advanced topics, faster progression, and challenging exercises.
Break the journey into 5 major milestones, each milestone lasting 3-5 days. The milestones must be in this logical order: 1. Understanding the skill, 2. Ideation and Opportunity Recognition, 3. Planning (e.g., business plan or roadmap), 4. Financial Management (or equivalent for the skill), 5. Launching and Scaling (or advanced mastery/application). Number the milestones sequentially (Milestone 1, Milestone 2, etc.) and give each a clear, descriptive title and a short description.
For each milestone, list 3-5 daily tasks. For each daily task, provide an extremely detailed, step-by-step instructional guide of at least 10-12 sentences. Every single task description must include all of the following: (1) a practical exercise for the user to do, (2) an analogy to help understanding, (3) a real-world example, and (4) a reflection prompt for the user to journal about what they learned. These four elements must be present in every task description. Absolutely do NOT mention, reference, or repeat the resource link in the description, not even as 'see the link below' or similar.
For the 'link' field, only provide a real, working, high-quality reputable website (such as Wikipedia, official documentation, or major news sites) that is directly relevant to the task. Prefer reputable websites over YouTube, as these are less likely to be removed. Do NOT invent or make up links. Only include links you are certain exist and are relevant. If you cannot find a real link, leave the link field empty.
Respond with ONLY valid JSON, no explanation, no markdown, no code block, no extra text. The response must be a JSON array as described below, and nothing else.
Format: [{ milestone: "Milestone 1: [title]", description: "Milestone description", tasks: [{ day: 1, description: "10-12 sentence detailed step-by-step instructional guide for the task (do NOT mention the link; must include a practical exercise, an analogy, a real-world example, and a reflection prompt)", link: "https://..." }, ...] }, ...]`;
      const res = await sendPrompt(prompt);
      setRawResponse(res.choices[0].message.content);
      // Try to find and parse the JSON in the response
      let json = null;
      try {
        const match = res.choices[0].message.content.match(/\[.*\]/s);
        if (match) {
          json = JSON.parse(match[0]);
        } else {
          throw new Error('No JSON found in response.');
        }
      } catch (err) {
        setError('Could not parse milestones from AI response.');
        setLoading(false);
        return;
      }
      setMilestones(json);
      // Prepare checkedTasks (all false)
      let initialChecked = {};
      json.forEach((m, i) => {
        m.tasks.forEach((_, j) => {
          initialChecked[`${i}-${j}`] = false;
        });
      });
      setChecked(initialChecked);
      // Save plan doc and tasks subcollection in Firestore
      try {
        // 1. Add plan doc
        const planDocRef = await addDoc(collection(db, 'plans'), {
          userId: currentUser.uid,
          skill,
          createdAt: serverTimestamp(),
          progress: 0,
          confidence: confidence,
        });
        setPlanId(planDocRef.id);
        // 2. Add all tasks as docs in subcollection
        const batch = writeBatch(db);
        json.forEach((m, i) => {
          m.tasks.forEach((task, j) => {
            const taskRef = doc(collection(db, 'plans', planDocRef.id, 'tasks'));
            batch.set(taskRef, {
              milestoneTitle: m.milestone,
              day: task.day,
              taskDescription: task.description,
              resourceLink: task.link || '',
              completed: false,
            });
          });
        });
        await batch.commit();
        setToastMessage('Plan created successfully!');
        setToastType('success');
      } catch (dbErr) {
        setError('Failed to save plan/tasks to database: ' + dbErr.message);
        setToastMessage('Failed to create plan: ' + dbErr.message);
        setToastType('error');
      }
    } catch (err) {
      setError('Error: ' + err.message);
      setToastMessage('Failed to create plan: ' + err.message);
      setToastType('error');
    }
    setLoading(false);
  };

  const handleCheck = async (milestoneIdx, taskIdx) => {
    const newChecked = {
      ...checked,
      [`${milestoneIdx}-${taskIdx}`]: !checked[`${milestoneIdx}-${taskIdx}`]
    };
    setChecked(newChecked);
    // Update progress
    const newCheckedTasks = Object.values(newChecked).filter(Boolean).length;
    const newProgress = totalTasks > 0 ? Math.round((newCheckedTasks / totalTasks) * 100) : 0;
    // Update Firestore
    if (planId) {
      try {
        // Find the task doc in Firestore
        // Get all tasks for this plan
        const tasksSnapshot = await getDocs(collection(db, 'plans', planId, 'tasks'));
        let taskDocId = null;
        let count = 0;
        for (const docSnap of tasksSnapshot.docs) {
          if (count === milestoneIdx * milestones[0].tasks.length + taskIdx) {
            taskDocId = docSnap.id;
            break;
          }
          count++;
        }
        if (taskDocId) {
          await updateDoc(doc(db, 'plans', planId, 'tasks', taskDocId), {
            completed: newChecked[`${milestoneIdx}-${taskIdx}`],
          });
        }
        // Update plan progress
        await updateDoc(doc(db, 'plans', planId), {
          progress: newProgress,
        });
        // Award XP and handle level up
        if (newChecked[`${milestoneIdx}-${taskIdx}`]) { // Only award XP when checking, not unchecking
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            let xp = userData.xp || 0;
            let level = userData.level || 1;
            const xpPerTask = 10;
            const xpToNextLevel = 100 * level; // Example: 100 XP per level
            xp += xpPerTask;
            let leveledUp = false;
            while (xp >= xpToNextLevel) {
              xp -= xpToNextLevel;
              level += 1;
              leveledUp = true;
            }
            await updateDoc(userRef, {
              xp,
              level
            });
            if (leveledUp) {
              setToastMessage(`Level up! You are now level ${level}.`);
              setToastType('success');
            }
            // BADGES: Check if a milestone is now fully completed
            const allTasks = tasksSnapshot.docs.map(d => d.data());
            const milestoneTitle = milestones[milestoneIdx].milestone;
            const milestoneTasks = allTasks.filter(t => t.milestoneTitle === milestoneTitle);
            const allCompleted = milestoneTasks.length > 0 && milestoneTasks.every(t => t.completed || (t.day === milestones[milestoneIdx].tasks[taskIdx].day && newChecked[`${milestoneIdx}-${taskIdx}`]));
            if (allCompleted) {
              const badgeTypes = ['stone', 'bronze', 'silver', 'gold', 'platinum'];
              const badge = badgeTypes[milestoneIdx] || 'milestone';
              const userRef = doc(db, 'users', currentUser.uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const userData = userSnap.data();
                const badges = Array.isArray(userData.badges) ? userData.badges : [];
                if (!badges.includes(badge)) {
                  await updateDoc(userRef, {
                    badges: [...badges, badge]
                  });
                  setToastMessage(`🏅 You earned the ${badge.charAt(0).toUpperCase() + badge.slice(1)} badge for completing milestone ${milestoneIdx + 1}!`);
                  setToastType('success');
                }
                setShareMessage(`I just completed milestone ${milestoneIdx + 1} (${milestones[milestoneIdx].milestone}) in ${skill} on SkillSprint! 🚀`);
                setShowShare(true);
              }
              // Check if the whole skill is now 100% complete
              const allMilestonesComplete = milestones.every((m, idx) => {
                const milestoneTasks = allTasks.filter(t => t.milestoneTitle === m.milestone);
                return milestoneTasks.length > 0 && milestoneTasks.every(t => t.completed || (idx === milestoneIdx && t.day === milestones[milestoneIdx].tasks[taskIdx].day && newChecked[`${milestoneIdx}-${taskIdx}`]));
              });
              if (allMilestonesComplete) {
                setShareMessage(`I just completed the entire skill "${skill}" on SkillSprint! 🏆🚀`);
                setShowShare(true);
              }
            }
          }
        }
      } catch (dbErr) {
        setError('Failed to update progress in database: ' + dbErr.message);
      }
    }
  };

  function handleSuggestedSkill(skillName) {
    setSkill(skillName);
  }
  function handleRandomSkill() {
    const idx = Math.floor(Math.random() * SUGGESTED_SKILLS.length);
    setSkill(SUGGESTED_SKILLS[idx]);
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
      {showShare && (
        <div style={{
          position: 'fixed',
          top: 80,
          right: 30,
          zIndex: 2000,
          background: 'var(--card)',
          color: 'var(--text)',
          borderRadius: 'var(--radius)',
          padding: '18px 28px',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          border: '1.5px solid var(--border)',
          backdropFilter: 'var(--glass)',
        }}>
          <div style={{ marginBottom: 10, fontWeight: 600, fontSize: 16 }}>Share your achievement!</div>
          <div style={{ marginBottom: 12, fontSize: 15 }}>{shareMessage}</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <a href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`} target="_blank" rel="noopener noreferrer" title="Share on WhatsApp" style={{ fontSize: 22, textDecoration: 'none' }}>🟢</a>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`} target="_blank" rel="noopener noreferrer" title="Share on Twitter" style={{ fontSize: 22, textDecoration: 'none' }}>🐦</a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=&quote=${encodeURIComponent(shareMessage)}`} target="_blank" rel="noopener noreferrer" title="Share on Facebook" style={{ fontSize: 22, textDecoration: 'none' }}>📘</a>
            <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://skillsprint.app')}&summary=${encodeURIComponent(shareMessage)}`} target="_blank" rel="noopener noreferrer" title="Share on LinkedIn" style={{ fontSize: 22, textDecoration: 'none' }}>💼</a>
            <a href={`mailto:?subject=Check%20out%20my%20SkillSprint%20achievement!&body=${encodeURIComponent(shareMessage)}`} target="_blank" rel="noopener noreferrer" title="Share via Email" style={{ fontSize: 22, textDecoration: 'none' }}>✉️</a>
          </div>
          <CopyToClipboard text={shareMessage} onCopy={() => setShowShare(false)}>
            <button style={{
              background: 'var(--button-bg)',
              color: 'var(--button-text)',
              border: 'var(--button-border)',
              borderRadius: 'var(--radius)',
              padding: '8px 18px',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              marginTop: 4,
              boxShadow: '0 1px 4px 0 var(--shadow)',
              transition: 'background 0.18s, color 0.18s, transform 0.18s',
            }}
              onMouseEnter={e => { e.target.style.background = 'var(--button-hover)'; e.target.style.color = 'var(--primary)'; e.target.style.transform = 'scale(1.06)'; }}
              onMouseLeave={e => { e.target.style.background = 'var(--button-bg)'; e.target.style.color = 'var(--button-text)'; e.target.style.transform = 'scale(1)'; }}
            >
              Copy & Share
            </button>
          </CopyToClipboard>
          <button onClick={() => setShowShare(false)} style={{
            background: 'none',
            color: '#b3b8c5',
            border: 'none',
            marginTop: 8,
            cursor: 'pointer',
            fontSize: 14
          }}>Close</button>
        </div>
      )}
      <main style={{
        minHeight: '100vh',
        background: theme === 'dark' ? '#181f2c' : 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        position: 'relative',
        overflow: 'auto',
      }}>
        <Card style={{
          width: '100%',
          maxWidth: 540,
          margin: '48px auto',
          position: 'relative',
          animation: 'fadeInCard 0.7s',
        }}>
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
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#2563eb', marginBottom: 8, letterSpacing: 0.5 }}>
              <span role="img" aria-label="rocket">🚀</span> Start learning a new skill!
            </h1>
            <div style={{ color: '#b3b8c5', fontSize: 18, marginBottom: 18 }}>
              Unlock your potential—choose a skill and get a personalized AI-powered learning sprint.
            </div>
          </div>
          <form onSubmit={handleSend} style={{ marginTop: 0, marginBottom: 24 }}>
            <label style={{ fontWeight: 600, fontSize: 18, color: '#2563eb' }}>
              What skill do you want to master?
            </label>
            <input
              value={skill}
              onChange={e => setSkill(e.target.value)}
              placeholder="e.g. Learn Python programming"
              style={{
                maxWidth: 520,
                width: '100%',
                display: 'block',
                margin: '12px auto 16px auto',
                padding: 14,
                fontSize: 17,
                borderRadius: 'var(--radius)',
                border: '1.5px solid var(--input-border)',
                outline: 'none',
                background: 'var(--input-bg)',
                color: 'var(--text)',
                fontWeight: 500,
                boxShadow: '0 1px 4px 0 rgba(16,24,42,0.06)',
                transition: 'border 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => e.target.style.border = '1.5px solid var(--primary)'}
              onBlur={e => e.target.style.border = '1.5px solid var(--input-border)'}
              required
            />
            {/* Confidence prompt */}
            <div style={{ margin: '12px 0 16px 0' }}>
              <label style={{ fontWeight: 600, fontSize: 16, color: theme === 'dark' ? '#4f8cff' : '#4f8cff', marginBottom: 6, display: 'block' }}>
                How confident are you in your knowledge of this skill?
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, margin: '18px 0 24px 0', width: '100%' }}>
                <div style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
                  {confidenceOptions.slice(0, 3).map(opt => (
                    <label key={opt.value} style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: confidence === opt.value ? 700 : 500,
                      color: theme === 'dark' ? (confidence === opt.value ? '#fff' : '#4f8cff') : (confidence === opt.value ? '#fff' : 'var(--primary)'),
                      background: theme === 'dark' ? (confidence === opt.value ? '#2563eb' : 'transparent') : (confidence === opt.value ? 'var(--primary)' : 'var(--input-bg)'),
                      borderRadius: 999,
                      padding: '8px 22px',
                      cursor: 'pointer',
                      border: theme === 'dark' ? '2px solid #232a47' : (confidence === opt.value ? '2px solid var(--primary)' : '2px solid var(--border)'),
                      boxShadow: confidence === opt.value ? '0 2px 8px 0 var(--shadow)' : 'none',
                      minWidth: 140,
                      fontSize: 15,
                      margin: 0,
                      transition: 'background 0.18s, color 0.18s, border 0.18s, box-shadow 0.18s',
                      outline: 'none',
                      position: 'relative',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                    }}
                      tabIndex={0}
                      onMouseEnter={e => { if (theme === 'dark') { if (confidence !== opt.value) { e.target.style.background = '#232a47'; e.target.style.color = '#4f8cff'; } } else { if (confidence !== opt.value) { e.target.style.background = 'var(--accent)'; e.target.style.color = '#fff'; } }}}
                      onMouseLeave={e => { if (theme === 'dark') { if (confidence !== opt.value) { e.target.style.background = 'transparent'; e.target.style.color = '#4f8cff'; } } else { if (confidence !== opt.value) { e.target.style.background = 'var(--input-bg)'; e.target.style.color = 'var(--primary)'; } }}}
                    >
                      <input
                        type="radio"
                        name="confidence"
                        value={opt.value}
                        checked={confidence === opt.value}
                        onChange={e => setConfidence(e.target.value)}
                        style={{
                          position: 'absolute',
                          opacity: 0,
                          width: 0,
                          height: 0,
                          pointerEvents: 'none',
                        }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
                  {confidenceOptions.slice(3).map(opt => (
                    <label key={opt.value} style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: confidence === opt.value ? 700 : 500,
                      color: theme === 'dark' ? (confidence === opt.value ? '#fff' : '#4f8cff') : (confidence === opt.value ? '#fff' : 'var(--primary)'),
                      background: theme === 'dark' ? (confidence === opt.value ? '#2563eb' : 'transparent') : (confidence === opt.value ? 'var(--primary)' : 'var(--input-bg)'),
                      borderRadius: 999,
                      padding: '8px 22px',
                      cursor: 'pointer',
                      border: theme === 'dark' ? '2px solid #232a47' : (confidence === opt.value ? '2px solid var(--primary)' : '2px solid var(--border)'),
                      boxShadow: confidence === opt.value ? '0 2px 8px 0 var(--shadow)' : 'none',
                      minWidth: 140,
                      fontSize: 15,
                      margin: 0,
                      transition: 'background 0.18s, color 0.18s, border 0.18s, box-shadow 0.18s',
                      outline: 'none',
                      position: 'relative',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                    }}
                      tabIndex={0}
                      onMouseEnter={e => { if (theme === 'dark') { if (confidence !== opt.value) { e.target.style.background = '#232a47'; e.target.style.color = '#4f8cff'; } } else { if (confidence !== opt.value) { e.target.style.background = 'var(--accent)'; e.target.style.color = '#fff'; } }}}
                      onMouseLeave={e => { if (theme === 'dark') { if (confidence !== opt.value) { e.target.style.background = 'transparent'; e.target.style.color = '#4f8cff'; } } else { if (confidence !== opt.value) { e.target.style.background = 'var(--input-bg)'; e.target.style.color = 'var(--primary)'; } }}}
                    >
                      <input
                        type="radio"
                        name="confidence"
                        value={opt.value}
                        checked={confidence === opt.value}
                        onChange={e => setConfidence(e.target.value)}
                        style={{
                          position: 'absolute',
                          opacity: 0,
                          width: 0,
                          height: 0,
                          pointerEvents: 'none',
                        }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16, justifyContent: 'center' }}>
              {SUGGESTED_SKILLS.slice(0, 6).map(skillName => (
                <button
                  type="button"
                  key={skillName}
                  onClick={() => handleSuggestedSkill(skillName)}
                  style={{
                    background: theme === 'dark' ? (skill === skillName ? '#2563eb' : '#232a47') : (skill === skillName ? 'var(--button-bg)' : '#fff'),
                    color: theme === 'dark' ? (skill === skillName ? '#fff' : '#4f8cff') : (skill === skillName ? 'var(--button-text)' : 'var(--primary)'),
                    border: theme === 'dark' ? (skill === skillName ? '2px solid #2563eb' : '2px solid #2563eb') : (skill === skillName ? 'var(--button-border)' : '1.5px solid var(--primary)'),
                    borderRadius: 'var(--radius)',
                    padding: '8px 18px',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: 'pointer',
                    transition: 'background 0.18s, color 0.18s, border 0.18s, transform 0.18s',
                    boxShadow: skill === skillName ? '0 2px 8px 0 var(--shadow)' : 'none',
                  }}
                  onMouseEnter={e => { if (theme === 'dark') { e.target.style.background = '#2563eb'; e.target.style.color = '#fff'; } else { e.target.style.background = 'var(--button-bg)'; e.target.style.color = 'var(--button-text)'; e.target.style.transform = 'scale(1.06)'; }}}
                  onMouseLeave={e => { if (theme === 'dark') { e.target.style.background = skill === skillName ? '#2563eb' : '#232a47'; e.target.style.color = skill === skillName ? '#fff' : '#4f8cff'; } else { e.target.style.background = skill === skillName ? 'var(--button-bg)' : '#fff'; e.target.style.color = skill === skillName ? 'var(--button-text)' : 'var(--primary)'; e.target.style.transform = 'scale(1)'; }}}
                >
                  {skillName}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const idx = Math.floor(Math.random() * SUGGESTED_SKILLS.length);
                  setSkill(SUGGESTED_SKILLS[idx]);
                }}
                style={{
                  background: 'var(--gradient)',
                  color: 'var(--primary)',
                  border: '1.5px solid var(--accent)',
                  borderRadius: 'var(--radius)',
                  padding: '8px 18px',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: 'pointer',
                  marginLeft: 8,
                  transition: 'background 0.18s, color 0.18s, transform 0.18s',
                  boxShadow: '0 2px 8px 0 var(--shadow)',
                  backdropFilter: 'var(--glass)',
                }}
                onMouseEnter={e => { e.target.style.background = 'var(--button-bg)'; e.target.style.color = 'var(--button-text)'; e.target.style.transform = 'scale(1.06)'; }}
                onMouseLeave={e => { e.target.style.background = 'var(--gradient)'; e.target.style.color = 'var(--primary)'; e.target.style.transform = 'scale(1)'; }}
              >
                🎲 Random Skill
              </button>
            </div>
            <PrimaryButton type="submit" disabled={loading} style={{ width: '100%', marginTop: 6 }}
              aria-label="Generate Milestones"
              onMouseEnter={e => { if (!loading) { if (theme === 'light') { e.target.style.background = 'var(--primary)'; e.target.style.color = '#fff'; } else { e.target.style.background = 'var(--button-hover)'; } }} }
              onMouseLeave={e => { if (!loading) { if (theme === 'light') { e.target.style.background = '#fff'; e.target.style.color = 'var(--primary)'; } else { e.target.style.background = 'var(--button-bg)'; } }} }
            >
              {loading ? 'Generating Plan...' : 'Generate Milestones'}
            </PrimaryButton>
          </form>
          {loading && (
            <div style={{
              background: '#181e36',
              borderRadius: 'var(--radius)',
              padding: '32px 24px',
              margin: '0 auto 32px auto',
              maxWidth: 420,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 2px 12px 0 rgba(37,99,235,0.10)'
            }}>
              <div style={{ marginBottom: 18 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  border: '6px solid #232a47',
                  borderTop: '6px solid #2563eb',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto',
                  boxSizing: 'border-box',
                  display: 'block'
                }}
                className="milestone-spinner"
                />
              </div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 18, marginBottom: 6, textAlign: 'center' }}>
                Generating your personalized milestones...
              </div>
              <div style={{ color: '#b3b8c5', fontSize: 15, textAlign: 'center' }}>
                This may take 10-20 seconds. Please wait.
              </div>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}
          {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}
            {rawResponse && (
              <pre style={{ background: '#232a47', color: '#fff', padding: 12, borderRadius: 8, marginTop: 10, fontSize: 13, maxHeight: 300, overflow: 'auto' }}>{rawResponse}</pre>
            )}
          </div>}
          {milestones.length > 0 && !loading && (
            <div style={{ marginTop: 32, animation: 'fadeInCard 0.7s' }}>
              {/* Progress Bar */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: '#2563eb', fontSize: 17, marginRight: 12 }}>Progress:</span>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{progress}%</span>
                </div>
                <div style={{ width: '100%', height: 18, background: theme === 'light' ? '#e3edfa' : '#232a47', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px 0 rgba(16,24,42,0.10)', border: theme === 'dark' ? '2px solid #4f8cff' : 'none' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #4f8cff 0%, #2563eb 100%)', borderRadius: 10, transition: 'width 0.3s' }} />
                </div>
              </div>
              <h3 style={{ color: '#2563eb' }}>Your Personalized Milestones</h3>
              {milestones.map((m, i) => (
                <div key={i} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', padding: 24, marginBottom: 28, boxShadow: '0 2px 12px 0 rgba(37,99,235,0.08)', animation: 'fadeInCard 0.7s' }}>
                  <h4 style={{ color: 'var(--text)', marginBottom: 6 }}>{m.milestone}</h4>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: 12, fontStyle: 'italic' }}>{m.description}</div>
                  <ul style={{ paddingLeft: 18 }}>
                    {m.tasks.map((task, j) => (
                      <li key={j} style={{ marginBottom: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start' }}>
                        <input
                          type="checkbox"
                          checked={!!checked[`${i}-${j}`]}
                          onChange={() => handleCheck(i, j)}
                          style={{ marginRight: 10, marginTop: 2 }}
                        />
                        <div>
                          <strong>Day {task.day}:</strong> {task.description}
                          {task.link && (
                            <div style={{ marginTop: 4 }}>
                              <a href={task.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{task.link}</a>
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
            </div>
          )}
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
              Have a question about <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{skill || 'your skill'}</span>? Get a detailed, expert answer from the AI.
            </div>
            <AIQuestionBox skill={skill} />
          </div>
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

Home.propTypes = {};
// Add PropTypes as needed for props if Home ever receives any.
// Note: API keys should be stored in .env and accessed via process.env. 