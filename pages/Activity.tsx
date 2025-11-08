

import React from 'react';
import Card from '../components/Card';

// For this demo, activity will be a placeholder.
// In a real app, this would come from a log of all significant actions.
const Activity: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Journal d'Activité</h2>
      <Card>
        <div className="text-center py-12">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Journal d'activité de la plateforme</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Cette fonctionnalité n'est pas encore implémentée.</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Elle affichera un log de toutes les actions importantes (créations de formulaires, analyses, etc.).</p>
        </div>
      </Card>
    </div>
  );
};

export default Activity;