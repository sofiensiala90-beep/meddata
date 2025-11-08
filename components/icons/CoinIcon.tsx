import React from 'react';

const CoinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12,2C6.486,2,2,6.486,2,12s4.486,10,10,10s10-4.486,10-10S17.514,2,12,2z M12,20c-4.411,0-8-3.589-8-8s3.589-8,8-8 s8,3.589,8,8S16.411,20,12,20z" />
    <path d="M12,10c-1.079,0-2.093,0.24-3,0.684V15.5c0,0,2.162-1.5,3-1.5s3,1.5,3,1.5V10.684C14.093,10.24,13.079,10,12,10z" />
    <path d="M12,6c-2.757,0-5,1.794-5,4h10C17,7.794,14.757,6,12,6z" />
  </svg>
);

export default CoinIcon;
