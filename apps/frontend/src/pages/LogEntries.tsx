import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { getMeasures, createEntry, getEntries, Measure, Entry, User } from '../services/api';

interface LogEntriesProps {
    user: User;
    onUpdate: () => void;
}

const LogEntries: React.FC<LogEntriesProps> = ({ user, onUpdate }) => {
    const [measures, setMeasures] = useState<Measure[]>([]);
    const [entries, setEntries] = useState<Entry[]>([]);
    // Date Format: YYYY-MM-DD
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    // Current Calendar View Month
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Form State: MeasureId -> Value
    const [logValues, setLogValues] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        fetchMeasures();
    }, []);

    useEffect(() => {
        fetchEntriesForMonth();
    }, [currentMonth]);

    const fetchMeasures = async () => {
        try {
            const res = await getMeasures();
            setMeasures(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchEntriesForMonth = async () => {
        // Calculate start and end of current month view
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const start = new Date(year, month, 1).toISOString();
        const end = new Date(year, month + 1, 0).toISOString();

        try {
            const res = await getEntries(start, end);
            setEntries(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleLogSubmit = async () => {
        const promises = Object.entries(logValues).map(([measureId, value]) => {
            if (!value || isNaN(parseFloat(value))) return null;
            return createEntry({
                measureId,
                value: parseFloat(value),
                date: new Date(selectedDate).toISOString()
            });
        }).filter(Boolean);

        if (promises.length === 0) {
            alert("Please enter values to log.");
            return;
        }

        try {
            await Promise.all(promises);
            setLogValues({});
            fetchEntriesForMonth();
            onUpdate();
            alert('Entries logged successfully!');
        } catch (e) {
            console.error(e);
            alert('Failed to log entries.');
        }
    };

    // Calendar Helper
    const daysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const startDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const changeMonth = (offset: number) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
    };

    const renderCalendarDays = () => {
        const totalDays = daysInMonth(currentMonth);
        const startDay = startDayOfMonth(currentMonth); // 0 = Sunday
        const days = [];

        // Empty slots for days before start of month
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 bg-transparent"></div>);
        }

        // Days
        for (let day = 1; day <= totalDays; day++) {
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            // Get entries for this day
            const dayEntries = entries.filter(e => e.date.startsWith(dateStr));
            const totalActivity = dayEntries.reduce((sum, e) => sum + e.value, 0); // Crude total, maybe count is better?
            const activityCount = dayEntries.length;

            days.push(
                <div
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`h-24 border border-white/5 relative p-2 cursor-pointer transition-colors group
                        ${isSelected ? 'bg-primary-500/10 border-primary-500/50' : 'hover:bg-white/5'}
                        ${isToday ? 'bg-white/5' : ''}
                    `}
                >
                    <span className={`text-sm font-medium ${isToday ? 'text-primary-400' : 'text-slate-400'}`}>{day}</span>
                    <div className="mt-2 space-y-1">
                        {/* Show dots for entries */}
                        {activityCount > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {Array.from({ length: Math.min(activityCount, 5) }).map((_, i) => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                ))}
                                {activityCount > 5 && <span className="text-[10px] text-emerald-500">+</span>}
                            </div>
                        )}
                        {dayEntries.length > 0 && (
                            <div className="hidden group-hover:block absolute z-10 bg-black border border-white/20 p-2 rounded shadow-xl text-xs w-32 left-0 top-full">
                                {dayEntries.map(e => (
                                    <div key={e.id} className="truncate text-slate-300">
                                        {e.measure?.name}: {e.value}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return days;
    };

    return (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            {/* Left Column: Logging Form */}
            <div className="glass p-6 rounded-3xl space-y-6 h-fit sticky top-4">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">Log Activity</h2>
                    <p className="text-slate-400 text-sm">Select a date and enter values for your measures.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Date</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors calendar-input"
                    />
                </div>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {measures.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No measures found.</p>}
                    {measures.map(m => (
                        <div key={m.id} className="space-y-1">
                            <label className="text-sm text-slate-300 font-medium flex justify-between">
                                {m.name} <span className="text-slate-500 text-xs">({m.unit})</span>
                            </label>
                            <input
                                type="number"
                                placeholder="0"
                                value={logValues[m.id] || ''}
                                onChange={e => setLogValues({ ...logValues, [m.id]: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                            />
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleLogSubmit}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                >
                    <PlusCircle size={20} /> Log Entries
                </button>
            </div>

            {/* Right Column: Calendar */}
            <div className="lg:col-span-2 glass p-6 rounded-3xl flex flex-col h-full min-h-[600px]">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-2">
                        <CalendarIcon className="text-emerald-400" />
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><ChevronLeft /></button>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><ChevronRight /></button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-px bg-white/10 border border-white/10 rounded-xl overflow-hidden flex-grow">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="h-10 bg-white/5 flex items-center justify-center text-xs font-bold uppercase text-slate-500 tracking-wider">
                            {day}
                        </div>
                    ))}
                    {renderCalendarDays()}
                </div>
            </div>
        </div>
    );
};

export default LogEntries;
