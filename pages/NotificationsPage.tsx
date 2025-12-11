import React from 'react';
import { Notification } from '../types';
import Card from '../components/Card';
import BellIcon from '../components/icons/BellIcon';

interface NotificationsPageProps {
  notifications: Notification[];
  onNotificationClick?: (notification: Notification) => void;
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ notifications, onNotificationClick }) => {
  const sortedNotifications = [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Notifications</h2>
      
      <Card>
        {sortedNotifications.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {sortedNotifications.map(notif => (
              <div 
                key={notif.id} 
                className={`p-4 flex items-start space-x-4 relative transition-colors ${onNotificationClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''}`}
                onClick={() => onNotificationClick && onNotificationClick(notif)}
              >
                {!notif.read && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-2 w-2 bg-primary-500 rounded-full" title="Non lue"></span>
                )}
                <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${!notif.read ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-slate-100 dark:bg-slate-700'}`}>
                   <BellIcon className={`h-6 w-6 ${!notif.read ? 'text-primary-600 dark:text-primary-300' : 'text-slate-500 dark:text-slate-400'}`} />
                </div>
                <div className="flex-grow">
                  <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{notif.message}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Aucune notification</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Vous n'avez pas de nouvelles notifications pour le moment.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default NotificationsPage;