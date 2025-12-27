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
    'tableau-de-bord': 'Accueil',
    'formulaires': 'Mes Formulaires',
    'analyse': 'Analyse IA',
    'portefeuille': 'Wallet',
    'profil': 'Mon Profil',
    'notifications': 'Alertes',
    'etudiants': 'Gestion Étudiants',
    'finances': 'Finances',
    'activite': 'Journal',
    'bibliotheque': 'Bibliothèque',
  };

  const title = pageTitles[currentPage] || currentPage;

  return (
    <header className="flex-shrink-0 glass-panel border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30 h-20 lg:h-24">
      <div className="flex items-center justify-between px-4 sm:px-6 h-full gap-2">
        <div className="flex items-center min-w-0">
          <button
            className="lg:hidden text-slate-500 hover:text-primary-600 dark:text-slate-400 p-2 -ml-2 transition-colors"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <div className="min-w-0">
             <h1 className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white truncate tracking-tight">{title}</h1>
             <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase hidden sm:block">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
             </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-4">
           <button 
            onClick={onToggleTheme}
            className="text-slate-500 hover:text-primary-600 dark:text-slate-400 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0"
            aria-label="Mode sombre/clair"
            >
            {theme === 'light' ? <MoonIcon className="w-5 h-5 sm:w-6" /> : <SunIcon className="w-5 h-5 sm:w-6" />}
          </button>

          {user.role === 'student' && (
            <div className="flex items-center space-x-1.5 bg-yellow-50 dark:bg-yellow-900/20 px-2.5 py-1.5 rounded-full border border-yellow-100 dark:border-yellow-800 shadow-sm shrink-0" title="Votre solde">
                <CoinIcon className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                <span className={`font-black text-xs sm:text-base ${user.coinBalance < 0 ? 'text-red-500' : 'text-yellow-700 dark:text-yellow-400'}`}>{user.coinBalance.toLocaleString()}</span>
            </div>
          )}

          <div ref={notificationsRef} className="relative shrink-0">
            <button onClick={handleBellClick} className="text-slate-500 hover:text-primary-600 dark:text-slate-400 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all relative">
              <BellIcon className="w-5 h-5 sm:w-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white dark:border-slate-900"></span>
                </span>
              )}
            </button>
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-3 w-[85vw] sm:w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden transform origin-top-right transition-all animate-mobile-slide-up sm:animate-none">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b flex justify-between items-center">
                    <span className="font-black text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Notifications</span>
                    <button onClick={handleViewAllNotifications} className="text-[10px] font-black uppercase text-primary-600 hover:text-primary-700">Voir tout</button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {notifications.length > 0 ? (
                    [...notifications].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(notif => (
                      <button 
                        key={notif.id} 
                        onClick={() => handleSingleNotificationClick(notif)}
                        className={`w-full text-left p-4 text-sm border-b dark:border-slate-700/50 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!notif.read ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${!notif.read ? 'bg-primary-500' : 'bg-slate-300'}`}></div>
                            <div>
                                <p className={`text-slate-800 dark:text-slate-200 leading-snug ${!notif.read ? 'font-semibold' : ''}`}>{notif.message}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1.5">{new Date(notif.createdAt).toLocaleDateString()} • {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-10 text-center text-sm text-slate-400 flex flex-col items-center italic">
                        Aucune notification.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

           <div ref={profileMenuRef} className="relative shrink-0">
            <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} 
                className="flex items-center p-1 rounded-full border-2 border-transparent hover:border-primary-100 dark:hover:border-primary-900 transition-all focus:outline-none"
                aria-label="Menu profil"
            >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-black text-sm sm:text-base shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                </div>
            </button>
            {isProfileMenuOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden transform origin-top-right transition-all">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <p className="font-black text-slate-900 dark:text-white truncate text-sm uppercase">{user.name}</p>
                        <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mt-0.5">{user.role === 'admin' ? 'Administration' : 'Étudiant'}</p>
                    </div>
                    <div className="py-1">
                        <button
                            onClick={() => { onNavigate('profil'); setIsProfileMenuOpen(false); }}
                            className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center"
                        >
                            <ProfileIcon className="w-4 h-4 mr-3 text-slate-400" />
                            Mon Profil
                        </button>
                        {/* FIX: Change handleLogout to onLogout to match destructured prop name */}
                        <button
                            onClick={onLogout}
                            className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center border-t dark:border-slate-700/50"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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