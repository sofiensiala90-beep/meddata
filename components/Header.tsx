import React, { useState, useRef, useEffect } from 'react';
import { User, Notification } from '../types';
import BellIcon from './icons/BellIcon';
import ProfileIcon from './icons/ProfileIcon';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';
import CoinIcon from './icons/CoinIcon';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  currentPage: string;
  notifications: Notification[];
  onMarkNotificationsRead: () => void;
  theme: string;
  onToggleTheme: () => void;
  onNavigate: (page: string) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, currentPage, notifications, onMarkNotificationsRead, theme, onToggleTheme, onNavigate, setIsSidebarOpen }) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isNotificationsOpen || isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen, isProfileMenuOpen]);

  const handleBellClick = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    if (!isNotificationsOpen && unreadCount > 0) {
      onMarkNotificationsRead();
    }
  };
  
  const handleNotificationClick = () => {
    onNavigate('notifications');
    setIsNotificationsOpen(false);
  };

  const pageTitles: { [key: string]: string } = {
    'tableau-de-bord': 'Tableau de bord',
    'formulaires': 'Formulaires',
    'analyse': 'Analyse IA',
    'portefeuille': 'Portefeuille',
    'profil': 'Profil',
    'notifications': 'Notifications',
    'etudiants': 'Étudiants',
    'finances': 'Finances',
    'activite': 'Activité',
    'bibliotheque': 'Bibliothèque',
  };

  const title = pageTitles[currentPage] || currentPage;

  return (
    <header className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-20">
      <div className="flex items-center justify-between p-4 h-full">
        <div className="flex items-center">
          <button
            className="lg:hidden text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white mr-4"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h1>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
           <button 
            onClick={onToggleTheme}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white focus:outline-none p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Toggle theme"
            >
            {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
          </button>

          {user.role === 'student' && (
            <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200" title="Votre solde de Coins">
                <CoinIcon className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                <span className="font-semibold">{user.coinBalance.toLocaleString()}</span>
            </div>
          )}

          <div ref={notificationsRef} className="relative">
            <button onClick={handleBellClick} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white focus:outline-none">
              <BellIcon className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </button>
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border dark:border-slate-700 z-10">
                <div className="p-3 font-semibold border-b dark:border-slate-700 flex justify-between items-center">
                    <span>Notifications</span>
                    <button onClick={handleNotificationClick} className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">Voir tout</button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length > 0 ? (
                    [...notifications].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(notif => (
                      <button 
                        key={notif.id} 
                        onClick={handleNotificationClick}
                        className={`w-full text-left p-3 text-sm border-b dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!notif.read ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                      >
                        <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{notif.message}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                      Aucune notification.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

           <div ref={profileMenuRef} className="relative">
            <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} 
                className="flex items-center space-x-3 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                aria-label="Ouvrir le menu du profil"
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="true"
            >
                <div className="relative w-10 h-10 overflow-hidden bg-slate-100 rounded-full dark:bg-slate-600">
                    <ProfileIcon className="absolute w-12 h-12 text-slate-400 -left-1" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="font-semibold text-sm text-slate-900 dark:text-white">{user.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                </div>
            </button>
            {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border dark:border-slate-700 z-10 overflow-hidden">
                    <div className="py-1">
                         {user.role === 'student' && (
                          <button
                              onClick={() => { onNavigate('profil'); setIsProfileMenuOpen(false); }}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center"
                          >
                              <ProfileIcon className="w-4 h-4 mr-3" />
                              Mon Profil
                          </button>
                        )}
                        <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                        <button
                            onClick={onLogout}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Déconnexion
                        </button>
                    </div>
                </div>
            )}
        </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
