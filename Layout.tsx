import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Chatbot from './components/Chatbot';
import ComplaintModal from './components/ComplaintModal';
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';

const Layout: React.FC = () => {
    const { currentUser } = useAuth();
    const { handleSendComplaint } = useData();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);

    if (!currentUser) return null;

    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-hidden font-sans">
            <Sidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                currentPage={window.location.pathname.substring(1) || 'tableau-de-bord'}
                onNavigate={() => setIsSidebarOpen(false)}
                onOpenComplaintModal={() => setIsComplaintModalOpen(true)}
            />

            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <Header
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                />

                <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                    <div className="max-w-7xl mx-auto pb-20">
                        <Outlet />
                    </div>
                </main>

                <Chatbot />

                <ComplaintModal
                    isOpen={isComplaintModalOpen}
                    onClose={() => setIsComplaintModalOpen(false)}
                    onSubmit={handleSendComplaint}
                />
            </div>
        </div>
    );
};

export default Layout;
