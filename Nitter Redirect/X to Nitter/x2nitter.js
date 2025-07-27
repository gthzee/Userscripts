// ==UserScript==
// @name         Twitter to Nitter
// @namespace    https://github.com/gthzee/
// @version      1.0
// @description  Redirects X.com→Nitter.net and handles Nitter rate limits→XCancel
// @author       gthzee
// @match        *://x.com/*
// @match        *://twitter.com/*
// @match        *://nitter.net/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ========================
    //  X/Twitter → Nitter Logic
    // ========================
    if (window.location.hostname.match(/^(x\.com|twitter\.com)$/)) {
        const nitterUrl = `https://nitter.net${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.replace(nitterUrl);
        return; // Stop execution after X→Nitter redirect
    }
    // ========================
    //  Nitter → XCancel Logic
    // (Original functionality)
    // ========================
    const errorPatterns = [
        "no auth tokens",
        "rate limited",
        "try again later",
        "instance overloaded",
        "nitter.net is down",
        "be back shortly"
    ];

    function hasError() {
        const bodyText = document.body?.innerText?.toLowerCase() || '';
        return errorPatterns.some(pattern => bodyText.includes(pattern));
    }

    function redirectToXCancel() {
        const newUrl = `https://xcancel.com${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.replace(newUrl);
    }

    // Immediate check
    if (hasError()) {
        redirectToXCancel();
        return;
    }

    // Setup observer with auto-cleanup
    const observer = new MutationObserver(() => {
        if (hasError()) {
            cleanup();
            redirectToXCancel();
        }
    });

    const timeoutId = setTimeout(() => {
        cleanup();
        if (hasError()) redirectToXCancel();
    }, 3000);

    function cleanup() {
        observer.disconnect();
        clearTimeout(timeoutId);
        window.removeEventListener('beforeunload', cleanup);
    }

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

    window.addEventListener('beforeunload', cleanup);
})();
