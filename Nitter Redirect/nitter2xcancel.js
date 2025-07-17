// ==UserScript==
// @name         Nitter.net Auto-Redirect
// @version      1.3
// @description  Redirect to xcancel.com when Nitter shows rate limit error
// @author       gthzee
// @match        *://nitter.net/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Pesan error yang dicari (dalam berbagai variasi)
    const errorMessages = [
        "Instance has no auth tokens, or is fully rate limited",
        "rate limited",
        "no auth tokens",
        "try again later"
    ];

    // Fungsi untuk memeriksa error
    function checkForError() {
        const pageText = document.body.innerText.toLowerCase();

        // Cek semua variasi pesan error
        const hasError = errorMessages.some(msg =>
            pageText.includes(msg.toLowerCase())
        );

        if (hasError) {
            const newUrl = `https://xcancel.com${window.location.pathname}${window.location.search}${window.location.hash}`;

            // Gunakan replace untuk menghindari history
            console.log('Redirecting to:', newUrl);
            window.location.replace(newUrl);
        }
    }

    // Jalankan segera setelah DOM siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkForError);
    } else {
        checkForError();
    }

    // Jalankan lagi dengan delay untuk tangkap konten async
    setTimeout(checkForError, 2000);
})();
