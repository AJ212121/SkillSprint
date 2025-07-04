import React from 'react';
import PropTypes from 'prop-types';

function Toast({ message, type, onClose }) {
  React.useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 3500);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 2000,
        background: type === 'error' ? '#ef4444' : '#2563eb',
        color: '#fff',
        padding: '16px 32px',
        borderRadius: 12,
        boxShadow: '0 4px 24px 0 #232a4744',
        fontWeight: 700,
        fontSize: 16,
        minWidth: 220,
        textAlign: 'center',
        letterSpacing: 0.2,
        animation: 'fadeInToast 0.4s',
      }}
    >
      {message}
      <button
        onClick={onClose}
        aria-label="Close notification"
        style={{
          marginLeft: 18,
          background: 'none',
          border: 'none',
          color: '#fff',
          fontWeight: 900,
          fontSize: 18,
          cursor: 'pointer',
        }}
      >×</button>
      <style>{`
        @keyframes fadeInToast {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

Toast.propTypes = {
  message: PropTypes.string,
  type: PropTypes.oneOf(['success', 'error']),
  onClose: PropTypes.func.isRequired,
};

export default Toast; 