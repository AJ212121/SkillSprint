import React from 'react';
import PropTypes from 'prop-types';

/**
 * Card: A reusable container for consistent card layout and spacing.
 * Applies theme variables for background, border, shadow, and radius.
 * Accepts style and className for overrides.
 */
export default function Card({ children, style = {}, className = '', ...props }) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        border: '1.5px solid var(--border)',
        backdropFilter: 'var(--glass)',
        padding: '32px 24px',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}

Card.propTypes = {
  children: PropTypes.node,
  style: PropTypes.object,
  className: PropTypes.string,
}; 