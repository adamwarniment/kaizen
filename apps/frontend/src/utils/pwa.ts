import { FamilyDef, ResolvedMode } from './themes';

/**
 * Theme-aware PWA chrome.
 *
 * What sticks and what does not:
 *  - <meta name="theme-color"> updates live; the status bar follows a switch
 *    immediately, installed or not.
 *  - The manifest is swapped for a generated blob so anyone installing AFTER
 *    picking a theme gets that theme's launcher icon.
 *  - An ALREADY installed icon does not reliably repaint: Android caches it at
 *    install, iOS captures apple-touch-icon at install and never refreshes.
 *    Reinstalling is the only dependable way to change one.
 */

/** Draws the launcher icon on a canvas, so no binary assets need building. */
const renderIcon = (
    colors: { ground: string; ring: string; mark: string },
    brush: boolean,
    size: number,
): string | null => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const { ground, ring, mark } = colors;
    const c = size / 2;

    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, size, size);

    // Maskable icons get cropped to a circle, so the mark stays inside the
    // safe zone (80% of the canvas).
    const r = size * 0.28;
    ctx.strokeStyle = ring;
    ctx.lineCap = 'round';

    if (brush) {
        // An enso drawn as one sweep: heavy where the brush lands, thinning as
        // it lifts, with the gap left open.
        const start = -Math.PI * 0.62;
        const end = Math.PI * 1.22;
        const steps = 60;
        for (let i = 0; i < steps; i++) {
            const a0 = start + ((end - start) * i) / steps;
            const a1 = start + ((end - start) * (i + 1)) / steps;
            const p = i / steps;
            // Thick through the belly of the stroke, tapering at both ends.
            const taper = Math.sin(Math.PI * Math.min(1, p * 1.12)) ** 0.55;
            ctx.lineWidth = size * (0.028 + 0.058 * taper);
            ctx.globalAlpha = 0.55 + 0.45 * taper;
            ctx.beginPath();
            ctx.arc(c, c, r, a0, a1 + 0.02);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    } else {
        ctx.lineWidth = size * 0.055;
        ctx.beginPath();
        ctx.arc(c, c, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // A rising stroke through the ring: the shared "one step up" mark.
    ctx.strokeStyle = mark;
    ctx.lineWidth = size * 0.055;
    ctx.beginPath();
    ctx.moveTo(c - r * 0.42, c + r * 0.4);
    ctx.lineTo(c - r * 0.02, c - r * 0.06);
    ctx.lineTo(c + r * 0.44, c - r * 0.44);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(c - r * 0.5, c + r * 0.72);
    ctx.lineTo(c + r * 0.5, c + r * 0.72);
    ctx.stroke();

    try {
        return canvas.toDataURL('image/png');
    } catch {
        return null;
    }
};

let activeManifestUrl: string | null = null;

export const applyPwaTheme = (family: FamilyDef, mode: ResolvedMode) => {
    const variant = family.modes[mode];

    // 1. Status bar tint -- immediate, installed or not.
    document.querySelectorAll('meta[name="theme-color"]').forEach(node => {
        node.setAttribute('content', variant.themeColor);
    });
    // iOS picks a status bar style rather than a colour.
    const iosBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (iosBar) iosBar.setAttribute('content', mode === 'light' ? 'default' : 'black-translucent');

    // 2. Manifest, so a future install picks up this theme's icon.
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) return;

    const icons: Array<Record<string, string>> = [];
    for (const size of [192, 512]) {
        const src = renderIcon(variant.icon, family.brush, size);
        if (src) icons.push({ src, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any maskable' });
    }
    if (icons.length === 0) return; // Canvas unavailable: keep the static manifest.

    const manifest = {
        name: 'Kaizen — Practice, better',
        short_name: 'Kaizen',
        description: 'A practice for continuous growth and improvement.',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: variant.backgroundColor,
        theme_color: variant.themeColor,
        icons,
    };

    const url = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
    link.setAttribute('href', url);
    if (activeManifestUrl) URL.revokeObjectURL(activeManifestUrl);
    activeManifestUrl = url;

    // 3. iOS reads the touch icon at install time; refresh it for the same reason.
    const touch = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    const touchSrc = renderIcon(variant.icon, family.brush, 180);
    if (touch && touchSrc) touch.setAttribute('href', touchSrc);
};
