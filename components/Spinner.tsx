
import React from 'react';

const Spinner: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => {
  return (
    <div
      className={`animate-spin rounded-full border-4 border-t-primary-500 border-slate-200 dark:border-slate-600 ${className}`}
      style={{ borderTopColor: 'currentColor' }}
    />
  );
};

export default Spinner;