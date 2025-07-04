import React from 'react';
import PropTypes from 'prop-types';

function Modal({ open, onClose, onConfirm, title, message, confirmText, cancelText, loading }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(24,31,44,0.65)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div style={{
        background: '#232a47',
        borderRadius: 16,
        padding: '36px 32px',
        boxShadow: '0 8px 40px 0 rgba(37,99,235,0.18)',
        minWidth: 320,
        maxWidth: '90vw',
        textAlign: 'center',
        animation: 'fadeInCard 0.5s',
      }}>
        <h2 id="modal-title" style={{ color: '#ef4444', fontWeight: 800, fontSize: 22, marginBottom: 16 }}>{title}</h2>
        <div style={{ color: '#b3b8c5', fontSize: 17, marginBottom: 28 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
          <button
            onClick={onClose}
            aria-label="Cancel"
            style={{
              background: 'none',
              color: '#b3b8c5',
              border: '1.5px solid #b3b8c5',
              borderRadius: 8,
              padding: '8px 28px',
              fontWeight: 600,
              fontSize: 16,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.18s, color 0.18s',
            }}
            disabled={loading}
          >
            {cancelText || 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            aria-label={confirmText || 'Confirm'}
            style={{
              background: loading ? '#ef444455' : '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 28px',
              fontWeight: 700,
              fontSize: 16,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px 0 #ef444433',
              transition: 'background 0.18s',
            }}
            disabled={loading}
          >
            {loading ? 'Processing...' : (confirmText || 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

Modal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  loading: PropTypes.bool
};

export default Modal; 