// ==UserScript==
// @name         Twitter/X/Nitter Redirector 🔀
// @namespace    https://github.com/gthzee/
// @version      1.7
// @description  Redirects X.com→Nitter.net and handles Nitter rate limits→other instances
// @author       gthzee
// @match        *://x.com/*
// @match        *://twitter.com/*
// @match        *://nitter.net/*
// @match        *://nitter.*.*/*
// @match        *://xcancel.com/*
// @grant        none
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
        "be back shortly"
    ];

    const ALTERNATIVE_INSTANCES = [
        'https://xcancel.com',
        'https://nitter.privacyredirect.com'
    ];

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

    // ==== Error Detection ====
    const hasError = () => {
        const bodyText = document.body?.innerText?.toLowerCase() || '';
        return ERROR_PATTERNS.some(pattern => bodyText.includes(pattern));
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
    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

    window.addEventListener('beforeunload', cleanupResources);
})();
