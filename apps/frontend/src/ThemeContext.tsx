import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
    DEFAULT_FAMILY, DEFAULT_MODE, FAMILIES, FAMILY_KEY, MODE_KEY,
    ResolvedMode, ThemeFamily, ThemeMode, isFamily, isMode, readStored, resolveMode,
} from './utils/themes';
import { applyPwaTheme } from './utils/pwa';

interface ThemeContextValue {
    family: ThemeFamily;
    mode: ThemeMode;
    resolved: ResolvedMode;
    /** True when the active family uses ink-brush furniture. */
    brush: boolean;
    setFamily: (id: ThemeFamily) => void;
    setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    family: DEFAULT_FAMILY,
    mode: DEFAULT_MODE,
    resolved: 'dark',
    brush: false,
    setFamily: () => undefined,
    setMode: () => undefined,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // The inline boot script in index.html has already stamped the attributes,
    // so reading them back keeps the first paint and React in agreement.
    const [family, setFamilyState] = useState<ThemeFamily>(() => {
        const stamped = document.documentElement.getAttribute('data-theme');
        return isFamily(stamped) ? stamped : readStored().family;
    });
    const [mode, setModeState] = useState<ThemeMode>(() => {
        const stamped = document.documentElement.getAttribute('data-mode-pref');
        return isMode(stamped) ? stamped : readStored().mode;
    });

    const [systemLight, setSystemLight] = useState(
        () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches,
    );

    // Follow the OS while the user has chosen "system".
    useEffect(() => {
        const mq = window.matchMedia?.('(prefers-color-scheme: light)');
        if (!mq) return;
        const onChange = (e: MediaQueryListEvent) => setSystemLight(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    const resolved: ResolvedMode = mode === 'system' ? (systemLight ? 'light' : 'dark') : mode;

    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', family);
        root.setAttribute('data-mode', resolved);
        root.setAttribute('data-mode-pref', mode);
        try {
            localStorage.setItem(FAMILY_KEY, family);
            localStorage.setItem(MODE_KEY, mode);
        } catch {
            // Non-fatal: the theme still applies for this session.
        }
        applyPwaTheme(FAMILIES[family], resolved);
    }, [family, mode, resolved]);

    const setFamily = useCallback((id: ThemeFamily) => setFamilyState(id), []);
    const setMode = useCallback((m: ThemeMode) => setModeState(m), []);

    const value = useMemo(
        () => ({ family, mode, resolved, brush: FAMILIES[family].brush, setFamily, setMode }),
        [family, mode, resolved, setFamily, setMode],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export { resolveMode };
