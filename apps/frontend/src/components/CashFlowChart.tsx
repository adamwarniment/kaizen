import React, { useMemo } from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell
} from 'recharts';
import { Transaction } from '../services/api';

interface CashFlowChartProps {
    transactions: Transaction[];
}

interface MonthlyData {
    month: string;
    income: number;
    expense: number;
    balance: number;
    displayMonth: string; // "Nov 2022"
    sortKey: number; // For sorting
}

const CashFlowChart: React.FC<CashFlowChartProps> = ({ transactions }) => {
    const data = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];

        // 1. Sort transactions by date
        const sorted = [...transactions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        // 2. Aggregate by month
        const monthlyMap = new Map<string, MonthlyData>();
        let runningBalance = 0;

        // Populate map with all transactions
        sorted.forEach(tx => {
            const date = new Date(tx.createdAt);
            const key = `${date.getFullYear()}-${date.getMonth()}`; // "2023-0" for Jan

            // Running balance updates for every transaction continuously
            runningBalance += tx.amount;

            if (!monthlyMap.has(key)) {
                monthlyMap.set(key, {
                    month: key,
                    income: 0,
                    expense: 0,
                    balance: runningBalance, // Capture balance at end of this transaction (will be overwritten by end of month)
                    displayMonth: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    sortKey: date.getTime()
                });
            }

            const current = monthlyMap.get(key)!;
            if (tx.amount > 0) {
                current.income += tx.amount;
            } else {
                current.expense += tx.amount; // Will be negative
            }
            current.balance = runningBalance; // Update end-of-month balance
        });

        // Convert to array and sort
        const result = Array.from(monthlyMap.values()).sort((a, b) => {
            // Re-sort relying on the original sort key isn't perfect if months are skipped, but good enough for display logic
            const [yA, mA] = a.month.split('-').map(Number);
            const [yB, mB] = b.month.split('-').map(Number);
            return new Date(yA, mA).getTime() - new Date(yB, mB).getTime();
        });

        return result;
    }, [transactions]);

    if (data.length === 0) return null;

    return (
        <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-slate-200 text-lg">Cash Flow</h3>
                    <p className="text-sm text-slate-400">Income, expenses, and running balance.</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                        <span className="text-slate-400">Income</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                        <span className="text-slate-400">Expenses</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                        <span className="text-slate-400">Net Income</span>
                    </div>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis
                            dataKey="displayMonth"
                            stroke="#ffffff50"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="#ffffff50"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333', borderRadius: '12px' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                            formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                            cursor={{ fill: '#ffffff05' }}
                        />
                        <ReferenceLine y={0} stroke="#ffffff20" />

                        {/* Income Bars (Green) */}
                        <Bar dataKey="income" barSize={40} fill="#34d399" radius={[4, 4, 0, 0]} name="Income" />

                        {/* Expense Bars (Red/Pink) */}
                        <Bar dataKey="expense" barSize={40} fill="#ec4899" radius={[0, 0, 4, 4]} name="Expenses" />

                        {/* Balance Line (Black/White per request) */}
                        <Line
                            type="monotone"
                            dataKey="balance"
                            stroke="#e2e8f0"
                            strokeWidth={3}
                            dot={{ fill: '#0f172a', stroke: '#e2e8f0', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, fill: '#fff' }}
                            name="Net Balance"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default CashFlowChart;
