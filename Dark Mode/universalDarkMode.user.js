// ==UserScript==
// @name          Universal Dark Mode 🌒
// @namespace     https://github.com/gthzee/
// @version       4.5
// @description   Universal dark mode with WordPress editor enhancement, toggle options, TwitterViewer.net support, and UNTHROTTLED link coloring
// @author        gthzee
// @match         *://*/*
// @grant         GM_registerMenuCommand
// @run-at        document-start
// @license       MIT
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = "dm_" + location.hostname;
    const WORDPRESS_STORAGE_KEY = "wp_dm_style";

    const STYLE_ID = "dm_style";
    const WORDPRESS_STYLE_ID = "wp_dm_style";

    const BACKGROUND_STYLES = [
        {
            bg: '#121212',
            textColors: ['#FFFFFF', '#F5F5F5', '#E0E0E0', '#BDBDBD', '#40C4FF',
                         '#64FFDA', '#7C4DFF', '#FF6E40', '#69F0AE', '#FFD740',
                         '#B388FF', '#8C9EFF', '#82B1FF', '#84FFFF', '#E1BEE7']
        },
        {
            bg: '#2d2d2d',
            textColors: ['#E0F7FA', '#B3E5FC', '#C5CAE9', '#D1C4E9', '#F8BBD0',
                         '#FFF8E1', '#FBE9E7', '#EFEBE9', '#D7CCC8', '#B0BEC5',
                         '#E1F5FE', '#F3E5F5', '#E8F5E9', '#FFF9C4', '#FFCDD2']
        },
        {
            bg: '#1e1f2f',
            textColors: ['#A6E3E9', '#71C9CE', '#C3ACD0', '#FFB6B9', '#B4E7CE',
                         '#FFE5B4', '#FFDAB9', '#F0E68C', '#DDA0DD', '#F5DEB3',
                         '#00FFF0', '#FF10F0', '#39FF14', '#FFFF00', '#C77DFF']
        }
    ];

    const LINK_MIN_BRIGHTNESS = 130;
    const LINK_MAX_BRIGHTNESS = 220;

    let isUniversalDarkMode = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'true');
    let isWordPressDarkMode = false;

    let universalStyleElement = null;
    let wordpressStyleElement = null;

    let mainObserver = null;
    let wordpressObserver = null;
    let linkObserver = null;

    let observersActive = false;
    let observerDebounceTimer = null;

    const createElementCache = () => {
        const cache = {
            body: null,
            links: null,
            inputs: null,
            images: null,
            allElements: null,
            wpContentElements: null
        };

        const makeGetter = (key, queryFn) => () => cache[key] || (cache[key] = queryFn());

        return {
            getBody: makeGetter('body', () => document.body),
            getLinks: makeGetter('links', () => document.querySelectorAll('a[href]')),
            getInputs: makeGetter('inputs', () => document.querySelectorAll('input, textarea, select')),
            getImages: makeGetter('images', () => document.querySelectorAll('img, video, iframe')),
            getAllElements: makeGetter('allElements', () => document.querySelectorAll('*')),
            getWpContentElements: makeGetter('wpContentElements', () => document.querySelectorAll('#wpcontent *')),

            invalidate() {
                Object.keys(cache).forEach(k => cache[k] = null);
            },
            invalidateLinks() { cache.links = null; },
            invalidateAllElements() { cache.allElements = null; },
            invalidateWpContentElements() { cache.wpContentElements = null; }
        };
    };

    const elementCache = createElementCache();

    const isTorrentFreak = /torrentfreak\.com$/i.test(location.hostname);
    const isOldReddit = /old\.reddit\.com$/i.test(location.hostname) && /^\/r\//i.test(location.pathname);
    const isWordPress = /wp-admin\/post-new\.php$|wp-admin\/post\.php$/.test(location.pathname);
    const isTwitterViewer = /twitterviewer\.net$/i.test(location.hostname);

    if (isWordPress) {
        isWordPressDarkMode = JSON.parse(localStorage.getItem(WORDPRESS_STORAGE_KEY) ?? 'false');
    } else {
        const saved = localStorage.getItem(WORDPRESS_STORAGE_KEY);
        if (saved === 'true') {
            localStorage.setItem(WORDPRESS_STORAGE_KEY, 'false');
        }
        isWordPressDarkMode = false;
    }

    const getDerivedColor = (hex, adjustment) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const adjust = (color) => Math.max(0, Math.min(255, Math.round(color + (255 - color) * adjustment)));
        return "#" + adjust(r).toString(16).padStart(2, '0') +
               adjust(g).toString(16).padStart(2, '0') +
               adjust(b).toString(16).padStart(2, '0');
    };

    let selectedBg, selectedText;
    if (isWordPress) {
        selectedBg = '#1a1a1a';
        selectedText = '#e0e0e0';
    } else {
        const chosenStyle = BACKGROUND_STYLES[Math.floor(Math.random() * BACKGROUND_STYLES.length)];
        selectedBg = chosenStyle.bg;
        const textOptions = chosenStyle.textColors;
        selectedText = textOptions[Math.floor(Math.random() * textOptions.length)];
    }

    const colors = {
        article: getDerivedColor(selectedBg, 0.1),
        content: getDerivedColor(selectedBg, 0.15),
        code: getDerivedColor(selectedBg, 0.05),
        input: getDerivedColor(selectedBg, 0.08)
    };

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

    const generateBaseCSS = () => {
        return `
            html, body {
                background: ${selectedBg} !important;
                color: ${selectedText} !important;
            }

            ::selection {
                background: inherit !important;
            }
        `;
    };

    const generateWordPressCSS = () => {
        if (!isWordPress) return '';

        const wpBg = selectedBg;
        const wpBgMedium = colors.article;
        const wpBgLight = colors.content;
        const wpText = selectedText;
        const wpTextSecondary = getDerivedColor(selectedText, -0.3);
        const wpAccent = '#5b9dd9';

        return `
            :root {
                --bg-dark: ${wpBg};
                --bg-medium: ${wpBgMedium};
                --bg-light: ${wpBgLight};
                --text-primary: ${wpText};
                --text-secondary: ${wpTextSecondary};
                --accent: ${wpAccent};
            }
            html, body {
                background: var(--bg-dark) !important;
                color: var(--text-primary) !important;
            }
            #wpcontent, #wpbody, #wpbody-content, .wrap {
                background: var(--bg-dark) !important;
                color: var(--text-primary) !important;
            }
            .postbox, .inside {
                background: var(--bg-medium) !important;
            }
            .wp-editor-container, #wp-content-wrap, .mce-container, .mce-panel, .mce-edit-area, .wp-editor-area {
                background: var(--bg-medium) !important;
                color: var(--text-primary) !important;
            }
            #content, .mce-content-body {
                background: var(--bg-light) !important;
                color: var(--text-primary) !important;
            }
            .button, .button-primary, .button-secondary, #publish {
                background: var(--bg-light) !important;
                color: var(--text-primary) !important;
            }
            .button-primary, #publish {
                background: var(--accent) !important;
                color: #fff !important;
            }
            input, textarea, select {
                background: var(--bg-light) !important;
                color: var(--text-primary) !important;
            }
            a {
                color: var(--accent) !important;
            }
            img, video, iframe {
                filter: invert(0.9) hue-rotate(180deg);
                background: transparent !important;
            }
            .editor-styles-wrapper, .block-editor-block-list__layout, .components-panel, .components-button {
                background: var(--bg-medium) !important;
                color: var(--text-primary) !important;
            }
            .block-editor-block-list__block {
                background: var(--bg-light) !important;
            }
            [style*="background: white"],
            [style*="background-color: white"],
            [style*="background: #fff"],
            [style*="background-color: #fff"],
            [style*="background: rgb(255, 255, 255)"] {
                background: var(--bg-dark) !important;
            }
            [style*="color: black"],
            [style*="color: #000"],
            [style*="color: rgb(0, 0, 0)"] {
                color: var(--text-primary) !important;
            }
            #adminmenu, #adminmenuwrap, #wpadminbar {
                background: var(--bg-medium) !important;
                color: var(--text-primary) !important;
            }

        `;
    };

    const generateTwitterViewerCSS = () => {
        if (!isTwitterViewer) return '';

        const tvBg = selectedBg;
        const tvCard = colors.article;
        const tvText = selectedText;
        const tvSecondary = getDerivedColor(selectedText, -0.3);
        const tvLink = generateReadableRandomColor();

        return `
            ${generateBaseCSS()}

            .container, main, .tweet-card, .user-info-card, section, article, .content, .wrapper, .container-fluid {
                background-color: ${tvCard} !important;
                border-radius: 8px;
            }

            h1, h2, h3, h4, h5, h6, p, span, div {
                color: ${tvText} !important;
            }

            a {
                color: ${tvLink} !important;
            }

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

            header {
                background-color: ${tvCard} !important;
            }

            header a, header h1 {
                color: ${tvText} !important;
            }

            input[type="text"], input[type="search"], textarea {
                background-color: ${tvCard} !important;
                color: ${tvText} !important;
            }

            input::placeholder {
                color: ${tvSecondary} !important;
            }

            button, .btn {
                background-color: ${tvCard} !important;
                color: ${tvText} !important;
            }

            footer {
                background-color: ${tvCard} !important;
                color: ${tvSecondary} !important;
            }

            footer a {
                color: ${tvSecondary} !important;
            }

            ::-webkit-scrollbar { width: 8px; }
            ::-webkit-scrollbar-track { background: ${tvBg}; }
            ::-webkit-scrollbar-thumb { background: ${getDerivedColor(selectedBg, 0.3)}; border-radius: 4px; }

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

            ::selection {
                background: ${colors.content} !important;
                color: ${tvText} !important;
            }
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
                color: #ccc !important;
            }

            input, textarea, button, select {
                background-color: var(--tf-input-bg) !important;
                color: #eee !important;
            }

            table, th, td {
                background-color: var(--tf-article-bg) !important;
                color: var(--tf-text) !important;
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
            html, body, .content, .side, .link, .comment, .entry, .usertext, .md, .titlebox, .linklisting, .thing,
            .child, .midcol, .tagline, .tabmenu, .tabmenu li, .tabmenu li a, .sitetable, .nestedlisting,
            .commentarea, .footer, .footer-parent, .debuginfo, .roundfield, .formtabs-content, .morelink,
            .infobar, .menuarea, .searchpane, .searchfacets, .raisedbox, .modactionlisting, .modactiontable,
            .nextprev, .nav-buttons, .flat-list, .buttons {
                background-color: ${selectedBg} !important;
                color: ${selectedText} !important;
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
            }

            .header {
                background-color: ${colors.article} !important;
            }

            #header-bottom-left {
                background-color: ${colors.article} !important;
                color: ${selectedText} !important;
            }

            #sr-header-area {
                background-color: ${colors.article} !important;
                color: ${selectedText} !important;
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

            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing {
                background-color: ${colors.article} !important;
            }

            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing *,
            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing * * {
                background-color: inherit !important;
                color: ${selectedText} !important;
            }

            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing .entry,
            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing .usertext-body,
            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing .usertext-edit,
            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing .md {
                background-color: ${colors.content} !important;
            }

            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing .child {
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
            }

            .comment.noncollapsed[class*="id-t1_"].thing .entry,
            .comment.noncollapsed[class*="id-t1_"].thing .usertext-body,
            .comment.noncollapsed[class*="id-t1_"].thing .usertext-edit,
            .comment.noncollapsed[class*="id-t1_"].thing .md {
                background-color: ${colors.content} !important;
            }

            .comment.noncollapsed[class*="id-t1_"].thing .child {
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
            }

            .tagline {
                background-color: transparent !important;
            }

            .new-comment .usertext-body {
                background-color: ${colors.content} !important;
            }

            img, video, iframe {
                filter: brightness(0.9) contrast(1.1) !important;
            }
        `;
    };

    const generateUniversalCSS = () => {
        return `
            ${generateBaseCSS()}
            * {
                background-color: transparent !important;
                color: inherit !important;
            }

            header, nav, main, aside, footer,
            .header, .navigation, .nav, .menu, .topbar, .top-nav, .navbar, .toolbar, .sidebar,
            #header, #navigation, #nav, #menu, #topbar, #top-nav, #navbar, #toolbar, #sidebar,
            .container, .wrapper, .main-container, .content-wrapper, .page-wrapper,
            .navbar, .navbar-expand-lg, .navbar-expand-md, .navbar-expand-sm, .navbar-expand-xl,
            .mdc-top-app-bar, .mdc-drawer, .top-bar, .brand, .logo, .site-header, .site-nav,
            .primary-nav, .secondary-nav {
                background-color: inherit !important;
            }

            img, video, iframe {
                filter: brightness(0.9) contrast(1.1) !important;
            }

            svg:not([fill]) { fill: ${selectedText} !important; }
            svg:not([stroke]) { stroke: ${selectedText} !important;
            }

            ::selection {
                background: ${colors.content} !important;
                color: ${selectedText} !important;
            }
        `;
    };

    const generateUniversalModeCSS = () => {
        if (isWordPress) {
            return generateWordPressCSS();
        } else if (isTorrentFreak) {
            return generateTorrentFreakCSS();
        } else if (isOldReddit) {
            return generateOldRedditCSS();
        } else if (isTwitterViewer) {
            return generateTwitterViewerCSS();
        } else {
            return generateUniversalCSS();
        }
    };

    const FORCE_DM_ATTR = 'data-dm-wp-forced';

    const forceDarkMode = () => {
        if (!isWordPressDarkMode) return;

        const allElements = elementCache.getWpContentElements();
        for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i];
            const cs = window.getComputedStyle(el);

            if (
                (cs.backgroundColor === 'rgb(255, 255, 255)' || cs.backgroundColor === 'white') &&
                !el.hasAttribute(FORCE_DM_ATTR)
            ) {
                el.style.setProperty('background-color', 'var(--bg-dark)', 'important');
                el.setAttribute(FORCE_DM_ATTR, 'true');
            }

            if (
                (cs.color === 'rgb(0, 0, 0)' || cs.color === 'black') &&
                !el.hasAttribute(FORCE_DM_ATTR)
            ) {
                el.style.setProperty('color', 'var(--text-primary)', 'important');
                el.setAttribute(FORCE_DM_ATTR, 'true');
            }
        }
    };

    const cleanupForcedStyles = () => {
        const allElements = elementCache.getWpContentElements();
        for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i];
            if (el.hasAttribute(FORCE_DM_ATTR)) {
                el.style.removeProperty('background-color');
                el.style.removeProperty('color');
                el.removeAttribute(FORCE_DM_ATTR);
            }
        }
    };

    const applyWordPressDarkMode = () => {
        if (wordpressStyleElement) return;

        wordpressStyleElement = document.createElement('style');
        wordpressStyleElement.id = WORDPRESS_STYLE_ID;
        wordpressStyleElement.textContent = generateWordPressCSS();
        (document.head || document.documentElement).appendChild(wordpressStyleElement);

        forceDarkMode();

        wordpressObserver = new MutationObserver(() => {
            elementCache.invalidateWpContentElements();
            forceDarkMode();
        });

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

        cleanupForcedStyles();

        if (!isUniversalDarkMode) {
            document.body.style.background = "";
            document.body.style.color = "";
        }
    };

    const fixWhiteElements = () => {
        if (!isUniversalDarkMode || !isTorrentFreak) return;

        const allElements = elementCache.getAllElements();
        for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i];

            if (['IMG', 'IFRAME', 'EMBED', 'VIDEO', 'CANVAS', 'SVG', 'PATH'].includes(el.tagName)) {
                continue;
            }

            const computedStyle = window.getComputedStyle(el);
            const bgColor = computedStyle.backgroundColor;
            const textColor = computedStyle.color;

            if (bgColor === 'rgba(0, 0, 0, 0)' ||
                bgColor === 'rgb(255, 255, 255)' ||
                bgColor === 'white' ||
                bgColor === '#ffffff' ||
                bgColor === '#fff') {
                el.style.setProperty('background-color', 'var(--tf-bg)', 'important');
            }

            if (textColor === 'rgb(0, 0, 0)' ||
                textColor === 'black' ||
                textColor === '#000000' ||
                textColor === '#000') {
                el.style.setProperty('color', 'var(--tf-text)', 'important');
            }

            if (el.classList.contains('container') ||
                el.classList.contains('wrapper') ||
                el.classList.contains('content') ||
                el.classList.contains('main') ||
                el.classList.contains('section')) {
                el.style.setProperty('background-color', 'var(--tf-article-bg)', 'important');
            }
        }
    };

    const colorizeLinks = () => {
        if (!isUniversalDarkMode) return;

        const links = elementCache.getLinks();
        const uncoloredLinks = Array.from(links).filter(a => !a.hasAttribute('data-dm-colored'));

        for (let i = 0; i < uncoloredLinks.length; i++) {
            const a = uncoloredLinks[i];

            if (a.closest('[data-no-dark-mode]') || a.classList.contains('no-dark-mode')) {
                continue;
            }

            const color = generateReadableRandomColor();
            a.style.setProperty('color', color, 'important');
            a.setAttribute('data-dm-colored', 'true');
        }
    };

    const resetLinks = () => {
        const links = elementCache.getLinks();
        const coloredLinks = Array.from(links).filter(a => a.hasAttribute('data-dm-colored'));

        for (let i = 0; i < coloredLinks.length; i++) {
            const a = coloredLinks[i];
            a.style.removeProperty('color');
            a.removeAttribute('data-dm-colored');
        }
    };

    const processNewLinks = (mutations) => {
        if (!isUniversalDarkMode) return;

        const newLinks = [];

        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;

                if (node.matches && node.matches('a[href]')) {
                    newLinks.push(node);
                }

                if (node.querySelectorAll) {
                    const links = node.querySelectorAll('a[href]');
                    for (let i = 0; i < links.length; i++) {
                        newLinks.push(links[i]);
                    }
                }
            }
        }

        for (let i = 0; i < newLinks.length; i++) {
            const a = newLinks[i];
            if (
                !a.hasAttribute('data-dm-colored') &&
                !a.closest('[data-no-dark-mode]') &&
                !a.classList.contains('no-dark-mode')
            ) {
                const color = generateReadableRandomColor();
                a.style.setProperty('color', color, 'important');
                a.setAttribute('data-dm-colored', 'true');
            }
        }
    };

    const observerConfig = {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    };

    const debouncedMainObserverCallback = () => {
        clearTimeout(observerDebounceTimer);
        observerDebounceTimer = setTimeout(() => {
            elementCache.invalidateAllElements();
            fixWhiteElements();
        }, 120);
    };

    const activateObservers = () => {
        if (observersActive) return;

        const body = elementCache.getBody();
        if (!body) return;

        if (isWordPress && isWordPressDarkMode) {
            if (!wordpressObserver) {
                wordpressObserver = new MutationObserver(() => {
                    elementCache.invalidateWpContentElements();
                    forceDarkMode();
                });
            }
            wordpressObserver.observe(body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
        }

        if (!isWordPress && isUniversalDarkMode) {
            if (!mainObserver) {
                mainObserver = new MutationObserver(debouncedMainObserverCallback);
            }
            mainObserver.observe(body, observerConfig);

            if (!linkObserver) {
                linkObserver = new MutationObserver(processNewLinks);
            }
            linkObserver.observe(body, {
                childList: true,
                subtree: true
            });
        }

        observersActive = true;
    };

    const deactivateObservers = () => {
        if (!observersActive) return;

        if (mainObserver) mainObserver.disconnect();
        if (wordpressObserver) wordpressObserver.disconnect();
        if (linkObserver) linkObserver.disconnect();

        clearTimeout(observerDebounceTimer);
        observerDebounceTimer = null;
        observersActive = false;
    };

    const handlePageShow = () => {
        activateObservers();
    };

    const handlePageHide = () => {
        deactivateObservers();
    };

    const handleStorageChange = (e) => {
        if (e.key === STORAGE_KEY || e.key === WORDPRESS_STORAGE_KEY) {
            isUniversalDarkMode = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'true');
            isWordPressDarkMode = JSON.parse(localStorage.getItem(WORDPRESS_STORAGE_KEY) ?? 'false');
            refresh();
        }
    };

    const cleanupEventListeners = () => {
        deactivateObservers();
        window.removeEventListener('pageshow', handlePageShow);
        window.removeEventListener('pagehide', handlePageHide);
        window.removeEventListener('beforeunload', handlePageHide);
        window.removeEventListener('storage', handleStorageChange);
        document.removeEventListener('visibilitychange', handleVisibilityChangeFallback);
        linkObserver = null;
    };

    const handleVisibilityChangeFallback = () => {
        if (document.hidden) {
            handlePageHide();
        } else {
            handlePageShow();
        }
    };

    const refresh = () => {
        if (isWordPress) {
            if (isWordPressDarkMode) {
                applyWordPressDarkMode();
            } else {
                removeWordPressDarkMode();
            }
        } else {
            if (isUniversalDarkMode) {
                applyUniversalStyle();
                colorizeLinks();
            } else {
                removeUniversalStyle();
            }
        }

        fixWhiteElements();
    };

    const toggleUniversalDarkMode = (reload = true) => {
        isUniversalDarkMode = !isUniversalDarkMode;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(isUniversalDarkMode));
        elementCache.invalidate();
        if (reload) {
            location.reload();
        } else {
            refresh();
        }
    };

    const toggleWordPressDarkMode = () => {
        isWordPressDarkMode = !isWordPressDarkMode;
        localStorage.setItem(WORDPRESS_STORAGE_KEY, JSON.stringify(isWordPressDarkMode));
        elementCache.invalidateWpContentElements();
        refresh();
    };

    const applyUniversalStyle = () => {
        if (isWordPress) return;

        if (!universalStyleElement && isUniversalDarkMode) {
            universalStyleElement = document.createElement('style');
            universalStyleElement.id = STYLE_ID;
            universalStyleElement.textContent = generateUniversalModeCSS();
            (document.head || document.documentElement).appendChild(universalStyleElement);

            activateObservers();
        }
    };

    const removeUniversalStyle = () => {
        if (universalStyleElement) {
            universalStyleElement.remove();
            universalStyleElement = null;
        }
        deactivateObservers();
        elementCache.invalidate();
        resetLinks();
    };

    const init = () => {
        refresh();

        if (isWordPress) {
            GM_registerMenuCommand("WordPress Dark Mode", toggleWordPressDarkMode);
        } else {
            GM_registerMenuCommand("Universal Dark Mode", () => toggleUniversalDarkMode(false));
        }

        window.addEventListener('pageshow', handlePageShow, { passive: true });
        window.addEventListener('pagehide', handlePageHide, { passive: true });
        window.addEventListener('beforeunload', handlePageHide, { passive: true });
        window.addEventListener('storage', handleStorageChange, { passive: true });
        document.addEventListener('visibilitychange', handleVisibilityChangeFallback, { passive: true });
        window.addEventListener('unload', cleanupEventListeners, { passive: true });
    };

    if (document.head && elementCache.getBody()) {
        init();
    } else {
        const initObserver = new MutationObserver(() => {
            if (document.head && elementCache.getBody()) {
                initObserver.disconnect();
                init();
            }
        });
        initObserver.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }
})();
