// ==UserScript==
// @name         Nitter.net Auto-Redirect
// @namespace    https://github.com/gthzee/
// @version      1.6
// @description  Redirect to xcancel.com when Nitter shows rate limit error
// @author       gthzee
// @match        *://nitter.net/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const errorPatterns = [
        "no auth tokens",
        "rate limited",
        "try again later",
        "instance overloaded"
    ];

    function hasError() {
        const bodyText = document.body?.innerText?.toLowerCase() || '';
        return errorPatterns.some(pattern => bodyText.includes(pattern));
    }

    function redirect() {
        const newUrl = `https://xcancel.com${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.replace(newUrl);
    }

    // Immediate check
    if (hasError()) {
        redirect();
        return; // Stop script execution
    }

    // Setup observer with auto-cleanup
    const observer = new MutationObserver(() => {
        if (hasError()) {
            cleanup();
            redirect();
        }
    });

    const timeoutId = setTimeout(() => {
        cleanup();
        if (hasError()) redirect();
    }, 3000);

    function cleanup() {
        observer.disconnect();
        clearTimeout(timeoutId);
        window.removeEventListener('beforeunload', cleanup);
    }

    // Start monitoring
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

    window.addEventListener('beforeunload', cleanup);
})();
