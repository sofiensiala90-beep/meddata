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
  onNotificationClick?: (notification: Notification) => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, currentPage, notifications, onMarkNotificationsRead, theme, onToggleTheme, onNavigate, setIsSidebarOpen, onNotificationClick }) => {
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
  
  const handleViewAllNotifications = () => {
    onNavigate('notifications');
    setIsNotificationsOpen(false);
  };

  const handleSingleNotificationClick = (notif: Notification) => {
      if (onNotificationClick) {
          onNotificationClick(notif);
      } else {
          onNavigate('notifications');
      }
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
    <header className="flex-shrink-0 bg-transparent h-24 z-20">
      <div className="flex items-center justify-between px-6 py-6 h-full">
        <div className="flex items-center">
          <button
            className="lg:hidden text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-white mr-4 transition-colors"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <div>
             <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{title}</h1>
             <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
             </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 sm:space-x-5">
           <button 
            onClick={onToggleTheme}
            className="text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 focus:outline-none p-2 rounded-full hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all"
            aria-label="Toggle theme"
            >
            {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
          </button>

          {user.role === 'student' && (
            <div className="hidden sm:flex items-center space-x-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm border border-slate-100 dark:border-slate-700" title="Votre solde de Coins">
                <div className="bg-yellow-100 p-1 rounded-full">
                    <CoinIcon className="w-5 h-5 text-yellow-600" />
                </div>
                <span className={`font-bold text-lg ${user.coinBalance < 0 ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>{user.coinBalance.toLocaleString()}</span>
            </div>
          )}

          <div ref={notificationsRef} className="relative">
            <button onClick={handleBellClick} className="text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 focus:outline-none p-2 rounded-full hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all relative">
              <BellIcon className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white dark:border-slate-800"></span>
                </span>
              )}
            </button>
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-4 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden transform origin-top-right transition-all">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <span className="font-bold text-slate-800 dark:text-white">Notifications</span>
                    <button onClick={handleViewAllNotifications} className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400">Voir tout</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    [...notifications].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(notif => (
                      <button 
                        key={notif.id} 
                        onClick={() => handleSingleNotificationClick(notif)}
                        className={`w-full text-left p-4 text-sm border-b border-slate-50 dark:border-slate-700/50 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!notif.read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${!notif.read ? 'bg-primary-500' : 'bg-slate-300'}`}></div>
                            <div>
                                <p className={`text-slate-800 dark:text-slate-200 whitespace-pre-wrap ${!notif.read ? 'font-medium' : ''}`}>{notif.message}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                            </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400 flex flex-col items-center">
                        <BellIcon className="w-8 h-8 mb-2 text-slate-300" />
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
                className="flex items-center space-x-3 p-1.5 rounded-full bg-white dark:bg-slate-800 hover:shadow-md transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Ouvrir le menu du profil"
            >
                <div className="relative w-9 h-9 overflow-hidden bg-primary-100 rounded-full dark:bg-slate-700 flex items-center justify-center text-primary-600 dark:text-primary-300">
                    <span className="font-bold text-lg">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="text-left hidden sm:block pr-2">
                  <p className="font-bold text-sm text-slate-800 dark:text-white leading-none">{user.name.split(' ')[0]}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mt-0.5">{user.role === 'admin' ? 'Admin' : 'Étudiant'}</p>
                </div>
                <div className="hidden sm:block text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </button>
            {isProfileMenuOpen && (
                <div className="absolute right-0 mt-4 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden transform origin-top-right transition-all">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    </div>
                    <div className="py-2">
                         {user.role === 'student' && (
                          <button
                              onClick={() => { onNavigate('profil'); setIsProfileMenuOpen(false); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"
                          >
                              <ProfileIcon className="w-4 h-4 mr-3 text-slate-400" />
                              Mon Profil
                          </button>
                        )}
                        <button
                            onClick={onLogout}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
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