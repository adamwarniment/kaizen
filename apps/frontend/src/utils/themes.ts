/**
 * Theme registry.
 *
 * Two independent axes:
 *   family -- growth | sumi   (palette, type, corner radius, texture)
 *   mode   -- dark | light | system
 *
 * Each pair maps to a `[data-theme][data-mode]` block in index.css. Adding a
 * family means adding a block there and an entry here; no component changes.
 */

export type ThemeFamily = 'growth' | 'sumi';
export type ThemeMode = 'dark' | 'light' | 'system';
/** The mode actually painted once `system` has been resolved. */
export type ResolvedMode = 'dark' | 'light';

export interface FamilyDef {
    id: ThemeFamily;
    name: string;
    tagline: string;
    /** True when the family leans on ink-brush furniture. */
    brush: boolean;
    modes: Record<ResolvedMode, {
        /** Swatches for the picker: [ground, accent, ink]. */
        swatch: [string, string, string];
        backgroundColor: string;
        themeColor: string;
        icon: { ground: string; ring: string; mark: string };
    }>;
}

export const FAMILIES: Record<ThemeFamily, FamilyDef> = {
    growth: {
        id: 'growth',
        name: 'Growth',
        tagline: 'Soft greens, rounded edges.',
        brush: false,
        modes: {
            dark: {
                swatch: ['#111513', '#b7d58d', '#edf3e7'],
                backgroundColor: '#111513',
                themeColor: '#111513',
                icon: { ground: '#131b16', ring: '#b7d58d', mark: '#d8efa4' },
            },
            light: {
                swatch: ['#f3f6ee', '#5f8f36', '#1b2418'],
                backgroundColor: '#f3f6ee',
                themeColor: '#f3f6ee',
                icon: { ground: '#eef3e6', ring: '#5f8f36', mark: '#3c6b1f' },
            },
        },
    },
    sumi: {
        id: 'sumi',
        name: 'Sumi',
        tagline: 'Brushed ink, washi grain, a vermilion seal.',
        brush: true,
        modes: {
            dark: {
                swatch: ['#0b0b0a', '#d11f34', '#f6f3ec'],
                backgroundColor: '#0b0b0a',
                themeColor: '#0b0b0a',
                icon: { ground: '#0b0b0a', ring: '#d11f34', mark: '#f6f3ec' },
            },
            light: {
                swatch: ['#efece4', '#bd1526', '#14110d'],
                backgroundColor: '#efece4',
                themeColor: '#efece4',
                icon: { ground: '#efece4', ring: '#bd1526', mark: '#14110d' },
            },
        },
    },
};

export const FAMILY_LIST = Object.values(FAMILIES);
export const DEFAULT_FAMILY: ThemeFamily = 'growth';
export const DEFAULT_MODE: ThemeMode = 'dark';

export const FAMILY_KEY = 'kaizen-theme';
export const MODE_KEY = 'kaizen-mode';

export const isFamily = (v: unknown): v is ThemeFamily =>
    typeof v === 'string' && v in FAMILIES;

export const isMode = (v: unknown): v is ThemeMode =>
    v === 'dark' || v === 'light' || v === 'system';

export const systemPrefersLight = (): boolean => {
    try {
        return window.matchMedia('(prefers-color-scheme: light)').matches;
    } catch {
        return false;
    }
};

export const resolveMode = (mode: ThemeMode): ResolvedMode =>
    mode === 'system' ? (systemPrefersLight() ? 'light' : 'dark') : mode;

/** Serialised as "family:mode" in the single `theme` column on the user. */
export const encodeTheme = (family: ThemeFamily, mode: ThemeMode) => `${family}:${mode}`;

export const decodeTheme = (value?: string | null): { family: ThemeFamily; mode: ThemeMode } => {
    const [f, m] = (value || '').split(':');
    return {
        family: isFamily(f) ? f : DEFAULT_FAMILY,
        mode: isMode(m) ? m : DEFAULT_MODE,
    };
};

export const readStored = () => {
    try {
        const f = localStorage.getItem(FAMILY_KEY);
        const m = localStorage.getItem(MODE_KEY);
        return {
            family: isFamily(f) ? f : DEFAULT_FAMILY,
            mode: isMode(m) ? m : DEFAULT_MODE,
        };
    } catch {
        return { family: DEFAULT_FAMILY, mode: DEFAULT_MODE };
    }
};
