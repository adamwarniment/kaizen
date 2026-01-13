import React, { useState, useEffect } from 'react';
import { Plus, Loader2, X, Trash2, Calendar, Target } from 'lucide-react';
import { createEntry, getMeasures, Measure } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

interface LogItem {
    id: string; // internal id for list management
    measureId: string;
    value: string;
}

const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const QuickLogModal: React.FC<QuickLogModalProps> = ({ isOpen, onClose, onUpdate }) => {
    const [measures, setMeasures] = useState<Measure[]>([]);
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [logItems, setLogItems] = useState<LogItem[]>([{ id: '1', measureId: '', value: '' }]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchMeasures = async () => {
                try {
                    const res = await getMeasures();
                    setMeasures(res.data);
                    // Pre-select first measure for the first item
                    if (res.data.length > 0) {
                        setLogItems([{ id: '1', measureId: res.data[0].id, value: '' }]);
                    }
                } catch (e) {
                    console.error(e);
                }
            };
            fetchMeasures();
            // Reset state on open
            setDate(new Date().toISOString().split('T')[0]);
        }
    }, [isOpen]);

    const addLogItem = () => {
        const newItem: LogItem = {
            id: Math.random().toString(36).substr(2, 9),
            measureId: measures.length > 0 ? measures[0].id : '',
            value: ''
        };
        setLogItems([...logItems, newItem]);
    };

    const removeLogItem = (id: string) => {
        if (logItems.length === 1) return;
        setLogItems(logItems.filter(item => item.id !== id));
    };

    const updateLogItem = (id: string, field: 'measureId' | 'value', value: string) => {
        setLogItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleLog = async () => {
        // Filter out incomplete items
        const validItems = logItems.filter(item => {
            if (!item.measureId || !item.value) return false;
            const measure = measures.find(m => m.id === item.measureId);
            if (measure?.type === 'TIME') return true; // time string is valid
            return !isNaN(parseFloat(item.value));
        });

        if (validItems.length === 0) return;

        setSubmitting(true);
        try {
            await Promise.all(validItems.map(item => {
                const measure = measures.find(m => m.id === item.measureId);
                const isTime = measure?.type === 'TIME';

                return createEntry({
                    measureId: item.measureId,
                    value: isTime ? timeToMinutes(item.value) : parseFloat(item.value),
                    date: date
                });
            }));

            onUpdate();
            onClose();
        } catch (e) {
            console.error(e);
            alert('Failed to log entries.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl z-[51] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-zinc-900 sticky top-0 md:bg-zinc-900">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Target className="text-red-500" size={20} />
                                    Quick Log
                                </h2>
                                <p className="text-zinc-500 text-xs mt-1">Record your progress quickly</p>
                            </div>
                            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            {/* Date Selection */}
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2 flex items-center gap-2">
                                    <Calendar size={12} /> Date
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-red-500 outline-none text-sm"
                                />
                            </div>

                            {/* Entries List */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Measures</label>
                                {logItems.map((item, index) => (
                                    <div key={item.id} className="flex gap-2 items-start">
                                        <div className="flex-grow grid grid-cols-2 gap-2">
                                            <select
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-red-500 outline-none text-sm appearance-none"
                                                value={item.measureId}
                                                onChange={(e) => updateLogItem(item.id, 'measureId', e.target.value)}
                                            >
                                                {measures.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                                                ))}
                                            </select>
                                            <input
                                                type={measures.find(m => m.id === item.measureId)?.type === 'TIME' ? "time" : "number"}
                                                value={item.value}
                                                onChange={(e) => updateLogItem(item.id, 'value', e.target.value)}
                                                placeholder={measures.find(m => m.id === item.measureId)?.type === 'TIME' ? "00:00" : "Value"}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-red-500 outline-none text-sm"
                                                autoFocus={index === logItems.length - 1}
                                            />
                                        </div>
                                        {logItems.length > 1 && (
                                            <button
                                                onClick={() => removeLogItem(item.id)}
                                                className="p-2.5 bg-white/5 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 rounded-lg transition-colors border border-white/5"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={addLogItem}
                                className="w-full py-2 border border-dashed border-white/10 hover:border-red-500/50 hover:bg-red-500/5 text-zinc-500 hover:text-red-400 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={16} /> Add another measure
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-zinc-900/50 mt-auto">
                            <button
                                onClick={handleLog}
                                disabled={submitting}
                                className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-900/20"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                                Log Entry
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default QuickLogModal;
