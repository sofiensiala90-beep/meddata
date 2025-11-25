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
    className={`flex items-center w-full px-4 py-3 text-sm font-medium transition-colors duration-200 ${
      isActive
        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    title={disabled ? "Cette fonctionnalité est désactivée car votre compte est suspendu." : ""}
  >
    <span className="mr-3">{icon}</span>
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

  // FIX: Added `disabled: false` to all admin nav items to ensure a consistent object shape.
  const adminNavItems = [
    { id: 'tableau-de-bord', label: 'Tableau de bord', icon: <DashboardIcon className="w-5 h-5" />, disabled: false },
    { id: 'etudiants', label: 'Étudiants', icon: <StudentsIcon className="w-5 h-5" />, disabled: false },
    { id: 'formulaires', label: 'Formulaires', icon: <FormsIcon className="w-5 h-5" />, disabled: false },
    { id: 'finances', label: 'Finances', icon: <FinanceIcon className="w-5 h-5" />, disabled: false },
    { id: 'activite', label: 'Activité', icon: <ActivityIcon className="w-5 h-5" />, disabled: false },
    { id: 'profil', label: 'Profil', icon: <ProfileIcon className="w-5 h-5" />, disabled: false },
    { id: 'notifications', label: 'Notifications', icon: <BellIcon className="w-5 h-5" />, disabled: false },
  ];

  const navItems = user.role === 'admin' ? adminNavItems : studentNavItems;

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 flex flex-col w-64 h-screen bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="flex items-center justify-center h-20 border-b border-slate-200 dark:border-slate-700">
        <LogoIcon className="h-16 w-auto" />
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <nav className="py-4">
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
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={onOpenComplaintModal}
              className="flex items-center w-full px-4 py-3 text-sm font-medium transition-colors duration-200 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg"
            >
              <HelpIcon className="w-5 h-5 mr-3" />
              <span>Faire une réclamation</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;