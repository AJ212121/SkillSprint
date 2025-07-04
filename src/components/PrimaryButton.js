import React from 'react';
import PropTypes from 'prop-types';

/**
 * PrimaryButton: A reusable button for primary actions.
 * Applies theme variables for background, color, border, and radius.
 * Accepts style and className for overrides.
 */
export default function PrimaryButton({ children, style = {}, className = '', ...props }) {
  return (
    <button
      className={className}
      style={{
        background: 'var(--button-bg)',
        color: 'var(--button-text)',
        border: 'var(--button-border)',
        borderRadius: 'var(--radius)',
        fontWeight: 700,
        fontSize: 16,
        padding: '10px 32px',
        cursor: 'pointer',
        boxShadow: '0 1px 4px 0 var(--shadow)',
        transition: 'background 0.18s, color 0.18s, border 0.18s, transform 0.18s',
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
}

PrimaryButton.propTypes = {
  children: PropTypes.node,
  style: PropTypes.object,
  className: PropTypes.string,
}; 