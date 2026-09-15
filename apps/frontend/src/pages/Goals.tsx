import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Loader2, Trophy, AlertCircle, Scissors, Pencil } from 'lucide-react';
import { getGoals, createGoal, updateGoal, deleteGoal, getMeasures, Goal, Measure, User } from '../services/api';
import { ICON_MAP, getColor } from '../utils/theme';
import EntryPanel from '../components/EntryPanel';
import { BrushUnderline, Enso } from '../components/Brush';

interface GoalsProps {
    user: User;
    onUpdate: () => void;
}

type Tab = 'rewards' | 'cuts';

const Goals: React.FC<GoalsProps> = ({ user, onUpdate }) => {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [measures, setMeasures] = useState<Measure[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [tab, setTab] = useState<Tab>('rewards');

    // Form State
    const [editId, setEditId] = useState<string | null>(null);
    const [measureId, setMeasureId] = useState('');
    const [timeframe, setTimeframe] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
    const [type, setType] = useState<'TOTAL' | 'COUNT'>('TOTAL');
    const [operator, setOperator] = useState<'GTE' | 'LTE'>('GTE');
    const [targetValue, setTargetValue] = useState('');
    const [rewardAmount, setRewardAmount] = useState('');
    const [cutAmount, setCutAmount] = useState('');
    const [minPerEntry, setMinPerEntry] = useState('');
    const [saving, setSaving] = useState(false);

    const selectedMeasure = measures.find(m => m.id === measureId);
    const isTime = selectedMeasure?.type === 'TIME';

    // Reset defaults when measure changes, but never while editing an existing goal.
    useEffect(() => {
        if (editId) return;
        setOperator(isTime ? 'LTE' : 'GTE');
    }, [measureId, isTime, editId]);

    const timeToMinutes = (time: string) => {
        if (!time) return 0;
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const minutesToTime = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        const period = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
    };

    const minutesToInput = (mins: number) =>
        `${Math.floor(mins / 60).toString().padStart(2, '0')}:${Math.round(mins % 60).toString().padStart(2, '0')}`;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [goalsRes, measuresRes] = await Promise.all([getGoals(), getMeasures()]);
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

    const resetForm = () => {
        setEditId(null);
        setTargetValue('');
        setRewardAmount('');
        setCutAmount('');
        setMinPerEntry('');
        setShowModal(false);
    };

    const openCreate = () => {
        setEditId(null);
        setTargetValue('');
        setRewardAmount('');
        setCutAmount('');
        setMinPerEntry('');
        setTimeframe('DAILY');
        setType('TOTAL');
        if (measures.length > 0) setMeasureId(measures[0].id);
        setShowModal(true);
    };

    const openEdit = (goal: Goal) => {
        setEditId(goal.id);
        setMeasureId(goal.measureId);
        setTimeframe(goal.timeframe);
        setType(goal.type);
        setOperator(goal.operator || 'GTE');
        const timeBased = goal.measure?.type === 'TIME';
        setTargetValue(timeBased ? minutesToInput(goal.targetValue) : String(goal.targetValue));
        setMinPerEntry(goal.minPerEntry ? (timeBased ? minutesToInput(goal.minPerEntry) : String(goal.minPerEntry)) : '');
        setRewardAmount(goal.rewardAmount ? String(goal.rewardAmount) : '');
        setCutAmount(goal.cutAmount ? String(goal.cutAmount) : '');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!measureId || !targetValue) {
            alert('Please choose a measure and set a target.');
            return;
        }
        const reward = parseFloat(rewardAmount || '0');
        const cut = parseFloat(cutAmount || '0');
        if (!reward && !cut) {
            alert('Set a reward, a cut, or both — otherwise this target does nothing.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                measureId,
                timeframe,
                type,
                operator,
                targetValue: isTime ? timeToMinutes(targetValue) : parseFloat(targetValue),
                rewardAmount: reward,
                cutAmount: cut,
                minPerEntry: minPerEntry ? (isTime ? timeToMinutes(minPerEntry) : parseFloat(minPerEntry)) : undefined
            };

            if (editId) {
                await updateGoal(editId, payload);
            } else {
                await createGoal(payload);
            }
            await fetchData();
            onUpdate();
            resetForm();
        } catch (e) {
            console.error(e);
            alert(editId ? 'Error updating target' : 'Error creating target');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this target? Its reward and cut both stop applying.')) return;
        try {
            await deleteGoal(id);
            fetchData();
        } catch (e) {
            console.error(e);
            alert('Failed to delete target');
        }
    };

    // Turning a cut off leaves the target (and its reward) untouched.
    const clearCut = async (goal: Goal) => {
        if (!confirm(`Stop cutting for missed ${goal.measure?.name} targets?`)) return;
        try {
            await updateGoal(goal.id, { cutAmount: 0 });
            await fetchData();
            onUpdate();
        } catch (e) {
            console.error(e);
            alert('Failed to remove cut');
        }
    };

    const describeTarget = (goal: Goal) => {
        const timeBased = goal.measure?.type === 'TIME';
        const verb = goal.operator === 'LTE'
            ? (timeBased ? 'before' : 'at most')
            : (timeBased ? 'after' : 'at least');
        const value = timeBased ? minutesToTime(goal.targetValue) : `${goal.targetValue} ${goal.measure?.unit || ''}`.trim();
        return `${verb} ${value}`;
    };

    if (loading) return <div className="text-center py-20 text-sm text-ink-mid"><Loader2 className="animate-spin inline mr-2" size={16} /> Loading targets...</div>;

    const rewardGoals = goals.filter(g => g.rewardAmount > 0);
    const cutGoals = goals.filter(g => g.cutAmount > 0);
    const cutlessGoals = goals.filter(g => !g.cutAmount);
    const visible = tab === 'rewards' ? rewardGoals : cutGoals;

    const GoalRow = ({ goal }: { goal: Goal }) => {
        const ItemIcon = ICON_MAP[goal.measure?.icon || 'Target'] || ICON_MAP.Target;
        const theme = getColor(goal.measure?.color || 'emerald');
        const isCut = tab === 'cuts';

        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                key={goal.id}
                className="glass p-2.5 sm:p-3 rounded-xl flex items-center justify-between gap-2 border border-hairline/5 group"
            >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className={`w-7 h-7 sm:w-9 sm:h-9 shrink-0 ${theme.bgSoft} rounded-lg flex items-center justify-center border ${theme.border} ${theme.text}`}>
                        <ItemIcon size={15} />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-sm text-ink-hi truncate">{goal.measure?.name || 'Unknown measure'}</p>
                        <p className="text-[11px] text-ink-low truncate">
                            <span className="text-ink-low uppercase">{goal.timeframe}</span>
                            <span className="mx-1.5 text-ink-faint">·</span>
                            {describeTarget(goal)}
                            {goal.type === 'COUNT' && goal.minPerEntry ? (
                                <span className="text-ink-faint"> (min {goal.measure?.type === 'TIME' ? minutesToTime(goal.minPerEntry) : goal.minPerEntry}/entry)</span>
                            ) : null}
                        </p>
                        {/* Both sides of a target are worth seeing from either tab. */}
                        <p className="text-[10px] text-ink-faint truncate sm:hidden">
                            {goal.rewardAmount > 0 && <span className="text-pos/70">+${goal.rewardAmount.toFixed(2)} met</span>}
                            {goal.rewardAmount > 0 && goal.cutAmount > 0 && <span className="mx-1 text-ink-faint">·</span>}
                            {goal.cutAmount > 0 && <span className="text-neg/70">-${goal.cutAmount.toFixed(2)} missed</span>}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                        <p className="text-[9px] text-ink-low font-bold kaizen-eyebrow uppercase tracking-wider">{isCut ? 'Cut' : 'Reward'}</p>
                        <p className={`text-sm font-bold tabular-nums ${isCut ? 'text-neg' : 'text-pos'}`}>
                            {isCut ? `-$${goal.cutAmount.toFixed(2)}` : `+$${goal.rewardAmount.toFixed(2)}`}
                        </p>
                    </div>
                    <p className={`sm:hidden text-sm font-bold tabular-nums ${isCut ? 'text-neg' : 'text-pos'}`}>
                        {isCut ? `-$${goal.cutAmount.toFixed(2)}` : `+$${goal.rewardAmount.toFixed(2)}`}
                    </p>

                    {/* Touch devices have no hover, so these stay visible on mobile. */}
                    <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(goal)} title="Edit target" className="p-1.5 sm:p-2 hover:bg-raise/10 rounded-lg text-ink-low hover:text-ink-hi transition-all">
                            <Pencil size={14} />
                        </button>
                        <button
                            onClick={() => (isCut ? clearCut(goal) : handleDelete(goal.id))}
                            title={isCut ? 'Remove cut' : 'Delete target'}
                            className="p-1.5 sm:p-2 hover:bg-neg/10 rounded-lg text-ink-low hover:text-neg transition-all"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-6">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10px] kaizen-eyebrow uppercase tracking-[.24em] font-semibold text-accent mb-1 sm:mb-2">Direction, not pressure</p>
                    <h1 className="text-xl sm:text-3xl kaizen-serif text-ink-hi">Make progress tangible.</h1>
                    <BrushUnderline className="mt-1 -ml-0.5" width={168} />
                    <p className="hidden sm:block text-sm text-ink-mid mt-1.5">Rewards for hitting the mark, cuts for letting it slide.</p>
                </div>
                <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 shrink-0 whitespace-nowrap px-3 py-2 text-xs sm:gap-2 sm:px-5 sm:py-3 sm:text-sm">
                    <Plus size={16} className="sm:hidden" />
                    <Plus size={20} className="hidden sm:block" />
                    <span className="sm:hidden">New</span>
                    <span className="hidden sm:inline">New Target</span>
                </button>
            </div>

            {/* Rewards and cuts are two views over the same targets. */}
            <div className="flex rounded-xl bg-sunken/20 p-1 border border-hairline/[.06]">
                <button
                    onClick={() => setTab('rewards')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${tab === 'rewards' ? 'bg-pos/20 text-pos' : 'text-ink-low hover:text-ink-hi'}`}
                >
                    <Trophy size={14} /> Rewards
                    <span className="text-[10px] opacity-60">({rewardGoals.length})</span>
                </button>
                <button
                    onClick={() => setTab('cuts')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${tab === 'cuts' ? 'bg-neg/20 text-neg' : 'text-ink-low hover:text-ink-hi'}`}
                >
                    <Scissors size={14} /> Cuts
                    <span className="text-[10px] opacity-60">({cutGoals.length})</span>
                </button>
            </div>

            <p className="text-[11px] sm:text-xs text-ink-low -mt-1 px-1">
                {tab === 'rewards'
                    ? 'Paid into your balance as soon as you log enough to hit the target.'
                    : 'Charged against your balance once a day or week closes with the target unmet. Cuts only count periods after you add them.'}
            </p>

            <div className="grid grid-cols-1 gap-2">
                {visible.length === 0 && (
                    <div className="p-6 sm:p-10 rounded-2xl border border-dashed border-hairline/10 text-center text-sm text-ink-low">
                        {tab === 'rewards'
                            ? 'No rewards yet. Create a target to start earning.'
                            : 'No cuts yet. Add one to put something at stake when you miss.'}
                    </div>
                )}
                {visible.map(goal => <GoalRow key={goal.id} goal={goal} />)}
            </div>

            {/* From the Cuts tab, existing reward targets are one tap from having stakes. */}
            {tab === 'cuts' && cutlessGoals.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-low px-1">Targets without a cut</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {cutlessGoals.map(goal => {
                            const ItemIcon = ICON_MAP[goal.measure?.icon || 'Target'] || ICON_MAP.Target;
                            const theme = getColor(goal.measure?.color || 'emerald');
                            return (
                                <div key={goal.id} className="glass p-2.5 rounded-xl flex items-center justify-between gap-2 border border-hairline/5 border-dashed">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-7 h-7 shrink-0 ${theme.bgSoft} rounded-lg flex items-center justify-center border ${theme.border} ${theme.text}`}>
                                            <ItemIcon size={14} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-ink-hi truncate">{goal.measure?.name}</p>
                                            <p className="text-[11px] text-ink-low truncate">
                                                <span className="uppercase">{goal.timeframe}</span>
                                                <span className="mx-1.5 text-ink-faint">·</span>
                                                {describeTarget(goal)}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => openEdit(goal)}
                                        className="shrink-0 px-2.5 py-1.5 rounded-lg bg-neg/10 hover:bg-neg/20 text-neg border border-neg/20 text-[11px] font-bold transition-all"
                                    >
                                        Add cut
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <EntryPanel
                isOpen={showModal}
                onClose={resetForm}
                eyebrow={editId ? 'Adjust the stakes' : 'Choose a direction'}
                title={editId ? 'Edit target' : 'Set a target'}
                subtitle="A good target gives today’s effort a shape."
            >
                {measures.length === 0 ? (
                    <div className="text-center py-6">
                        <AlertCircle className="mx-auto text-yellow-500 mb-2" size={28} />
                        <p className="text-sm text-ink-hi mb-4">You need to create a Measure first.</p>
                        <button onClick={resetForm} className="btn-primary w-full">Got it</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-low ml-1">Measure</label>
                            <select
                                className="input-field w-full py-2.5 text-sm disabled:opacity-60"
                                value={measureId}
                                disabled={Boolean(editId)}
                                onChange={e => setMeasureId(e.target.value)}
                            >
                                {measures.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-low ml-1">Timeframe</label>
                                <select className="input-field w-full py-2.5 text-sm" value={timeframe} onChange={e => setTimeframe(e.target.value as 'DAILY' | 'WEEKLY')}>
                                    <option value="DAILY">Daily</option>
                                    <option value="WEEKLY">Weekly</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-low ml-1">Tracking</label>
                                <select className="input-field w-full py-2.5 text-sm" value={type} onChange={e => setType(e.target.value as 'TOTAL' | 'COUNT')}>
                                    <option value="TOTAL">Total Amount</option>
                                    <option value="COUNT">Frequency</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-low ml-1">Requirement</label>
                                <select className="input-field w-full py-2.5 text-sm" value={operator} onChange={e => setOperator(e.target.value as 'GTE' | 'LTE')}>
                                    {isTime ? (
                                        <>
                                            <option value="LTE">Before</option>
                                            <option value="GTE">After</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="GTE">At Least</option>
                                            <option value="LTE">At Most</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-low ml-1">Target {isTime ? 'Time' : 'Value'}</label>
                                <input
                                    type={isTime ? 'time' : 'number'}
                                    inputMode={isTime ? undefined : 'decimal'}
                                    placeholder={isTime ? '06:30' : 'e.g. 30'}
                                    className="input-field w-full py-2.5 text-sm"
                                    value={targetValue}
                                    onChange={e => setTargetValue(e.target.value)}
                                />
                            </div>
                        </div>

                        {type === 'COUNT' && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-low ml-1">Minimum per Entry (Optional)</label>
                                <input
                                    type={isTime ? 'time' : 'number'}
                                    placeholder={isTime ? '00:30' : 'e.g. 30'}
                                    className="input-field w-full py-2.5 text-sm"
                                    value={minPerEntry}
                                    onChange={e => setMinPerEntry(e.target.value)}
                                />
                            </div>
                        )}

                        {/* The two outcomes of one target, side by side. */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-emerald-500/80 ml-1 flex items-center gap-1">
                                    <Trophy size={11} /> Reward ($)
                                </label>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    className="input-field w-full py-2.5 text-sm"
                                    value={rewardAmount}
                                    onChange={e => setRewardAmount(e.target.value)}
                                />
                                <p className="text-[10px] text-ink-faint ml-1">Paid when you hit it.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-neg/80 ml-1 flex items-center gap-1">
                                    <Scissors size={11} /> Cut ($)
                                </label>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    className="input-field w-full py-2.5 text-sm"
                                    value={cutAmount}
                                    onChange={e => setCutAmount(e.target.value)}
                                />
                                <p className="text-[10px] text-ink-faint ml-1">Charged when the {timeframe === 'WEEKLY' ? 'week' : 'day'} closes unmet.</p>
                            </div>
                        </div>

                        {parseFloat(cutAmount || '0') > 0 && (
                            <div className="rounded-xl bg-red-500/[.07] border border-red-500/[.15] p-3">
                                <p className="text-[11px] text-red-300/90 leading-relaxed">
                                    Cuts apply only to {timeframe === 'WEEKLY' ? 'weeks' : 'days'} that close after you save this — past misses are never charged.
                                </p>
                            </div>
                        )}

                        <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3 disabled:opacity-50">
                            {saving ? 'Saving…' : editId ? 'Save target' : 'Create target'}
                        </button>
                    </div>
                )}
            </EntryPanel>
        </div>
    );
};

export default Goals;
