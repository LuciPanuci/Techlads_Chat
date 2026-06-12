import React from 'react';

export default function LoadingSpinner({ size = 'md', color = '#3B82F6' }) {
  const dimension = size === 'sm' ? '1rem' : '1.5rem';
  return (
    <span
      className="scc-spinner"
      style={{
        width: dimension,
        height: dimension,
        borderTopColor: color,
      }}
      aria-hidden="true"
    />
  );
}
