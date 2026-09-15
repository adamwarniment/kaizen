import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiTokens, createApiToken, deleteApiToken, ApiToken, updateUser, User, getEntries, getHistory } from '../services/api';
import { Key, Copy, Plus, Trash2, Check, Loader2, AlertCircle, Calendar as CalendarIcon, Download, Ruler, Target, Palette, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { FAMILY_LIST, ThemeFamily, ThemeMode, encodeTheme } from '../utils/themes';
import { downloadCSV } from '../utils/csv';
import { Link } from 'react-router-dom';
import { BrushUnderline, Enso } from '../components/Brush';

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

    // Theme applies instantly from local state; the server copy just makes it
    // follow the user to their other devices.
    const { family, mode, resolved, setFamily, setMode } = useTheme();

    const persistTheme = async (nextFamily: ThemeFamily, nextMode: ThemeMode) => {
        try {
            await updateUser({ theme: encodeTheme(nextFamily, nextMode) });
            onUpdate();
        } catch (e) {
            console.error('Could not save theme to profile', e);
        }
    };

    const handleSelectFamily = (id: ThemeFamily) => {
        setFamily(id);
        persistTheme(id, mode);
    };

    const handleSelectMode = (next: ThemeMode) => {
        setMode(next);
        persistTheme(family, next);
    };

    const MODES: Array<{ id: ThemeMode; label: string; Icon: typeof Sun }> = [
        { id: 'light', label: 'Light', Icon: Sun },
        { id: 'dark', label: 'Dark', Icon: Moon },
        { id: 'system', label: 'Auto', Icon: Monitor },
    ];

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

    if (loading) return <div className="text-center py-20 text-sm text-ink-mid"><Loader2 className="animate-spin inline mr-2" size={16} /> Loading Settings...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
            <div><p className="text-[10px] kaizen-eyebrow uppercase tracking-[.24em] font-semibold text-accent mb-1">Your rhythm</p><h1 className="text-xl sm:text-3xl kaizen-serif text-ink-hi">Shape the practice.</h1>
                    <BrushUnderline className="mt-1 -ml-0.5" width={168} /></div>

            {/* Appearance */}
            <div className="glass p-3 sm:p-4 rounded-xl border border-hairline/5 space-y-3">
                <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-accent/10 rounded-lg text-accent shrink-0">
                        <Palette size={16} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-ink-hi">Appearance</h2>
                        <p className="text-xs text-ink-low">Colour, type and how square the edges sit.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {FAMILY_LIST.map(item => {
                        const active = family === item.id;
                        const preview = item.modes[resolved];
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleSelectFamily(item.id)}
                                aria-pressed={active}
                                className={`p-2.5 rounded-lg border text-left transition-all ${active ? 'border-accent bg-accent/[.08]' : 'border-hairline/5 bg-raise/[.04] hover:bg-raise/[.07]'}`}
                            >
                                <div className="flex items-center gap-1.5 mb-2">
                                    {preview.swatch.map((hex, i) => (
                                        <span
                                            key={i}
                                            className="w-4 h-4 rounded-full border border-hairline/20 shrink-0"
                                            style={{ backgroundColor: hex }}
                                        />
                                    ))}
                                    {active && <Check size={13} className="text-accent ml-auto shrink-0" />}
                                </div>
                                <p className="text-sm font-bold text-ink-hi">{item.name}</p>
                                <p className="text-xs text-ink-low leading-snug">{item.tagline}</p>
                            </button>
                        );
                    })}
                </div>

                <div>
                    <p className="text-[10px] kaizen-eyebrow uppercase tracking-wider font-bold text-ink-low mb-1.5">Mode</p>
                    <div className="flex rounded-lg bg-sunken/20 p-0.5 border border-hairline/[.06]">
                        {MODES.map(({ id, label, Icon }) => (
                            <button
                                key={id}
                                onClick={() => handleSelectMode(id)}
                                aria-pressed={mode === id}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all ${mode === id ? 'bg-accent text-accent-ink' : 'text-ink-low hover:text-ink-hi'}`}
                            >
                                <Icon size={13} /> {label}
                            </button>
                        ))}
                    </div>
                </div>

                <p className="text-[11px] text-ink-low leading-relaxed">
                    The status bar tint follows your theme right away. If you install Kaizen to your
                    home screen, the launcher icon is captured at install time — switching themes later
                    will not repaint an icon that is already installed, so reinstall to pick up a new one.
                </p>
            </div>

            {/* Application Settings */}
            <div className="glass p-3 sm:p-4 rounded-xl border border-hairline/5 space-y-3">
                <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-accent/10 rounded-lg text-accent shrink-0">
                        <CalendarIcon size={16} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-ink-hi">Application Preferences</h2>
                        <p className="text-xs text-ink-low">How the app behaves globally.</p>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 bg-raise/5 p-2.5 rounded-lg border border-hairline/5">
                    <div className="min-w-0">
                        <label className="text-sm font-bold text-ink-hi block">Week Starts On</label>
                        <p className="text-xs text-ink-low">Used by weekly targets and the calendar.</p>
                    </div>
                    <div className="flex bg-sunken/40 p-1 rounded-lg border border-hairline/10">
                        <button
                            onClick={() => handleUpdateWeekStart('SUNDAY')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${user.weekStart === 'SUNDAY' || !user.weekStart ? 'bg-accent text-accent-ink shadow-lg' : 'text-ink-low hover:text-ink-hi'}`}
                        >
                            Sunday
                        </button>
                        <button
                            onClick={() => handleUpdateWeekStart('MONDAY')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${user.weekStart === 'MONDAY' ? 'bg-accent text-accent-ink shadow-lg' : 'text-ink-low hover:text-ink-hi'}`}
                        >
                            Monday
                        </button>
                    </div>
                </div>
            </div>

            <div className="glass p-3 sm:p-4 rounded-xl border border-hairline/5 space-y-3">
                <div>
                    <p className="text-[10px] kaizen-eyebrow uppercase tracking-[.2em] font-bold text-accent">Practice setup</p>
                    <h2 className="text-sm font-bold text-ink-hi mt-0.5">Measures &amp; targets</h2>
                    <p className="text-xs text-ink-low">What you track, and what it is worth.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link to="/measures" className="rounded-lg border border-hairline/10 bg-raise/[.04] p-3 hover:bg-raise/[.07] transition-colors flex items-center gap-2.5"><Ruler size={16} className="text-accent shrink-0"/><div className="min-w-0"><p className="font-bold text-sm text-ink-hi">Manage measures</p><p className="text-xs text-ink-low">Activities and units</p></div></Link>
                    <Link to="/goals" className="rounded-lg border border-hairline/10 bg-raise/[.04] p-3 hover:bg-raise/[.07] transition-colors flex items-center gap-2.5"><Target size={16} className="text-accent shrink-0"/><div className="min-w-0"><p className="font-bold text-sm text-ink-hi">Rewards &amp; cuts</p><p className="text-xs text-ink-low">Targets, payouts and stakes</p></div></Link>
                </div>
            </div>

            {/* Data Export Settings */}
            <div className="glass p-3 sm:p-4 rounded-xl border border-hairline/5 space-y-3">
                <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-accent/10 rounded-lg text-accent shrink-0">
                        <Download size={16} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-ink-hi">Export Data</h2>
                        <p className="text-xs text-ink-low">Download your data as CSV.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleExportLogs} className="bg-raise/5 hover:bg-raise/10 p-2.5 rounded-lg border border-hairline/5 flex items-center gap-2 text-left transition-all">
                        <Download size={15} className="text-accent shrink-0" />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-ink-hi">Log entries</p>
                            <p className="text-xs text-ink-low truncate">Dates and values</p>
                        </div>
                    </button>
                    <button onClick={handleExportTransactions} className="bg-raise/5 hover:bg-raise/10 p-2.5 rounded-lg border border-hairline/5 flex items-center gap-2 text-left transition-all">
                        <Download size={15} className="text-accent shrink-0" />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-ink-hi">Transactions</p>
                            <p className="text-xs text-ink-low truncate">Rewards and cuts</p>
                        </div>
                    </button>
                </div>
            </div>

            <div className="glass p-3 sm:p-4 rounded-xl border border-hairline/5 space-y-3">
                <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-accent/10 rounded-lg text-accent shrink-0">
                        <Key size={16} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-ink-hi">Personal Access Tokens</h2>
                        <p className="text-xs text-ink-low">For external scripts. Treat these like passwords.</p>
                    </div>
                </div>

                {/* Create Token Section */}
                <div className="flex flex-wrap gap-2 items-end bg-raise/5 p-2.5 rounded-lg border border-hairline/5">
                    <div className="flex-grow min-w-0 space-y-1.5">
                        <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-low ml-1">Token Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Curl Script"
                            className="w-full bg-sunken/20 border border-hairline/10 rounded-xl px-3 py-2 text-sm text-ink-hi focus:outline-none focus:border-indigo-500/50"
                            value={newTokenName}
                            onChange={(e) => setNewTokenName(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleCreateToken}
                        className="btn-primary px-3 py-2 h-[38px] text-xs sm:text-sm flex items-center gap-1.5 shrink-0"
                    >
                        <Plus size={16} /> Generate
                    </button>
                </div>

                {/* Success Display */}
                <AnimatePresence>
                    {justCreatedToken && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-pos/10 border border-pos/20 rounded-xl p-3 space-y-2 overflow-hidden"
                        >
                            <div className="flex items-center gap-2 text-pos font-bold">
                                <Check size={15} /> Token generated
                            </div>
                            <p className="text-xs text-ink-mid">Copy this now — you will not see it again.</p>
                            <div className="flex items-center gap-2 bg-sunken/40 p-2.5 rounded-lg border border-hairline/10 kaizen-mono text-xs text-emerald-300 break-all relative group">
                                <span className="flex-grow">{justCreatedToken}</span>
                                <button
                                    onClick={copyToClipboard}
                                    className="p-2 hover:bg-raise/10 rounded-lg text-ink-mid hover:text-ink-hi transition-colors"
                                    title="Copy to clipboard"
                                >
                                    {copySuccess ? <Check size={16} className="text-pos" /> : <Copy size={16} />}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Token List */}
                <div className="space-y-2 pt-1">
                    <h3 className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-low">Active Tokens</h3>
                    {tokens.length === 0 && (
                        <p className="text-ink-low text-xs italic">No active tokens.</p>
                    )}
                    {tokens.map((token) => (
                        <div key={token.id} className="flex items-center justify-between gap-2 p-2.5 bg-raise/5 rounded-lg border border-hairline/5 hover:border-hairline/10 transition-colors">
                            <div className="min-w-0">
                                <p className="font-bold text-sm text-ink-hi truncate">{token.name}</p>
                                <div className="flex flex-wrap gap-x-3 text-[11px] text-ink-low">
                                    <span>Created: {new Date(token.createdAt).toLocaleDateString()}</span>
                                    {token.lastUsedAt && (
                                        <span className="text-pos/70">Last used: {new Date(token.lastUsedAt).toLocaleDateString()}</span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(token.id)}
                                className="p-2 hover:bg-neg/10 rounded-lg text-ink-low hover:text-neg transition-colors"
                                title="Revoke Token"
                            >
                                <Trash2 size={15} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div >
    );
};

export default Settings;
