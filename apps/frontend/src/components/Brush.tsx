import React from 'react';
import { useTheme } from '../ThemeContext';

/**
 * Ink-brush furniture for the Sumi family.
 *
 * Every mark is a filled outline rather than a stroked line, so the width can
 * swell and taper the way a loaded brush does. They render nothing in families
 * that do not ask for brushwork, which keeps call sites free of conditionals.
 */

/** A tapered sweep that sits under a heading. */
export const BrushUnderline: React.FC<{ className?: string; width?: number }> = ({ className = '', width = 220 }) => {
    const { brush } = useTheme();
    if (!brush) return null;

    return (
        <svg
            viewBox="0 0 300 18"
            width={width}
            height={width * 0.06}
            aria-hidden="true"
            preserveAspectRatio="none"
            className={`block text-accent ${className}`}
        >
            {/* Body of the stroke: thin entry, heavy belly, dry exit. */}
            <path
                fill="currentColor"
                d="M2 9.6c14-3.1 30-5.2 48-6.1 27-1.4 54 .4 81 2 26 1.6 52 3.1 78 2.2 17-.6 34-2.3 50-5.2-13 5.1-27 8-41 9.4-28 2.8-56 1-84-.7-27-1.6-54-3.2-81-1.9-17 .8-34 2.7-51 6.1Z"
            />
            {/* Dry-brush flecks trailing off the end. */}
            <path fill="currentColor" opacity=".55" d="M262 6.2c9-.6 18-1.9 26-3.9-7 3.1-15 5-23 5.9Z" />
            <path fill="currentColor" opacity=".3" d="M292 3.1c3-.4 5-1 8-1.9-2 1.5-5 2.5-8 3Z" />
        </svg>
    );
};

/** A full-width divider drawn as a single dry sweep. */
export const BrushRule: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { brush } = useTheme();
    if (!brush) return null;

    return (
        <svg
            viewBox="0 0 1000 10"
            preserveAspectRatio="none"
            aria-hidden="true"
            className={`block w-full h-[7px] brush-rule ${className}`}
        >
            <path
                fill="currentColor"
                d="M0 5.4c60-2.2 121-3.6 182-4.1 122-1 244 .9 366 2.1 118 1.2 236 1.8 354-.4 33-.6 66-1.6 98-3.0-30 3.4-63 5.3-95 6.4-119 4-238 3.1-357 1.9-122-1.2-244-3-366-1.9-61 .5-122 1.8-182 4.2Z"
            />
        </svg>
    );
};

/**
 * The enso: one circular sweep left deliberately open. Used as a watermark
 * behind headline areas.
 */
export const Enso: React.FC<{ size?: number; className?: string; opacity?: number }> = ({
    size = 260,
    className = '',
    opacity = 0.09,
}) => {
    const { brush } = useTheme();
    if (!brush) return null;

    return (
        <svg
            viewBox="0 0 200 200"
            width={size}
            height={size}
            aria-hidden="true"
            className={`text-accent ${className}`}
            style={{ opacity }}
        >
            <path
                fill="currentColor"
                d="M104 8c-15 0-30 4-43 12C41 32 28 51 23 73c-6 25-1 52 15 72 15 19 38 31 62 33 25 2 50-7 67-25 8-9 14-19 17-30-6 10-13 19-22 26-16 13-37 19-57 17-22-2-43-14-56-32C36 115 32 91 37 69c4-19 15-36 31-47 13-9 29-14 45-14 12 0 24 3 35 8-13-6-28-9-44-8Z"
            />
            {/* The lift-off tail, thinning and breaking up. */}
            <path fill="currentColor" opacity=".6" d="M148 16c8 4 15 9 21 16-8-5-16-10-24-13Z" />
            <path fill="currentColor" opacity=".3" d="M176 38c4 5 7 11 9 17-3-6-6-12-11-16Z" />
        </svg>
    );
};

/** A vermilion seal, like the stamp on a finished scroll. */
export const InkSeal: React.FC<{ label?: string; className?: string }> = ({ label = '改', className = '' }) => {
    const { brush } = useTheme();
    if (!brush) return null;

    return (
        <span
            aria-hidden="true"
            className={`inline-flex items-center justify-center w-6 h-6 text-[11px] font-bold shrink-0 ${className}`}
            style={{
                background: 'var(--accent)',
                color: 'var(--accent-ink)',
                borderRadius: '2px',
                fontFamily: 'var(--font-ui)',
            }}
        >
            {label}
        </span>
    );
};
