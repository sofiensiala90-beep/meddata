import React from 'react';

const WordIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" className="text-blue-500 opacity-20" fill="currentColor"/>
    <path d="M14 2v6h6" className="text-blue-600 opacity-40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 13h-2.5l-1-3-1 3H9" className="text-blue-700" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 11h8v8H8z" fill="none"/>
    <path d="M7 11l2 8 2-6 2 6 2-8" className="text-blue-600" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

export default WordIcon;