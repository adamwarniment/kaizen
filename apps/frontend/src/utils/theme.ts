import {
    Target, Zap, Heart, Book, DollarSign, Dumbbell,
    Droplets, Flame, Smile, Star, Trophy, Clock,
    Briefcase, Coffee, Music, Sun, Moon,
    Brain, Mountain, Footprints, BedDouble, Utensils,
    Bike, Wallet, Users, Smartphone, Code, Gamepad2,
    Plane, Home, Leaf, Palette, LucideIcon
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
    Target, Zap, Heart, Book, DollarSign, Dumbbell,
    Droplets, Flame, Smile, Star, Trophy, Clock,
    Briefcase, Coffee, Music, Sun, Moon,
    Brain, Mountain, Footprints, BedDouble, Utensils,
    Bike, Wallet, Users, Smartphone, Code, Gamepad2,
    Plane, Home, Leaf, Palette
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
    { name: 'indigo', value: 'bg-indigo-500', text: 'text-indigo-400', border: 'border-indigo-500/20', bgSoft: 'bg-indigo-500/10', bg: 'bg-indigo-500', hex: '#6366f1' },
    { name: 'pink', value: 'bg-pink-500', text: 'text-pink-400', border: 'border-pink-500/20', bgSoft: 'bg-pink-500/10', bg: 'bg-pink-500', hex: '#ec4899' },
    { name: 'lime', value: 'bg-lime-500', text: 'text-lime-400', border: 'border-lime-500/20', bgSoft: 'bg-lime-500/10', bg: 'bg-lime-500', hex: '#84cc16' },
    { name: 'teal', value: 'bg-teal-500', text: 'text-teal-400', border: 'border-teal-500/20', bgSoft: 'bg-teal-500/10', bg: 'bg-teal-500', hex: '#14b8a6' },
    { name: 'orange', value: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500/20', bgSoft: 'bg-orange-500/10', bg: 'bg-orange-500', hex: '#f97316' },
    { name: 'sky', value: 'bg-sky-500', text: 'text-sky-400', border: 'border-sky-500/20', bgSoft: 'bg-sky-500/10', bg: 'bg-sky-500', hex: '#0ea5e9' },
    { name: 'violet', value: 'bg-violet-500', text: 'text-violet-400', border: 'border-violet-500/20', bgSoft: 'bg-violet-500/10', bg: 'bg-violet-500', hex: '#8b5cf6' },
    { name: 'fuchsia', value: 'bg-fuchsia-500', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20', bgSoft: 'bg-fuchsia-500/10', bg: 'bg-fuchsia-500', hex: '#d946ef' },
];

export const getColor = (name: string): ThemeColor => COLORS.find(c => c.name === name) || COLORS[0];
