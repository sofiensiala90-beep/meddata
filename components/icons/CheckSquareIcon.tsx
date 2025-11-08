
import React from 'react';

const CheckSquareIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
        <path d="M3 3h18v18H3z" stroke="none"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.996C3 4.34 4.344 3 6.004 3h11.992C19.654 3 21 4.345 21 5.996v11.992A2.998 2.998 0 0 1 17.996 21H6.004A2.998 2.998 0 0 1 3 17.996V5.996Z" />
    </svg>
);

export default CheckSquareIcon;
