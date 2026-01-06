import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Target, History, LogOut, ChevronRight, Loader2, Ruler, DollarSign, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import Dashboard from './pages/Dashboard';
import Measures from './pages/Measures';
import Goals from './pages/Goals';
import LogEntries from './pages/LogEntries';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { AuthProvider, useAuth } from './AuthContext';
import { User } from './services/api';

const SidebarLink = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link to={to}>
            <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
            >
                <Icon size={20} />
                <span className="font-medium">{label}</span>
                {isActive && (
                    <motion.div
                        layoutId="active-pill"
                        className="ml-auto"
                    >
                        <ChevronRight size={16} />
                    </motion.div>
                )}
            </motion.div>
        </Link>
    );
};

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
    const { user, loading, logout } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-slate-200">
                <Loader2 className="animate-spin text-emerald-400 mb-4" size={48} />
                <p className="text-slate-400 font-medium">Loading Kaizen...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex min-h-screen bg-[#0a0a0f] text-slate-200">
            <aside className="w-72 border-r border-white/5 p-6 flex flex-col gap-8 glass m-4 rounded-3xl h-[calc(100vh-2rem)]">
                <div className="px-4">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        Kaizen
                    </h1>
                </div>

                <nav className="flex flex-col gap-2 flex-grow">
                    <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" />
                    <SidebarLink to="/log" icon={History} label="Log Entries" />
                    <SidebarLink to="/measures" icon={Ruler} label="Measures" />
                    <SidebarLink to="/goals" icon={Target} label="Goals" />
                    <SidebarLink to="/transactions" icon={DollarSign} label="Transactions" />
                    <SidebarLink to="/settings" icon={SettingsIcon} label="Settings" />
                </nav>

                <div className="mt-auto flex flex-col gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Balance</p>
                        <p className="text-2xl font-bold text-emerald-400">${user?.balance?.toFixed(2) || '0.00'}</p>
                    </div>

                    <div className="flex items-center gap-3 px-4 py-3 border-t border-white/5 pt-6">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                            <span className="font-bold text-emerald-400">{user?.name?.charAt(0) || 'U'}</span>
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-semibold truncate">{user?.name || 'User'}</p>
                            <button
                                onClick={logout}
                                className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                            >
                                <LogOut size={12} /> Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="flex-grow p-8 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {children}
                </AnimatePresence>
            </main>
        </div>
    );
};

function AppRoutes() {
    const { user, refreshUser } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={
                <ProtectedLayout>
                    {user && <Dashboard user={user} onUpdate={refreshUser} />}
                </ProtectedLayout>
            } />
            <Route path="/log" element={
                <ProtectedLayout>
                    {user && <LogEntries user={user} onUpdate={refreshUser} />}
                </ProtectedLayout>
            } />
            <Route path="/measures" element={
                <ProtectedLayout>
                    {user && <Measures user={user} onUpdate={refreshUser} />}
                </ProtectedLayout>
            } />
            <Route path="/goals" element={
                <ProtectedLayout>
                    {user && <Goals user={user} onUpdate={refreshUser} />}
                </ProtectedLayout>
            } />
            <Route path="/transactions" element={
                <ProtectedLayout>
                    {user && <Transactions user={user} onUpdate={refreshUser} />}
                </ProtectedLayout>
            } />
            <Route path="/settings" element={
                <ProtectedLayout>
                    <Settings />
                </ProtectedLayout>
            } />
        </Routes>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
}

export default App;
