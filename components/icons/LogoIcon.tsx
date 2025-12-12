import React from 'react';

const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 128 128"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="DASS Logo - Data Analysis Statistical System"
  >
    <defs>
      <linearGradient id="logoGradient" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0f766e" />   {/* Teal 700 */}
        <stop offset="100%" stopColor="#2dd4bf" /> {/* Teal 400 */}
      </linearGradient>
      <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.2"/>
      </filter>
    </defs>

    <g filter="url(#logoShadow)">
        {/* Outer Ring / Badge Background */}
        <circle cx="64" cy="64" r="60" stroke="url(#logoGradient)" strokeWidth="4" fill="white" />
        
        {/* Decorative Inner Ring */}
        <circle cx="64" cy="64" r="54" stroke="#ccfbf1" strokeWidth="1.5" strokeDasharray="4 3" />

        {/* Central Graphic: Brain (Intelligence) */}
        <path 
            d="M40 55 C 32 40, 48 20, 64 20 C 80 20, 96 40, 88 55 C 88 70, 75 76, 64 76 C 53 76, 40 70, 40 55 Z" 
            fill="#f0fdfa" 
            stroke="#14b8a6" 
            strokeWidth="2.5"
        />
        
        {/* Brain Connections (Nodes) */}
        <g fill="#0f766e">
            <circle cx="50" cy="45" r="3" />
            <circle cx="64" cy="35" r="3" />
            <circle cx="78" cy="45" r="3" />
            <circle cx="56" cy="60" r="3" />
            <circle cx="72" cy="60" r="3" />
        </g>
        <path d="M50 45 L64 35 L78 45 M50 45 L56 60 L72 60 L78 45 M64 35 L64 50" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" />

        {/* Bar Chart (Statistics) - positioned below/overlaying bottom of brain */}
        <g transform="translate(42, 80)">
            <rect x="0" y="12" width="8" height="12" fill="#0f766e" rx="1" />
            <rect x="12" y="4" width="8" height="20" fill="#14b8a6" rx="1" />
            <rect x="24" y="8" width="8" height="16" fill="#2dd4bf" rx="1" />
            <rect x="36" y="0" width="8" height="24" fill="#5eead4" rx="1" />
            {/* Baseline */}
            <line x1="-2" y1="26" x2="46" y2="26" stroke="#334155" strokeWidth="2" strokeLinecap="round"/>
        </g>

        {/* Magnifying Glass (Analysis) - Overlaying right side */}
        <g transform="translate(86, 76) rotate(-15)">
            {/* Handle */}
            <path d="M12 12 L24 24" stroke="#d97706" strokeWidth="5" strokeLinecap="round" />
            {/* Glass Rim */}
            <circle cx="0" cy="0" r="16" stroke="#d97706" strokeWidth="3.5" fill="rgba(255,255,255,0.4)" />
            {/* Reflection */}
            <path d="M-10 -10 Q -5 -14 0 -11" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
        </g>
    </g>
  </svg>
);

export default LogoIcon;