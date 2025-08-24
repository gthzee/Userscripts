// ==UserScript==
// @name         Universal Dark Mode 🌒
// @namespace    https://github.com/gthzee/
// @version      1.6
// @description  Dark mode with random static background & random bright links
// @author       gthzee
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @license      MIT
// ==/UserScript==
(function() {
    'use strict';

    // ==== Constants ====
    const STORAGE_KEY = "dm_" + location.hostname;
    const STYLE_ID = "dm_style";
    const LINK_COLOR_ATTR = "data-dm-colored";
    const DARK_MODE_STYLES = [
        `html, body { background: #121212 !important; color: #e0e0e0 !important; }`,
        `html, body { background: #2d2d2d !important; color: #e0e0e0 !important; }`,
        `html, body { background: #1e1f2f !important; color: #e0e0e0 !important; }`
    ];
    const SELECTED_STYLE = DARK_MODE_STYLES[Math.floor(Math.random() * DARK_MODE_STYLES.length)];

    // ==== State Management ====
    let isDarkModeEnabled = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'true');
    let mainObserver = null;
    let styleElement = null;
    let isInitialized = false;
    let dynamicContentObserver = null;
    let mutationTimeout = null;

    // ==== Style Management ====
    const applyDarkModeStyles = () => {
        if (!styleElement && isDarkModeEnabled) {
            styleElement = document.createElement('style');
            styleElement.id = STYLE_ID;
            styleElement.textContent = `
                ${SELECTED_STYLE}
                * {
                    background-color: transparent !important;
                    border-color: #444 !important;
                    color: inherit !important;
                }
                input, textarea, select {
                    background-color: #2a2a2a !important;
                    border-color: #555 !important;
                    color: #e0e0e0 !important;
                }
                img, video, iframe {
                    filter: brightness(0.9) contrast(1.1) !important;
                }
                ::selection {
                    background: #555 !important;
                    color: #fff !important;
                }
                :-moz-selection {
                    background: #555 !important;
                    color: #fff !important;
                }
                ::-moz-selection {
                    background: #555 !important;
                    color: #fff !important;
                }
                /* Improve visibility of placeholders */
                ::placeholder {
                    color: #aaa !important;
                    opacity: 1 !important;
                }
                :-ms-input-placeholder {
                    color: #aaa !important;
                }
                ::-ms-input-placeholder {
                    color: #aaa !important;
                }
                /* Fix for SVG elements */
                svg:not([fill]) {
                    fill: #e0e0e0 !important;
                }
                svg:not([stroke]) {
                    stroke: #e0e0e0 !important;
                }
            `;

            const targetElement = document.head || document.documentElement;
            targetElement.appendChild(styleElement);
        }
    };

    const removeDarkModeStyles = () => {
        if (styleElement && styleElement.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
            styleElement = null;
        }
    };

    // ==== Link Color Management ====
    const calculateColorBrightness = (hexColor) => {
        if (hexColor.length === 3) {
            hexColor = hexColor[0] + hexColor[0] + hexColor[1] + hexColor[1] + hexColor[2] + hexColor[2];
        }
        const r = parseInt(hexColor.slice(0, 2), 16);
        const g = parseInt(hexColor.slice(2, 4), 16);
        const b = parseInt(hexColor.slice(4, 6), 16);
        return (r * 299 + g * 587 + b * 114) / 1000;
    };

    const generateReadableRandomColor = () => {
        let hexColor, brightness;
        do {
            const r = Math.floor(Math.random() * 128 + 128).toString(16);
            const g = Math.floor(Math.random() * 128 + 128).toString(16);
            const b = Math.floor(Math.random() * 128 + 128).toString(16);
            hexColor = (r.length === 1 ? '0' + r : r) +
                       (g.length === 1 ? '0' + g : g) +
                       (b.length === 1 ? '0' + b : b);
            brightness = calculateColorBrightness(hexColor);
        } while (brightness < 160);
        return `#${hexColor}`;
    };

    const colorizeLinks = () => {
        if (!isDarkModeEnabled) return;

        const links = document.querySelectorAll(`a[href]:not([${LINK_COLOR_ATTR}])`);
        links.forEach(link => {
            if (link.closest('[data-no-dark-mode]') || link.classList.contains('no-dark-mode')) {
                return;
            }
            const color = generateReadableRandomColor();
            link.style.setProperty('color', color, 'important');
            link.setAttribute(LINK_COLOR_ATTR, 'true');
        });
    };

    const resetLinkColors = () => {
        const links = document.querySelectorAll(`a[href][${LINK_COLOR_ATTR}]`);
        links.forEach(link => {
            link.style.removeProperty('color');
            link.removeAttribute(LINK_COLOR_ATTR);
        });
    };

    // ==== Dynamic Content Handling ====
    const setupDynamicContentObserver = () => {
        if (!isDarkModeEnabled || dynamicContentObserver) return;

        dynamicContentObserver = new MutationObserver(() => {
            if (!mutationTimeout) {
                mutationTimeout = setTimeout(() => {
                    colorizeLinks();
                    mutationTimeout = null;
                }, 100);
            }
        });

        dynamicContentObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    };

    const cleanupDynamicContentObserver = () => {
        if (dynamicContentObserver) {
            dynamicContentObserver.disconnect();
            dynamicContentObserver = null;
        }
        if (mutationTimeout) {
            clearTimeout(mutationTimeout);
            mutationTimeout = null;
        }
    };

    // ==== Core Functionality ====
    const refreshDarkMode = () => {
        if (isDarkModeEnabled) {
            applyDarkModeStyles();
            requestAnimationFrame(() => {
                setTimeout(() => {
                    colorizeLinks();
                    setupDynamicContentObserver();
                }, 100);
            });
        } else {
            removeDarkModeStyles();
            resetLinkColors();
            cleanupDynamicContentObserver();
        }
    };

    const toggleDarkMode = () => {
        isDarkModeEnabled = !isDarkModeEnabled;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(isDarkModeEnabled));
        refreshDarkMode();
    };

    // ==== Initialization ====
    const initializeDarkMode = () => {
        if (isInitialized) return;
        isInitialized = true;

        if (mainObserver) {
            mainObserver.disconnect();
            mainObserver = null;
        }

        refreshDarkMode();
        GM_registerMenuCommand('Dark Mode (Instant)', toggleDarkMode);
    };

    // ==== DOM Ready Check ====
    const checkDomReady = () => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeDarkMode);
        } else {
            setTimeout(initializeDarkMode, 0);
        }

        if (document.head) {
            initializeDarkMode();
        } else {
            mainObserver = new MutationObserver((mutations, observer) => {
                if (document.head) {
                    initializeDarkMode();
                    observer.disconnect();
                }
            });
            mainObserver.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        }
    };

    // ==== Event Handlers ====
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            refreshDarkMode();
        }
    };

    const cleanupEventListeners = () => {
        if (mainObserver) mainObserver.disconnect();
        cleanupDynamicContentObserver();
        window.removeEventListener('pageshow', refreshDarkMode);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('unload', cleanupEventListeners);
    };

    // ==== Setup Event Listeners ====
    const setupEventListeners = () => {
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pageshow', refreshDarkMode);
        window.addEventListener('unload', cleanupEventListeners);
    };

    // ==== Start ====
    checkDomReady();
    setupEventListeners();
})();
