// ==UserScript==
// @name         Universal Motion Removal
// @namespace    https://github.com/gthzee/
// @version      2.3
// @description  Disable animations and transitions without performance issues
// @author       gthzee
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Site-specific storage key
    const siteKey = `deanimator_enabled_${location.hostname.replace(/^www\./, '')}`;
    const enabled = GM_getValue(siteKey, false);

    // Minimal, high-impact CSS (removes redundancy)
    const DEANIMATOR_CSS = `
        *, ::before, ::after {
            animation: none !important;
            transition: none !important;
            scroll-behavior: auto !important;
            will-change: auto !important;
        }
    `;

    // Apply styles immediately if enabled
    if (enabled) {
        GM_addStyle(DEANIMATOR_CSS);
    }

    GM_registerMenuCommand(
        `Deanimator: ${enabled ? 'ON' : 'OFF'}`,
        () => {
            GM_setValue(siteKey, !enabled);
            location.reload();
        }
    );
})();
