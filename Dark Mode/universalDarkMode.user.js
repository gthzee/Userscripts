// ==UserScript==
// @name          Universal Dark Mode 🌒
// @namespace     https://github.com/gthzee/
// @version       3.7
// @description   Universal dark mode with WordPress editor enhancement, toggle options, and TwitterViewer.net support
// @author        gthzee
// @match         *://*/*
// @grant         GM_registerMenuCommand
// @run-at        document-start
// @license       MIT
// ==/UserScript==

(function() {
    'use strict';

    // ===== CONFIGURATION =====
    const STORAGE_KEY = "dm_" + location.hostname;
    const WORDPRESS_STORAGE_KEY = "wp_dm_style";
    const STYLE_ID = "dm_style";
    const WORDPRESS_STYLE_ID = "wp_dm_style";
    const BACKGROUND_STYLES = [
        { bg: '#121212', text: '#e0e0e0' },
        { bg: '#2d2d2d', text: '#e0e0e0' },
        { bg: '#1e1f2f', text: '#e0e0e0' }
    ];
    const LINK_MIN_BRIGHTNESS = 130;
    const LINK_MAX_BRIGHTNESS = 200;
    const CHUNK_SIZE = 100; // Process elements in chunks

    // ===== STATE MANAGEMENT =====
    let isUniversalDarkMode = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'true');
    let isWordPressDarkMode = false;
    let universalStyleElement = null;
    let wordpressStyleElement = null;
    let observers = [];
    let dynamicContentObserver = null;
    let wordpressObserver = null;
    let wordpressIntervalId = null;
    let refreshTimeout = null;

    // ===== RACE CONDITION PREVENTION =====
    let colorizeFrameId = null;
    let fixWhiteFrameId = null;
    let isColorizing = false;
    let isFixingWhite = false;
    const pendingColorize = new Set();
    const pendingFixWhite = new Set();

    // ===== SITE DETECTION =====
    const isTorrentFreak = /torrentfreak\.com$/i.test(location.hostname);
    const isOldReddit = /old\.reddit\.com$/i.test(location.hostname) && /^\/r\//i.test(location.pathname);
    const isWordPress = /wp-admin\/post-new\.php$|wp-admin\/post\.php$/.test(location.pathname);
    // --- NEW: TwitterViewer.net Detection ---
    const isTwitterViewer = /twitterviewer\.net$/i.test(location.hostname);

    // Initialize WordPress dark mode state if on WordPress page
    if (isWordPress) {
        isWordPressDarkMode = JSON.parse(localStorage.getItem(WORDPRESS_STORAGE_KEY) ?? 'false');
    }

    // ===== COLOR UTILITIES =====
    const getDerivedColor = (hex, adjustment) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const adjust = (color) => Math.max(0, Math.min(255, Math.round(color + (255 - color) * adjustment)));
        return "#" + adjust(r).toString(16).padStart(2, '0') +
               adjust(g).toString(16).padStart(2, '0') +
               adjust(b).toString(16).padStart(2, '0');
    };

    // Set base colors based on site
    const selected = BACKGROUND_STYLES[Math.floor(Math.random() * BACKGROUND_STYLES.length)];
    const selectedBg = selected.bg;
    const selectedText = selected.text;
    const colors = {
        article: getDerivedColor(selectedBg, 0.1),
        content: getDerivedColor(selectedBg, 0.15),
        code: getDerivedColor(selectedBg, 0.05),
        border: getDerivedColor(selectedBg, 0.2),
        input: getDerivedColor(selectedBg, 0.08)
    };

    // ===== LINK COLOR UTILITIES =====
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
            const r = Math.floor(Math.random() * 256);
            const g = Math.floor(Math.random() * 256);
            const b = Math.floor(Math.random() * 256);
            hexColor = r.toString(16).padStart(2, '0') +
                       g.toString(16).padStart(2, '0') +
                       b.toString(16).padStart(2, '0');
            brightness = calculateColorBrightness(hexColor);
        } while (brightness < LINK_MIN_BRIGHTNESS || brightness > LINK_MAX_BRIGHTNESS);
        return `#${hexColor}`;
    };

    // ===== WORDPRESS DARK MODE CSS =====
    const wordpressDarkStyles = `
        :root {
            --bg-dark: #1a1a1a;
            --bg-medium: #2d2d2d;
            --bg-light: #3a3a3a;
            --text-primary: #e0e0e0;
            --text-secondary: #b0b0b0;
            --accent: #5b9dd9;
            --border: #444;
        }
        html,body {
            background: var(--bg-dark) !important;
            color: var(--text-primary) !important;
        }
        #wpcontent,#wpbody,#wpbody-content,.wrap {
            background: var(--bg-dark) !important;
            color: var(--text-primary) !important;
        }
        .postbox,.inside {
            background: var(--bg-medium) !important;
        }
        .wp-editor-container,#wp-content-wrap,.mce-container,.mce-panel,.mce-edit-area,.wp-editor-area {
          background: var(--bg-medium) !important;
          color: var(--text-primary) !important;
        }
        #content,.mce-content-body {
            background: var(--bg-light) !important;
            color: var(--text-primary) !important;
        }
        .button,.button-primary,.button-secondary,#publish {
          background: var(--bg-light) !important;
          color: var(--text-primary) !important;
          border-color: var(--border) !important;
        }
        .button-primary,#publish {
            background: var(--accent) !important;
            color: #fff !important;
        }
        input,textarea,select {
            background: var(--bg-light) !important;
            color: var(--text-primary) !important;
            border-color: var(--border) !important;
        }
        a {
            color: var(--accent) !important;
        }
        img,video,iframe {
            filter: invert(0.9) hue-rotate(180deg);
            background: transparent !important;
        }
        .editor-styles-wrapper,.block-editor-block-list__layout,.components-panel,.components-button {
          background: var(--bg-medium) !important;
          color: var(--text-primary) !important;
        }
        .block-editor-block-list__block {
            background: var(--bg-light) !important;
        }
        [style*="background: white"],[style*="background-color: white"],[style*="background: #fff"],
        [style*="background-color: #fff"],[style*="background: rgb(255, 255, 255)"] {
          background: var(--bg-dark) !important;
        }
        [style*="color: black"],[style*="color: #000"],[style*="color: rgb(0, 0, 0)"] {
          color: var(--text-primary) !important;
        }
        #adminmenu,#adminmenuwrap,#wpadminbar {
          background: var(--bg-medium) !important;
          color: var(--text-primary) !important;
        }
    `;

    // =======================================================================
    // == UPDATED: TWITTERVIEWER.NET DARK MODE CSS (Now using universal colors) ==
    // =======================================================================
    const generateTwitterViewerCSS = () => {
        if (!isTwitterViewer) return '';

        // Use universal colors instead of specific TwitterViewer colors
        const tvBg = selectedBg;
        const tvCard = colors.article;
        const tvHover = colors.content;
        const tvText = selectedText;
        const tvSecondary = getDerivedColor(selectedText, -0.3); // A bit darker than text
        const tvLink = generateReadableRandomColor(); // Use the same link color generation as universal mode
        const tvBorder = colors.border;

        return `
            html, body {
                background: ${tvBg} !important;
                color: ${tvText} !important;
            }

            /* --- Layout & Containers --- */
            .container, main, .tweet-card, .user-info-card, section, article, .content, .wrapper, .container-fluid {
                background-color: ${tvCard} !important;
                border: 1px solid ${tvBorder} !important;
                border-radius: 8px;
            }

            /* --- Typography --- */
            h1, h2, h3, h4, h5, h6, p, span, div {
                color: ${tvText} !important;
            }

            a {
                color: ${tvLink} !important;
            }

            /* --- Tweet Specific Elements --- */
            .tweet-author-name {
                color: ${tvText} !important;
                font-weight: bold;
            }

            .tweet-author-handle, .tweet-time, .tweet-stats span {
                color: ${tvSecondary} !important;
            }

            .tweet-text {
                color: ${tvText} !important;
                line-height: 1.5;
            }

            .tweet-card:hover, .user-info-card:hover {
                background-color: ${tvHover} !important;
                transition: background-color 0.2s ease-in-out;
            }

            /* --- Header & Navigation --- */
            header {
                background-color: ${tvCard} !important;
                border-bottom: 1px solid ${tvBorder} !important;
            }

            header a, header h1 {
                color: ${tvText} !important;
            }

            /* --- Forms & Inputs --- */
            input[type="text"], input[type="search"], textarea {
                background-color: ${tvHover} !important;
                color: ${tvText} !important;
                border: 1px solid ${tvBorder} !important;
            }

            input::placeholder {
                color: ${tvSecondary} !important;
            }

            /* --- Buttons --- */
            button, .btn {
                background-color: ${tvHover} !important;
                color: ${tvText} !important;
                border: 1px solid ${tvBorder} !important;
            }

            button:hover, .btn:hover {
                background-color: ${getDerivedColor(selectedBg, 0.25)} !important;
                cursor: pointer;
            }

            /* --- Footer --- */
            footer {
                background-color: ${tvCard} !important;
                border-top: 1px solid ${tvBorder} !important;
                color: ${tvSecondary} !important;
            }

            footer a {
                color: ${tvSecondary} !important;
            }

            /* --- Scrollbar --- */
            ::-webkit-scrollbar { width: 8px; }
            ::-webkit-scrollbar-track { background: ${tvBg}; }
            ::-webkit-scrollbar-thumb { background: ${tvBorder}; border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: ${getDerivedColor(selectedBg, 0.3)}; }

            /* --- Specific Fixes for Utility Classes --- */
            .bg-white, [class*="bg-white"] {
                background-color: ${tvCard} !important;
            }

            .bg-gradient-to-r {
                background-image: none !important;
                background-color: ${tvCard} !important;
            }

            .text-white {
                color: ${tvText} !important;
            }

            #faq {
                background-color: ${tvCard} !important;
                color: ${tvText} !important;
            }
        `;
    };


    // ===== CSS GENERATION =====
    const generateBaseCSS = () => {
        return `
            html, body {
                background: ${selectedBg} !important;
                color: ${selectedText} !important;
            }
        `;
    };

    const generateUniversalCSS = () => {
        return `
            ${generateBaseCSS()}
            * {
                background-color: transparent !important;
                border-color: ${colors.border} !important;
                color: inherit !important;
            }
            input, textarea, select {
                background-color: ${colors.input} !important;
                border-color: ${colors.border} !important;
                color: ${selectedText} !important;
            }
            img, video, iframe {
                filter: brightness(0.9) contrast(1.1) !important;
            }
            ::selection, :-moz-selection, ::-moz-selection {
                background: ${getDerivedColor(selectedBg, 0.3)} !important;
                color: #fff !important;
            }
            ::placeholder, :-ms-input-placeholder, ::-ms-input-placeholder {
                color: #aaa !important;
                opacity: 1 !important;
            }
            svg:not([fill]) { fill: ${selectedText} !important; }
            svg:not([stroke]) { stroke: ${selectedText} !important; }
        `;
    };

    const generateTorrentFreakCSS = () => {
        if (!isTorrentFreak) return '';

        return `
            ${generateBaseCSS()}
            :root {
                --tf-bg: ${selectedBg};
                --tf-article-bg: ${colors.article};
                --tf-text: ${selectedText};
                --tf-border: ${colors.border};
                --tf-code-bg: ${colors.code};
                --tf-input-bg: ${colors.input};
            }

            *:not(svg):not(path):not(canvas):not(img):not(video):not(iframe):not(embed) {
                background-color: inherit !important;
                color: inherit !important;
            }

            *, *::before, *::after {
                background-color: var(--tf-bg) !important;
                color: var(--tf-text) !important;
                border-color: var(--tf-border) !important;
            }

            img, iframe, embed, video, canvas, svg, path {
                background-color: transparent !important;
                color: inherit !important;
                filter: brightness(0.9) contrast(1.1) !important;
            }

            #page, .site, .site-content, .site-main, .wrapper, .wrap, .container, .main, .content-area,
            .outer-wrap, .page-wrapper, .page-inner, .post, .post-content, .entry-content, .single-post,
            .td-container, .td-ss-main-content, .td-main-content, .td-post-content, .td-pb-row, .td-pb-span12,
            .vc_row, .vc_column, .vc_column-inner, .wp-block-group, .wp-block-column, .wp-block-container {
                background-color: var(--tf-article-bg) !important;
                color: var(--tf-text) !important;
            }

            h1, h2, h3, h4, h5, h6, p, span, strong, em, small, label, li, dd, dt {
                color: var(--tf-text) !important;
                background-color: transparent !important;
            }

            a, a * {
                background-color: transparent !important;
            }

            pre, code, blockquote {
                background-color: var(--tf-code-bg) !important;
                border-left: 3px solid var(--tf-border) !important;
                color: #ccc !important;
            }

            input, textarea, button, select {
                background-color: var(--tf-input-bg) !important;
                color: #eee !important;
                border: 1px solid var(--tf-border) !important;
            }

            table, th, td {
                background-color: var(--tf-article-bg) !important;
                color: var(--tf-text) !important;
                border-color: var(--tf-border) !important;
            }

            [style*="background-color: white"], [style*="background-color: #fff"],
            [style*="background-color: #ffffff"], [style*="background: white"],
            [style*="background: #fff"], [style*="background: #ffffff"] {
                background-color: var(--tf-bg) !important;
            }

            [style*="color: black"], [style*="color: #000"], [style*="color: #000000"] {
                color: var(--tf-text) !important;
            }

            .bg-white, .white, .light, .bright, [class*="bg-light"], [class*="bg-white"] {
                background-color: var(--tf-bg) !important;
                color: var(--tf-text) !important;
            }
        `;
    };

    const generateOldRedditCSS = () => {
        if (!isOldReddit) return '';

        return `
            ${generateBaseCSS()}
            body, .content, .side, .link, .comment, .entry, .usertext, .md, .titlebox, .linklisting, .thing,
            .child, .midcol, .tagline, .tabmenu, .tabmenu li, .tabmenu li a, .sitetable, .nestedlisting,
            .commentarea, .footer, .footer-parent, .debuginfo, .roundfield, .formtabs-content, .morelink,
            .infobar, .menuarea, .searchpane, .searchfacets, .raisedbox, .modactionlisting, .modactiontable,
            .nextprev, .nav-buttons, .flat-list, .buttons {
                background-color: ${selectedBg} !important;
                color: ${selectedText} !important;
                border-color: ${colors.border} !important;
            }

            .usertext-body, .usertext-edit, .md {
                background-color: ${colors.content} !important;
            }

            input, textarea, select, button {
                background-color: ${colors.input} !important;
                border: ${colors.border} !important;
            }

            .commentarea .thing {
                background-color: ${colors.article} !important;
            }

            .md pre, .md code {
                background-color: ${colors.code} !important;
            }

            .infobar {
                background-color: ${colors.content} !important;
                color: ${selectedText} !important;
                border: ${colors.border} !important;
            }

            .header {
                background-color: ${colors.article} !important;
                border-bottom: ${colors.border} !important;
            }

            .tabmenu li a {
                background-color: transparent !important;
                color: ${selectedText} !important;
            }

            .tabmenu li.selected a {
                background-color: ${selectedBg} !important;
            }

            .expand {
                background-color: transparent !important;
            }

            .collapsed, .score-hidden {
                background-color: ${selectedBg} !important;
            }

            /* Nested comments */
            .comment, .comment .child, .comment .child .comment, .comment .child .comment .child,
            .comment .child .comment .child .comment, .comment .child .comment .child .comment .child,
            .comment .child .comment .child .comment .child .comment,
            .comment .child .comment .child .comment .child .comment .child,
            .comment .child .comment .child .comment .child .comment .child .comment,
            .comment .child .comment .child .comment .child .comment .child .comment .child,
            .comment .child .comment .child .comment .child .comment .child .comment .child .comment {
                background-color: ${selectedBg} !important;
            }

            /* Stickied comments */
            .stickied.comment, .stickied .comment, .stickied .comment .child, .stickied .comment .child .comment,
            .stickied .comment .child .comment .child, .stickied .comment .child .comment .child .comment,
            .stickied .comment .child .comment .child .comment .child, .stickied .comment .child .comment .child .comment .child .comment,
            .stickied .comment .child .comment .child .comment .child .comment .child,
            .stickied .comment .child .comment .child .comment .child .comment .child .comment,
            .stickied .comment .child .comment .child .comment .child .comment .child .comment .child,
            .stickied .comment .child .comment .child .comment .child .comment .child .comment .child .comment {
                background-color: ${colors.article} !important;
            }

            /* Comment content */
            .comment .entry, .comment .usertext, .comment .usertext-body, .comment .md,
            .comment .child .comment .entry, .comment .child .comment .usertext,
            .comment .child .comment .usertext-body, .comment .child .comment .md,
            .comment .child .comment .child .comment .entry, .comment .child .comment .child .comment .usertext,
            .comment .child .comment .child .comment .usertext-body, .comment .child .comment .child .comment .md {
                background-color: ${colors.content} !important;
            }

            /* Stickied comment content */
            .stickied .entry, .stickied .usertext, .stickied .usertext-body, .stickied .md,
            .stickied .comment .entry, .stickied .comment .usertext, .stickied .comment .usertext-body,
            .stickied .comment .md, .stickied .comment .child .comment .entry,
            .stickied .comment .child .comment .usertext, .stickied .comment .child .comment .usertext-body,
            .stickied .comment .child .comment .md {
                background-color: ${colors.content} !important;
            }

            /* Comment borders */
            .comment .child, .comment .child .comment .child, .comment .child .comment .child .comment .child,
            .comment .child .comment .child .comment .child .comment .child, .stickied .child,
            .stickied .comment .child, .stickied .comment .child .comment .child,
            .stickied .comment .child .comment .child .comment .child {
                border-left: ${colors.border} !important;
            }

            /* Voting areas */
            .comment .midcol, .comment .child .comment .midcol, .comment .child .comment .child .comment .midcol,
            .stickied .midcol, .stickied .comment .midcol, .stickied .comment .child .comment .midcol {
                background-color: ${selectedBg} !important;
                color: ${selectedText} !important;
            }

            /* AutoModerator styling */
            .thing.stickied, .thing.stickied .entry, .thing.stickied .usertext, .thing.stickied .usertext-body,
            .thing.stickied .md, .thing.stickied .child, .thing.stickied .child .comment,
            .thing.stickied .child .comment .entry, .thing.stickied .child .comment .usertext,
            .thing.stickied .child .comment .usertext-body, .thing.stickied .child .comment .md,
            .thing.stickied .child .comment .child, .thing.stickied .child .comment .child .comment,
            .thing.stickied .child .comment .child .comment .entry, .thing.stickied .child .comment .child .comment .usertext,
            .thing.stickied .child .comment .child .comment .usertext-body, .thing.stickied .child .comment .child .comment .md {
                background-color: ${colors.article} !important;
                color: ${selectedText} !important;
            }

            /* IMPORTANT: Reddit comment ID selectors */
            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing {
                background-color: ${colors.article} !important;
            }

            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing *,
            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing * * {
                background-color: inherit !important;
                color: ${selectedText} !important;
                border-color: ${colors.border} !important;
            }

            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing .entry,
            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing .usertext-body,
            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing .usertext-edit,
            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing .md {
                background-color: ${colors.content} !important;
            }

            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing .child {
                border-left: ${colors.border} !important;
                background-color: transparent !important;
            }

            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing .midcol {
                background-color: ${selectedBg} !important;
                color: ${selectedText} !important;
            }

            .comment.noncollapsed[class*="id-t1_"].thing {
                background-color: ${selectedBg} !important;
            }

            .comment.noncollapsed[class*="id-t1_"].thing *,
            .comment.noncollapsed[class*="id-t1_"].thing * * {
                background-color: inherit !important;
                color: ${selectedText} !important;
                border-color: ${colors.border} !important;
            }

            .comment.noncollapsed[class*="id-t1_"].thing .entry,
            .comment.noncollapsed[class*="id-t1_"].thing .usertext-body,
            .comment.noncollapsed[class*="id-t1_"].thing .usertext-edit,
            .comment.noncollapsed[class*="id-t1_"].thing .md {
                background-color: ${colors.content} !important;
            }

            .comment.noncollapsed[class*="id-t1_"].thing .child {
                border-left: ${colors.border} !important;
                background-color: transparent !important;
            }

            .comment.noncollapsed[class*="id-t1_"].thing .midcol {
                background-color: ${selectedBg} !important;
                color: ${selectedText} !important;
            }

            /* User attributes */
            .userattrs {
                background-color: transparent !important;
            }

            .userattrs a, .submitter, .moderator, .admin, .friend, .flair {
                background-color: ${colors.content} !important;
                color: ${selectedText} !important;
                border: ${colors.border} !important;
            }

            .tagline {
                background-color: transparent !important;
            }

            /* THIS WAS THE MISSING LINE */
            .new-comment .usertext-body {
                background-color: ${colors.content} !important;
            }

            img, video, iframe {
                filter: brightness(0.9) contrast(1.1) !important;
            }
        `;
    };

    const generateUniversalModeCSS = () => {
        if (isTorrentFreak) {
            return generateTorrentFreakCSS();
        } else if (isOldReddit) {
            return generateOldRedditCSS();
        } else if (isTwitterViewer) { // --- NEW: Check for TwitterViewer ---
            return generateTwitterViewerCSS(); // --- NEW: Use its specific CSS ---
        } else {
            return generateUniversalCSS();
        }
    };

    // ===== WORDPRESS DARK MODE FUNCTIONS =====
    const batchStyleChanges = (elements, styleUpdater) => {
        let index = 0;

        function processChunk() {
            const end = Math.min(index + CHUNK_SIZE, elements.length);
            for (; index < end; index++) {
                styleUpdater(elements[index]);
            }

            if (index < elements.length) {
                requestAnimationFrame(processChunk);
            }
        }

        requestAnimationFrame(processChunk);
    };

    const forceDarkMode = () => {
        const allElements = document.querySelectorAll('#wpcontent *');
        batchStyleChanges(allElements, (el) => {
            const cs = window.getComputedStyle(el);
            if (cs.backgroundColor === 'rgb(255, 255, 255)' || cs.backgroundColor === 'white')
                el.style.setProperty('background-color', 'var(--bg-dark)', 'important');
            if (cs.color === 'rgb(0, 0, 0)' || cs.color === 'black')
                el.style.setProperty('color', 'var(--text-primary)', 'important');
            if (cs.borderColor === 'rgb(255, 255, 255)' || cs.borderColor === 'white')
                el.style.setProperty('border-color', 'var(--border)', 'important');
        });
    };

    const applyWordPressDarkMode = () => {
        if (wordpressStyleElement) return;

        wordpressStyleElement = document.createElement('style');
        wordpressStyleElement.id = WORDPRESS_STYLE_ID;
        wordpressStyleElement.textContent = wordpressDarkStyles;
        (document.head || document.documentElement).appendChild(wordpressStyleElement);

        forceDarkMode();
        window.addEventListener('load', forceDarkMode);
        wordpressIntervalId = setInterval(forceDarkMode, 2000);

        wordpressObserver = new MutationObserver(forceDarkMode);
        wordpressObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    };

    const removeWordPressDarkMode = () => {
        if (wordpressStyleElement) {
            wordpressStyleElement.remove();
            wordpressStyleElement = null;
        }

        if (wordpressObserver) {
            wordpressObserver.disconnect();
            wordpressObserver = null;
        }

        if (wordpressIntervalId) {
            clearInterval(wordpressIntervalId);
            wordpressIntervalId = null;
        }

        window.removeEventListener('load', forceDarkMode);

        // Reset body style
        document.body.style.background = "white";
        document.body.style.color = "black";
    };

    // ===== DOM MANIPULATION FUNCTIONS =====
    const fixWhiteElements = () => {
        if (!isUniversalDarkMode || !isTorrentFreak) return;

        const allElements = document.querySelectorAll('*');
        batchStyleChanges(allElements, (el) => {
            // Skip media elements
            if (['IMG', 'IFRAME', 'EMBED', 'VIDEO', 'CANVAS', 'SVG', 'PATH'].includes(el.tagName)) {
                return;
            }

            const computedStyle = window.getComputedStyle(el);
            const bgColor = computedStyle.backgroundColor;
            const textColor = computedStyle.color;

            // Fix white or transparent backgrounds
            if (bgColor === 'rgba(0, 0, 0, 0)' ||
                bgColor === 'rgb(255, 255, 255)' ||
                bgColor === 'white' ||
                bgColor === '#ffffff' ||
                bgColor === '#fff') {
                el.style.setProperty('background-color', 'var(--tf-bg)', 'important');
            }

            // Fix black text
            if (textColor === 'rgb(0, 0, 0)' ||
                textColor === 'black' ||
                textColor === '#000000' ||
                textColor === '#000') {
                el.style.setProperty('color', 'var(--tf-text)', 'important');
            }

            // Special handling for elements that might be containers
            if (el.classList.contains('container') ||
                el.classList.contains('wrapper') ||
                el.classList.contains('content') ||
                el.classList.contains('main') ||
                el.classList.contains('section')) {
                el.style.setProperty('background-color', 'var(--tf-article-bg)', 'important');
            }
        });
    };

    // ===== RACE CONDITION FREE LINK COLORING =====
    const scheduleColorizeLinks = () => {
        if (isColorizing) return;

        if (colorizeFrameId) {
            cancelAnimationFrame(colorizeFrameId);
        }

        colorizeFrameId = requestAnimationFrame(() => {
            isColorizing = true;
            try {
                colorizeLinks();
            } finally {
                isColorizing = false;
                colorizeFrameId = null;
            }
        });
    };

    const scheduleFixWhiteElements = () => {
        if (!isTorrentFreak || isFixingWhite) return;

        if (fixWhiteFrameId) {
            cancelAnimationFrame(fixWhiteFrameId);
        }

        fixWhiteFrameId = requestAnimationFrame(() => {
            isFixingWhite = true;
            try {
                fixWhiteElements();
            } finally {
                isFixingWhite = false;
                fixWhiteFrameId = null;
            }
        });
    };

    const colorizeLinks = () => {
        if (!isUniversalDarkMode) return;

        const links = document.querySelectorAll('a[href]:not([data-dm-colored])');
        batchStyleChanges(links, (a) => {
            // Skip links that should not be colorized
            if (a.closest('[data-no-dark-mode]') || a.classList.contains('no-dark-mode')) {
                return;
            }

            const color = generateReadableRandomColor();
            a.style.setProperty('color', color, 'important');
            a.setAttribute('data-dm-colored', 'true');
        });
    };

    const resetLinks = () => {
        document.querySelectorAll('a[href][data-dm-colored]').forEach(a => {
            a.style.removeProperty('color');
            a.removeAttribute('data-dm-colored');
        });
    };

    // ===== OBSERVER MANAGEMENT =====
    const addObserver = (target, config, callback) => {
        const observer = new MutationObserver(callback);
        observer.observe(target, config);
        observers.push(observer);
        return observer;
    };

    const disconnectObservers = () => {
        observers.forEach(o => o.disconnect());
        observers = [];

        if (dynamicContentObserver) {
            dynamicContentObserver.disconnect();
            dynamicContentObserver = null;
        }

        if (colorizeFrameId) {
            cancelAnimationFrame(colorizeFrameId);
            colorizeFrameId = null;
        }

        if (fixWhiteFrameId) {
            cancelAnimationFrame(fixWhiteFrameId);
            fixWhiteFrameId = null;
        }
    };

    // ===== CORE FUNCTIONS =====
    const applyUniversalStyle = () => {
        // Don't apply universal style on WordPress pages
        if (isWordPress) return;

        if (!universalStyleElement && isUniversalDarkMode) {
            universalStyleElement = document.createElement('style');
            universalStyleElement.id = STYLE_ID;
            universalStyleElement.textContent = generateUniversalModeCSS();
            (document.head || document.documentElement).appendChild(universalStyleElement);

            // Set up a single observer for all dynamic content changes
            dynamicContentObserver = new MutationObserver(() => {
                scheduleColorizeLinks();
                scheduleFixWhiteElements();
            });

            // Observe the entire body for changes
            if (document.body) {
                dynamicContentObserver.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['style', 'class']
                });
            }
        }
    };

    const removeUniversalStyle = () => {
        if (universalStyleElement) {
            universalStyleElement.remove();
            universalStyleElement = null;
        }
        disconnectObservers();
        resetLinks();
    };

    const debouncedRefresh = () => {
        if (refreshTimeout) {
            cancelAnimationFrame(refreshTimeout);
        }
        refreshTimeout = requestAnimationFrame(refresh);
    };

    const refresh = () => {
        // Handle WordPress dark mode first if on WordPress page
        if (isWordPress) {
            if (isWordPressDarkMode) {
                applyWordPressDarkMode();
            } else {
                removeWordPressDarkMode();
            }
        } else {
            // Not on WordPress page, apply universal mode normally
            if (isUniversalDarkMode) {
                applyUniversalStyle();
            } else {
                removeUniversalStyle();
            }
        }

        // Schedule coloring operations
        scheduleColorizeLinks();
        scheduleFixWhiteElements();
    };

    const toggleUniversalDarkMode = (reload = true) => {
        isUniversalDarkMode = !isUniversalDarkMode;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(isUniversalDarkMode));
        reload ? location.reload() : debouncedRefresh();
    };

    const toggleWordPressDarkMode = () => {
        isWordPressDarkMode = !isWordPressDarkMode;
        localStorage.setItem(WORDPRESS_STORAGE_KEY, JSON.stringify(isWordPressDarkMode));
        debouncedRefresh();
    };

    // ===== EVENT HANDLERS =====
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            debouncedRefresh();
        }
    };

    const cleanupEventListeners = () => {
        disconnectObservers();
        window.removeEventListener('pageshow', debouncedRefresh);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('unload', cleanupEventListeners);
    };

    // ===== INITIALIZATION =====
    const init = () => {
        refresh();

        // Register menu commands based on current page
        if (isWordPress) {
            GM_registerMenuCommand("WordPress Dark Mode", toggleWordPressDarkMode);
        } else {
            GM_registerMenuCommand("Universal Dark Mode", () => toggleUniversalDarkMode(false));
        }

        document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
        window.addEventListener('pageshow', debouncedRefresh, { passive: true });
        window.addEventListener('unload', cleanupEventListeners, { passive: true });
    };

    // Start when DOM is ready
    if (document.head && document.body) {
        init();
    } else {
        addObserver(document.documentElement, {
            childList: true,
            subtree: true
        }, () => {
            if (document.head && document.body) {
                disconnectObservers();
                init();
            }
        });
    }
})();
