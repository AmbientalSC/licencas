import React from 'react';

export const ColumnsIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="4" width="4" height="16" rx="1" />
    <rect x="9" y="4" width="4" height="16" rx="1" />
    <rect x="15" y="4" width="4" height="16" rx="1" />
  </svg>
); 