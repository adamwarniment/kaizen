import React, { useState, useEffect } from 'react';
import { Plus, Loader2, X } from 'lucide-react';
import { createEntry, getMeasures, Measure } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

const QuickLogModal: React.FC<QuickLogModalProps> = ({ isOpen, onClose, onUpdate }) => {
    const [measures, setMeasures] = useState<Measure[]>([]);
    const [selectedMeasureId, setSelectedMeasureId] = useState('');
    const [logValue, setLogValue] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchMeasures = async () => {
                try {
                    const res = await getMeasures();
                    setMeasures(res.data);
                    if (res.data.length > 0 && !selectedMeasureId) setSelectedMeasureId(res.data[0].id);
                } catch (e) {
                    console.error(e);
                }
            };
            fetchMeasures();
        }
    }, [isOpen]);

    const handleLog = async () => {
        if (!selectedMeasureId) return;
        if (!logValue) return;

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
            onClose();
        } catch (e) {
            console.error(e);
            alert('Failed to log entry.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[50]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-900 border border-white/10 p-6 rounded-2xl z-[51] shadow-2xl"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Quick Log</h2>
                            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-white/30 block mb-2">Measure</label>
                                <select
                                    className="input-field w-full appearance-none bg-black/40 border-white/10 focus:border-red-500/50"
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
                                    placeholder="Enter value..."
                                    className="input-field w-full bg-black/40 border-white/10 focus:border-red-500/50"
                                    autoFocus
                                />
                            </div>

                            <button
                                onClick={handleLog}
                                disabled={submitting}
                                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                                Log Entry
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default QuickLogModal;
