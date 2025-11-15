import React from 'react';

// FIX: Used Omit to resolve conflict between custom `title: React.ReactNode` and inherited `title: string` from HTMLAttributes.
interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  titleAddon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

const Card: React.FC<CardProps> = ({ title, titleAddon, children, className = '', titleClassName = '', ...props }) => {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden ${className}`} {...props}>
      {(title || titleAddon) && (
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center gap-4">
          {title && (
            <h3 className={`text-lg sm:text-xl font-semibold text-slate-900 dark:text-white ${titleClassName}`}>
              {title}
            </h3>
          )}
          {titleAddon && (
            <div className="flex-shrink-0">{titleAddon}</div>
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
