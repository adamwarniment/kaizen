import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, ArrowUpRight, ArrowDownLeft, Wallet, Loader2, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { getHistory, cashout, createTransaction, updateTransaction, deleteTransaction, Transaction, User } from '../services/api';
import CashFlowChart from '../components/CashFlowChart';
import EntryPanel from '../components/EntryPanel';
import { format } from 'date-fns';
import { BrushUnderline, Enso } from '../components/Brush';

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
    const [txDate, setTxDate] = useState('');

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
        setTxDate('');
        setTxType('DEBIT');
        setShowModal(false);
    }

    const openCreateModal = () => {
        resetModal();
        setTxDate(format(new Date(), 'yyyy-MM-dd')); // Default to today in the viewer's local calendar
        setShowModal(true);
    }

    const openEditModal = (tx: Transaction) => {
        setEditTxId(tx.id);
        setTxTitle(tx.title || 'Transaction');
        setTxAmount(Math.abs(tx.amount).toString());
        setTxDesc(tx.notes || '');
        setTxDate(tx.createdAt.substring(0, 10));
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
                    description: txDesc,
                    date: txDate
                });
            } else {
                await createTransaction({
                    type: txType === 'CREDIT' ? 'CREDIT' : 'DEBIT',
                    amount: parseFloat(txAmount),
                    title: txTitle,
                    description: txDesc,
                    date: txDate
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

    if (loading) return <div className="text-center py-20 text-ink-mid"><Loader2 className="animate-spin inline mr-2" /> Loading Transactions...</div>;

    const totalEarned = history.filter(h => h.amount > 0).reduce((acc, curr) => acc + curr.amount, 0);
    const totalSpent = Math.abs(history.filter(h => h.amount < 0).reduce((acc, curr) => acc + curr.amount, 0));
    const formatTransactionDate = (value: string) => {
        const [year, month, day] = value.substring(0, 10).split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-6">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10px] kaizen-eyebrow uppercase tracking-[.24em] font-semibold text-accent mb-1 sm:mb-2">Your reward loop</p>
                    <h1 className="text-xl sm:text-3xl kaizen-serif text-ink-hi">See the value you’ve built.</h1>
                    <BrushUnderline className="mt-1 -ml-0.5" width={168} />
                    {/* Explanatory copy is nice on desktop, just noise on a phone. */}
                    <p className="hidden sm:block text-sm text-ink-mid mt-1.5">Track the rewards that keep your practice alive.</p>
                </div>
                <button onClick={openCreateModal} className="btn-primary flex items-center gap-1.5 shrink-0 whitespace-nowrap px-3 py-2 text-xs sm:gap-2 sm:px-5 sm:py-3 sm:text-sm">
                    <Plus size={16} className="sm:hidden" />
                    <Plus size={20} className="hidden sm:block" />
                    <span className="sm:hidden">New</span>
                    <span className="hidden sm:inline">New Transaction</span>
                </button>
            </div>

            {/* Phone: one compact strip — three stacked cards owned the whole screen. */}
            <div className="md:hidden glass rounded-xl border border-hairline/5 grid grid-cols-3 divide-x divide-hairline/[.07]">
                <div className="px-2.5 py-2.5 min-w-0">
                    <div className="flex items-center gap-1 text-ink-mid mb-0.5">
                        <Wallet size={11} className="text-pos shrink-0" />
                        <span className="text-[9px] kaizen-eyebrow uppercase tracking-wider font-bold truncate">Balance</span>
                    </div>
                    <p className="text-base font-bold text-ink-hi tabular-nums truncate">${user?.balance?.toFixed(2)}</p>
                </div>
                <div className="px-2.5 py-2.5 min-w-0">
                    <div className="flex items-center gap-1 text-ink-mid mb-0.5">
                        <ArrowDownLeft size={11} className="text-pos shrink-0" />
                        <span className="text-[9px] kaizen-eyebrow uppercase tracking-wider font-bold truncate">Earned</span>
                    </div>
                    <p className="text-base font-bold text-pos tabular-nums truncate">+${totalEarned.toFixed(2)}</p>
                </div>
                <div className="px-2.5 py-2.5 min-w-0">
                    <div className="flex items-center gap-1 text-ink-mid mb-0.5">
                        <ArrowUpRight size={11} className="text-neg shrink-0" />
                        <span className="text-[9px] kaizen-eyebrow uppercase tracking-wider font-bold truncate">Spent</span>
                    </div>
                    <p className="text-base font-bold text-neg tabular-nums truncate">-${totalSpent.toFixed(2)}</p>
                </div>
            </div>

            <div className="hidden md:grid grid-cols-3 gap-4">
                <div className="glass p-4 rounded-xl border border-hairline/5">
                    <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="p-1.5 bg-pos/10 rounded-lg text-pos"><Wallet size={17} /></div>
                        <h3 className="text-sm text-ink-mid font-medium">Current Balance</h3>
                    </div>
                    <p className="text-2xl font-bold text-ink-hi">${user?.balance?.toFixed(2)}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-hairline/5">
                    <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="p-1.5 bg-green-500/10 rounded-lg text-pos"><ArrowDownLeft size={17} /></div>
                        <h3 className="text-sm text-ink-mid font-medium">Total Earned</h3>
                    </div>
                    <p className="text-2xl font-bold text-pos">+${totalEarned.toFixed(2)}</p>
                </div>
                <div className="glass p-4 rounded-xl border border-hairline/5">
                    <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="p-1.5 bg-neg/10 rounded-lg text-neg"><ArrowUpRight size={17} /></div>
                        <h3 className="text-sm text-ink-mid font-medium">Total Spent</h3>
                    </div>
                    <p className="text-2xl font-bold text-neg">-${totalSpent.toFixed(2)}</p>
                </div>
            </div>

            <CashFlowChart transactions={history} />

            {/* Cashout Section (Legacy/Quick) */}
            <div className="glass p-3 sm:p-4 rounded-xl border border-hairline/5 flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex-1 min-w-full sm:min-w-0">
                    <h3 className="font-bold text-ink-hi text-sm sm:text-base">Quick Cashout</h3>
                    <p className="text-xs text-ink-mid">Redeem your balance instantly.</p>
                </div>
                <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Amount ($)"
                    className="bg-raise/5 border border-hairline/10 rounded-xl px-3 sm:px-4 py-2 text-sm text-ink-hi flex-1 min-w-0 sm:flex-none sm:w-32 focus:outline-none focus:border-neg/50"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                />
                <button onClick={handleCashout} className="px-4 py-2 bg-neg/10 hover:bg-neg/20 text-neg rounded-xl border border-neg/20 transition-all font-bold text-sm shrink-0">
                    Cash Out
                </button>
            </div>

            <div className="space-y-2 sm:space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-ink-hi">History</h3>
                {history.length === 0 && (
                    <div className="p-6 sm:p-10 rounded-2xl sm:rounded-3xl border border-dashed border-hairline/10 text-center text-sm text-ink-low">
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
                            className="glass p-2.5 sm:p-3 rounded-xl flex items-center justify-between gap-2 border border-hairline/5 group"
                        >
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                <div className={`w-7 h-7 sm:w-9 sm:h-9 shrink-0 rounded-full flex items-center justify-center border ${isPositive
                                    ? 'bg-pos/10 border-pos/20 text-pos'
                                    : 'bg-neg/10 border-neg/20 text-neg'
                                    }`}>
                                    {isPositive ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm sm:text-base text-ink-hi truncate">{tx.title || 'Transaction'}</p>
                                    {tx.notes && <p className="text-xs text-ink-mid truncate">{tx.notes}</p>}
                                    {/* Type and date share one line instead of stacking into a tall row. */}
                                    <p className="text-[11px] text-ink-low truncate">
                                        <span className="text-ink-low">{tx.type}</span>
                                        <span className="mx-1.5 text-ink-faint">·</span>
                                        {formatTransactionDate(tx.createdAt)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 sm:gap-4 shrink-0">
                                <span className={`font-bold text-sm sm:text-lg tabular-nums ${isPositive ? 'text-pos' : 'text-neg'}`}>
                                    {isPositive ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                                </span>

                                {/* Touch devices have no hover, so these must stay visible on mobile. */}
                                <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => openEditModal(tx)}
                                        className="p-1.5 sm:p-2 hover:bg-raise/10 rounded-lg text-ink-low hover:text-ink-hi transition-all"
                                        title="Edit Transaction"
                                    >
                                        {/* Re-using Edit2 from icons if imported, else fallback or use text */}
                                        <ArrowUpRight className="rotate-45" size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(tx.id)}
                                        className="p-1.5 sm:p-2 hover:bg-neg/10 rounded-lg text-ink-low hover:text-neg transition-all"
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

            <EntryPanel isOpen={showModal} onClose={resetModal} eyebrow={editTxId ? 'Adjust the record' : 'Reward loop'} title={editTxId ? 'Edit transaction' : 'Add a transaction'} subtitle="Keep your reward economy honest and useful.">

                            <div className="space-y-4">
                                {!editTxId && (
                                    <div className="flex bg-raise/5 p-1 rounded-xl">
                                        <button
                                            onClick={() => setTxType('DEBIT')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${txType === 'DEBIT' ? 'bg-neg/20 text-neg shadow-sm' : 'text-ink-low hover:text-ink-hi'}`}
                                        >
                                            Expenses (Debit)
                                        </button>
                                        <button
                                            onClick={() => setTxType('CREDIT')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${txType === 'CREDIT' ? 'bg-pos/20 text-pos shadow-sm' : 'text-ink-low hover:text-ink-hi'}`}
                                        >
                                            Income (Credit)
                                        </button>
                                    </div>
                                )}

                                {editTxId && (
                                    <p className="text-xs text-center text-ink-low mb-2">Editing <span className="text-ink-hi font-bold">{txType}</span> transaction.</p>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-low ml-1">Title</label>
                                    <input
                                        type="text"
                                        placeholder={txType === 'CREDIT' ? 'e.g. Sold Item' : 'e.g. Coffee'}
                                        className="w-full bg-raise/5 border border-hairline/10 rounded-xl px-4 py-3 text-ink-hi focus:outline-none focus:border-hairline/30 transition-colors"
                                        value={txTitle}
                                        onChange={e => setTxTitle(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-low ml-1">Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-raise/5 border border-hairline/10 rounded-xl px-4 py-3 text-ink-hi focus:outline-none focus:border-hairline/30 transition-colors"
                                        value={txDate}
                                        onChange={e => setTxDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-low ml-1">Amount ($)</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        className={`w-full bg-raise/5 border rounded-xl px-4 py-3 text-ink-hi focus:outline-none transition-colors ${txType === 'CREDIT' ? 'focus:border-pos/50 border-hairline/10' : 'focus:border-neg/50 border-hairline/10'
                                            }`}
                                        value={txAmount}
                                        onChange={e => setTxAmount(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold kaizen-eyebrow uppercase tracking-wider text-ink-low ml-1">Description (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Add details..."
                                        className="w-full bg-raise/5 border border-hairline/10 rounded-xl px-4 py-3 text-ink-hi focus:outline-none focus:border-hairline/30 transition-colors"
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
            </EntryPanel>
        </div>
    );
};

export default Transactions;
