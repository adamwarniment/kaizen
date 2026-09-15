import React, { useState, useEffect } from 'react';
import { Plus, Loader2, Trash2, Calendar, Target } from 'lucide-react';
import { createEntry, getMeasures, Measure } from '../services/api';
import EntryPanel from './EntryPanel';
import { format } from 'date-fns';

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
    const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [logItems, setLogItems] = useState<LogItem[]>([{ id: '1', measureId: '', value: '' }]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchMeasures = async () => {
                try {
                    const res = await getMeasures();
                    setMeasures(res.data);
                    // Start with every measure: logging a day should never require hunting for a habit.
                    if (res.data.length > 0) {
                        setLogItems(res.data.map((measure, index) => ({ id: `${measure.id}-${index}`, measureId: measure.id, value: '' })));
                    }
                } catch (e) {
                    console.error(e);
                }
            };
            fetchMeasures();
            // Reset state on open
            setDate(format(new Date(), 'yyyy-MM-dd'));
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
        <EntryPanel isOpen={isOpen} onClose={onClose} eyebrow="A small win" title="Log your practice" subtitle="Capture the effort while it’s fresh.">
                        <div className="space-y-6">
                            {/* Date Selection */}
                            <div className="bg-raise/5 p-4 rounded-xl border border-hairline/5">
                                <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-mid block mb-2 flex items-center gap-2">
                                    <Calendar size={12} /> Date
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full bg-sunken/40 border border-hairline/10 rounded-lg px-3 py-2 text-ink-hi focus:border-red-500 outline-none text-sm"
                                />
                            </div>

                            {/* Entries List */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-mid block">Measures</label>
                                {logItems.map((item, index) => (
                                    <div key={item.id} className="flex gap-2 items-start">
                                        <div className="flex-grow grid grid-cols-2 gap-2">
                                            <select
                                                className="w-full bg-sunken/40 border border-hairline/10 rounded-lg px-3 py-2.5 text-ink-hi focus:border-red-500 outline-none text-sm appearance-none"
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
                                                className="w-full bg-sunken/40 border border-hairline/10 rounded-lg px-3 py-2 text-ink-hi focus:border-red-500 outline-none text-sm"
                                                autoFocus={index === logItems.length - 1}
                                            />
                                        </div>
                                        {logItems.length > 1 && (
                                            <button
                                                onClick={() => removeLogItem(item.id)}
                                                className="p-2.5 bg-raise/5 hover:bg-neg/20 text-ink-low hover:text-neg rounded-lg transition-colors border border-hairline/5"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={addLogItem}
                                className="w-full py-2 border border-dashed border-hairline/10 hover:border-neg/50 hover:bg-red-500/5 text-ink-low hover:text-neg rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={16} /> Add another measure
                            </button>
                            <button
                                onClick={handleLog}
                                disabled={submitting}
                                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                                Log Entry
                            </button>
                        </div>
        </EntryPanel>
    );
};

export default QuickLogModal;
