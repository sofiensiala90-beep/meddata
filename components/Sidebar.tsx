import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import BellIcon from './icons/BellIcon';
import LibraryIcon from './icons/LibraryIcon';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentPage: string;
  onNavigate: () => void;
  onOpenComplaintModal: () => void;
}

// ... (NavItem remains same)

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, onNavigate, onOpenComplaintModal }) => {
  // ... (rest of component)

  {
    currentUser.role === 'student' && (
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={onOpenComplaintModal}
          className="flex items-center w-full px-4 py-3 text-sm font-medium transition-colors duration-200 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg"
        >
          <HelpIcon className="w-5 h-5 mr-3" />
          <span>Faire une réclamation</span>
        </button>
      </div>
    )
  }
      </div >
    </aside >
  );
};

export default Sidebar;