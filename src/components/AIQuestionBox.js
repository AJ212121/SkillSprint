import React from 'react';
import PropTypes from 'prop-types';
import { sendPrompt } from '../api/openai';

function AIQuestionBox({ skill }) {
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const inputRef = React.useRef();
  const isAnswered = !!answer;

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const prompt = `You are an expert in ${skill || 'this topic'}. Answer the following question in a highly detailed, step-by-step, and easy-to-understand way, as if you are tutoring a beginner. Use clear explanations, analogies, and practical examples. Question: "${question}"`;
      const res = await sendPrompt(prompt);
      setAnswer(res.choices[0].message.content.trim());
    } catch (err) {
      setError("Sorry, the AI could not answer your question. Please try again.");
    }
    setLoading(false);
  };

  const handleRefresh = () => {
    setQuestion("");
    setAnswer("");
    setError("");
    inputRef.current && inputRef.current.focus();
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <form onSubmit={handleAsk} style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder={`Ask anything about ${skill || 'your skill'}...`}
          aria-label="Ask the AI Expert"
          style={{
            flex: 1,
            padding: 14,
            fontSize: 17,
            borderRadius: 'var(--radius)',
            border: '1.5px solid var(--input-border)',
            background: 'var(--input-bg)',
            color: 'var(--text)',
            fontWeight: 500,
            outline: 'none',
            boxShadow: '0 1px 4px 0 rgba(16,24,42,0.06)',
            transition: 'border 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => e.target.style.border = '1.5px solid var(--primary)'}
          onBlur={e => e.target.style.border = '1.5px solid var(--input-border)'}
          disabled={loading || isAnswered}
        />
        {isAnswered ? (
          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Refresh question and answer"
            style={{
              background: 'var(--card)',
              color: 'var(--accent)',
              border: 'none',
              borderRadius: 8,
              padding: '0 22px',
              fontWeight: 700,
              fontSize: 16,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px 0 var(--shadow)',
              transition: 'background 0.18s',
              height: 44,
              outline: '2px solid transparent',
            }}
            disabled={loading}
          >
            Refresh
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Ask the AI Expert"
            disabled={loading || !question.trim()}
            style={{
              background: 'var(--button-bg)',
              color: 'var(--button-text)',
              border: 'none',
              borderRadius: 8,
              padding: '0 22px',
              fontWeight: 700,
              fontSize: 16,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px 0 var(--shadow)',
              transition: 'background 0.18s',
              height: 44,
              outline: '2px solid transparent',
            }}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        )}
      </form>
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '12px 0 0 0' }}>
          <div style={{
            width: 32, height: 32, border: '5px solid var(--card)', borderTop: '5px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 6
          }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Thinking...</span>
        </div>
      )}
      {error && <div style={{ color: 'var(--danger)', marginBottom: 10 }}>{error}</div>}
      {answer && (
        <div style={{
          background: 'var(--card)',
          color: 'var(--text)',
          borderRadius: 10,
          padding: '18px 16px',
          fontSize: 16,
          marginTop: 6,
          boxShadow: '0 1px 4px 0 rgba(16,24,42,0.10)',
          whiteSpace: 'pre-line',
        }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>AI:</span> {answer}
        </div>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

AIQuestionBox.propTypes = {
  skill: PropTypes.string
};

export default AIQuestionBox; 