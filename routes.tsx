import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Forms from './pages/Forms';
import Analysis from './pages/Analysis';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import Students from './pages/Students';
import Finance from './pages/Finance';
import ActivityPage from './pages/Activity';
import NotificationsPage from './pages/NotificationsPage';
import Library from './pages/Library';
import { useAuth } from './contexts/AuthContext';

const AppRoutes: React.FC = () => {
    const { currentUser, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/auth" element={!currentUser ? <AuthPage /> : <Navigate to="/" />} />

            <Route element={currentUser ? <Layout /> : <Navigate to="/auth" />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/tableau-de-bord" element={<Navigate to="/" />} />
                <Route path="/formulaires" element={<Forms />} />
                <Route path="/analyse" element={<Analysis />} />
                <Route path="/portefeuille" element={<Wallet />} />
                <Route path="/profil" element={<Profile />} />
                <Route path="/etudiants" element={<Students />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/activite" element={<ActivityPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/bibliotheque" element={<Library />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
};

export default AppRoutes;
