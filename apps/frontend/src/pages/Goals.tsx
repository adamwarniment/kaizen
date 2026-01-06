import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, Trash2, X, Loader2, Trophy, AlertCircle } from 'lucide-react';
import { getGoals, createGoal, deleteGoal, getMeasures, Goal, Measure, User } from '../services/api';
import { ICON_MAP, getColor } from '../utils/theme';

interface GoalsProps {
    user: User;
    onUpdate: () => void;
}

const Goals: React.FC<GoalsProps> = ({ user, onUpdate }) => {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [measures, setMeasures] = useState<Measure[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [measureId, setMeasureId] = useState('');
    const [timeframe, setTimeframe] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
    const [type, setType] = useState<'TOTAL' | 'COUNT'>('TOTAL');
    const [targetValue, setTargetValue] = useState('');
    const [rewardAmount, setRewardAmount] = useState('');
    const [minPerEntry, setMinPerEntry] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [goalsRes, measuresRes] = await Promise.all([
                getGoals(),
                getMeasures()
            ]);
            setGoals(goalsRes.data);
            setMeasures(measuresRes.data);
            if (measuresRes.data.length > 0 && !measureId) {
                setMeasureId(measuresRes.data[0].id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!measureId || !targetValue || !rewardAmount) {
            alert('Please fill in Measure, Target, and Reward.');
            return;
        }

        try {
            await createGoal({
                measureId,
                timeframe,
                type,
                targetValue: parseFloat(targetValue),
                rewardAmount: parseFloat(rewardAmount),
                minPerEntry: minPerEntry ? parseFloat(minPerEntry) : undefined
            });
            fetchData();
            onUpdate(); // Update balance or global state if needed
            setShowModal(false);
            // Reset form but keep measureId or reasonable defaults
            setTargetValue(''); setRewardAmount(''); setMinPerEntry('');
        } catch (e) {
            console.error(e);
            alert('Error creating goal');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Area you sure you want to delete this goal?')) return;
        try {
            await deleteGoal(id);
            fetchData();
        } catch (e) {
            console.error(e);
            alert('Failed to delete goal');
        }
    }

    if (loading) return <div className="text-center py-20 text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Loading Goals...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">My Goals</h1>
                    <p className="text-slate-400">Set targets for your measures and earn rewards.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={20} /> Create New
                </button>
            </div>

            <div className="grid gap-4">
                {goals.length === 0 && (
                    <div className="p-10 rounded-3xl border border-dashed border-white/10 text-center text-slate-500">
                        No goals set yet. Click "Create New" to start earning!
                    </div>
                )}
                {goals.map((goal, i) => {
                    const iconName = goal.measure?.icon || 'Target';
                    const ItemIcon = ICON_MAP[iconName] || ICON_MAP['Target'];
                    const colorName = goal.measure?.color || 'yellow';
                    const theme = getColor(colorName);

                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            key={goal.id}
                            className={`glass p-6 rounded-2xl flex items-center justify-between group border border-white/5 hover:${theme.border} transition-all`}
                        >
                            <div className="flex items-center gap-5">
                                <div className={`w-12 h-12 ${theme.bgSoft} rounded-xl flex items-center justify-center border ${theme.border} ${theme.text}`}>
                                    <ItemIcon size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-200">{goal.measure?.name || 'Unknown Measure'}</h3>
                                    <div className="flex flex-wrap gap-2 mt-1 text-sm text-slate-400">
                                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider">
                                            {goal.timeframe} {goal.type}
                                        </span>
                                        <span>Target: <span className="text-white">{goal.targetValue} {goal.measure?.unit}</span></span>
                                        {goal.type === 'COUNT' && goal.minPerEntry && (
                                            <span>(Min {goal.minPerEntry}/entry)</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Reward</p>
                                    <p className="text-xl font-bold text-emerald-400">${goal.rewardAmount}</p>
                                </div>
                                <button onClick={() => handleDelete(goal.id)} className="p-3 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="glass w-full max-w-md p-6 rounded-3xl border border-white/10"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-slate-200">New Goal</h3>
                                <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-200 transition-colors"><X size={24} /></button>
                            </div>

                            {measures.length === 0 ? (
                                <div className="text-center py-6">
                                    <AlertCircle className="mx-auto text-yellow-500 mb-2" size={32} />
                                    <p className="text-slate-300 mb-4">You need to create a Measure first!</p>
                                    <button onClick={() => { setShowModal(false); /* Navigate to measures if possible */ }} className="btn-primary w-full">Got it</button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Measure</label>
                                        <select
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-yellow-500/50 transition-colors appearance-none"
                                            value={measureId}
                                            onChange={e => setMeasureId(e.target.value)}
                                        >
                                            {measures.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Timeframe</label>
                                            <select
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-yellow-500/50 transition-colors"
                                                value={timeframe}
                                                onChange={e => setTimeframe(e.target.value)}
                                            >
                                                <option value="DAILY">Daily</option>
                                                <option value="WEEKLY">Weekly</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Type</label>
                                            <select
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-yellow-500/50 transition-colors"
                                                value={type}
                                                onChange={e => setType(e.target.value)}
                                            >
                                                <option value="TOTAL">Total Amount</option>
                                                <option value="COUNT">Frequency</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Target</label>
                                            <input
                                                type="number"
                                                placeholder="e.g. 30"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-yellow-500/50 transition-colors"
                                                value={targetValue}
                                                onChange={e => setTargetValue(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Reward ($)</label>
                                            <input
                                                type="number"
                                                placeholder="e.g. 5"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-yellow-500/50 transition-colors"
                                                value={rewardAmount}
                                                onChange={e => setRewardAmount(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {type === 'COUNT' && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Minimum per Entry (Optional)</label>
                                            <input
                                                type="number"
                                                placeholder="e.g. 30 (User must log 30 to count)"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-yellow-500/50 transition-colors"
                                                value={minPerEntry}
                                                onChange={e => setMinPerEntry(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    <button onClick={handleCreate} className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold py-3 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-yellow-900/20 mt-4">
                                        Create Goal
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Goals;
