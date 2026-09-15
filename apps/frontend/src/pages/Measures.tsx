import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Loader2, Edit2 } from 'lucide-react';
import { getMeasures, createMeasure, updateMeasure, deleteMeasure, Measure, User } from '../services/api';
import { ICON_MAP, COLORS, getColor } from '../utils/theme';
import EntryPanel from '../components/EntryPanel';
import { BrushUnderline, Enso } from '../components/Brush';

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
    const [type, setType] = useState<'NUMBER' | 'TIME'>('NUMBER');
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

    if (loading) return <div className="text-center py-20 text-ink-mid"><Loader2 className="animate-spin inline mr-2" /> Loading Measures...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-6">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10px] kaizen-eyebrow uppercase tracking-[.24em] font-semibold text-accent mb-1 sm:mb-2">Your practice map</p>
                    <h1 className="text-xl sm:text-3xl kaizen-serif text-ink-hi">What are you growing?</h1>
                    <BrushUnderline className="mt-1 -ml-0.5" width={168} />
                    <p className="hidden sm:block text-sm text-ink-mid mt-1.5">Choose the small signals that tell your story.</p>
                </div>
                <button onClick={openCreateModal} className="btn-primary flex items-center gap-1.5 shrink-0 whitespace-nowrap px-3 py-2 text-xs sm:gap-2 sm:px-5 sm:py-3 sm:text-sm">
                    <Plus size={16} className="sm:hidden" />
                    <Plus size={20} className="hidden sm:block" />
                    <span className="sm:hidden">New</span>
                    <span className="hidden sm:inline">Create New</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {measures.length === 0 && (
                    <div className="p-6 sm:p-10 rounded-2xl border border-dashed border-hairline/10 text-center text-sm text-ink-low">
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
                            className={`glass p-5 rounded-2xl flex items-center justify-between group border border-hairline/5 hover:border-hairline/20 transition-all`}
                        >
                            <div className="flex items-center gap-5">
                                <div className={`w-12 h-12 ${theme.bgSoft} rounded-xl flex items-center justify-center border ${theme.border} ${theme.text}`}>
                                    <ItemIcon size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-ink-hi">{item.name}</h3>
                                    <p className="text-sm text-ink-mid">Unit: {item.unit}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditModal(item)}
                                    className="p-3 hover:bg-raise/10 text-ink-low hover:text-ink-hi rounded-xl transition-all"
                                    title="Edit Measure"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-3 hover:bg-neg/10 text-ink-low hover:text-neg rounded-xl transition-all"
                                    title="Delete Measure"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <EntryPanel isOpen={showModal} onClose={() => setShowModal(false)} eyebrow={editId ? 'Refine your practice' : 'A new signal'} title={editId ? 'Edit measure' : 'Create a measure'} subtitle="Define one thing worth noticing.">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-low ml-1">Data Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => { setType('NUMBER'); setUnit(''); }}
                                            className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${type === 'NUMBER'
                                                ? 'bg-pos/20 border-emerald-500 text-pos'
                                                : 'bg-raise/5 border-hairline/10 text-ink-mid hover:bg-raise/10'}`}
                                        >
                                            <span className="font-bold">Number</span>
                                        </button>
                                        <button
                                            onClick={() => { setType('TIME'); setUnit('Time'); }}
                                            className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${type === 'TIME'
                                                ? 'bg-pos/20 border-emerald-500 text-pos'
                                                : 'bg-raise/5 border-hairline/10 text-ink-mid hover:bg-raise/10'}`}
                                        >
                                            <span className="font-bold">Time</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-low ml-1">Measure Name</label>
                                    <input
                                        placeholder="e.g. Workout"
                                        className="w-full bg-raise/5 border border-hairline/10 rounded-xl px-4 py-3 text-ink-hi focus:outline-none focus:border-pos/50 transition-colors"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-low ml-1">Unit</label>
                                    <input
                                        placeholder={type === 'TIME' ? 'Time (hh:mm)' : 'e.g. minutes'}
                                        className={`w-full bg-raise/5 border border-hairline/10 rounded-xl px-4 py-3 text-ink-hi focus:outline-none focus:border-pos/50 transition-colors ${type === 'TIME' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        value={unit}
                                        readOnly={type === 'TIME'}
                                        onChange={e => setUnit(e.target.value)}
                                    />
                                </div>

                                {/* Icon Picker */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-low ml-1">Icon</label>
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
                                                        : 'bg-raise/5 text-ink-mid hover:bg-raise/10 hover:text-ink-hi'
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
                                    <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-low ml-1">Color</label>
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
            </EntryPanel>
        </div>
    );
};

export default Measures;
