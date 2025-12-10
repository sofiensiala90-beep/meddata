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
    <div className={`bg-white dark:bg-slate-800 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden transition-shadow duration-300 hover:shadow-lg ${className}`} {...props}>
      {(title || titleAddon) && (
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center gap-4 bg-gradient-to-r from-slate-50/50 to-white dark:from-slate-800 dark:to-slate-800/50">
          {title && (
            <h3 className={`text-xl font-bold text-slate-800 dark:text-white tracking-tight ${titleClassName}`}>
              {title}
            </h3>
          )}
          {titleAddon && (
            <div className="flex-shrink-0">{titleAddon}</div>
          )}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;