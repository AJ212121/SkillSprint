import React, { useState } from 'react';
import useLinkValid from './useLinkValid';
import PropTypes from 'prop-types';

export default function ValidatedLink({ url }) {
  const [retryKey, setRetryKey] = useState(0);
  const { valid, loading } = useLinkValid(url + (retryKey ? `?retry=${retryKey}` : ''));
  if (!url) return null;
  if (loading) return <div style={{ marginTop: 4, color: '#b3b8c5', fontWeight: 500, fontSize: 14 }}>Checking resource...</div>;
  if (!valid) return <div style={{ marginTop: 4, color: 'red', fontWeight: 600 }}>
    Resource unavailable
    <button style={{ marginLeft: 10, fontSize: 13, background: 'none', border: '1px solid #4f8cff', color: '#4f8cff', borderRadius: 6, padding: '2px 10px', cursor: 'pointer' }} onClick={() => setRetryKey(k => k + 1)}>Retry</button>
  </div>;
  return (
    <div style={{ marginTop: 4 }}>
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#4f8cff' }}>{url}</a>
    </div>
  );
}

ValidatedLink.propTypes = {
  url: PropTypes.string
}; 