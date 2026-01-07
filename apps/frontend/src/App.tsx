import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Target, History, LogOut, ChevronRight, Loader2, Ruler, DollarSign, Settings as SettingsIcon, Menu, ChevronLeft, Plus, User as UserIcon } from 'lucide-react';
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
import QuickLogModal from './components/QuickLog';

const SidebarLink = ({ to, icon: Icon, label, isCollapsed }: { to: string, icon: any, label: string, isCollapsed: boolean }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link to={to} title={isCollapsed ? label : ''}>
            <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200 ${isActive
                    ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(220,20,60,0.1)]'
                    : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                    } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
                <Icon size={20} />
                {!isCollapsed && <span className="font-medium">{label}</span>}
                {isActive && !isCollapsed && (
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
    const { user, loading, logout, refreshUser } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-slate-200">
                <Loader2 className="animate-spin text-red-500 mb-4" size={48} />
                <p className="text-zinc-500 font-medium">Loading Kaizen...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col xl:flex-row font-sans selection:bg-red-500/30">
            {/* Mobile Header */}
            <header className="xl:hidden sticky top-0 bg-zinc-900/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between z-30 h-16 safe-area-top">
                <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="Kaizen Logo" className="w-8 h-8" />
                    <h1 className="text-lg font-bold text-red-500 tracking-tight">Kaizen</h1>
                </div>

                <div className="flex items-center gap-3">
                    {/* Balance */}
                    <div className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/5 flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                        <DollarSign size={12} className="text-emerald-500" />
                        <span>{user?.balance?.toFixed(2) || '0.00'}</span>
                    </div>

                    {/* Quick Log */}
                    <button
                        onClick={() => setIsQuickLogOpen(true)}
                        className="w-8 h-8 flex items-center justify-center bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg shadow-red-900/20 active:scale-95 transition-all"
                    >
                        <Plus size={18} />
                    </button>

                    {/* Profile */}
                    <Link to="/settings" className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 text-xs font-bold text-zinc-400">
                        {user?.name?.charAt(0) || <UserIcon size={14} />}
                    </Link>
                </div>
            </header>

            {/* Sidebar (Desktop) */}
            <aside
                className={`hidden xl:flex sticky top-0 h-screen border-r border-white/5 flex-col bg-zinc-900/50 backdrop-blur-xl transition-all duration-300 z-20
                ${isCollapsed ? 'w-20' : 'w-72'}`}
            >
                <div className="p-4 flex items-center justify-between border-b border-white/5 h-16">
                    {!isCollapsed && (
                        <h1 className="text-xl font-bold text-red-500 tracking-tight px-2 flex items-center gap-2">
                            <img src="/logo.png" alt="Kaizen Logo" className="w-8 h-8" />
                            Kaizen
                        </h1>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`p-2 hover:bg-white/5 rounded-lg text-zinc-500 transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
                    >
                        {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
                    </button>
                </div>

                <nav className="flex flex-col gap-1.5 flex-grow overflow-y-auto overflow-x-hidden scrollbar-thin py-4">
                    <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" isCollapsed={isCollapsed} />
                    <SidebarLink to="/log" icon={History} label="Log Entries" isCollapsed={isCollapsed} />
                    <SidebarLink to="/measures" icon={Ruler} label="Measures" isCollapsed={isCollapsed} />
                    <SidebarLink to="/goals" icon={Target} label="Goals" isCollapsed={isCollapsed} />
                    <SidebarLink to="/transactions" icon={DollarSign} label="Transactions" isCollapsed={isCollapsed} />
                    <SidebarLink to="/settings" icon={SettingsIcon} label="Settings" isCollapsed={isCollapsed} />
                </nav>

                {/* Visual Separator */}
                <div className="mx-4 border-t border-white/5 my-2"></div>

                {/* Quick Actions & User */}
                <div className="p-4 space-y-4">
                    {/* Balance & Quick Log Row */}
                    <div className={`flex items-center gap-2 ${isCollapsed ? 'flex-col' : ''}`}>
                        {/* Balance Display */}
                        {!isCollapsed && (
                            <div className="flex-grow px-3 py-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2 text-sm font-mono text-emerald-400">
                                <DollarSign size={14} className="text-emerald-500" />
                                <span>{user?.balance?.toFixed(2) || '0.00'}</span>
                            </div>
                        )}

                        {/* Quick Log Button */}
                        <button
                            onClick={() => setIsQuickLogOpen(true)}
                            className={`flex items-center justify-center bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all shadow-lg shadow-red-900/20 active:scale-95
                            ${isCollapsed ? 'w-10 h-10' : 'w-10 h-10'}`}
                            title="Quick Log"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} pt-2`}>
                        <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 text-sm font-bold text-zinc-400">
                            {user?.name?.charAt(0) || 'U'}
                        </div>

                        {!isCollapsed && (
                            <div className="overflow-hidden">
                                <p className="font-semibold truncate text-sm text-zinc-300">{user?.name || 'User'}</p>
                                <button
                                    onClick={logout}
                                    className="text-[10px] uppercase font-bold tracking-wider text-zinc-600 hover:text-red-400 flex items-center gap-1 transition-colors mt-0.5"
                                >
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-grow p-4 md:p-6 overflow-y-auto w-full pb-24 xl:pb-6">
                <AnimatePresence mode="wait">
                    {children}
                </AnimatePresence>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="xl:hidden fixed bottom-6 left-4 right-4 h-16 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl z-40 flex items-center justify-evenly shadow-2xl safe-area-bottom">
                {[
                    { to: '/', icon: LayoutDashboard },
                    { to: '/log', icon: History },
                    { to: '/measures', icon: Ruler },
                    { to: '/goals', icon: Target },
                    { to: '/transactions', icon: DollarSign },
                ].map(({ to, icon: Icon }) => {
                    const isActive = location.pathname === to;
                    return (
                        <Link key={to} to={to} className="relative p-3">
                            {isActive && (
                                <motion.div
                                    layoutId="mobile-nav-pill"
                                    className="absolute inset-0 bg-white/10 rounded-xl"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                            <Icon size={22} className={isActive ? 'text-red-500' : 'text-zinc-500'} />
                        </Link>
                    );
                })}
            </nav>

            <QuickLogModal isOpen={isQuickLogOpen} onClose={() => setIsQuickLogOpen(false)} onUpdate={refreshUser} />
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
                    {user && <Settings user={user} onUpdate={refreshUser} />}
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
