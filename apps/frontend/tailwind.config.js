/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Semantic, theme-driven. Raw palette hexes should not appear in components.
                accent: {
                    DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
                    strong: 'var(--accent-strong)',
                    ink: 'var(--accent-ink)',
                },
                hairline: 'rgb(var(--line-rgb) / <alpha-value>)',
                sunken: 'rgb(var(--sunken-rgb) / <alpha-value>)',
                pos: 'rgb(var(--pos-rgb) / <alpha-value>)',
                neg: 'rgb(var(--neg-rgb) / <alpha-value>)',
                raise: 'rgb(var(--raise-rgb) / <alpha-value>)',
                ink: {
                    hi: 'var(--ink-hi)',
                    mid: 'var(--ink-mid)',
                    low: 'var(--ink-low)',
                    faint: 'var(--ink-faint)',
                },
                surface: 'rgb(var(--surface) / <alpha-value>)',
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                },
                dark: '#0f172a',
            },
            // Themes control how square the app feels.
            borderRadius: {
                md: 'var(--radius-md)',
                lg: 'var(--radius-lg)',
                xl: 'var(--radius-xl)',
                '2xl': 'var(--radius-2xl)',
                '3xl': 'var(--radius-3xl)',
            },
            backgroundImage: {
                'glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
            }
        },
    },
    plugins: [],
}
