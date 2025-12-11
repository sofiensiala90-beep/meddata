import React from 'react';
import LogoIcon from './icons/LogoIcon';
import DashboardIcon from './icons/DashboardIcon';
import FormsIcon from './icons/FormsIcon';
import AnalysisIcon from './icons/AnalysisIcon';
import WalletIcon from './icons/WalletIcon';
import ProfileIcon from './icons/ProfileIcon';
import StudentsIcon from './icons/StudentsIcon';
import FinanceIcon from './icons/FinanceIcon';
import ActivityIcon from './icons/ActivityIcon';
import HelpIcon from './icons/HelpIcon';
import { User } from '../types';
import BellIcon from './icons/BellIcon';
import LibraryIcon from './icons/LibraryIcon';
import SettingsIcon from './icons/SettingsIcon';

interface SidebarProps {
  user: User;
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenComplaintModal: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const NavItem: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; disabled?: boolean; }> = ({ icon, label, isActive, onClick, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`group flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-300 rounded-2xl mb-1 ${
      isActive
        ? 'bg-primary-600 text-white shadow-glow shadow-primary-500/30'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50 hover:pl-6'
    } ${disabled ? 'opacity-50 cursor-not-allowed hover:pl-4' : ''}`}
    title={disabled ? "Cette fonctionnalité est désactivée car votre compte est suspendu." : ""}
  >
    <span className={`mr-3 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</span>
    <span>{label}</span>
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ user, currentPage, onNavigate, onOpenComplaintModal, isSidebarOpen, setIsSidebarOpen }) => {
  const isSuspended = user.role === 'student' && user.status.startsWith('suspended');

  const handleNavigation = (page: string) => {
    onNavigate(page);
    if (window.innerWidth < 1024) { // 'lg' breakpoint in Tailwind
      setIsSidebarOpen(false);
    }
  };

  const studentNavItems = [
    { id: 'tableau-de-bord', label: 'Tableau de bord', icon: <DashboardIcon className="w-5 h-5" />, disabled: isSuspended },
    { id: 'formulaires', label: 'Formulaires', icon: <FormsIcon className="w-5 h-5" />, disabled: isSuspended },
    { id: 'bibliotheque', label: 'Bibliothèque', icon: <LibraryIcon className="w-5 h-5" />, disabled: isSuspended },
    { id: 'analyse', label: 'Analyse IA', icon: <AnalysisIcon className="w-5 h-5" />, disabled: isSuspended },
    { id: 'portefeuille', label: 'Portefeuille', icon: <WalletIcon className="w-5 h-5" />, disabled: false },
    { id: 'notifications', label: 'Notifications', icon: <BellIcon className="w-5 h-5" />, disabled: false },
    { id: 'profil', label: 'Profil', icon: <ProfileIcon className="w-5 h-5" />, disabled: false },
  ];

  const adminNavItems = [
    { id: 'tableau-de-bord', label: 'Tableau de bord', icon: <DashboardIcon className="w-5 h-5" />, disabled: false },
    { id: 'etudiants', label: 'Étudiants', icon: <StudentsIcon className="w-5 h-5" />, disabled: false },
    { id: 'formulaires', label: 'Formulaires', icon: <FormsIcon className="w-5 h-5" />, disabled: false },
    { id: 'finances', label: 'Finances', icon: <FinanceIcon className="w-5 h-5" />, disabled: false },
    { id: 'activite', label: 'Activité', icon: <ActivityIcon className="w-5 h-5" />, disabled: false },
    { id: 'configuration', label: 'Configuration', icon: <SettingsIcon className="w-5 h-5" />, disabled: false },
    { id: 'profil', label: 'Profil', icon: <ProfileIcon className="w-5 h-5" />, disabled: false },
    { id: 'notifications', label: 'Notifications', icon: <BellIcon className="w-5 h-5" />, disabled: false },
  ];

  const navItems = user.role === 'admin' ? adminNavItems : studentNavItems;
  const currentYear = new Date().getFullYear();

  return (
    <>
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-72 h-[96vh] m-2 lg:m-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-2xl rounded-3xl transform transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[120%]'} lg:translate-x-0`}>
        <div className="flex items-center justify-center h-24 border-b border-slate-100 dark:border-slate-700/50 shrink-0">
          <LogoIcon className="h-16 w-auto drop-shadow-md" />
        </div>
        
        <div className="flex-1 flex flex-col justify-between overflow-y-auto py-6 px-4 scrollbar-hide">
          <nav className="space-y-1">
            {navItems.map(item => (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                isActive={currentPage === item.id}
                onClick={() => handleNavigation(item.id)}
                disabled={item.disabled}
              />
            ))}
          </nav>
          
          {user.role === 'student' && (
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/50">
              <button
                onClick={onOpenComplaintModal}
                className="flex items-center w-full px-4 py-3 text-sm font-medium transition-colors duration-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-2xl"
              >
                <HelpIcon className="w-5 h-5 mr-3" />
                <span>Support & Aide</span>
              </button>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-b-3xl shrink-0">
            <div className="flex flex-col gap-2 px-2 text-center">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">System Ready</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">v2.1</span>
                </div>
                
                <div className="border-t border-slate-200 dark:border-slate-700/50 my-2"></div>
                
                <div className="flex flex-col items-center justify-center space-y-0.5">
                    <span className="text-lg font-bold tracking-tight text-slate-700 dark:text-white">DASS</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight">Data Analysis Statistical System</span>
                    <span className="text-[10px] uppercase tracking-widest text-primary-600 dark:text-primary-400 font-bold mt-1">from JS GATE</span>
                </div>
                
                <div className="text-[10px] text-slate-400 dark:text-slate-600 mt-2">
                    © {currentYear} JS GATE Corp.<br/>
                    Tous droits réservés.
                </div>
            </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;