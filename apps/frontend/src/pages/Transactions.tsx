import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, ArrowUpRight, ArrowDownLeft, Wallet, Loader2, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { getHistory, cashout, createTransaction, updateTransaction, deleteTransaction, Transaction, User } from '../services/api';

interface TransactionsProps {
    user: User;
    onUpdate: () => void;
}

const Transactions: React.FC<TransactionsProps> = ({ user, onUpdate }) => {
    const [history, setHistory] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState('');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editTxId, setEditTxId] = useState<string | null>(null);
    const [txType, setTxType] = useState<'CREDIT' | 'DEBIT'>('DEBIT');
    const [txTitle, setTxTitle] = useState('');
    const [txAmount, setTxAmount] = useState('');
    const [txDesc, setTxDesc] = useState('');

    useEffect(() => {
        fetchHistory();
    }, [user?.balance]);

    const fetchHistory = async () => {
        try {
            const res = await getHistory();
            setHistory(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCashout = async () => {
        if (!amount || isNaN(parseFloat(amount))) {
            alert("Please enter a valid amount");
            return;
        }
        try {
            await cashout({ amount: parseFloat(amount) });
            fetchHistory();
            onUpdate();
            setAmount('');
            alert('Cashout successful!');
        } catch (e) {
            console.error(e);
            alert('Cashout failed (Check balance)');
        }
    };

    const resetModal = () => {
        setEditTxId(null);
        setTxTitle('');
        setTxAmount('');
        setTxDesc('');
        setTxType('DEBIT');
        setShowModal(false);
    }

    const openCreateModal = () => {
        resetModal();
        setShowModal(true);
    }

    const openEditModal = (tx: Transaction) => {
        setEditTxId(tx.id);
        setTxTitle(tx.title || 'Transaction');
        setTxAmount(Math.abs(tx.amount).toString());
        setTxDesc(tx.notes || '');
        // Infer type from amount sign or existing type data (if available on FE object properly)
        // If amount > 0 => CREDIT/REWARD. If < 0 => DEBIT/CASHOUT.
        const isCredit = tx.amount > 0;
        setTxType(isCredit ? 'CREDIT' : 'DEBIT');
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!txTitle || !txAmount || isNaN(parseFloat(txAmount))) {
            alert('Please enter a title and valid amount.');
            return;
        }

        try {
            if (editTxId) {
                await updateTransaction(editTxId, {
                    amount: parseFloat(txAmount),
                    title: txTitle,
                    description: txDesc
                });
            } else {
                await createTransaction({
                    type: txType,
                    amount: parseFloat(txAmount),
                    title: txTitle,
                    description: txDesc
                });
            }

            fetchHistory();
            onUpdate();
            resetModal();
        } catch (e: any) {
            console.error(e);
            alert(e.response?.data?.error || 'Transaction failed');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will revert the balance change.")) return;
        try {
            await deleteTransaction(id);
            fetchHistory();
            onUpdate();
        } catch (e) {
            console.error(e);
            alert("Failed to delete transaction");
        }
    };

    if (loading) return <div className="text-center py-20 text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Loading Transactions...</div>;

    const totalEarned = history.filter(h => h.amount > 0).reduce((acc, curr) => acc + curr.amount, 0);
    const totalSpent = Math.abs(history.filter(h => h.amount < 0).reduce((acc, curr) => acc + curr.amount, 0));

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Transactions</h1>
                    <p className="text-slate-400">Track your earnings and spending.</p>
                </div>
                <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
                    <Plus size={20} /> New Transaction
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass p-6 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><Wallet size={20} /></div>
                        <h3 className="text-slate-400 font-medium">Current Balance</h3>
                    </div>
                    <p className="text-3xl font-bold text-slate-200">${user?.balance?.toFixed(2)}</p>
                </div>
                <div className="glass p-6 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><ArrowDownLeft size={20} /></div>
                        <h3 className="text-slate-400 font-medium">Total Earned</h3>
                    </div>
                    <p className="text-3xl font-bold text-green-400">+${totalEarned.toFixed(2)}</p>
                </div>
                <div className="glass p-6 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-500/10 rounded-lg text-red-400"><ArrowUpRight size={20} /></div>
                        <h3 className="text-slate-400 font-medium">Total Spent</h3>
                    </div>
                    <p className="text-3xl font-bold text-red-400">-${totalSpent.toFixed(2)}</p>
                </div>
            </div>

            {/* Cashout Section (Legacy/Quick) */}
            <div className="glass p-6 rounded-2xl border border-white/5 flex items-center gap-4">
                <div className="flex-1">
                    <h3 className="font-bold text-slate-200">Quick Cashout</h3>
                    <p className="text-xs text-slate-400">Redeem your balance instantly.</p>
                </div>
                <input
                    type="number"
                    placeholder="Amount ($)"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-slate-200 w-32 focus:outline-none focus:border-red-500/50"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                />
                <button onClick={handleCashout} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all font-bold text-sm">
                    Cash Out
                </button>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-200">History</h3>
                {history.length === 0 && (
                    <div className="p-10 rounded-3xl border border-dashed border-white/10 text-center text-slate-500">
                        No transactions found.
                    </div>
                )}
                {history.map((tx) => {
                    const isPositive = tx.amount > 0;
                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={tx.id}
                            className="glass p-4 rounded-xl flex items-center justify-between border border-white/5 group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isPositive
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                                    }`}>
                                    {isPositive ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                </div>
                                <div>
                                    <div className="flex flex-col">
                                        <p className="font-bold text-slate-200">{tx.title || 'Transaction'}</p>
                                        {tx.notes && <p className="text-xs text-slate-400">{tx.notes}</p>}
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-white/50">{tx.type}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleDateString()} at {new Date(tx.createdAt).toLocaleTimeString()}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className={`font-bold text-lg ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {isPositive ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                                </span>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => openEditModal(tx)}
                                        className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all"
                                        title="Edit Transaction"
                                    >
                                        {/* Re-using Edit2 from icons if imported, else fallback or use text */}
                                        <ArrowUpRight className="rotate-45" size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(tx.id)}
                                        className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-all"
                                        title="Delete Transaction"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )
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
                                <h3 className="text-2xl font-bold text-slate-200">{editTxId ? 'Edit Transaction' : 'New Transaction'}</h3>
                                <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-200 transition-colors"><X size={24} /></button>
                            </div>

                            <div className="space-y-4">
                                {!editTxId && (
                                    <div className="flex bg-white/5 p-1 rounded-xl">
                                        <button
                                            onClick={() => setTxType('DEBIT')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${txType === 'DEBIT' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            Expenses (Debit)
                                        </button>
                                        <button
                                            onClick={() => setTxType('CREDIT')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${txType === 'CREDIT' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            Income (Credit)
                                        </button>
                                    </div>
                                )}

                                {editTxId && (
                                    <p className="text-xs text-center text-slate-500 mb-2">Editing <span className="text-slate-300 font-bold">{txType}</span> transaction.</p>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Title</label>
                                    <input
                                        type="text"
                                        placeholder={txType === 'CREDIT' ? 'e.g. Sold Item' : 'e.g. Coffee'}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-white/30 transition-colors"
                                        value={txTitle}
                                        onChange={e => setTxTitle(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Amount ($)</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-slate-200 focus:outline-none transition-colors ${txType === 'CREDIT' ? 'focus:border-emerald-500/50 border-white/10' : 'focus:border-red-500/50 border-white/10'
                                            }`}
                                        value={txAmount}
                                        onChange={e => setTxAmount(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Description (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Add details..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-white/30 transition-colors"
                                        value={txDesc}
                                        onChange={e => setTxDesc(e.target.value)}
                                    />
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    className={`w-full font-bold py-3 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg mt-4 text-white
                                        ${txType === 'CREDIT'
                                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-900/20'
                                            : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-red-900/20'
                                        }`}
                                >
                                    {editTxId ? 'Save Changes' : (txType === 'CREDIT' ? 'Add Credit' : 'Confirm Debit')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Transactions;
