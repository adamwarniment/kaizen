import React, { useEffect, useMemo, useState } from 'react';
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

/** Reads the resolved theme tokens the chart needs. */
const readChartTheme = () => {
    const s = getComputedStyle(document.documentElement);
    const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
    return {
        grid: v('--chart-grid', 'rgba(255,255,255,.07)'),
        axis: v('--chart-axis', '#94a3b8'),
        income: v('--chart-income', '#34d399'),
        expense: v('--chart-expense', '#ec4899'),
        net: v('--chart-net', '#e2e8f0'),
        tooltipBg: v('--chart-tooltip-bg', '#1e1e1e'),
        tooltipBorder: v('--chart-tooltip-border', '#333'),
        surface: `rgb(${v('--surface', '31 38 34')})`,
        ink: v('--ink-hi', '#edf3e7'),
        radius: v('--radius-lg', '12px'),
        meta: v('--font-meta', 'monospace'),
        ui: v('--font-ui', 'sans-serif'),
    };
};

/** Re-resolves whenever the theme or mode attribute changes. */
const useChartTheme = () => {
    const [tokens, setTokens] = useState(readChartTheme);

    useEffect(() => {
        const update = () => setTokens(readChartTheme());
        const observer = new MutationObserver(update);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] });
        return () => observer.disconnect();
    }, []);

    return tokens;
};

const CashFlowChart: React.FC<CashFlowChartProps> = ({ transactions }) => {
    const t = useChartTheme();
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
        <div className="glass p-3 sm:p-6 rounded-2xl border border-hairline/5 space-y-2 sm:space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
                <div className="min-w-0">
                    <h3 className="font-bold text-ink-hi text-sm sm:text-lg">Cash Flow</h3>
                    <p className="hidden sm:block text-sm text-ink-mid">Income, expenses, and running balance.</p>
                </div>
                {/* Legend wraps under the title on narrow screens rather than crushing it. */}
                <div className="flex items-center gap-2.5 sm:gap-4 text-[10px] sm:text-xs font-bold">
                    <div className="flex items-center gap-1 sm:gap-2">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0" style={{ backgroundColor: t.income }}></div>
                        <span className="text-ink-mid">Income</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0" style={{ backgroundColor: t.expense }}></div>
                        <span className="text-ink-mid">Expenses</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0" style={{ backgroundColor: t.net }}></div>
                        <span className="text-ink-mid whitespace-nowrap">Net Income</span>
                    </div>
                </div>
            </div>

            <div className="h-[180px] sm:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
                        <XAxis
                            dataKey="displayMonth"
                            stroke={t.grid}
                            tick={{ fill: t.axis, fontSize: 11, fontFamily: t.meta }}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke={t.grid}
                            tick={{ fill: t.axis, fontSize: 11, fontFamily: t.meta }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, borderRadius: t.radius, color: t.ink, fontFamily: t.meta, fontSize: 12 }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                            formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                            cursor={{ fill: t.grid }}
                        />
                        <ReferenceLine y={0} stroke={t.axis} strokeOpacity={0.35} />

                        {/* Income Bars (Green) */}
                        <Bar dataKey="income" barSize={40} fill={t.income} radius={[4, 4, 0, 0]} name="Income" />

                        {/* Expense Bars (Red/Pink) */}
                        <Bar dataKey="expense" barSize={40} fill={t.expense} radius={[0, 0, 4, 4]} name="Expenses" />

                        {/* Balance Line (Black/White per request) */}
                        <Line
                            type="monotone"
                            dataKey="balance"
                            stroke={t.net}
                            strokeWidth={3}
                            dot={{ fill: t.surface, stroke: t.net, strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, fill: t.net }}
                            name="Net Balance"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default CashFlowChart;
