// ==UserScript==
// @name         Nitter.net Auto-Redirect
// @version      1.4
// @description  Redirect to xcancel.com when Nitter shows rate limit error
// @author       gthzee
// @match        *://nitter.net/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Variasi pesan error
    const errorPatterns = [
        "no auth tokens",
        "rate limited",
        "try again later",
        "instance overloaded"
    ];

    function shouldRedirect() {
        const bodyText = document.body?.innerText?.toLowerCase() || '';
        return errorPatterns.some(pattern => bodyText.includes(pattern));
    }

    function performRedirect() {
        const destination = `https://xcancel.com${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.replace(destination);
    }

    function init() {
        if (shouldRedirect()) {
            performRedirect();
        }
    }

    // Jalankan segera untuk konten yang sudah load
    init();

    // Tambahkan observer untuk handle konten dynamic
    const observer = new MutationObserver(() => {
        if (shouldRedirect()) {
            observer.disconnect();
            performRedirect();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

    // Fallback timeout
    setTimeout(() => {
        if (shouldRedirect()) {
            performRedirect();
        }
    }, 3000);
})();
