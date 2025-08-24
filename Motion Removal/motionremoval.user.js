// ==UserScript==
// @name         Universal Motion Removal ⏸️
// @namespace    https://github.com/gthzee/
// @version      1.3
// @description  Comprehensive animation and transition removal
// @author       gthzee
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// @license      MIT
// ==/UserScript==
(function() {
    'use strict';

    // ==== Constants ====
    const STORAGE_KEY = `motion_removal_${location.hostname}`;

    // ==== State Management ====
    let isMotionRemovalEnabled = GM_getValue(STORAGE_KEY, true);

    // ==== Core Styles ====
    const motionRemovalStyles = `
        /* ===== CORE MOTION REMOVAL ===== */
        *:not(svg *):not([aria-busy="true"]):not(.no-motion-removal),
        *:not(svg *):not([aria-busy="true"]):not(.no-motion-removal)::before,
        *:not(svg *):not([aria-busy="true"]):not(.no-motion-removal)::after {
            /* Kill all animations - comprehensive properties */
            animation: none !important;
            animation-delay: 0s !important;
            animation-duration: 0s !important;
            animation-fill-mode: none !important;
            animation-iteration-count: 1 !important;
            animation-name: none !important;
            animation-play-state: paused !important;
            animation-timing-function: ease !important;
            /* Kill all transitions */
            transition: none !important;
            transition-delay: 0s !important;
            transition-duration: 0s !important;
            transition-property: none !important;
            transition-timing-function: ease !important;
            /* Prevent future animations */
            will-change: auto !important;
            /* Smooth scrolling removal */
            scroll-behavior: auto !important;
        }

        /* ===== SPECIFIC ANIMATION TARGETING ===== */
        [class*="animate-"],
        [class*="animation"],
        [class*="pulse"],
        [class*="bounce"],
        [class*="shake"],
        [class*="flash"],
        [class*="fade"],
        [class*="slide"],
        [class*="zoom"],
        [class*="spin"],
        [class*="rotate"],
        [class*="scale"],
        [data-aos],
        [data-animate],
        [data-animation] {
            animation: none !important;
            transition: none !important;
        }

        /* ===== MULTIMEDIA & EMBEDS ===== */
        video,
        iframe,
        embed,
        object,
        [class*="player"],
        [class*="video"],
        [class*="media"],
        [class*="carousel"],
        [class*="slider"] {
            animation: none !important;
            transition: none !important;
        }

        /* ===== ACCESSIBILITY ENHANCEMENT ===== */
        @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
                animation: none !important;
                transition: none !important;
                scroll-behavior: auto !important;
            }
        }

        /* ===== MINIMAL UX PRESERVATION ===== */
        input:focus,
        select:focus,
        textarea:focus,
        button:focus,
        a:focus,
        [tabindex]:focus {
            transition-property: opacity, visibility !important;
            transition-duration: 0.1s !important;
            transition-timing-function: ease-out !important;
        }

        /* ===== EXCLUSIONS ===== */
        svg *,
        [aria-busy="true"],
        .no-motion-removal,
        canvas {
            animation: auto !important;
            transition: auto !important;
        }
    `;

    // ==== Functions ====
    const applyMotionRemovalStyles = () => {
        if (isMotionRemovalEnabled) {
            GM_addStyle(motionRemovalStyles);
        }
    };

    const toggleMotionRemoval = () => {
        const newState = !isMotionRemovalEnabled;
        GM_setValue(STORAGE_KEY, newState);
        location.reload();
    };

    const registerMenuCommand = () => {
        GM_registerMenuCommand(
            `Motion Removal: ${isMotionRemovalEnabled ? 'ON' : 'OFF'}`,
            toggleMotionRemoval
        );
    };

    // ==== Initialization ====
    const initializeMotionRemoval = () => {
        applyMotionRemovalStyles();
        registerMenuCommand();
    };

    // ==== Start ====
    initializeMotionRemoval();
})();
