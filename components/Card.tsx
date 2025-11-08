
import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', titleClassName = '' }) => {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden ${className}`}>
      {title && (
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className={`text-lg sm:text-xl font-semibold text-slate-900 dark:text-white ${titleClassName}`}>
            {title}
          </h3>
        </div>
      )}
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;