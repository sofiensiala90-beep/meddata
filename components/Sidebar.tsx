import React from 'react';
import LogoIcon from './icons/LogoIcon';
import DashboardIcon from './icons/DashboardIcon';
import FormsIcon from './icons/FormsIcon';
import AnalysisIcon from './icons/AnalysisIcon';
import WalletIcon from './icons/WalletIcon';
import StudentsIcon from './icons/StudentsIcon';
import FinanceIcon from './icons/FinanceIcon';
import ActivityIcon from './icons/ActivityIcon';
import HelpIcon from './icons/HelpIcon';
import { User } from '../types';
import LibraryIcon from './icons/LibraryIcon';
import SettingsIcon from './icons/SettingsIcon';
import TrashIcon from './icons/TrashIcon';

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
    className={`group flex items-center w-full px-4 py-4 sm:py-3.5 text-sm font-black uppercase tracking-widest transition-all duration-200 rounded-2xl mb-1.5 ${
      isActive
        ? 'bg-primary-600 text-white shadow-glow shadow-primary-500/20'
        : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50'
    } ${disabled ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'}`}
  >
    <span className={`mr-4 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110 opacity-70 group-hover:opacity-100'}`}>{icon}</span>
    <span className="text-[11px] sm:text-xs">{label}</span>
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ user, currentPage, onNavigate, onOpenComplaintModal, isSidebarOpen, setIsSidebarOpen }) => {
  const isSuspended = user.role === 'student' && user.status.startsWith('suspended');

  const handleNavigation = (page: string) => {
    onNavigate(page);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const studentNavItems = [
    { id: 'tableau-de-bord', label: 'Accueil', icon: <DashboardIcon className="w-5 h-5" />, disabled: isSuspended },
    { id: 'formulaires', label: 'Formulaires', icon: <FormsIcon className="w-5 h-5" />, disabled: isSuspended },
    { id: 'bibliotheque', label: 'Bibliothèque', icon: <LibraryIcon className="w-5 h-5" />, disabled: isSuspended },
    { id: 'analyse', label: 'Analyse IA', icon: <AnalysisIcon className="w-5 h-5" />, disabled: isSuspended },
    { id: 'portefeuille', label: 'Wallet', icon: <WalletIcon className="w-5 h-5" />, disabled: false },
  ];

  const adminNavItems = [
    { id: 'tableau-de-bord', label: 'Tableau Bord', icon: <DashboardIcon className="w-5 h-5" />, disabled: false },
    { id: 'etudiants', label: 'Étudiants', icon: <StudentsIcon className="w-5 h-5" />, disabled: false },
    { id: 'formulaires', label: 'Formulaires', icon: <FormsIcon className="w-5 h-5" />, disabled: false },
    { id: 'finances', label: 'Finances', icon: <FinanceIcon className="w-5 h-5" />, disabled: false },
    { id: 'activite', label: 'Journal', icon: <ActivityIcon className="w-5 h-5" />, disabled: false },
    { id: 'corbeille', label: 'Corbeille', icon: <TrashIcon className="w-5 h-5" />, disabled: false },
    { id: 'configuration', label: 'Paramètres', icon: <SettingsIcon className="w-5 h-5" />, disabled: false },
  ];

  const navItems = user.role === 'admin' ? adminNavItems : studentNavItems;
  const currentYear = new Date().getFullYear();

  return (
    <>
      {/* Overlay for mobile with stronger blur */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-[80vw] sm:w-72 h-full lg:h-[96vh] m-0 lg:m-4 bg-white dark:bg-slate-800 border-r lg:border border-slate-100 dark:border-slate-700 shadow-2xl rounded-r-3xl lg:rounded-3xl transform transition-transform duration-400 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex items-center justify-center h-28 border-b border-slate-100 dark:border-slate-700/50 shrink-0">
          <LogoIcon className="h-16 w-auto drop-shadow-lg transition-transform hover:scale-105" />
        </div>
        
        <div className="flex-1 flex flex-col justify-between overflow-y-auto py-6 px-4 custom-scrollbar">
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
                onClick={() => { onOpenComplaintModal(); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                className="flex items-center w-full px-4 py-4 text-[11px] font-black uppercase tracking-widest transition-colors duration-200 text-slate-500 hover:text-primary-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700 rounded-2xl"
              >
                <HelpIcon className="w-5 h-5 mr-4" />
                <span>Support & Aide</span>
              </button>
            </div>
          )}
        </div>
        
        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-b-none lg:rounded-b-3xl shrink-0">
            <div className="flex flex-col gap-3 px-2 text-center">
                <div className="flex flex-col items-center justify-center space-y-1">
                    <span className="text-xl font-black tracking-tighter text-slate-800 dark:text-white uppercase leading-none">DASS 18</span>
                    <span className="text-[10px] uppercase tracking-widest text-primary-600 dark:text-primary-400 font-black">JS GATE Corp.</span>
                </div>
                <div className="text-[8px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest leading-loose">
                    © {currentYear} Tous droits réservés.<br/>
                    Medical Intelligence Platform
                </div>
            </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;