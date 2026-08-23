import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Target, History, ChevronRight, Loader2, Ruler, DollarSign, Settings as SettingsIcon, Menu, ChevronLeft, Plus, User as UserIcon, Sprout, PenLine, Wallet } from 'lucide-react';
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
                    ? 'bg-[#b7d58d]/12 text-[#c9e6a1] border border-[#b7d58d]/20 shadow-[0_0_18px_rgba(183,213,141,0.08)]'
                    : 'text-zinc-500 hover:bg-white/[0.045] hover:text-zinc-200'
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
            <div className="min-h-screen bg-[#111513] flex flex-col items-center justify-center text-slate-200">
                <Loader2 className="animate-spin text-[#b7d58d] mb-4" size={48} />
                <p className="text-zinc-500 font-medium">Preparing your practice...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen text-zinc-100 flex flex-col xl:flex-row font-sans kaizen-grid">
            {/* Mobile Header */}
            <header className="xl:hidden sticky top-0 bg-[#161c18]/90 backdrop-blur-xl border-b border-[#dcebd0]/[.07] p-4 flex items-center justify-between z-30 h-16 safe-area-top">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 kaizen-orbit rounded-full p-[2px]"><div className="w-full h-full rounded-full bg-[#161c18] flex items-center justify-center"><Sprout size={15} className="text-[#d2eaaa]" /></div></div>
                    <h1 className="text-xl kaizen-wordmark text-[#e9f0df]">Kaizen</h1>
                </div>

                <div className="flex items-center gap-3">
                    {/* Balance */}
                    <div className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/5 flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                        <Wallet size={12} className="text-[#b7d58d]" />
                        <span>{user?.balance?.toFixed(2) || '0.00'}</span>
                    </div>

                    {/* Quick Log */}
                    <button
                        onClick={() => setIsQuickLogOpen(true)}
                        title="Log progress"
                        className="w-8 h-8 flex items-center justify-center bg-[#b7d58d] hover:bg-[#c8e79d] text-[#172014] rounded-lg shadow-lg shadow-[#8ca95f]/20 active:scale-95 transition-all"
                    >
                        <PenLine size={16} />
                    </button>

                    {/* Profile */}
                    <Link to="/settings" className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 text-xs font-bold text-zinc-400">
                        {user?.name?.charAt(0) || <UserIcon size={14} />}
                    </Link>
                </div>
            </header>

            {/* Sidebar (Desktop) */}
            <aside
                className={`hidden xl:flex sticky top-0 h-screen border-r border-[#dcebd0]/[.07] flex-col bg-[#161c18]/80 backdrop-blur-xl transition-all duration-300 z-20
                ${isCollapsed ? 'w-20' : 'w-72'}`}
            >
                <div className="p-4 flex items-center justify-between border-b border-[#dcebd0]/[.07] h-20">
                    {!isCollapsed && (
                        <h1 className="text-2xl kaizen-wordmark text-[#e9f0df] px-2 flex items-center gap-3">
                            <div className="w-8 h-8 kaizen-orbit rounded-full p-[2px]"><div className="w-full h-full rounded-full bg-[#161c18] flex items-center justify-center"><Sprout size={15} className="text-[#d2eaaa]" /></div></div>
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
                    <SidebarLink to="/" icon={LayoutDashboard} label="Growth" isCollapsed={isCollapsed} />
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
                            <div className="flex-grow px-3 py-2.5 rounded-xl bg-[#b7d58d]/[.07] border border-[#b7d58d]/[.12] flex items-center gap-2 text-sm kaizen-mono text-[#c9e6a1]">
                                <Wallet size={14} className="text-[#b7d58d]" />
                                <span>{user?.balance?.toFixed(2) || '0.00'}</span>
                            </div>
                        )}

                        {/* Quick Log Button */}
                        <button
                            onClick={() => setIsQuickLogOpen(true)}
                            className={`flex items-center justify-center bg-[#b7d58d] hover:bg-[#c8e79d] text-[#172014] rounded-xl transition-all shadow-lg shadow-[#8ca95f]/20 active:scale-95
                            ${isCollapsed ? 'w-10 h-10' : 'w-10 h-10'}`}
                            title="Log progress"
                        >
                            <PenLine size={19} />
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
            <main className="app-content flex-grow p-4 md:p-6 overflow-y-auto w-full pb-24 xl:pb-6 transition-[margin] duration-300 ease-out">
                <AnimatePresence mode="wait">
                    {children}
                </AnimatePresence>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="xl:hidden fixed bottom-6 left-4 right-4 h-16 bg-[#1b211d]/95 backdrop-blur-xl border border-[#dcebd0]/10 rounded-2xl z-40 flex items-center justify-evenly shadow-2xl safe-area-bottom">
                {[
                    { to: '/', icon: LayoutDashboard },
                    { to: '/transactions', icon: DollarSign },
                    { to: '/settings', icon: SettingsIcon },
                ].map(({ to, icon: Icon }) => {
                    const isActive = location.pathname === to;
                    return (
                        <Link key={to} to={to} className="relative p-3">
                            {isActive && (
                                <motion.div
                                    layoutId="mobile-nav-pill"
                                    className="absolute inset-0 bg-[#b7d58d]/15 rounded-xl"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                            <Icon size={22} className={isActive ? 'text-[#c9e6a1]' : 'text-zinc-500'} />
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
