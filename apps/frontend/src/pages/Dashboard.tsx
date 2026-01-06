import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Calendar, CheckCircle, Clock, Plus, Loader2 } from 'lucide-react';
import { getMeasures, createEntry, getUser, Measure, User } from '../services/api';
import { ICON_MAP, getColor } from '../utils/theme';
import { Link } from 'react-router-dom';

interface DashboardProps {
    user: User;
    onUpdate: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onUpdate }) => {
    const [measures, setMeasures] = useState<Measure[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedMeasureId, setSelectedMeasureId] = useState('');
    const [logValue, setLogValue] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await getMeasures();
            setMeasures(res.data);
            if (res.data.length > 0) setSelectedMeasureId(res.data[0].id);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleLog = async () => {
        if (!selectedMeasureId) {
            alert('Please select a measure first.');
            return;
        }
        if (!logValue) {
            alert('Please enter a value to log.');
            return;
        }
        setSubmitting(true);
        try {
            const date = new Date().toISOString().split('T')[0];
            await createEntry({
                measureId: selectedMeasureId,
                value: parseFloat(logValue),
                date
            });
            setLogValue('');
            onUpdate();
            alert('Entry logged successfully!');
        } catch (e) {
            console.error(e);
            alert('Error logging entry.');
        } finally {
            setSubmitting(false);
        }
    };

    const stats = [
        { label: 'Daily Streak', value: '1 Day', icon: <TrendingUp className="text-orange-400" /> },
        { label: 'Available Balance', value: `$${user.balance.toFixed(2)}`, icon: <DollarSign className="text-green-400" /> },
        { label: 'Measures Active', value: measures.length, icon: <CheckCircle className="text-primary-400" /> },
    ];

    if (loading) return <div className="text-center py-20"><Loader2 className="animate-spin inline mr-2" /> Loading Dashboard...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Daily Dashboard</h1>
                    <p className="text-white/50 mt-1">Welcome back, {user.name}! Here's your progress for today.</p>
                </div>
                <div className="flex items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">
                    <Calendar className="text-white/30 ml-2" size={18} />
                    <span className="font-medium mr-4">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={stat.label}
                        className="glass-card flex items-center justify-between"
                    >
                        <div>
                            <p className="text-white/50 text-sm">{stat.label}</p>
                            <p className="text-2xl font-bold mt-1">{stat.value}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                            {stat.icon}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Active Goals */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">Active Measures</h2>
                        <Link to="/measures" className="text-primary-400 text-sm font-semibold hover:underline">Manage All</Link>
                    </div>

                    <div className="space-y-4">
                        {measures.length === 0 && (
                            <div className="glass-card text-center py-10 text-white/30">
                                No active measures. Go to "Measures" to create one!
                            </div>
                        )}
                        {measures.map((m, i) => {
                            const colorName = m.color || 'emerald';
                            const theme = getColor(colorName);
                            // Ensure goals exist
                            const goals = m.goals || [];

                            const iconName = m.icon || 'Target';
                            const ItemIcon = ICON_MAP[iconName] || ICON_MAP['Target'];

                            return (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + (i * 0.1) }}
                                    key={m.id}
                                    className={`glass-card flex items-center gap-6 group hover:border-${colorName}-500/30 transition-all cursor-pointer`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${theme.border} ${theme.bgSoft} ${theme.text}`}>
                                        <ItemIcon size={24} />
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className="text-lg font-bold">{m.name}</h3>
                                        <div className="flex flex-col gap-1 mt-1">
                                            {goals.slice(0, 2).map((g: any, idx: number) => (
                                                <div key={idx} className="flex items-center gap-2 text-sm text-white/50">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/5 py-0.5 px-1.5 rounded text-white/70">{g.timeframe}</span>
                                                    <span>Target: {g.targetValue} {g.type === 'COUNT' ? 'times' : m.unit}</span>
                                                    <span className={`${theme.text} font-bold ml-auto`}>${g.rewardAmount}</span>
                                                </div>
                                            ))}
                                            {goals.length > 2 && <span className="text-xs text-white/30 italic">+{goals.length - 2} more goals</span>}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                </div>

                {/* Quick Log */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold">Quick Log</h2>
                    <div className="glass-card bg-primary-600/10 border-primary-500/30">
                        <p className="text-sm text-white/70 mb-4">Submit your measurement for any active goal below.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-white/30 block mb-2">Measure</label>
                                <select
                                    className="input-field w-full appearance-none bg-dark"
                                    value={selectedMeasureId}
                                    onChange={(e) => setSelectedMeasureId(e.target.value)}
                                >
                                    {measures.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-white/30 block mb-2">Value</label>
                                <input
                                    type="number"
                                    value={logValue}
                                    onChange={(e) => setLogValue(e.target.value)}
                                    placeholder="e.g. 45"
                                    className="input-field w-full"
                                />
                            </div>
                            <button
                                onClick={handleLog}
                                disabled={submitting}
                                className="btn-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                                Log Entry
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
