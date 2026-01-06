import {
    Target, Zap, Heart, Book, DollarSign, Dumbbell,
    Droplets, Flame, Smile, Star, Trophy, Clock,
    Briefcase, Coffee, Music, Sun, Moon, LucideIcon
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
    Target, Zap, Heart, Book, DollarSign, Dumbbell,
    Droplets, Flame, Smile, Star, Trophy, Clock,
    Briefcase, Coffee, Music, Sun, Moon
};

export interface ThemeColor {
    name: string;
    value: string;
    text: string;
    border: string;
    bgSoft: string;
    bg: string;
    hex: string;
}

export const COLORS: ThemeColor[] = [
    { name: 'emerald', value: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/20', bgSoft: 'bg-emerald-500/10', bg: 'bg-emerald-500', hex: '#10b981' },
    { name: 'blue', value: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/20', bgSoft: 'bg-blue-500/10', bg: 'bg-blue-500', hex: '#3b82f6' },
    { name: 'purple', value: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500/20', bgSoft: 'bg-purple-500/10', bg: 'bg-purple-500', hex: '#a855f7' },
    { name: 'rose', value: 'bg-rose-500', text: 'text-rose-400', border: 'border-rose-500/20', bgSoft: 'bg-rose-500/10', bg: 'bg-rose-500', hex: '#f43f5e' },
    { name: 'amber', value: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/20', bgSoft: 'bg-amber-500/10', bg: 'bg-amber-500', hex: '#f59e0b' },
    { name: 'cyan', value: 'bg-cyan-500', text: 'text-cyan-400', border: 'border-cyan-500/20', bgSoft: 'bg-cyan-500/10', bg: 'bg-cyan-500', hex: '#06b6d4' },
];

export const getColor = (name: string): ThemeColor => COLORS.find(c => c.name === name) || COLORS[0];
