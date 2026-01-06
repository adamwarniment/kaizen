import { startOfDay, subDays, isSameDay, format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { Measure, Entry, Goal } from '../services/api';

export const calculateStreak = (measure: Measure, entries: Entry[]): number => {
    // Find the daily goal
    const dailyGoal = measure.goals?.find(g => g.timeframe === 'DAILY');
    if (!dailyGoal) return 0;

    const sortedEntries = [...entries]
        .filter(e => e.measureId === measure.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let streak = 0;
    const today = startOfDay(new Date());
    let currentCheckDate = today;

    // Check if today is completed (optional for streak, usually streak includes today if done, or up to yesterday)
    // Common logic: If today is done, include it. If not, check yesterday.
    // If yesterday is not done, streak is 0 (unless today is done? No, broken).
    // Let's being checking from TODAY.

    // Group entries by day
    const entriesByDay: Record<string, number> = {};
    sortedEntries.forEach(e => {
        const dayStr = e.date.substring(0, 10);
        entriesByDay[dayStr] = (entriesByDay[dayStr] || 0) + e.value;
    });

    // Check today
    const todayStr = format(today, 'yyyy-MM-dd');
    const todayVal = entriesByDay[todayStr] || 0;
    // For COUNT goals, it's roughly sum of values if value is 1, or count of entries? 
    // The Goal model has type TOTAL or COUNT.
    // If COUNT, usually we count number of entries.
    // But backend logic: "amount = entries.filter(...).length".
    // So for COUNT, we need to sum up how many entries meet criteria?
    // Let's simplify and assume the 'value' passed to us needs to be aggregated differently based on type.

    // Wait, the backend logic for goal evaluation:
    // TOTAL: sum(e.value)
    // COUNT: filter(e => e.value >= minPerEntry).length

    // We need to replicate that.

    const checkGoalMet = (dateStr: string) => {
        const daysEntries = sortedEntries.filter(e => e.date.substring(0, 10) === dateStr);
        let achieved = 0;

        if (dailyGoal.type === 'TOTAL') {
            achieved = daysEntries.reduce((sum, e) => sum + e.value, 0);
        } else {
            // COUNT
            achieved = daysEntries.filter(e => !dailyGoal.minPerEntry || e.value >= dailyGoal.minPerEntry).length;
        }

        return achieved >= dailyGoal.targetValue;
    };

    if (checkGoalMet(todayStr)) {
        streak++;
        currentCheckDate = subDays(currentCheckDate, 1);
    } else {
        // If today not met, check yesterday. If yesterday met, streak starts from there.
        // If yesterday not met, streak is 0.
        // BUT strict streak usually means: "consecutive days ending now". 
        // If I haven't done today yet, my streak is still alive from yesterday?
        // Let's check yesterday.
        const yesterday = subDays(today, 1);
        if (checkGoalMet(format(yesterday, 'yyyy-MM-dd'))) {
            currentCheckDate = yesterday;
        } else {
            // Streak broken or 0
            return 0; // If today not done AND yesterday not done -> 0
        }
    }

    // Iterate backwards
    while (true) {
        if (checkGoalMet(format(currentCheckDate, 'yyyy-MM-dd'))) {
            // Don't double count start day if we already incremented
            if (!isSameDay(currentCheckDate, today)) {
                streak++;
            }
            currentCheckDate = subDays(currentCheckDate, 1);
        } else {
            break;
        }
        // Safety break
        if (streak > 3650) break;
    }

    return streak;
};

export const getDailyProgress = (measure: Measure, entries: Entry[], date: Date) => {
    const dailyGoal = measure.goals?.find(g => g.timeframe === 'DAILY');

    // Default to TOTAL behavior if no goal, or use goal type
    const calculationType = dailyGoal?.type || 'TOTAL';
    const target = dailyGoal?.targetValue || 0;

    const dateStr = format(date, 'yyyy-MM-dd');
    const daysEntries = entries.filter(e =>
        e.measureId === measure.id &&
        e.date.substring(0, 10) === dateStr
    );

    let value = 0;
    if (calculationType === 'TOTAL') {
        value = daysEntries.reduce((sum, e) => sum + e.value, 0);
    } else {
        value = daysEntries.filter(e => !dailyGoal?.minPerEntry || e.value >= dailyGoal.minPerEntry).length;
    }

    const progress = target > 0 ? Math.min(100, (value / target) * 100) : 0;

    return {
        progress,
        met: target > 0 && value >= target,
        value,
        target
    };
};

export const getTrendData = (measure: Measure, entries: Entry[], days = 14) => {
    // Return last N days of data
    const result = [];
    const today = new Date();
    const dailyGoal = measure.goals?.find(g => g.timeframe === 'DAILY');

    for (let i = days - 1; i >= 0; i--) {
        const date = subDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const shortDate = format(date, 'd'); // 5, 23

        const daysEntries = entries.filter(e =>
            e.measureId === measure.id &&
            e.date.substring(0, 10) === dateStr
        );

        let value = 0;
        if (dailyGoal) { // Use Goal logic if available for "value" semantics
            if (dailyGoal.type === 'TOTAL') {
                value = daysEntries.reduce((sum, e) => sum + e.value, 0);
            } else {
                value = daysEntries.filter(e => !dailyGoal.minPerEntry || e.value >= dailyGoal.minPerEntry).length;
            }
        } else {
            // Default sum
            value = daysEntries.reduce((sum, e) => sum + e.value, 0);
        }

        result.push({ name: shortDate, value, fullDate: dateStr });
    }
    return result;
};
