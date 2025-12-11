import React from 'react';

const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <img
    src="https://storage.googleapis.com/prompt-gallery/prod/c3298c4d-7a6c-4b68-812e-a5796c5678cd/image.png"
    alt="DASS Logo"
    className={className}
  />
);

export default LogoIcon;