import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Trash2, Edit2, Save, X, Check } from 'lucide-react';
import { ICON_MAP, getColor } from '../utils/theme';
import { getMeasures, getEntries, updateEntry, deleteEntry, Measure, Entry, User } from '../services/api';

interface LogEntriesProps {
    user: User;
    onUpdate: () => void;
}

const LogEntries: React.FC<LogEntriesProps> = ({ user, onUpdate }) => {
    const [entries, setEntries] = useState<Entry[]>([]);
    // Calendar Focus Month
    const [currentMonth, setCurrentMonth] = useState(new Date());
    // Selected Date in Calendar (default today)
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [hoveredDate, setHoveredDate] = useState<string | null>(null);

    // Editing State
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchEntriesForView();
    }, [currentMonth, selectedDate]); // Refetch if month changes (for dots) or selection changes (to ensure we have data, though usually we fetch month)

    const fetchEntriesForView = async () => {
        // We fetch the whole month to populate the calendar dots
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        // Get full range including potential trailing days from prev/next months if we wanted to be perfect,
        // but for now, let's just ensure we get the user's focus + safety buffer? 
        // actually existing logic was just month. Let's stick to user's month for Calendar dots.
        // BUT for the "Weekly List", we need the entries for that specific week.
        // If the week straddles months, we might miss some if we only fetch one month.
        // Strategy: Fetch a generous range or just rely on "getEntries" logic?
        // Let's safe-bet: fetch current month - 1 week to current month + 1 month?
        // Simpler: Just fetch the current month for now, if week straddles, maybe we miss? 
        // Let's fetch 3 months: Prev, Current, Next.

        const start = new Date(year, month - 1, 1).toISOString();
        const end = new Date(year, month + 2, 0).toISOString();

        try {
            const res = await getEntries(start, end);
            setEntries(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this entry?')) return;
        setIsDeleting(id);
        try {
            await deleteEntry(id);
            // Optimistic remove
            setEntries(prev => prev.filter(e => e.id !== id));
            onUpdate(); // Update user balance/stats if needed
        } catch (e) {
            console.error(e);
            alert('Failed to delete entry');
        } finally {
            setIsDeleting(null);
        }
    };

    const handleEditStart = (entry: Entry) => {
        setEditingEntryId(entry.id);
        setEditValue(entry.value.toString());
    };

    const handleEditCancel = () => {
        setEditingEntryId(null);
        setEditValue('');
    };

    const handleEditSave = async (id: string) => {
        if (!editValue || isNaN(parseFloat(editValue))) return;
        try {
            const updated = await updateEntry(id, { value: parseFloat(editValue) });
            // Update local state
            setEntries(prev => prev.map(e => e.id === id ? { ...e, value: updated.data.entry.value } : e));
            setEditingEntryId(null);
            onUpdate();
        } catch (e) {
            console.error(e);
            alert('Failed to update entry');
        }
    };


    // Calendar Helper
    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const startDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const changeMonth = (offset: number) => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));

    // Week Calculation logic for "Weekly List"
    const getWeekRange = (dateStr: string) => {
        // Fix Timezone Issue: Parse YYYY-MM-DD manually
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d); // Local time noon to avoid DST edge cases if any, but 00:00 is fine if we stick to local

        const day = date.getDay(); // 0-6
        const weekStartSetting = user.weekStart === 'MONDAY' ? 1 : 0;

        let diff = 0;
        if (weekStartSetting === 1) { // Monday
            // If day is 0 (Sun), we need to go back 6 days to Mon
            // If day is 1 (Mon), back 0
            diff = (day === 0 ? -6 : 1 - day);
        } else { // Sunday
            diff = -day;
        }

        const start = new Date(date);
        start.setDate(date.getDate() + diff);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    };

    const selectedWeekRange = getWeekRange(selectedDate);
    const hoveredWeekRange = hoveredDate ? getWeekRange(hoveredDate) : null;

    // Filter entries for the selected week
    const weeklyEntries = entries.filter(e => {
        const entryDateStr = e.date.substring(0, 10);
        const startStr = format(selectedWeekRange.start, 'yyyy-MM-dd');
        const endStr = format(selectedWeekRange.end, 'yyyy-MM-dd');
        return entryDateStr >= startStr && entryDateStr <= endStr;
    }).sort((a, b) => a.date.localeCompare(b.date));

    // Group by Date for display
    const groupedEntries: { [key: string]: Entry[] } = {};
    weeklyEntries.forEach(e => {
        const d = e.date.split('T')[0];
        if (!groupedEntries[d]) groupedEntries[d] = [];
        groupedEntries[d].push(e);
    });

    // Helper to format date header
    const formatDateHeader = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    };

    // Helper to check if a date is in range
    const isDateInRange = (dateStr: string, range: { start: Date, end: Date } | null) => {
        if (!range) return false;
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return date >= range.start && date <= range.end;
    };

    const renderCalendarDays = () => {
        const totalDays = daysInMonth(currentMonth);
        const weekStartDay = user.weekStart === 'MONDAY' ? 1 : 0;
        const startDay = (startDayOfMonth(currentMonth) - weekStartDay + 7) % 7;
        const days = [];

        // Empty slots
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 bg-transparent"></div>);
        }

        // Days
        for (let day = 1; day <= totalDays; day++) {
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const dayEntries = entries.filter(e => e.date.substring(0, 10) === dateStr);
            const activityCount = dayEntries.length;

            const isSelectedWeek = isDateInRange(dateStr, selectedWeekRange);
            const isHoveredWeek = isDateInRange(dateStr, hoveredWeekRange);

            days.push(
                <div
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    onMouseEnter={() => setHoveredDate(dateStr)}
                    onMouseLeave={() => setHoveredDate(null)}
                    className={`h-24 border relative p-2 cursor-pointer transition-all duration-200 group
                        ${isSelectedWeek ? 'bg-primary-500/10 border-primary-500/30' : 'border-white/5'}
                        ${!isSelectedWeek && isHoveredWeek ? 'bg-white/5 border-white/20' : ''}
                        ${!isSelectedWeek && !isHoveredWeek ? 'hover:bg-white/5' : ''}
                        ${isToday ? 'bg-white/5' : ''} 
                    `}
                >
                    <span className={`text-sm font-medium ${isToday ? 'text-primary-400' : 'text-slate-400'}`}>{day}</span>
                    <div className="mt-2 space-y-1">
                        {activityCount > 0 && (
                            <div className="grid grid-cols-4 gap-0.5">
                                {dayEntries.slice(0, 12).map((entry, i) => {
                                    const colorName = entry.measure?.color || 'emerald';
                                    const theme = getColor(colorName);
                                    const ItemIcon = ICON_MAP[entry.measure?.icon || 'Target'] || ICON_MAP['Target'];

                                    return (
                                        <div key={i} className={`flex items-center justify-center ${theme.text}`}>
                                            <ItemIcon size={12} />
                                        </div>
                                    );
                                })}
                                {activityCount > 12 && (
                                    <div className="flex items-center justify-center text-[8px] text-slate-500 font-medium">
                                        +
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return days;
    };

    // Helper Component for Dynamic Icons
    const IconComponent = ({ name, className }: { name?: string, className?: string }) => {
        // We need a mapping or a way to get icon by name. 
        // Since we import specific icons, we can't dynamically access all Lucide icons unless we import * as Icons
        // But for optimization, let's just support a few common ones or import the ones we use?
        // OR: Better approach for this codebase implies we might need to import * as Icons if user can select ANY icon.
        // Given previous context, let's assume we can import * as LucideIcons or just fallback to a generic one if not found
        // For now, let's map a few common ones we know exist or used in other parts, 
        // OR simply rely on the fact that we might need to add `import * as LucideIcons from 'lucide-react'` at top.
        // Let's modify imports first.
        return <div className={className} />;
    };

    // Changing strategy: define the helper outside or use what's available. 
    // Wait, I cannot change imports in this replace block easily without affecting top of file.
    // Let's assume for this specific edit, I will stick to a few hardcoded ones OR just use a generic circle if icon name is missing?
    // User asked for "Icon matching the measure". 
    // To do this properly, I should probably do a multi-replace to add `import * as Icons from 'lucide-react'` at the top.

    // let's try to do it in one go with multi-replace or just assume "Activity" generic icon if not found, 
    // BUT user explicitly asked for "icon matching the measure".
    // I will use a simple mapping for now for standard ones if I can't change imports easily here.
    // actually, let's just render the colored dot for now as "icon" in calendar if complex, 
    // BUT user said "show the icon... on both".

    // Let's look at how Measures are defined. Usually they save the icon string name.
    // I'll add `import * as Icons from 'lucide-react'` in a separate edit to be safe.
    // For now, let's implement the logic assuming `Icons[name]` works if I update imports next.

    return (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            {/* Left Column: Weekly Log List */}
            <div className="glass p-6 rounded-3xl space-y-6 h-fit sticky top-4 max-h-[90vh] overflow-hidden flex flex-col">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">Weekly Activities</h2>
                    <p className="text-slate-400 text-xs">
                        {selectedWeekRange.start.toLocaleDateString()} - {selectedWeekRange.end.toLocaleDateString()}
                    </p>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-6">
                    {weeklyEntries.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <p>No activity logged this week.</p>
                            <p className="text-xs mt-2">Select a date in the calendar to view other weeks.</p>
                        </div>
                    ) : (
                        Object.keys(groupedEntries).sort((a, b) => a.localeCompare(b)).map(dateKey => (
                            <div key={dateKey} className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 sticky top-0 bg-[#0f1115] py-2 z-10 border-b border-white/5">
                                    {formatDateHeader(dateKey)}
                                </h3>
                                <div className="space-y-2">
                                    {groupedEntries[dateKey].map(entry => {
                                        const colorName = entry.measure?.color || 'emerald';
                                        const theme = getColor(colorName);
                                        const ItemIcon = ICON_MAP[entry.measure?.icon || 'Target'] || ICON_MAP['Target'];

                                        return (
                                            <div key={entry.id} className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-3 group hover:bg-white/10 transition-colors border-l-2 relative overflow-hidden"
                                                style={{ borderLeftColor: theme.hex }}
                                            >
                                                <div className={`flex-shrink-0 ${theme.text}`}>
                                                    <ItemIcon size={14} />
                                                </div>

                                                <div className="flex-grow flex items-center gap-2 overflow-hidden min-w-0">
                                                    <span className="text-sm font-medium text-slate-200 whitespace-nowrap">{entry.measure?.name}</span>
                                                    <span className="text-xs text-slate-500 whitespace-nowrap">({entry.measure?.unit})</span>

                                                    {editingEntryId === entry.id ? (
                                                        <div className="flex items-center gap-1 ml-auto">
                                                            <input
                                                                type="number"
                                                                value={editValue}
                                                                onChange={e => setEditValue(e.target.value)}
                                                                className="bg-black/50 border border-white/20 rounded px-1.5 py-0.5 text-xs w-16 text-white focus:border-emerald-500 outline-none"
                                                                autoFocus
                                                            />
                                                            <button onClick={() => handleEditSave(entry.id)} className="text-emerald-500 hover:text-emerald-400 p-1"><Check size={12} /></button>
                                                            <button onClick={handleEditCancel} className="text-red-500 hover:text-red-400 p-1"><X size={12} /></button>
                                                        </div>
                                                    ) : (
                                                        <div className={`ml-auto font-mono text-sm font-bold ${theme.text}`}>
                                                            {entry.value}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                {editingEntryId !== entry.id && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-[#18181b] shadow-lg rounded-md border border-white/10">
                                                        <button onClick={() => handleEditStart(entry)} className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-blue-400"><Edit2 size={12} /></button>
                                                        <button onClick={() => handleDelete(entry.id)} className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-red-400"><Trash2 size={12} /></button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
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
                    {(user.weekStart === 'MONDAY'
                        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                    ).map(day => (
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
