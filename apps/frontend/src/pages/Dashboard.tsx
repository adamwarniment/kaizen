import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, DollarSign, Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight, Activity, Filter } from 'lucide-react';
import { getMeasures, getUser, Measure, User, Entry, getEntries, getHistory, Transaction, updateEntry } from '../services/api';
import { ICON_MAP, getColor } from '../utils/theme';
import { Link } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, isToday, addWeeks, subWeeks, parseISO, getDay, getDaysInMonth, isFuture } from 'date-fns';
import { calculateStreak, getDailyProgress, getTrendData } from '../utils/stats';
import EntryPanel from '../components/EntryPanel';

interface DashboardProps {
    user: User;
    onUpdate: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onUpdate }) => {
    const timeToMinutes = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };
    // Helper to format values (especially Time)
    const formatValue = (val: number, type: string | undefined) => {
        if (type === 'TIME') {
            const hours = Math.floor(val / 60);
            const mins = Math.round(val % 60);
            return `${hours}:${mins.toString().padStart(2, '0')}`;
        }
        return val.toFixed(2);
    };

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
    const [mobileView, setMobileView] = useState<'week' | 'month'>('week');
    const [desktopView, setDesktopView] = useState<'week' | 'month'>('week');
    const [editingDay, setEditingDay] = useState<Date | null>(null);
    const [dayValues, setDayValues] = useState<Record<string, string>>({});
    const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
    const [savingEntry, setSavingEntry] = useState(false);

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

    const openDayEditor = (day: Date) => {
        const initialValues: Record<string, string> = {};
        entries.filter(entry => entry.date.substring(0, 10) === format(day, 'yyyy-MM-dd')).forEach(entry => {
            initialValues[entry.id] = entry.measure?.type === 'TIME'
                ? `${Math.floor(entry.value / 60).toString().padStart(2, '0')}:${Math.round(entry.value % 60).toString().padStart(2, '0')}`
                : entry.value.toString();
        });
        setDayValues(initialValues);
        setEditingDay(day);
    };

    const saveDayEntries = async () => {
        if (!editingDay) return;
        const dayEntries = entries.filter(entry => entry.date.substring(0, 10) === format(editingDay, 'yyyy-MM-dd'));
        setSavingEntry(true);
        try {
            await Promise.all(dayEntries.map(entry => {
                const value = dayValues[entry.id];
                const isTime = entry.measure?.type === 'TIME';
                return updateEntry(entry.id, { value: isTime ? timeToMinutes(value) : parseFloat(value), date: entry.date.substring(0, 10) });
            }));
            await fetchData();
            onUpdate();
            setEditingDay(null);
        } catch (error) {
            console.error(error);
            alert('Could not update this entry.');
        } finally {
            setSavingEntry(false);
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
            <div className="flex flex-col gap-6 h-full sm:hidden pb-20">
                {/* Header Section */}
                <div className="flex flex-col gap-4">
                    <div>
                            <p className="text-[10px] uppercase tracking-[.24em] font-semibold text-[#b7d58d] mb-2">Today’s practice</p>
                            <h1 className="text-4xl kaizen-serif text-[#edf3e7]">Keep the promise.</h1>
                        <p className="text-zinc-400 mt-2 text-sm">Every entry is a vote for the person you’re becoming.</p>
                    </div>

                    {/* Week is the default focal point; month is available on demand. */}
                    <div className="flex items-center gap-2 bg-zinc-900/50 p-1.5 rounded-xl border border-white/5 self-start">
                        <button onClick={mobileView === 'week' ? prevWeek : prevMonth} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors">
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex items-center gap-2 px-2 min-w-[120px] justify-center">
                            <CalendarIcon size={14} className="text-[#b7d58d]" />
                            <span className="text-sm font-bold text-zinc-200">
                                {mobileView === 'week' ? `${format(currentWeekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}` : format(currentMonth, 'MMM yyyy')}
                            </span>
                        </div>

                        <button onClick={mobileView === 'week' ? nextWeek : nextMonth} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors">
                            <ChevronRight size={16} />
                        </button>
                        <div className="flex rounded-lg bg-black/20 p-0.5 border border-white/[.06]" aria-label="Growth view">
                            <button onClick={() => setMobileView('week')} className={`p-2 rounded-md transition-colors ${mobileView === 'week' ? 'bg-[#b7d58d] text-[#172014]' : 'text-zinc-500'}`} title="Week view"><Activity size={15} /></button>
                            <button onClick={() => setMobileView('month')} className={`p-2 rounded-md transition-colors ${mobileView === 'month' ? 'bg-[#b7d58d] text-[#172014]' : 'text-zinc-500'}`} title="Calendar view"><CalendarIcon size={15} /></button>
                        </div>
                    </div>
                </div>

                {/* Measure Cards List */}
                <div className="flex flex-col gap-4">
                    {mobileView === 'week' ? measures.map(m => {
                        const theme = getColor(m.color || 'emerald');
                        const Icon = ICON_MAP[m.icon || 'Target'] || ICON_MAP['Target'];

                        // The mobile default is a readable seven-day practice board.
                        const daysInMonth = weekDays;

                        const monthTotal = daysInMonth.reduce((acc, day) => {
                            const stats = getDailyProgress(m, entries, day);
                            return acc + stats.value;
                        }, 0);

                        const isCurrentMonth = true;
                        const daysPassed = 7;
                        const avgPerDay = daysPassed > 0 ? (monthTotal / daysPassed).toFixed(2) : '0.00';
                        const weeklyGoal = m.goals?.find(goal => goal.timeframe === 'WEEKLY') || m.goals?.find(goal => goal.timeframe === 'DAILY');
                        const weeklyTarget = weeklyGoal ? (weeklyGoal.timeframe === 'WEEKLY' ? weeklyGoal.targetValue : weeklyGoal.targetValue * 7) : 0;
                        const weeklyProgress = weeklyTarget > 0 ? Math.min(100, (monthTotal / weeklyTarget) * 100) : 0;

                        // Grid Generation
                        const monthStart = startOfMonth(currentMonth);
                        const startingDayIndex = getDay(monthStart);
                        const offset = user.weekStart === 'MONDAY'
                            ? (startingDayIndex === 0 ? 6 : startingDayIndex - 1)
                            : startingDayIndex;

                        const blanks: null[] = [];
                        const days = daysInMonth;

                        return (
                            <div key={m.id} className={`relative bg-zinc-900/50 border border-white/5 rounded-2xl p-4 shadow-lg backdrop-blur-sm gap-3 ${mobileView === 'week' ? 'flex flex-col' : 'flex flex-row items-stretch justify-between'}`}>
                                {/* Left Side: Info & Stats */}
                                <div className={`flex flex-col justify-between min-w-[100px] py-1 ${mobileView === 'week' ? 'gap-3' : ''}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${theme.bg} bg-opacity-10 border border-white/5`}>
                                            <Icon size={14} className={theme.text} />
                                        </div>
                                        <h3 className={`font-bold text-sm ${theme.text}`}>{m.name}</h3>
                                        </div>
                                        {mobileView === 'week' && <div className="flex items-center gap-3 text-right"><div><p className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">Total</p><p className="kaizen-mono text-sm font-bold text-white">{formatValue(monthTotal, m.type)}</p></div><div><p className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">Avg</p><p className="kaizen-mono text-sm font-bold text-white">{m.type === 'TIME' ? formatValue(Number(avgPerDay), 'TIME') : avgPerDay}</p></div></div>}
                                    </div>

                                    <div className="hidden flex gap-5">
                                        {m.type !== 'TIME' && (
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider w-8">Total</span>
                                                <span className="text-white font-mono font-bold text-sm">{monthTotal.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider w-8">Avg</span>
                                            <span className="text-white font-mono font-bold text-sm">{m.type === 'TIME' ? formatValue(Number(avgPerDay), 'TIME') : avgPerDay}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Week uses one legible progress bar; month keeps the per-day grid. */}
                                {mobileView === 'week' ? <div className="grid grid-cols-7 gap-1.5">{days.map(day => { const stat = getDailyProgress(m, entries, day); const progress = stat.target > 0 ? Math.min(100, stat.progress) : (stat.value > 0 ? 100 : 0); return <div key={day.toISOString()} className="min-w-0"><div className="text-center mb-1.5"><p className="text-[9px] font-bold uppercase text-zinc-500">{format(day,'EEEEE')}</p><p className="text-[10px] text-zinc-400">{format(day,'d')}</p></div><div className="h-2.5 rounded-full border overflow-hidden" style={{borderColor:`${theme.hex}99`,backgroundColor:`${theme.hex}12`}}><div className="h-full rounded-full" style={{width:`${progress}%`,backgroundColor:theme.hex}} /></div><p className={`mt-1 text-center text-[9px] font-bold truncate ${stat.value ? theme.text : 'text-zinc-600'}`}>{stat.value ? formatValue(stat.value,m.type) : '–'}</p></div>})}</div> : <div className="bg-black/20 rounded-xl p-2.5 border border-white/5 flex-grow max-w-[65%]">
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
                                            const fill = stats.target > 0 ? Math.min(100, stats.progress) : (hasEntry ? 100 : 0);

                                            return (
                                                <div key={day.toString()} className="flex items-center justify-center">
                                                    <div
                                                        className={`w-full aspect-[4/3] rounded-md flex items-center justify-center text-[10px] font-bold transition-all border ${hasEntry ? `${theme.bg} text-white border-transparent shadow-sm` : 'bg-white/5 border-transparent text-zinc-700'}`}
                                                        style={hasEntry ? { backgroundColor: theme.hex } : {}}
                                                    >{hasEntry ? stats.value : null}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>}
                            </div>
                        );
                    }) : <div className="glass p-3 rounded-2xl border border-[#dcebd0]/[.08]">
                        <div className="grid grid-cols-7 auto-rows-[4.75rem] gap-px rounded-xl overflow-hidden bg-[#dcebd0]/[.06]">{(user.weekStart === 'MONDAY' ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']).map(day => <div key={day} className="bg-[#1a211c] py-2 text-center text-[9px] uppercase font-bold tracking-wider text-zinc-500">{day}</div>)}{calendarDays.map(day => { const current=isSameMonth(day,currentMonth); const logs=entries.filter(entry=>entry.date.substring(0,10)===format(day,'yyyy-MM-dd')); return <button key={day.toISOString()} onClick={()=>openDayEditor(day)} className={`h-full text-left p-1.5 bg-[#171d19] hover:bg-white/[.035] ${current?'':'opacity-30'}`}><span className={`inline-flex w-5 h-5 items-center justify-center rounded-full text-[10px] font-bold ${isToday(day)?'bg-[#b7d58d] text-[#172014]':'text-zinc-500'}`}>{format(day,'d')}</span><div className="mt-1 space-y-0.5">{logs.slice(0,2).map(entry=>{const color=getColor(entry.measure?.color||'emerald');return <p key={entry.id} className="text-[8px] font-bold truncate" style={{color:color.hex}}>{entry.measure?.name}: {formatValue(entry.value,entry.measure?.type)}</p>})}</div></button>})}</div>
                    </div>}
                </div>

            </div>

            {/* -------------------------------------------------------------------------- */
            /*                           DESKTOP VIEW (hidden md:flex)                    */
            /* -------------------------------------------------------------------------- */}
            <div className="hidden sm:flex lg:h-[calc(100vh-190px)] xl:h-[calc(100vh-60px)] h-auto flex-col lg:flex-row gap-6 pb-2">
                {/* Left Column: Header + Calendar */}
                <div className="flex-grow flex flex-col min-h-[600px] lg:min-h-0 gap-4 lg:gap-2 xl:gap-4">
                    {/* Header */}
                    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
                        <div>
                            <p className="text-[10px] uppercase tracking-[.24em] font-semibold text-[#b7d58d] mb-1">Practice dashboard</p>
                            <h1 className="text-4xl lg:text-3xl xl:text-4xl kaizen-serif text-[#edf3e7]">Change, made visible.</h1>
                            <p className="text-zinc-400 mt-1 lg:hidden xl:block">Small decisions, faithfully repeated.</p>
                        </div>
                    </header>

                    <div className="relative flex-grow w-full flex flex-col bg-[#171d19]/90 backdrop-blur-sm border border-[#dcebd0]/[.09] rounded-2xl overflow-visible shadow-2xl min-h-0 p-4 xl:p-5">
                        <div className="flex items-center justify-between pb-3 border-b border-[#dcebd0]/[.08]">
                            <button onClick={desktopView === 'week' ? prevWeek : prevMonth} className="p-1.5 hover:bg-white/5 rounded-md text-zinc-400 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                            <span className="font-bold text-sm text-zinc-200">{desktopView === 'week' ? `Week of ${format(currentWeekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}` : format(currentMonth, 'MMMM yyyy')}</span>
                            <div className="flex items-center gap-2"><div className="flex rounded-lg bg-black/20 p-0.5 border border-white/[.06]" aria-label="Growth view"><button onClick={() => setDesktopView('week')} className={`p-1.5 rounded-md ${desktopView === 'week' ? 'bg-[#b7d58d] text-[#172014]' : 'text-zinc-500'}`} title="Week view"><Activity size={14}/></button><button onClick={() => setDesktopView('month')} className={`p-1.5 rounded-md ${desktopView === 'month' ? 'bg-[#b7d58d] text-[#172014]' : 'text-zinc-500'}`} title="Calendar view"><CalendarIcon size={14}/></button></div><button onClick={desktopView === 'week' ? nextWeek : nextMonth} className="p-1.5 hover:bg-white/5 rounded-md text-zinc-400 hover:text-white transition-colors"><ChevronRight size={16} /></button></div>
                        </div>
                        {desktopView === 'week' ? <>
                        <div className="grid grid-cols-[11rem_1fr] gap-4 pt-4 min-w-0">
                            <div />
                            <div className="grid grid-cols-7">{weekDays.map(day => <button key={day.toISOString()} onMouseEnter={() => setHoveredDay(day)} onMouseLeave={() => setHoveredDay(null)} onClick={() => openDayEditor(day)} className={`text-center pb-2 ${isToday(day) ? 'text-[#c9e6a1]' : 'text-zinc-500'}`}><span className="block text-[10px] uppercase tracking-wider font-bold">{format(day, 'EEE')}</span><span className={`inline-flex mt-1 h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${isToday(day) ? 'bg-[#b7d58d] text-[#172014]' : ''}`}>{format(day, 'd')}</span></button>)}</div>
                            {measures.map((m, i) => {
                                const theme = getColor(m.color || 'emerald');
                                const Icon = ICON_MAP[m.icon || 'Target'] || ICON_MAP.Target;
                                const chartData = weekDays.map(day => {
                                    const stats = getDailyProgress(m, entries, day);
                                    const dayEntries = entries.filter(entry => entry.measureId === m.id && entry.date.substring(0, 10) === format(day, 'yyyy-MM-dd'));
                                    return { day: format(day, 'EEE'), value: stats.value, target: stats.target, date: format(day, 'MMM d'), entry: dayEntries[0] };
                                });
                                const weekTotal = chartData.reduce((sum, point) => sum + point.value, 0);
                                const target = chartData[0]?.target || 0;
                                return <React.Fragment key={m.id}>
                                    <div className="self-stretch flex flex-col justify-center pr-2 border-r border-[#dcebd0]/[.08]"><div className="flex items-center gap-2"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme.bgSoft} ${theme.text}`}><Icon size={16}/></div><div><h3 className="font-bold text-sm text-[#edf3e7]">{m.name}</h3><p className="text-[10px] text-zinc-500">{formatValue(weekTotal, m.type)} {m.unit} this week</p></div></div></div>
                                    <div className="relative h-28 rounded-xl bg-black/15 border border-[#dcebd0]/[.06] overflow-hidden -mx-2 px-2">
                                        <div className="absolute inset-0 grid grid-cols-7 z-10">{weekDays.map(day => <button key={day.toISOString()} onMouseEnter={() => setHoveredDay(day)} onMouseLeave={() => setHoveredDay(null)} onClick={() => openDayEditor(day)} className="border-r border-[#dcebd0]/[.05] last:border-r-0 hover:bg-white/[.035] transition-colors" aria-label={`Edit entries for ${format(day, 'MMMM d')}`} />)}</div>
                                        <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 12, right: 8, bottom: 8, left: 8 }}><YAxis hide domain={[0, (max: number) => Math.max(max, target || 0) * 1.15 || 1]} /><XAxis hide dataKey="day" />{target > 0 && <ReferenceLine y={target} stroke={theme.hex} strokeDasharray="5 5" opacity={0.65}/>}<Line type="monotone" dataKey="value" stroke={theme.hex} strokeWidth={3} dot={{r:3, fill:theme.hex, stroke:'#171d19', strokeWidth:2}} activeDot={{r:5}} /></LineChart></ResponsiveContainer>
                                        {target > 0 && <span className="absolute right-3 top-2 text-[9px] font-bold" style={{color: theme.hex}}>Goal {formatValue(target, m.type)}</span>}
                                    </div>
                                </React.Fragment>;
                            })}
                        </div>
                        {hoveredDay && <div className="absolute top-[4.7rem] right-5 z-20 rounded-xl bg-[#1a211c]/95 backdrop-blur border border-[#dcebd0]/12 shadow-2xl p-3 min-w-[16rem]">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-[#b7d58d] mb-2">{format(hoveredDay, 'EEEE, MMM d')}</p>
                            <div className="space-y-1.5">{measures.map(measure => { const stat = getDailyProgress(measure, entries, hoveredDay); const color = getColor(measure.color || 'emerald'); return <div key={measure.id} className="flex justify-between gap-6 text-xs"><span className="text-zinc-400">{measure.name}</span><span className="font-bold" style={{color:color.hex}}>{formatValue(stat.value, measure.type)} / {stat.target ? formatValue(stat.target, measure.type) : '—'} {measure.unit}</span></div>; })}</div>
                        </div>}
                        </> : <div className="grid grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-px mt-4 rounded-xl overflow-hidden border border-[#dcebd0]/[.08] bg-[#dcebd0]/[.06] flex-grow min-h-0">{(user.weekStart === 'MONDAY' ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']).map(day => <div key={day} className="bg-[#1a211c] py-2 text-center text-[10px] uppercase font-bold tracking-wider text-zinc-500">{day}</div>)}{calendarDays.map(day => { const current=isSameMonth(day,currentMonth); return <button key={day.toISOString()} onClick={()=>openDayEditor(day)} onMouseEnter={()=>setHoveredDay(day)} onMouseLeave={()=>setHoveredDay(null)} className={`min-h-0 flex flex-col items-start justify-start text-left p-2 bg-[#171d19] hover:bg-white/[.035] transition-colors overflow-hidden ${current?'':'opacity-30'}`}><span className={`inline-flex shrink-0 w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${isToday(day)?'bg-[#b7d58d] text-[#172014]':'text-zinc-500'}`}>{format(day,'d')}</span><div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-2 w-full">{measures.slice(0,6).map(measure=>{const stat=getDailyProgress(measure,entries,day);const color=getColor(measure.color||'emerald');const Icon=ICON_MAP[measure.icon||'Target']||ICON_MAP.Target;const progress=stat.target>0?Math.min(100,stat.progress):(stat.value>0?100:0);return <div key={measure.id} className="flex items-center gap-1 min-w-0"><Icon size={10} style={{color:color.hex}} className="shrink-0"/><div className="h-1.5 flex-grow rounded-full border overflow-hidden" style={{borderColor:`${color.hex}88`,backgroundColor:`${color.hex}12`}}><div className="h-full rounded-full" style={{width:`${progress}%`,backgroundColor:color.hex}} /></div></div>})}</div></button>})}</div>}
                    </div>
                </div>

                {/* Supplementary measure list is unnecessary in the focused weekly board. */}
                <div className="hidden w-full lg:w-72 xl:w-80 lg:min-w-[280px] xl:min-w-[320px] flex-shrink-0 h-auto lg:h-full lg:overflow-y-auto pr-1 custom-scrollbar flex-col gap-3">
                    <div className="flex items-center justify-between sticky top-0 bg-[#1a211c] z-10 py-2 px-3 rounded-xl border border-[#dcebd0]/[.08] flex-shrink-0">
                        <h2 className="text-sm font-bold text-[#edf3e7]">
                            {isSameDay(selectedDate, new Date()) ? 'Today' : format(selectedDate, 'MMM do')}
                        </h2>
                        <Link to="/measures" className="text-[#c9e6a1] text-[10px] font-bold hover:text-[#e4f5c6] transition-colors uppercase tracking-wider">Manage</Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 pb-6">
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
                                                    {typeof dayStats.value === 'number' ? formatValue(dayStats.value, m.type) : dayStats.value}
                                                </span>
                                                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
                                                    / {m.type === 'TIME' ? formatValue(dayStats.target, 'TIME') : dayStats.target} {m.unit}
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
                                                    <YAxis hide domain={[0, (max: number) => Math.max(max, dayStats.target || 0) * 1.1]} />
                                                    <XAxis
                                                        dataKey="name"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 9, fill: '#71717a', fontWeight: 600 }}
                                                        dy={5}
                                                        padding={{ left: 10, right: 10 }}
                                                        interval={0}
                                                    />
                                                    {dayStats.target > 0 && (
                                                        <ReferenceLine y={dayStats.target} stroke="#fff" strokeDasharray="3 3" opacity={0.3} />
                                                    )}
                                                    <RechartsTooltip
                                                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                                                        content={({ active, payload }) => {
                                                            if (active && payload && payload.length) {
                                                                const data = payload[0].payload;
                                                                return (
                                                                    <div className="bg-zinc-900 border border-white/10 p-2 rounded-lg shadow-xl text-xs">
                                                                        <p className="font-bold text-zinc-300">{data.fullDate}</p>
                                                                        <p className={`${theme.text} font-mono mt-1`}>
                                                                            {typeof data.value === 'number' ? formatValue(Number(data.value), m.type) : data.value} / {m.type === 'TIME' ? formatValue(data.target, 'TIME') : data.target} {m.unit}
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
            <EntryPanel isOpen={Boolean(editingDay)} onClose={() => setEditingDay(null)} eyebrow="Refine the record" title="Edit this day" subtitle={editingDay ? format(editingDay, 'EEEE, MMMM d') : undefined}>
                {editingDay && <div className="space-y-5">{entries.filter(entry => entry.date.substring(0, 10) === format(editingDay, 'yyyy-MM-dd')).length === 0 ? <div className="rounded-xl bg-white/[.04] border border-white/[.08] p-5 text-sm text-slate-400">Nothing was logged on this day yet. Use the log action to add progress.</div> : <><div className="rounded-xl bg-[#b7d58d]/[.07] border border-[#b7d58d]/[.12] p-4"><p className="text-[10px] uppercase tracking-wider font-bold text-[#b7d58d]">Daily entries</p><p className="text-sm text-slate-400 mt-1">Update every logged measure for this date in one place.</p></div>{entries.filter(entry => entry.date.substring(0, 10) === format(editingDay, 'yyyy-MM-dd')).map(entry => <div key={entry.id}><label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">{entry.measure?.name} ({entry.measure?.unit})</label><input type={entry.measure?.type === 'TIME' ? 'time' : 'number'} value={dayValues[entry.id] || ''} onChange={event => setDayValues(values => ({...values, [entry.id]: event.target.value}))} className="input-field w-full py-3 mt-2" /></div>)}<button onClick={saveDayEntries} disabled={savingEntry} className="btn-primary w-full py-3 disabled:opacity-50">{savingEntry ? 'Saving…' : 'Save day'}</button></>}</div>}
            </EntryPanel>
        </div>
    );
};

export default Dashboard;
