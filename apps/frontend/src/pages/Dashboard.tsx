import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getMeasures, getUser, Measure, User, Entry, getEntries } from '../services/api';
import { ICON_MAP, getColor } from '../utils/theme';
import { Link } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, isToday, subDays } from 'date-fns';
import { calculateStreak, getDailyProgress, getTrendData } from '../utils/stats';

interface DashboardProps {
    user: User;
    onUpdate: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onUpdate }) => {
    const [measures, setMeasures] = useState<Measure[]>([]);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedMeasureId, setSelectedMeasureId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [measuresRes, entriesRes] = await Promise.all([
                getMeasures(),
                getEntries()
            ]);
            setMeasures(measuresRes.data);
            setEntries(entriesRes.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    // Calendar Generation
    const weekStartDay = user.weekStart === 'MONDAY' ? 1 : 0;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: weekStartDay as 0 | 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: weekStartDay as 0 | 1 });
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    if (loading) return <div className="text-center py-20"><Loader2 className="animate-spin inline mr-2 text-red-500" /> Loading Dashboard...</div>;

    return (
        <div className="max-w-[1600px] mx-auto h-[calc(100vh-60px)] flex flex-col xl:flex-row gap-6 pb-2">
            {/* Left Column: Header + Calendar */}
            <div className="flex-grow flex flex-col min-h-0 gap-4">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-rose-400 bg-clip-text text-transparent">
                            Dashboard
                        </h1>
                        <p className="text-zinc-400 mt-1">Change for the better</p>
                    </div>
                </header>

                {/* Calendar View */}
                <div className="flex-grow w-full flex flex-col bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden shadow-2xl min-h-0">
                    <div className="flex-grow flex flex-col">
                        {/* Month Navigator (Compacted at Top) */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-zinc-900/80">
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
                                <div key={day} className="h-8 bg-white/5 flex items-center justify-center text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 auto-rows-fr flex-grow bg-black/20 overflow-y-auto custom-scrollbar">
                            {calendarDays.map((day, idx) => {
                                const isCurrentMonth = isSameMonth(day, monthStart);
                                const isSelected = isSameDay(day, selectedDate);
                                return (
                                    <div
                                        key={day.toISOString()}
                                        onClick={() => setSelectedDate(day)}
                                        className={`p-2 border-b border-r border-white/5 flex flex-col gap-1 cursor-pointer transition-colors relative
                                            ${!isCurrentMonth ? 'bg-black/40 opacity-30 blur-[0.5px]' : ''} 
                                            ${isToday(day) ? 'bg-red-500/5' : ''}
                                            ${isSelected ? 'bg-white/5 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]' : 'hover:bg-white/5'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full 
                                                ${isToday(day) ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' :
                                                    isSelected ? 'bg-white text-black' : 'text-zinc-500'}`}>
                                                {format(day, 'd')}
                                            </span>
                                        </div>

                                        {/* Daily Progress Bars */}
                                        <div className="grid grid-cols-2 gap-1 mt-1">
                                            {measures.map(m => {
                                                const stats = getDailyProgress(m, entries, day);
                                                const colorName = m.color || 'emerald';
                                                const theme = getColor(colorName);
                                                const ItemIcon = ICON_MAP[m.icon || 'Target'] || ICON_MAP['Target'];

                                                const isSelectedMeasure = selectedMeasureId === m.id;
                                                const isFilteredAndNotSelected = selectedMeasureId && !isSelectedMeasure;
                                                const isSelectedAndZero = isSelectedMeasure && stats.value === 0;

                                                return (
                                                    <div
                                                        key={m.id}
                                                        className={`group/item relative transition-all duration-300 
                                                            ${isFilteredAndNotSelected ? 'opacity-10 grayscale' : ''} 
                                                            ${isSelectedAndZero ? 'opacity-20 grayscale' : ''}
                                                        `}
                                                    >
                                                        <div className="flex items-center gap-1.5 opacity-80 group-hover/item:opacity-100 transition-opacity">
                                                            <div className={theme.text}>
                                                                <ItemIcon size={10} />
                                                            </div>
                                                            <div className="h-1 flex-grow bg-zinc-800 rounded-full overflow-hidden">
                                                                {stats.target > 0 && (
                                                                    <div
                                                                        className={`h-full ${stats.met ? theme.bg : theme.bg} transition-all duration-500 ${stats.met ? 'brightness-125' : 'opacity-70'}`}
                                                                        style={{ width: `${stats.progress}%` }}
                                                                    />
                                                                )}
                                                            </div>
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
            <div className="w-full xl:w-80 flex-shrink-0 h-full overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-4">
                <div className="flex items-center justify-between sticky top-0 bg-[#09090b] z-10 py-2 border-b border-white/5 flex-shrink-0">
                    <h2 className="text-lg font-bold text-white/90">
                        {isSameDay(selectedDate, new Date()) ? 'Today' : format(selectedDate, 'MMM do')}
                    </h2>
                    <Link to="/measures" className="text-red-500 text-xs font-bold hover:text-red-400 transition-colors uppercase tracking-wider">Manage</Link>
                </div>

                <div className="flex flex-col gap-3 pb-6">
                    {measures.map((m, i) => {
                        const colorName = m.color || 'emerald';
                        const theme = getColor(colorName);
                        const streak = calculateStreak(m, entries);
                        const isMeasureSelected = selectedMeasureId === m.id;
                        const isDimmed = selectedMeasureId && !isMeasureSelected;

                        // Calculate trend data for the selected week based on user's weekStart preference
                        const trendData = [];
                        // Determine start of week based on user setting (0 for Sunday, 1 for Monday)
                        const weekStartDay = user.weekStart === 'MONDAY' ? 1 : 0;
                        const currentWeekStart = startOfWeek(selectedDate, { weekStartsOn: weekStartDay as 0 | 1 });

                        // Generate 7 days for the current week of Selected Date
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
                                    {/* Left: Icon, Name, Streak */}
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

                                    {/* Right: Stats (Value & Percentage) */}
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
    );
};

export default Dashboard;
