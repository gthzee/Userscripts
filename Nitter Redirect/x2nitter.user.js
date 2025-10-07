// ==UserScript==
// @name         Twitter/X/Nitter Redirector 🔀
// @namespace    https://github.com/gthzee/
// @version      1.9
// @description  Redirects X.com→Nitter.net and handles Nitter rate limits→other instances
// @author       gthzee
// @match        *://x.com/*
// @match        *://twitter.com/*
// @match        *://nitter.*/*
// @match        *://nitter.*.*/*
// @match        *://xcancel.com/*
// @grant        none
// @run-at       document-start
// @license      MIT
// ==/UserScript==
(function() {
    'use strict';

    // ==== Constants ====
    const ERROR_PATTERNS = [
        "no auth tokens",
        "rate limited",
        "try again later",
        "instance overloaded",
        "nitter.net is down",
        "be back shortly",
        "not found"
    ];

    const ALTERNATIVE_INSTANCES = [
        'https://xcancel.com',
        //'https://nitter.privacyredirect.com',
        //'https://nitter.tiekoetter.com'
    ];

    // ==== Global Variables ====
    let pageStatusCode = 200;

    // ==== Intercept Network Requests ====
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        return originalFetch.apply(this, args).then(response => {
            if (response.status >= 400) {
                pageStatusCode = response.status;
            }
            return response;
        });
    };

    // ==== Helper Functions ====
    const isNitterNet = () => {
        return window.location.hostname === 'nitter.net';
    };

    const isAlternativeInstance = () => {
        return ALTERNATIVE_INSTANCES.some(instance => {
            return window.location.origin === instance;
        });
    };

    // ==== Redirect Functions ====
    const redirectToNitter = () => {
        const nitterUrl = `https://nitter.net${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.replace(nitterUrl);
    };

    const redirectToAlternativeInstance = () => {
        const randomInstance = ALTERNATIVE_INSTANCES[Math.floor(Math.random() * ALTERNATIVE_INSTANCES.length)];
        const newUrl = `${randomInstance}${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.replace(newUrl);
    };

    // ==== Enhanced Error Detection ====
    const hasError = () => {
        if (!isNitterNet()) return false;

        // 1. Check document title for error indicators
        const titleText = document.title.toLowerCase();
        const titleErrorPatterns = [
            'error',
            'rate limited',
            'instance overloaded',
            'not found',
            'unavailable',
            'down'
        ];

        if (titleErrorPatterns.some(pattern => titleText.includes(pattern))) {
            console.log('Error detected in title:', document.title);
            return true;
        }

        // 2. Check for specific error page elements
        const errorSelectors = [
            '.error-container',
            '.error-message',
            '.alert-error',
            '.error-page',
            '[class*="error"]',
            '[id*="error"]'
        ];

        for (const selector of errorSelectors) {
            const errorElement = document.querySelector(selector);
            if (errorElement) {
                const errorText = errorElement.innerText.toLowerCase();
                if (ERROR_PATTERNS.some(pattern => errorText.includes(pattern))) {
                    console.log('Error detected in element:', selector, errorElement);
                    return true;
                }
            }
        }

        // 3. Check HTTP status codes
        if (pageStatusCode >= 400) {
            console.log('Error detected via status code:', pageStatusCode);
            return true;
        }

        // 4. Fallback to body text check (more restrictive)
        const bodyText = document.body?.innerText?.toLowerCase() || '';
        const bodyErrorPatterns = [
            "no auth tokens",
            "rate limited",
            "try again later",
            "instance overloaded",
            "nitter.net is down",
            "be back shortly"
        ];

        // Only check body text if it's short (likely an error page)
        if (bodyText.length < 500 && bodyErrorPatterns.some(pattern => bodyText.includes(pattern))) {
            console.log('Error detected in body text (short page)');
            return true;
        }

        return false;
    };

    // ==== Cleanup Functions ====
    let mutationObserver = null;
    let timeoutId = null;

    const cleanupResources = () => {
        if (mutationObserver) {
            mutationObserver.disconnect();
            mutationObserver = null;
        }
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        window.removeEventListener('beforeunload', cleanupResources);
    };

    // ==== X/Twitter to Nitter Redirect ====
    const isTwitterDomain = () => {
        return window.location.hostname.match(/^(x\.com|twitter\.com)$/);
    };

    if (isTwitterDomain()) {
        redirectToNitter();
        return;
    }

    // ==== Nitter Error Handling ====
    const handleNitterError = () => {
        cleanupResources();
        redirectToAlternativeInstance();
    };

    // Only set up error detection if we're on nitter.net
    if (isNitterNet()) {
        // Immediate error check
        if (hasError()) {
            redirectToAlternativeInstance();
            return;
        }

        // Setup observer for dynamic content
        mutationObserver = new MutationObserver(() => {
            if (hasError()) {
                handleNitterError();
            }
        });

        // Set timeout for delayed error check
        timeoutId = setTimeout(() => {
            cleanupResources();
            if (hasError()) {
                redirectToAlternativeInstance();
            }
        }, 3000);

        // Start observing and set up cleanup
        if (document.body) {
            mutationObserver.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });
        } else {
            // If document.body doesn't exist yet, wait for it
            const bodyObserver = new MutationObserver(() => {
                if (document.body) {
                    bodyObserver.disconnect();
                    mutationObserver.observe(document.body, {
                        childList: true,
                        subtree: true,
                        characterData: true
                    });
                }
            });
            bodyObserver.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        }

        window.addEventListener('beforeunload', cleanupResources);
    }
    // If we're on an alternative instance, do nothing (no error detection)
})();
