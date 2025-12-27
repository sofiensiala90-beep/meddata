import React from 'react';

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  titleAddon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

const Card: React.FC<CardProps> = ({ title, titleAddon, children, className = '', titleClassName = '', ...props }) => {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden transition-all duration-300 hover:shadow-md ${className}`} {...props}>
      {(title || titleAddon) && (
        <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gradient-to-r from-slate-50/50 to-white dark:from-slate-800 dark:to-slate-800/50">
          {title && (
            <h3 className={`text-lg sm:text-xl font-bold text-slate-800 dark:text-white tracking-tight leading-tight ${titleClassName}`}>
              {title}
            </h3>
          )}
          {titleAddon && (
            <div className="flex-shrink-0 w-full sm:w-auto">{titleAddon}</div>
          )}
        </div>
      )}
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;