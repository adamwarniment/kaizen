import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, X, Loader2, Edit2 } from 'lucide-react';
import { getMeasures, createMeasure, updateMeasure, deleteMeasure, Measure, User } from '../services/api';
import { ICON_MAP, COLORS, getColor } from '../utils/theme';

interface MeasuresProps {
    user: User;
    onUpdate: () => void;
}

const Measures: React.FC<MeasuresProps> = ({ user, onUpdate }) => {
    const [measures, setMeasures] = useState<Measure[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // New/Edit Measure Form State
    const [editId, setEditId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    const [type, setType] = useState('NUMBER');
    const [selectedIcon, setSelectedIcon] = useState('Target');
    const [selectedColor, setSelectedColor] = useState('emerald');

    useEffect(() => {
        fetchMeasures();
    }, []);

    const fetchMeasures = async () => {
        try {
            const res = await getMeasures();
            setMeasures(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setUnit('');
        setType('NUMBER');
        setSelectedIcon('Target');
        setSelectedColor('emerald');
        setEditId(null);
    };

    const openEditModal = (measure: Measure) => {
        setEditId(measure.id);
        setName(measure.name);
        setUnit(measure.unit);
        setType(measure.type || 'NUMBER');
        setSelectedIcon(measure.icon || 'Target');
        setSelectedColor(measure.color || 'emerald');
        setShowModal(true);
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!name || !unit) {
            alert('Please fill in Name and Unit.');
            return;
        }
        try {
            const payload = {
                name,
                unit,
                type,
                icon: selectedIcon,
                color: selectedColor
            };

            if (editId) {
                await updateMeasure(editId, payload);
            } else {
                await createMeasure(payload);
            }

            fetchMeasures();
            onUpdate();
            setShowModal(false);
            resetForm();
        } catch (e) {
            console.error(e);
            alert('Error saving measure');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this measure? all associated goals and entries will be lost.')) return;
        try {
            await deleteMeasure(id);
            fetchMeasures();
            onUpdate(); // Ensure global update happens
        } catch (e) {
            console.error(e);
            alert('Failed to delete measure');
        }
    }

    if (loading) return <div className="text-center py-20 text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Loading Measures...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">My Measures</h1>
                    <p className="text-slate-400">Define what you want to track (e.g. Workout, Water, Reading).</p>
                </div>
                <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
                    <Plus size={20} /> Create New
                </button>
            </div>

            <div className="grid gap-4">
                {measures.length === 0 && (
                    <div className="p-10 rounded-3xl border border-dashed border-white/10 text-center text-slate-500">
                        No measures created yet. Click "Create New" to get started!
                    </div>
                )}
                {measures.map((item, i) => {
                    const iconName = item.icon || 'Target';
                    const ItemIcon = ICON_MAP[iconName] || ICON_MAP['Target'];
                    const colorName = item.color || 'emerald';
                    const theme = getColor(colorName);

                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            key={item.id}
                            className={`glass p-6 rounded-2xl flex items-center justify-between group border border-white/5 hover:border-white/20 transition-all`}
                        >
                            <div className="flex items-center gap-5">
                                <div className={`w-12 h-12 ${theme.bgSoft} rounded-xl flex items-center justify-center border ${theme.border} ${theme.text}`}>
                                    <ItemIcon size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-200">{item.name}</h3>
                                    <p className="text-sm text-slate-400">Unit: {item.unit}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditModal(item)}
                                    className="p-3 hover:bg-white/10 text-slate-500 hover:text-white rounded-xl transition-all"
                                    title="Edit Measure"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-3 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-xl transition-all"
                                    title="Delete Measure"
                                >
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
                            className="glass w-full max-w-md p-6 rounded-3xl border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-slate-200">{editId ? 'Edit Measure' : 'New Measure'}</h3>
                                <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-200 transition-colors"><X size={24} /></button>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Data Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => { setType('NUMBER'); setUnit(''); }}
                                            className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${type === 'NUMBER'
                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                        >
                                            <span className="font-bold">Number</span>
                                        </button>
                                        <button
                                            onClick={() => { setType('TIME'); setUnit('Time'); }}
                                            className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${type === 'TIME'
                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                        >
                                            <span className="font-bold">Time</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Measure Name</label>
                                    <input
                                        placeholder="e.g. Workout"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Unit</label>
                                    <input
                                        placeholder={type === 'TIME' ? 'Time (hh:mm)' : 'e.g. minutes'}
                                        className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors ${type === 'TIME' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        value={unit}
                                        readOnly={type === 'TIME'}
                                        onChange={e => setUnit(e.target.value)}
                                    />
                                </div>

                                {/* Icon Picker */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Icon</label>
                                    <div className="grid grid-cols-6 gap-2">
                                        {Object.keys(ICON_MAP).map(iconName => {
                                            const Icon = ICON_MAP[iconName];
                                            const isSelected = selectedIcon === iconName;
                                            return (
                                                <button
                                                    key={iconName}
                                                    onClick={() => setSelectedIcon(iconName)}
                                                    className={`p-2 rounded-lg flex items-center justify-center transition-all ${isSelected
                                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                                                        }`}
                                                >
                                                    <Icon size={20} />
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Color Picker */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Color</label>
                                    <div className="flex gap-2">
                                        {COLORS.map(c => (
                                            <button
                                                key={c.name}
                                                onClick={() => setSelectedColor(c.name)}
                                                className={`w-8 h-8 rounded-full ${c.value} transition-all ${selectedColor === c.name ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <button onClick={handleSubmit} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-900/20 mt-4">
                                    {editId ? 'Save Changes' : 'Create Measure'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Measures;
