import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiTokens, createApiToken, deleteApiToken, ApiToken, updateUser, User, getEntries, getHistory } from '../services/api';
import { Key, Copy, Plus, Trash2, Check, Loader2, AlertCircle, Calendar as CalendarIcon, Download, Ruler, Target } from 'lucide-react';
import { downloadCSV } from '../utils/csv';
import { Link } from 'react-router-dom';

interface SettingsProps {
    user: User;
    onUpdate: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdate }) => {
    const [tokens, setTokens] = useState<ApiToken[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTokenName, setNewTokenName] = useState('');
    const [justCreatedToken, setJustCreatedToken] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        fetchTokens();
    }, []);

    const fetchTokens = async () => {
        try {
            const res = await getApiTokens();
            setTokens(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleExportLogs = async () => {
        try {
            const res = await getEntries();
            const data = res.data.map(entry => {
                let formattedValue: any = entry.value;
                if (entry.measure?.type === 'TIME') {
                    const h = Math.floor(entry.value / 60);
                    const m = entry.value % 60;
                    const period = h >= 12 ? 'PM' : 'AM';
                    const h12 = h % 12 || 12;
                    formattedValue = `${h12}:${m.toString().padStart(2, '0')} ${period}`;
                }

                return {
                    Date: new Date(entry.date).toLocaleDateString(),
                    Activity: entry.measure?.name || 'Unknown Activity',
                    Value: formattedValue,
                    RawValue: entry.value,
                    Unit: entry.measure?.unit || '',
                    'Logged At': new Date(entry.createdAt).toLocaleString()
                };
            });
            downloadCSV(`log_entries_${new Date().toISOString().split('T')[0]}.csv`, data);
        } catch (e) {
            console.error(e);
            alert("Failed to export logs.");
        }
    };

    const handleExportTransactions = async () => {
        try {
            const res = await getHistory();
            const data = res.data.map(tx => ({
                Date: tx.createdAt.substring(0, 10),
                Time: tx.createdAt.includes('T') ? tx.createdAt.substring(11, 16) : '',
                Title: tx.title || 'Transaction',
                Amount: tx.amount,
                Type: tx.type,
                Notes: tx.notes || ''
            }));
            downloadCSV(`transactions_${new Date().toISOString().split('T')[0]}.csv`, data);
        } catch (e) {
            console.error(e);
            alert("Failed to export transactions.");
        }
    };

    const handleCreateToken = async () => {
        try {
            const res = await createApiToken({ name: newTokenName || 'My API Token' });
            setJustCreatedToken(res.data.token);
            setNewTokenName('');
            fetchTokens();
        } catch (e) {
            console.error(e);
            alert("Failed to create token");
        }
    };

    const handleUpdateWeekStart = async (day: 'SUNDAY' | 'MONDAY') => {
        try {
            const res = await updateUser({ weekStart: day });
            onUpdate(); // Refresh parent user state
            // Optimistic update or just wait for re-fetch? onUpdate should trigger fetching in App.tsx? 
            // Actually Dashboard/App fetches user. Settings receives user as prop? 
            // Wait, Settings currently doesn't receive User prop. I need to update Pros.
        } catch (e) {
            console.error(e);
            alert("Failed to update setting");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Revoke this token? Applications using it will stop working.")) return;
        try {
            await deleteApiToken(id);
            fetchTokens();
        } catch (e) {
            console.error(e);
            alert("Failed to delete token");
        }
    };

    const copyToClipboard = () => {
        if (justCreatedToken) {
            navigator.clipboard.writeText(justCreatedToken);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    if (loading) return <div className="text-center py-20 text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Loading Settings...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-5">
            <div><p className="text-[10px] uppercase tracking-[.24em] font-semibold text-[#b7d58d] mb-1">Your rhythm</p><h1 className="text-3xl kaizen-serif text-[#edf3e7]">Shape the practice.</h1></div>

            {/* Application Settings */}
            <div className="glass p-5 rounded-xl border border-white/5 space-y-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#b7d58d]/10 rounded-lg text-[#b7d58d]">
                        <CalendarIcon size={22} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-200">Application Preferences</h2>
                        <p className="text-sm text-slate-400 mt-0.5">
                            Customize your global application experience.
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                    <div>
                        <label className="text-sm font-bold text-slate-200 block">Week Starts On</label>
                        <p className="text-xs text-slate-500 mt-1">Determines how weekly goals and calendar weeks are displayed.</p>
                    </div>
                    <div className="flex bg-black/40 p-1 rounded-lg border border-white/10">
                        <button
                            onClick={() => handleUpdateWeekStart('SUNDAY')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${user.weekStart === 'SUNDAY' || !user.weekStart ? 'bg-[#b7d58d] text-[#172014] shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Sunday
                        </button>
                        <button
                            onClick={() => handleUpdateWeekStart('MONDAY')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${user.weekStart === 'MONDAY' ? 'bg-[#b7d58d] text-[#172014] shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Monday
                        </button>
                    </div>
                </div>
            </div>

            <div className="glass p-5 rounded-xl border border-white/5 space-y-4">
                <div>
                    <p className="text-[10px] uppercase tracking-[.2em] font-bold text-[#b7d58d]">Practice setup</p>
                    <h2 className="text-lg font-bold text-slate-200 mt-1">Measures & goals</h2>
                    <p className="text-sm text-slate-400 mt-0.5">Define what you track and the targets that give it meaning.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link to="/measures" className="rounded-lg border border-[#dcebd0]/10 bg-white/[.04] p-4 hover:bg-white/[.07] transition-colors"><Ruler size={18} className="text-[#b7d58d] mb-2"/><p className="font-bold text-sm text-slate-200">Manage measures</p><p className="text-xs text-slate-500 mt-1">Activities and units</p></Link>
                    <Link to="/goals" className="rounded-lg border border-[#dcebd0]/10 bg-white/[.04] p-4 hover:bg-white/[.07] transition-colors"><Target size={18} className="text-[#b7d58d] mb-2"/><p className="font-bold text-sm text-slate-200">Manage goals</p><p className="text-xs text-slate-500 mt-1">Targets and rewards</p></Link>
                </div>
            </div>

            {/* Data Export Settings */}
            <div className="glass p-5 rounded-xl border border-white/5 space-y-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#b7d58d]/10 rounded-lg text-[#b7d58d]">
                        <Download size={22} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-200">Export Data</h2>
                        <p className="text-sm text-slate-400 mt-0.5">
                            Download your data as CSV files for personal backup or external analysis.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-lg border border-white/5 flex flex-col justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-200">Log Entries</h3>
                            <p className="text-xs text-slate-500 mt-1 mb-4">Export all tracked activities, including dates, measures, and values.</p>
                        </div>
                        <button
                            onClick={handleExportLogs}
                            className="btn-secondary w-full flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 text-slate-200 rounded-lg transition-all font-bold text-sm"
                        >
                            <Download size={16} /> Export Logs
                        </button>
                    </div>

                    <div className="bg-white/5 p-4 rounded-lg border border-white/5 flex flex-col justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-200">Transactions</h3>
                            <p className="text-xs text-slate-500 mt-1 mb-4">Export your reward history, cashouts, and balance changes.</p>
                        </div>
                        <button
                            onClick={handleExportTransactions}
                            className="btn-secondary w-full flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 text-slate-200 rounded-lg transition-all font-bold text-sm"
                        >
                            <Download size={16} /> Export Transactions
                        </button>
                    </div>
                </div>
            </div>

            <div className="glass p-5 rounded-xl border border-white/5 space-y-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#b7d58d]/10 rounded-lg text-[#b7d58d]">
                        <Key size={22} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-200">Personal Access Tokens</h2>
                        <p className="text-sm text-slate-400 mt-0.5">
                            Create tokens to authenticate external scripts or applications (like curl).
                            Treat these like passwords.
                        </p>
                    </div>
                </div>

                {/* Create Token Section */}
                <div className="flex gap-3 items-end bg-white/5 p-3 rounded-lg border border-white/5">
                    <div className="flex-grow space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Token Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Curl Script"
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-indigo-500/50"
                            value={newTokenName}
                            onChange={(e) => setNewTokenName(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleCreateToken}
                        className="btn-primary px-4 py-2 h-[40px] text-sm flex items-center gap-2 mb-0.5"
                    >
                        <Plus size={18} /> Generate Token
                    </button>
                </div>

                {/* Success Display */}
                <AnimatePresence>
                    {justCreatedToken && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2 overflow-hidden"
                        >
                            <div className="flex items-center gap-2 text-emerald-400 font-bold">
                                <Check size={18} /> Token Generated Successfully
                            </div>
                            <p className="text-sm text-slate-400">Copy this now. You won't be able to see it again!</p>
                            <div className="flex items-center gap-2 bg-black/40 p-3 rounded-lg border border-white/10 font-mono text-emerald-300 break-all relative group">
                                <span className="flex-grow">{justCreatedToken}</span>
                                <button
                                    onClick={copyToClipboard}
                                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                    title="Copy to clipboard"
                                >
                                    {copySuccess ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Token List */}
                <div className="space-y-4 pt-4">
                    <h3 className="text-lg font-bold text-slate-300">Active Tokens</h3>
                    {tokens.length === 0 && (
                        <p className="text-slate-500 text-sm italic">No active tokens.</p>
                    )}
                    {tokens.map((token) => (
                        <div key={token.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                            <div>
                                <p className="font-bold text-slate-200">{token.name}</p>
                                <div className="flex gap-4 mt-1 text-xs text-slate-500">
                                    <span>Created: {new Date(token.createdAt).toLocaleDateString()}</span>
                                    {token.lastUsedAt && (
                                        <span className="text-emerald-500/70">Last used: {new Date(token.lastUsedAt).toLocaleDateString()}</span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(token.id)}
                                className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                                title="Revoke Token"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div >
    );
};

export default Settings;
