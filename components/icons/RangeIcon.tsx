import React from 'react';

const RangeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
      <circle cx="10" cy="12" r="3" stroke="none" fill="currentColor" />
    </svg>
);

export default RangeIcon;
