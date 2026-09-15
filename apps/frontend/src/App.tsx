import React, { useState, useEffect } from 'react';
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
import { useTheme } from './ThemeContext';
import { decodeTheme } from './utils/themes';
import { User } from './services/api';
import QuickLogModal from './components/QuickLog';
import { BrushRule } from './components/Brush';

const SidebarLink = ({ to, icon: Icon, label, isCollapsed }: { to: string, icon: any, label: string, isCollapsed: boolean }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link to={to} title={isCollapsed ? label : ''}>
            <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200 ${isActive
                    ? 'bg-accent/12 text-accent-strong border border-accent/20 shadow-[0_0_18px_rgba(183,213,141,0.08)]'
                    : 'text-ink-low hover:bg-raise/[0.045] hover:text-ink-hi'
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
            <div className="min-h-screen bg-surface flex flex-col items-center justify-center text-ink-hi">
                <Loader2 className="animate-spin text-accent mb-4" size={48} />
                <p className="text-ink-low font-medium">Preparing your practice...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen text-ink-hi flex flex-col xl:flex-row kaizen-grid">
            {/* Mobile Header */}
            <header className="relative xl:hidden sticky top-0 bg-surface/90 backdrop-blur-xl border-b border-hairline/[.07] p-4 flex items-center justify-between z-30 h-16 safe-area-top">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 kaizen-orbit rounded-full p-[2px]"><div className="w-full h-full rounded-full bg-surface flex items-center justify-center"><Sprout size={15} className="text-accent-strong" /></div></div>
                    <h1 className="text-xl kaizen-wordmark text-ink-hi">Kaizen</h1>
                </div>

                <div className="flex items-center gap-3">
                    {/* Balance */}
                    <div className="px-2 py-1.5 rounded-lg bg-raise/5 border border-hairline/5 flex items-center gap-1.5 text-xs kaizen-mono text-accent">
                        <Wallet size={12} className="text-accent" />
                        <span>{user?.balance?.toFixed(2) || '0.00'}</span>
                    </div>

                    {/* Quick Log */}
                    <button
                        onClick={() => setIsQuickLogOpen(true)}
                        title="Log progress"
                        className="w-8 h-8 flex items-center justify-center bg-accent hover:bg-accent-strong text-accent-ink rounded-lg shadow-lg shadow-accent/20 active:scale-95 transition-all"
                    >
                        <PenLine size={16} />
                    </button>

                    {/* Profile */}
                    <Link to="/settings" className="w-8 h-8 rounded-full bg-raise/10 flex items-center justify-center border border-hairline/10 text-xs font-bold text-ink-mid">
                        {user?.name?.charAt(0) || <UserIcon size={14} />}
                    </Link>
                </div>
                <BrushRule className="absolute inset-x-0 -bottom-[6px] pointer-events-none" />
            </header>

            {/* Sidebar (Desktop) */}
            <aside
                className={`hidden xl:flex sticky top-0 h-screen border-r border-hairline/[.07] flex-col bg-surface/80 backdrop-blur-xl transition-all duration-300 z-20
                ${isCollapsed ? 'w-20' : 'w-72'}`}
            >
                <div className="p-4 flex items-center justify-between border-b border-hairline/[.07] h-20">
                    {!isCollapsed && (
                        <h1 className="text-2xl kaizen-wordmark text-ink-hi px-2 flex items-center gap-3">
                            <div className="w-8 h-8 kaizen-orbit rounded-full p-[2px]"><div className="w-full h-full rounded-full bg-surface flex items-center justify-center"><Sprout size={15} className="text-accent-strong" /></div></div>
                            Kaizen
                        </h1>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`p-2 hover:bg-raise/5 rounded-lg text-ink-low transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
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
                <div className="mx-4 border-t border-hairline/5 my-2"></div>

                {/* Quick Actions & User */}
                <div className="p-4 space-y-4">
                    {/* Balance & Quick Log Row */}
                    <div className={`flex items-center gap-2 ${isCollapsed ? 'flex-col' : ''}`}>
                        {/* Balance Display */}
                        {!isCollapsed && (
                            <div className="flex-grow px-3 py-2.5 rounded-xl bg-accent/[.07] border border-accent/[.12] flex items-center gap-2 text-sm kaizen-mono text-accent-strong">
                                <Wallet size={14} className="text-accent" />
                                <span>{user?.balance?.toFixed(2) || '0.00'}</span>
                            </div>
                        )}

                        {/* Quick Log Button */}
                        <button
                            onClick={() => setIsQuickLogOpen(true)}
                            className={`flex items-center justify-center bg-accent hover:bg-accent-strong text-accent-ink rounded-xl transition-all shadow-lg shadow-accent/20 active:scale-95
                            ${isCollapsed ? 'w-10 h-10' : 'w-10 h-10'}`}
                            title="Log progress"
                        >
                            <PenLine size={19} />
                        </button>
                    </div>

                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} pt-2`}>
                        <div className="w-9 h-9 rounded-full bg-raise/10 flex items-center justify-center border border-hairline/10 text-sm font-bold text-ink-mid">
                            {user?.name?.charAt(0) || 'U'}
                        </div>

                        {!isCollapsed && (
                            <div className="overflow-hidden">
                                <p className="font-semibold truncate text-sm text-ink-hi">{user?.name || 'User'}</p>
                                <button
                                    onClick={logout}
                                    className="text-[10px] uppercase font-bold tracking-wider text-ink-faint hover:text-neg flex items-center gap-1 transition-colors mt-0.5"
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
            <nav className="xl:hidden fixed bottom-6 left-4 right-4 h-16 bg-surface/95 backdrop-blur-xl border border-hairline/10 rounded-2xl z-40 flex items-center justify-evenly shadow-2xl safe-area-bottom">
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
                                    className="absolute inset-0 bg-accent/15 rounded-xl"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                            <Icon size={22} className={isActive ? 'text-accent-strong' : 'text-ink-low'} />
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
    const { family, mode, setFamily, setMode } = useTheme();

    // A theme saved on the profile follows the user to a new device, where
    // localStorage has nothing yet.
    useEffect(() => {
        if (!user?.theme) return;
        const saved = decodeTheme(user.theme);
        if (saved.family !== family) setFamily(saved.family);
        if (saved.mode !== mode) setMode(saved.mode);
    }, [user?.theme]);

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
