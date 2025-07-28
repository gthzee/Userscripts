// ==UserScript==
// @name         Universal Dark Mode 🌒
// @namespace    https://github.com/gthzee/
// @version      1.4
// @description  Dark mode with random static background & random bright links
// @author       gthzee
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // Constants
    const KEY = "dm_" + location.hostname;
    const STYLE_ID = "dm_style";
    const styles = [
        `html, body { background: #121212 !important; color: #e0e0e0 !important; }`,
        `html, body { background: #2d2d2d !important; color: #e0e0e0 !important; }`,
        `html, body { background: #1e1f2f !important; color: #e0e0e0 !important; }`
    ];
    const selectedStyle = styles[Math.floor(Math.random() * styles.length)];

    // State management
    let isDark = JSON.parse(localStorage.getItem(KEY) ?? 'true');
    let observer = null;
    let styleElement = null;
    let isInitialized = false;

    // Style management
    const applyStyle = () => {
        if (!styleElement && isDark) {
            styleElement = document.createElement('style');
            styleElement.id = STYLE_ID;
            styleElement.textContent = `
                ${selectedStyle}
                * { background: transparent !important; border-color: #444 !important; color: inherit !important; }
                img, video { filter: brightness(0.9) contrast(1.1); }
                ::selection { background: #555; color: #fff; }
            `;
            document.head.appendChild(styleElement);
        }
    };

    const removeStyle = () => {
        if (styleElement) {
            styleElement.remove();
            styleElement = null;
        }
    };

    // Link handling (with brightness control)
    const getBrightness = (hex) => {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return (r * 299 + g * 587 + b * 114) / 1000;
    };

    const getReadableRandomColor = () => {
        let hex, brightness;
        do {
            hex = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
            brightness = getBrightness(hex);
        } while (brightness < 120); // Avoid colors that are too dark
        return `#${hex}`;
    };

    const colorizeLinks = () => {
        if (!isDark) return;

        const links = document.querySelectorAll('a[href]');
        links.forEach(a => {
            if (!a.hasAttribute('data-dm-colored')) {
                const color = getReadableRandomColor();
                a.style.setProperty('color', color, 'important');
                a.setAttribute('data-dm-colored', 'true');
            }
        });
    };

    const resetLinks = () => {
        const links = document.querySelectorAll('a[href][data-dm-colored]');
        links.forEach(a => {
            a.style.removeProperty('color');
            a.removeAttribute('data-dm-colored');
        });
    };

    // Core functionality
    const refresh = () => {
        if (isDark) {
            applyStyle();
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    colorizeLinks();
                    setupDynamicContentObserver();
                });
            });
        } else {
            removeStyle();
            resetLinks();
            cleanupDynamicContentObserver();
        }
    };

    // Dynamic content handling
    let dynamicObserver = null;
    const setupDynamicContentObserver = () => {
        if (!isDark || dynamicObserver) return;

        dynamicObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length) {
                    colorizeLinks();
                }
            });
        });

        dynamicObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    };

    const cleanupDynamicContentObserver = () => {
        if (dynamicObserver) {
            dynamicObserver.disconnect();
            dynamicObserver = null;
        }
    };

    // Toggle functionality
    const toggle = (reload = true) => {
        isDark = !isDark;
        localStorage.setItem(KEY, JSON.stringify(isDark));
        if (reload) {
            location.reload();
        } else {
            refresh();
        }
    };

    // Initialization
    const initialize = () => {
        if (isInitialized) return;
        isInitialized = true;

        if (observer) {
            observer.disconnect();
            observer = null;
        }

        refresh();

        // Register commands
        GM_registerMenuCommand('Dark Mode (Reload)', () => toggle(true));
        GM_registerMenuCommand('Dark Mode (Instant)', () => toggle(false));
    };

    // DOM ready check
    if (document.head && document.body) {
        initialize();
    } else {
        observer = new MutationObserver((mutations, obs) => {
            if (document.head && document.body) {
                initialize();
                obs.disconnect();
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    // Event handlers
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            refresh();
        }
    };

    const cleanup = () => {
        if (observer) observer.disconnect();
        if (dynamicObserver) dynamicObserver.disconnect();
        window.removeEventListener('pageshow', refresh);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('unload', cleanup);
    };

    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', refresh);
    window.addEventListener('unload', cleanup);
})();
