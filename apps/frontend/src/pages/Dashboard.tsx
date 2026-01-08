import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, DollarSign, Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight, Activity, Filter } from 'lucide-react';
import { getMeasures, getUser, Measure, User, Entry, getEntries, getHistory, Transaction } from '../services/api';
import { ICON_MAP, getColor } from '../utils/theme';
import { Link } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, isToday, addWeeks, subWeeks, parseISO, getDay, getDaysInMonth, isFuture } from 'date-fns';
import { calculateStreak, getDailyProgress, getTrendData } from '../utils/stats';

interface DashboardProps {
    user: User;
    onUpdate: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onUpdate }) => {
    // Common State
    const [measures, setMeasures] = useState<Measure[]>([]);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    // Desktop State (Calendar)
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedMeasureId, setSelectedMeasureId] = useState<string | null>(null);

    // Mobile State (Weekly Graph)
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
    const [visibleMeasureIds, setVisibleMeasureIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Initialize week start based on user pref
        setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: user.weekStart === 'MONDAY' ? 1 : 0 }));
        fetchData();
    }, []);

    // Set all measures visible initially for mobile once loaded
    useEffect(() => {
        if (measures.length > 0 && visibleMeasureIds.size === 0) {
            setVisibleMeasureIds(new Set(measures.map(m => m.id)));
        }
    }, [measures]);

    const fetchData = async () => {
        try {
            const [measuresRes, entriesRes, transactionsRes] = await Promise.all([
                getMeasures(),
                getEntries(),
                getHistory()
            ]);
            setMeasures(measuresRes.data);
            setEntries(entriesRes.data);
            setTransactions(transactionsRes.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    /* -------------------------------------------------------------------------- */
    /*                                DESKTOP LOGIC                               */
    /* -------------------------------------------------------------------------- */
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    // Calendar Generation
    const weekStartDay = user.weekStart === 'MONDAY' ? 1 : 0;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: weekStartDay as 0 | 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: weekStartDay as 0 | 1 });
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    /* -------------------------------------------------------------------------- */
    /*                                MOBILE LOGIC                                */
    /* -------------------------------------------------------------------------- */
    const nextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    const prevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    const jumpToWeek = (dateStr: string) => {
        if (!dateStr) return;
        const date = parseISO(dateStr);
        setCurrentWeekStart(startOfWeek(date, { weekStartsOn: user.weekStart === 'MONDAY' ? 1 : 0 }));
    };

    const toggleMeasure = (id: string) => {
        const next = new Set(visibleMeasureIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setVisibleMeasureIds(next);
    };

    // Mobile Chart Data
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: weekStartDay as 0 | 1 });
    const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

    const mobileChartData = weekDays.map(day => {
        const item: any = {
            name: format(day, 'EEE'),
            fullDate: format(day, 'MMM d, yyyy'),
            timestamp: day.getTime()
        };
        measures.forEach(m => {
            if (visibleMeasureIds.has(m.id)) {
                const stat = getDailyProgress(m, entries, day);
                item[m.id] = Math.round(stat.progress);
                item[`${m.id}_raw`] = stat.value;
                item[`${m.id}_target`] = stat.target;
                item[`${m.id}_unit`] = m.unit;
            }
        });
        return item;
    });

    if (loading) return <div className="text-center py-20"><Loader2 className="animate-spin inline mr-2 text-red-500" /> Loading Dashboard...</div>;

    return (
        <div className="max-w-[1600px] mx-auto h-full">

            {/* -------------------------------------------------------------------------- */
            /*                            MOBILE VIEW (md:hidden)                          */
            /* -------------------------------------------------------------------------- */}
            <div className="flex flex-col gap-6 h-full md:hidden pb-20">
                {/* Header Section */}
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-rose-400 bg-clip-text text-transparent">
                            Dashboard
                        </h1>
                        <p className="text-zinc-400 mt-1 text-sm">Track your weekly progress</p>
                    </div>

                    {/* Month Controls (Replaces Week Controls) */}
                    <div className="flex items-center gap-2 bg-zinc-900/50 p-1.5 rounded-xl border border-white/5 self-start">
                        <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors">
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex items-center gap-2 px-2 min-w-[120px] justify-center">
                            <CalendarIcon size={14} className="text-red-500" />
                            <span className="text-sm font-bold text-zinc-200">
                                {format(currentMonth, 'MMM yyyy')}
                            </span>
                        </div>

                        <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Measure Cards List */}
                <div className="flex flex-col gap-4">
                    {measures.map(m => {
                        const theme = getColor(m.color || 'emerald');
                        const Icon = ICON_MAP[m.icon || 'Target'] || ICON_MAP['Target'];

                        // Calculate Monthly Stats
                        const daysInMonth = eachDayOfInterval({
                            start: startOfMonth(currentMonth),
                            end: endOfMonth(currentMonth)
                        });

                        const monthTotal = daysInMonth.reduce((acc, day) => {
                            const stats = getDailyProgress(m, entries, day);
                            return acc + stats.value;
                        }, 0);

                        const isCurrentMonth = isSameMonth(currentMonth, new Date());
                        const daysPassed = isCurrentMonth ? new Date().getDate() : getDaysInMonth(currentMonth);
                        const avgPerDay = daysPassed > 0 ? (monthTotal / daysPassed).toFixed(1) : '0.0';

                        // Grid Generation
                        const monthStart = startOfMonth(currentMonth);
                        const startingDayIndex = getDay(monthStart);
                        const offset = user.weekStart === 'MONDAY'
                            ? (startingDayIndex === 0 ? 6 : startingDayIndex - 1)
                            : startingDayIndex;

                        const blanks = Array(offset).fill(null);
                        const days = daysInMonth;

                        return (
                            <div key={m.id} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-3 flex flex-row items-stretch justify-between shadow-lg backdrop-blur-sm gap-3">
                                {/* Left Side: Info & Stats */}
                                <div className="flex flex-col justify-between min-w-[100px] py-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${theme.bg} bg-opacity-10 border border-white/5`}>
                                            <Icon size={14} className={theme.text} />
                                        </div>
                                        <h3 className={`font-bold text-sm ${theme.text}`}>{m.name}</h3>
                                    </div>

                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider w-8">Total</span>
                                            <span className="text-white font-mono font-bold text-sm">{monthTotal}</span>
                                        </div>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider w-8">Avg</span>
                                            <span className="text-white font-mono font-bold text-sm">{avgPerDay}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Compact Connect 4 Grid */}
                                <div className="bg-black/20 rounded-xl p-2.5 border border-white/5 flex-grow max-w-[65%]">
                                    {/* Days Header */}
                                    <div className="grid grid-cols-7 mb-1 gap-x-1">
                                        {(user.weekStart === 'MONDAY'
                                            ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
                                            : ['S', 'M', 'T', 'W', 'T', 'F', 'S']
                                        ).map((d, i) => (
                                            <div key={i} className="text-center text-[8px] font-bold text-zinc-600 w-3">{d}</div>
                                        ))}
                                    </div>

                                    {/* Grid Circles */}
                                    <div className="grid grid-cols-7 gap-y-1 gap-x-1">
                                        {/* Blanks */}
                                        {blanks.map((_, i) => (
                                            <div key={`blank-${i}`} className="aspect-[4/3] rounded-md bg-white/5 opacity-[0.02]" />
                                        ))}

                                        {/* Days */}
                                        {days.map(day => {
                                            const stats = getDailyProgress(m, entries, day);
                                            const hasEntry = stats.value > 0;

                                            return (
                                                <div key={day.toString()} className="flex items-center justify-center">
                                                    <div
                                                        className={`w-full aspect-[4/3] rounded-md flex items-center justify-center text-[10px] font-bold transition-all border
                                                            ${hasEntry
                                                                ? `${theme.bg} text-white border-transparent shadow-sm` // Active
                                                                : 'bg-white/5 border-transparent text-zinc-700' // Empty Slot
                                                            }
                                                        `}
                                                        style={hasEntry ? { backgroundColor: theme.hex } : {}}
                                                    >
                                                        {hasEntry ? stats.value : null}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>

            {/* -------------------------------------------------------------------------- */
            /*                           DESKTOP VIEW (hidden md:flex)                    */
            /* -------------------------------------------------------------------------- */}
            <div className="hidden md:flex lg:h-[calc(100vh-190px)] xl:h-[calc(100vh-60px)] h-auto flex-col lg:flex-row gap-6 pb-2">
                {/* Left Column: Header + Calendar */}
                <div className="flex-grow flex flex-col min-h-[600px] lg:min-h-0 gap-4 lg:gap-2 xl:gap-4">
                    {/* Header */}
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
                        <div>
                            <h1 className="text-3xl lg:text-xl xl:text-3xl font-bold bg-gradient-to-r from-red-500 to-rose-400 bg-clip-text text-transparent">
                                Dashboard
                            </h1>
                            <p className="text-zinc-400 mt-1 lg:hidden xl:block">Change for the better</p>
                        </div>
                    </header>

                    {/* Calendar View */}
                    <div className="flex-grow w-full flex flex-col bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden shadow-2xl min-h-0">
                        <div className="flex-grow flex flex-col">
                            {/* Month Navigator */}
                            <div className="flex items-center justify-between px-3 py-2 lg:py-1 xl:py-2 border-b border-white/5 bg-zinc-900/80">
                                <button onClick={prevMonth} className="p-1 hover:bg-white/5 rounded-md text-zinc-400 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                                <span className="font-bold text-sm text-zinc-200">{format(currentMonth, 'MMMM yyyy')}</span>
                                <button onClick={nextMonth} className="p-1 hover:bg-white/5 rounded-md text-zinc-400 hover:text-white transition-colors"><ChevronRight size={16} /></button>
                            </div>

                            {/* Days Header */}
                            <div className="grid grid-cols-7 border-b border-white/5 bg-zinc-900/80 flex-shrink-0">
                                {(user.weekStart === 'MONDAY'
                                    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                                    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                                ).map(day => (
                                    <div key={day} className="h-8 lg:h-6 xl:h-8 bg-white/5 flex items-center justify-center text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Days Grid */}
                            <div className="grid grid-cols-7 auto-rows-fr flex-grow bg-black/20 overflow-y-auto custom-scrollbar h-[500px] lg:h-auto">
                                {calendarDays.map((day, idx) => {
                                    const isCurrentMonth = isSameMonth(day, monthStart);
                                    const isSelected = isSameDay(day, selectedDate);

                                    // Calculate "Perfect Day" status
                                    const dayDateStr = format(day, 'yyyy-MM-dd');

                                    // 1. Check if ANY daily goals exist
                                    const activeMeasures = measures.filter(m => m.goals?.some(g => g.timeframe === 'DAILY'));

                                    // 2. Check if ALL active daily goals are met
                                    const allGoalsMet = activeMeasures.length > 0 && activeMeasures.every(m => {
                                        const stats = getDailyProgress(m, entries, day);
                                        return stats.met;
                                    });

                                    // 3. Calculate Earned Amount for the day
                                    const earnedAmount = transactions
                                        .filter(t =>
                                            // Match date
                                            t.createdAt.startsWith(dayDateStr) &&
                                            // Positive types
                                            ['REWARD', 'BONUS', 'MANUAL_CREDIT', 'CREDIT'].includes(t.type)
                                        )
                                        .reduce((sum, t) => sum + t.amount, 0);

                                    return (
                                        <div
                                            key={day.toISOString()}
                                            onClick={() => setSelectedDate(day)}
                                            className={`p-1 lg:p-0.5 xl:p-2 border-b border-r border-white/5 flex flex-col gap-0.5 xl:gap-1 cursor-pointer transition-colors relative
                                                ${!isCurrentMonth ? 'bg-black/40 opacity-30 blur-[0.5px]' : ''} 
                                                ${isToday(day) ? 'bg-red-500/5' : ''}
                                                ${isSelected ? 'bg-white/5 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]' : 'hover:bg-white/5'}
                                            `}
                                        >
                                            <div className="flex justify-between items-start">
                                                <span className={`text-xs lg:text-[10px] xl:text-xs font-bold w-6 h-6 lg:w-5 lg:h-5 xl:w-6 xl:h-6 flex items-center justify-center rounded-full 
                                                    ${isToday(day) ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' :
                                                        isSelected ? 'bg-white text-black' : 'text-zinc-500'}`}>
                                                    {format(day, 'd')}
                                                </span>

                                                {/* Earned Pill */}
                                                {allGoalsMet && earnedAmount > 0 && (
                                                    <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 shadow-sm">
                                                        <span>+${earnedAmount.toFixed(2)}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Daily Progress Bars */}
                                            <div className="grid grid-cols-2 gap-1 lg:gap-0.5 xl:gap-1 mt-1 lg:mt-0.5 xl:mt-1">
                                                {measures.map(m => {
                                                    if (selectedMeasureId && m.id !== selectedMeasureId) return null;
                                                    const stats = getDailyProgress(m, entries, day);
                                                    if (stats.value === 0) return null;
                                                    const colorName = m.color || 'emerald';
                                                    const theme = getColor(colorName);
                                                    const ItemIcon = ICON_MAP[m.icon || 'Target'] || ICON_MAP['Target'];
                                                    return (
                                                        <div
                                                            key={m.id}
                                                            className="group/item relative transition-all duration-300"
                                                        >
                                                            <div className="flex items-center gap-1.5 opacity-80 group-hover/item:opacity-100 transition-opacity">
                                                                <div className={theme.text}>
                                                                    <ItemIcon size={10} />
                                                                </div>
                                                                {stats.target > 0 ? (
                                                                    <div className="h-1 flex-grow bg-zinc-800 rounded-full overflow-hidden relative">
                                                                        <div
                                                                            className={`h-full ${theme.bg} transition-all duration-500 brightness-125`}
                                                                            style={{ width: `${stats.progress}%` }}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex-grow flex items-center">
                                                                        <span
                                                                            className={`text-[9px] font-bold px-1 rounded-full flex items-center justify-center leading-none h-[10px] w-full`}
                                                                            style={{
                                                                                backgroundColor: `${theme.hex}33`,
                                                                                color: theme.hex
                                                                            }}
                                                                        >
                                                                            {stats.value}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Measures Cards */}
                <div className="w-full lg:w-72 xl:w-80 lg:min-w-[280px] xl:min-w-[320px] flex-shrink-0 h-auto lg:h-full lg:overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-4">
                    <div className="flex items-center justify-between sticky top-0 bg-[#09090b] z-10 py-2 border-b border-white/5 flex-shrink-0">
                        <h2 className="text-lg font-bold text-white/90">
                            {isSameDay(selectedDate, new Date()) ? 'Today' : format(selectedDate, 'MMM do')}
                        </h2>
                        <Link to="/measures" className="text-red-500 text-xs font-bold hover:text-red-400 transition-colors uppercase tracking-wider">Manage</Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3 pb-6">
                        {measures.map((m, i) => {
                            const colorName = m.color || 'emerald';
                            const theme = getColor(colorName);
                            const streak = calculateStreak(m, entries);
                            const isMeasureSelected = selectedMeasureId === m.id;
                            const isDimmed = selectedMeasureId && !isMeasureSelected;

                            // Calculate trend data for the selected week based on user's weekStart preference
                            const trendData = [];
                            const currentWeekStart = startOfWeek(selectedDate, { weekStartsOn: weekStartDay as 0 | 1 });

                            for (let j = 0; j < 7; j++) {
                                const d = new Date(currentWeekStart);
                                d.setDate(d.getDate() + j);
                                const dateStr = format(d, 'yyyy-MM-dd');
                                const dayStat = getDailyProgress(m, entries, d);
                                trendData.push({
                                    name: format(d, 'cccccc'), // 'Su', 'Mo', etc.
                                    fullDate: format(d, 'MMM d'),
                                    value: dayStat.value,
                                    target: dayStat.target,
                                    date: dateStr,
                                    isToday: isSameDay(d, new Date()),
                                    isSelected: isSameDay(d, selectedDate)
                                });
                            }

                            const ItemIcon = ICON_MAP[m.icon || 'Target'] || ICON_MAP['Target'];
                            const dayStats = getDailyProgress(m, entries, selectedDate);

                            return (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    key={m.id}
                                    onClick={() => setSelectedMeasureId(isMeasureSelected ? null : m.id)} // Toggle selection
                                    className={`cursor-pointer 
                                        ${isMeasureSelected
                                            ? 'bg-white/5 ring-1 ring-inset ring-white border-transparent'
                                            : `bg-zinc-900/50 border ${theme.border}`
                                        } 
                                        ${isDimmed ? 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0' : ''}
                                        backdrop-blur-sm p-3 rounded-2xl relative overflow-hidden group transition-all duration-300 shadow-lg flex flex-col gap-2`}
                                >
                                    {/* Header & Stats Combined */}
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme.bgSoft} ${theme.text} ring-1 ring-inset ring-white/5`}>
                                                <ItemIcon size={16} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm leading-tight text-zinc-100">{m.name}</h3>
                                                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium mt-0.5">
                                                    <TrendingUp size={10} className={streak > 0 ? 'text-orange-500' : 'text-zinc-600'} />
                                                    <span className={streak > 0 ? 'text-orange-500' : 'text-zinc-500'}>{streak} day streak</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="flex items-baseline justify-end gap-1">
                                                <span className={`text-lg font-bold tracking-tight ${dayStats.met ? theme.text : 'text-white'}`}>
                                                    {dayStats.value}
                                                </span>
                                                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
                                                    / {dayStats.target} {m.unit}
                                                </span>
                                            </div>
                                            <div className={`text-xs font-bold ${dayStats.met ? theme.text : 'text-zinc-500'}`}>
                                                {Math.round(dayStats.progress)}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chart */}
                                    <div className="h-16 w-full mt-auto">
                                        <div className="w-full h-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={trendData}>
                                                    <XAxis
                                                        dataKey="name"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 9, fill: '#71717a', fontWeight: 600 }}
                                                        dy={5}
                                                        padding={{ left: 10, right: 10 }}
                                                        interval={0}
                                                    />
                                                    <RechartsTooltip
                                                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                                                        content={({ active, payload }) => {
                                                            if (active && payload && payload.length) {
                                                                const data = payload[0].payload;
                                                                return (
                                                                    <div className="bg-zinc-900 border border-white/10 p-2 rounded-lg shadow-xl text-xs">
                                                                        <p className="font-bold text-zinc-300">{data.fullDate}</p>
                                                                        <p className={`${theme.text} font-mono mt-1`}>
                                                                            {data.value} / {data.target} {m.unit}
                                                                        </p>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="value"
                                                        stroke={theme.hex || '#ef4444'}
                                                        strokeWidth={2}
                                                        dot={(props) => {
                                                            const { cx, cy, payload } = props;
                                                            if (payload.isSelected) {
                                                                return (
                                                                    <circle cx={cx} cy={cy} r={3} fill={theme.hex} stroke="#09090b" strokeWidth={2} />
                                                                );
                                                            }
                                                            return <></>;
                                                        }}
                                                        activeDot={{ r: 4, strokeWidth: 0 }}
                                                        isAnimationActive={false}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}

                        {measures.length === 0 && (
                            <div className="text-center py-10 text-white/20 border border-dashed border-white/10 rounded-2xl text-sm">
                                No measures found.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
