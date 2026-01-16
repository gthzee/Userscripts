// ==UserScript==
// @name          Kön Dark Mode
// @namespace     https://github.com/gthzee/
// @version       7.9
// @description   Universal dark mode
// @author        gthzee
// @match         *://*/*
// @grant         GM_registerMenuCommand
// @run-at        document-start
// @license       MIT
// ==/UserScript==

(function() {
    'use strict';

    /* --- Configuration --- */
    const Config = {
        STORAGE_KEY: "udm_" + location.hostname,
        WORDPRESS_STORAGE_KEY: "wp_dm",
        VERSION_KEY: "udm_version",
        CURRENT_VERSION: "7.9",

        STYLE_ID: "udm_style",
        WORDPRESS_STYLE_ID: "wp_dm_style",
        FOURCHAN_STYLE_ID: "fourchan_dm_style",

        FORCE_DM_ATTR: 'wp-forced',
        COLORED_LINK_ATTR: 'udm-link-colored',

        LINK_MIN_BRIGHTNESS: 130,
        LINK_MAX_BRIGHTNESS: 220,

        BACKGROUND_STYLES: [
            {
                bg: '#121212',
                textColors: ['#FFFFFF', '#F5F5F5', '#E0E0E0', '#BDBDBD', '#40C4FF',
                             '#64FFDA', '#69F0AE', '#FFD740', '#B388FF', '#8C9EFF',
                             '#82B1FF', '#84FFFF', '#E1BEE7']
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
                             '#00FFF0', '#C77DFF']
            }
        ]
    };

    const Site = {
        get isTorrentFreak() { return /torrentfreak\.com$/i.test(location.hostname); },
        get isOldReddit() { return /old\.reddit\.com$/i.test(location.hostname) && /^\/r\//i.test(location.pathname); },
        get isWordPress() { return /wp-admin\/post-new\.php$|wp-admin\/post\.php$/.test(location.pathname); },
        get is4chan() { return /4chan\.org$|4channel\.org$/i.test(location.hostname); }
    };

    const State = {
        darkMode: {
            universal: true,
            wordpress: false
        },
        colors: {
            bg: '', text: '', article: '', content: '', code: '', input: ''
        },
        initialized: false
    };

    const Observers = {
        link: null,
        main: null,
        wordpress: null,
        react: null,
        init: null,
        isActive: false,

        clear() {
            ['link', 'main', 'wordpress', 'react', 'init'].forEach(key => {
                if (this[key]) {
                    this[key].disconnect();
                    this[key] = null;
                }
            });
            this.isActive = false;
        }
    };

    const EventManager = {
        list: [],

        add(target, event, handler, options) {
            target.addEventListener(event, handler, options);
            this.list.push({ target, event, handler, options });
        },

        removeAll() {
            this.list.forEach(({ target, event, handler, options }) => {
                target.removeEventListener(event, handler, options);
            });
            this.list.length = 0;
        }
    };

    const ColorUtils = {
        cache: new Map(),

        getDerivedColor(hex, adjustment) {
            const parse = (str) => parseInt(hex.slice(str, str + 2), 16);
            const r = parse(1);
            const g = parse(3);
            const b = parse(5);

            const adjust = (color) => Math.max(0, Math.min(255, Math.round(color + (255 - color) * adjustment)));

            const toHex = (val) => adjust(val).toString(16).padStart(2, '0');
            return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        },

        calculateBrightness(hex) {
            if (hex.length === 3) {
                hex = hex.split('').map(c => c + c).join('');
            }
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return (r * 299 + g * 587 + b * 114) / 1000;
        },

        getPersistentColor(str) {
            if (this.cache.has(str)) {
                return this.cache.get(str);
            }

            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }

            hash = hash >>> 0;

            const r = (hash >> 16) & 0xFF;
            const g = (hash >> 8) & 0xFF;
            const b = hash & 0xFF;

            let brightness = (r * 299 + g * 587 + b * 114) / 1000;
            let factor = 1;

            if (brightness < Config.LINK_MIN_BRIGHTNESS) {
                 factor = Config.LINK_MIN_BRIGHTNESS / (brightness || 1);
            } else if (brightness > Config.LINK_MAX_BRIGHTNESS) {
                 factor = Config.LINK_MAX_BRIGHTNESS / brightness;
            }

            const scale = (c) => Math.min(255, Math.max(0, Math.round(c * factor)));

            const finalR = scale(r).toString(16).padStart(2, '0');
            const finalG = scale(g).toString(16).padStart(2, '0');
            const finalB = scale(b).toString(16).padStart(2, '0');

            const result = `#${finalR}${finalG}${finalB}`;

            // 6. Save to Cache
            this.cache.set(str, result);

            return result;
        }
    };

    const SanityCheck = {
        run() {
            const storedVersion = localStorage.getItem(Config.VERSION_KEY);
            if (storedVersion !== Config.CURRENT_VERSION) {
                this.fullWipe();
                localStorage.setItem(Config.VERSION_KEY, Config.CURRENT_VERSION);
            }
        },

        fullWipe() {
            localStorage.removeItem(Config.STORAGE_KEY);
            localStorage.removeItem(Config.WORDPRESS_STORAGE_KEY);
        }
    };

    const initializeColors = () => {
        if (Site.isWordPress) {
            State.colors.bg = '#1a1a1a';
            State.colors.text = '#e0e0e0';
        } else {
            const styleIndex = Math.floor(Math.random() * Config.BACKGROUND_STYLES.length);
            const chosenStyle = Config.BACKGROUND_STYLES[styleIndex];
            State.colors.bg = chosenStyle.bg;

            const textIndex = Math.floor(Math.random() * chosenStyle.textColors.length);
            State.colors.text = chosenStyle.textColors[textIndex];
        }

        State.colors.article = ColorUtils.getDerivedColor(State.colors.bg, 0.1);
        State.colors.content = ColorUtils.getDerivedColor(State.colors.bg, 0.15);
        State.colors.code = ColorUtils.getDerivedColor(State.colors.bg, 0.05);
        State.colors.input = ColorUtils.getDerivedColor(State.colors.bg, 0.08);
    };

    const initializeState = () => {
        SanityCheck.run();

        if (Site.isWordPress) {
            const wpSaved = localStorage.getItem(Config.WORDPRESS_STORAGE_KEY);
            State.darkMode.wordpress = wpSaved === 'true';
        } else {
            const saved = localStorage.getItem(Config.WORDPRESS_STORAGE_KEY);
            if (saved === 'true') {
                localStorage.setItem(Config.WORDPRESS_STORAGE_KEY, 'false');
            }
            State.darkMode.wordpress = false;
        }

        const saved = localStorage.getItem(Config.STORAGE_KEY);
        State.darkMode.universal = saved !== 'false';
        initializeColors();
    };

    const colorizeSingleLink = (anchorElement) => {
        if (
            !anchorElement.hasAttribute(Config.COLORED_LINK_ATTR) &&
            !anchorElement.closest('[data-no-dark-mode]') &&
            !anchorElement.classList.contains('no-dark-mode')
        ) {
            const color = ColorUtils.getPersistentColor(anchorElement.href);
            anchorElement.style.setProperty('color', color, 'important');
            anchorElement.setAttribute(Config.COLORED_LINK_ATTR, 'true');
        }
    };

    initializeState();

    const processNewLinks = (mutations) => {
        if (!State.darkMode.universal) return;
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;
                if (node.nodeName === 'A' && node.hasAttribute('href')) colorizeSingleLink(node);
                const links = node.getElementsByTagName('a');
                for (let i = 0; i < links.length; i++) colorizeSingleLink(links[i]);
            }
        }
    };

    if (State.darkMode.universal && !Site.isWordPress) {
        Observers.link = new MutationObserver(processNewLinks);
        Observers.link.observe(document.documentElement, { childList: true, subtree: true });
    }

    const generateBaseCSS = () => {
        const colors = State.colors;
        return `
            html, body {
                background: ${colors.bg} !important;
                color: ${colors.text} !important;
            }
            ::selection {
                background: ${ColorUtils.getDerivedColor(colors.text, -0.2)} !important;
                color: ${ColorUtils.getDerivedColor(colors.bg, -0.7)} !important;
            }
        `;
    };

    const generateWordPressCSS = () => {
        if (!Site.isWordPress) return '';
        const colors = State.colors;

        return `
            :root {
                --bg-dark: ${colors.bg};
                --bg-medium: ${colors.article};
                --bg-light: ${colors.content};
                --text-primary: ${colors.text};
                --text-secondary: ${ColorUtils.getDerivedColor(colors.text, -0.3)};
                --accent: #5b9dd9;
            }

            /* Main Body Background */
            html, body, #wpwrap, #wpcontent, #wpbody, #wpbody-content, .wrap {
                background: var(--bg-dark) !important;
                color: var(--text-primary) !important;
            }

            /* --- Sidebar & Top Bar (Independent Menu Box) --- */
            #wpadminbar,
            #adminmenuback,
            #adminmenuwrap,
            #adminmenu {
                background: var(--bg-medium) !important;
                color: var(--text-primary) !important;
                border-right: 1px solid var(--bg-light) !important;
            }

            /* Force consistency inside the menu (No exceptions) */
            #adminmenu .menu-top,
            #adminmenu li.menu-top,
            #adminmenu .wp-submenu,
            #adminmenu .wp-submenu-wrap,
            #adminmenu .wp-submenu-head,
            #adminmenu li.wp-has-submenu,
            #adminmenu a {
                background: var(--bg-medium) !important;
                color: var(--text-primary) !important;
                border-color: var(--bg-medium) !important;
            }

            /* Hover/Active States for visual hierarchy */
            #adminmenu .menu-top:hover,
            #adminmenu .menu-top:focus,
            #adminmenu li.opensub > a.menu-top,
            #adminmenu li.current a.menu-top {
                background: var(--bg-light) !important;
                color: #fff !important;
            }

            /* Adminbar items */
            #wpadminbar .ab-item, #wpadminbar a {
                color: var(--text-primary) !important;
            }
            #wpadminbar .ab-item:hover, #wpadminbar a:hover {
                color: #fff !important;
            }

            /* --- Editor & Content Areas --- */
            .wp-editor-container, #wp-content-wrap, .mce-container, .mce-panel, .mce-edit-area, .wp-editor-area,
            .editor-styles-wrapper, .block-editor-block-list__layout, .components-panel, .components-button,
            .block-editor-block-list__block, .block-editor-block-toolbar, .components-popover,
            .components-dropdown-menu__menu, .block-editor-inserter,
            .components-navigate-regions, .components-autocomplete__results, .components-panel__body,
            .components-tab-panel__tabs, .components-tab-panel__tab-content {
                background: var(--bg-medium) !important;
                color: var(--text-primary) !important;
            }
            #content, .mce-content-body, .block-editor-block-list__layout.is-root-container {
                background: var(--bg-light) !important;
                color: var(--text-primary) !important;
            }

            /* --- Buttons & Inputs --- */
            .button, .button-secondary, #publish, .components-button {
                background: var(--bg-light) !important;
                color: var(--text-primary) !important;
            }
            .button-primary, #publish, .components-button.is-primary {
                background: var(--accent) !important;
                color: #fff !important;
            }
            input, textarea, select, .components-text-control__input {
                background: var(--bg-light) !important;
                color: var(--text-primary) !important;
                border-color: var(--bg-medium) !important;
            }
            a, .components-button.is-link { color: var(--accent) !important; }

            /* --- Images --- */
            img, video, iframe {
                filter: invert(0.9) hue-rotate(180deg);
                background: transparent !important;
            }

            /* --- Tables & Meta Boxes --- */
            .edit-post-sidebar, .interface-interface-skeleton__sidebar,
            .edit-post-header, .interface-interface-skeleton__header,
            .postbox, .inside, .postbox-header, .handlediv {
                background: var(--bg-medium) !important;
                color: var(--text-primary) !important;
            }
            .widefat, .wp-list-table {
                background: var(--bg-medium) !important;
                color: var(--text-primary) !important;
            }
            .widefat th, .wp-list-table th {
                background: var(--bg-dark) !important;
                color: var(--text-primary) !important;
            }
            .widefat td, .wp-list-table td {
                background: var(--bg-light) !important;
                color: var(--text-primary) !important;
            }
            .select2-container--default .select2-selection--single,
            .select2-container--default .select2-dropdown,
            .wp-color-picker {
                background: var(--bg-light) !important;
                border-color: var(--bg-medium) !important;
            }
            .media-modal, .media-frame, .attachments-browser .media-toolbar {
                background: var(--bg-medium) !important;
                color: var(--text-primary) !important;
            }
            .attachments-browser .attachments, .attachment-preview {
                background: var(--bg-light) !important;
            }

            /* --- Generic Overwrites --- */
            [style*="background: white"], [style*="background-color: white"],
            [style*="background: #fff"], [style*="background-color: #fff"],
            [style*="background: rgb(255, 255, 255)"], [style*="background-color: rgb(255, 255, 255)"],
            [style*="background: #f1f1f1"], [style*="background-color: #f1f1f1"] {
                background: var(--bg-dark) !important;
            }
            [style*="color: black"], [style*="color: #000"], [style*="color: rgb(0, 0, 0)"] {
                color: var(--text-primary) !important;
            }
        `;
    };

    const generate4chanCSS = () => {
        if (!Site.is4chan) return '';
        const colors = State.colors;
        const borderCol = ColorUtils.getDerivedColor(colors.bg, 0.3);
        const textLight = ColorUtils.getDerivedColor(colors.text, 0.2);
        const textDim = ColorUtils.getDerivedColor(colors.text, -0.2);
        const textLink = ColorUtils.getDerivedColor(colors.text, 0.3);

        return `
            html, body, #doc, div.board {
                background: ${colors.bg} !important;
                background-color: ${colors.bg} !important;
                background-image: none !important;
                color: ${colors.text} !important;
            }
            html body div.board div.thread div.post.reply:target,
            html body div.board div.thread div.post.reply.highlight,
            html body div.board div.thread div.post.op:target,
            html body div.board div.thread div.post.op.highlight,
            #qp, .inline {
                background: ${colors.article} !important;
                background-color: ${colors.article} !important;
                border: 1px solid ${borderCol} !important;
                color: ${colors.text} !important;
                box-shadow: none !important;
                z-index: 9999 !important;
            }
            html body .post.reply {
                background-color: ${colors.content} !important;
                border: 1px solid ${ColorUtils.getDerivedColor(colors.bg, 0.2)} !important;
                color: ${colors.text} !important;
            }
            html body .post.op {
                background-color: ${colors.content} !important;
                color: ${colors.text} !important;
            }
            html body .postMessage { color: ${colors.text} !important; }
            html body .subject { color: ${textLight} !important; }
            html body .name { color: ${textDim} !important; }
            html body span.quote { color: #789922 !important; }
            #qp a, .inline a, .post:target a { color: ${textLink} !important; }
            #quickReply, textarea, input {
                background-color: ${colors.input} !important;
                color: ${colors.text} !important;
                border: 1px solid ${borderCol} !important;
            }
            .center, .top-box, .middle-box, .bottom-box { display: none !important; }
        `;
    };

    const generateTorrentFreakCSS = () => {
        if (!Site.isTorrentFreak) return '';
        const colors = State.colors;
        return `
            ${generateBaseCSS()}
            :root {
                --tf-bg: ${colors.bg};
                --tf-article-bg: ${colors.article};
                --tf-text: ${colors.text};
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
            .vc_row, .vc_column, .vc_column_inner, .wp-block-group, .wp-block-column, .wp-block-container {
                background-color: var(--tf-article-bg) !important;
                color: var(--tf-text) !important;
            }
            h1, h2, h3, h4, h5, h6, p, span, strong, em, small, label, li, dd, dt {
                color: var(--tf-text) !important;
                background-color: transparent !important;
            }
            a, a * { background-color: transparent !important; }
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
        if (!Site.isOldReddit) return '';
        const colors = State.colors;
        return `
            html, body, .content, .side, .link, .comment, .entry, .usertext, .md, .titlebox, .linklisting, .thing,
            .child, .midcol, .tagline, .tabmenu, .tabmenu li, .tabmenu li a, .sitetable, .nestedlisting,
            .commentarea, .footer, .footer-parent, .debuginfo, .roundfield, .formtabs-content, .morelink,
            .infobar, .menuarea, .searchpane, .searchfacets, .raisedbox, .modactionlisting, .modactiontable,
            .nextprev, .nav-buttons, .flat-list, .buttons {
                background-color: ${colors.bg} !important;
                color: ${colors.text} !important;
            }
            .usertext-body, .usertext-edit, .md {
                background-color: ${colors.content} !important;
            }
            input, textarea, select, button {
                background-color: ${colors.input} !important;
                border: 1px solid ${ColorUtils.getDerivedColor(colors.bg, 0.3)} !important;
            }
            .commentarea .thing {
                background-color: ${colors.article} !important;
            }
            .md pre, .md code {
                background-color: ${colors.code} !important;
            }
            .infobar, .header, #header-bottom-left, #sr-header-area {
                background-color: ${colors.article} !important;
                color: ${colors.text} !important;
            }
            .tabmenu li a {
                background-color: transparent !important;
                color: ${colors.text} !important;
            }
            .tabmenu li.selected a {
                background-color: ${colors.bg} !important;
            }
            .expand, .tagline, .userattrs { background-color: transparent !important; }
            .collapsed, .score-hidden { background-color: ${colors.bg} !important; }

            /* Nested Comments handling */
            .comment, .comment .child, .stickled.comment { background-color: ${colors.bg} !important; }
            .comment :is(.entry, .usertext, .usertext-body, .md),
            .stickied :is(.entry, .usertext-body, .usertext-edit, .md) {
                background-color: ${colors.content} !important;
            }
            :is(.comment, .stickied) .midcol {
                background-color: ${colors.bg} !important;
                color: ${colors.text} !important;
            }
            .thing.stickied, .thing.stickied :is(.entry, .usertext, .usertext-body, .md, .child, .comment),
            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing {
                background-color: ${colors.article} !important;
                color: ${colors.text} !important;
            }
            /* Specific overrides for complex selectors */
            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing *,
            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing * * {
                background-color: inherit !important;
                color: ${colors.text} !important;
            }
            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing :is(.entry, .usertext-body, .usertext-edit, .md) {
                background-color: ${colors.content} !important;
            }
            .score-hidden.comment.noncollapsed.stickied[class*="id-t1_"].thing .child,
            .comment.noncollapsed[class*="id-t1_"].thing .child {
                background-color: transparent !important;
            }
            .comment, .comment .child, .comment .child .comment, .comment .child .comment .child,
            .comment .child .comment .child .comment, .comment .child .comment .child .comment .child,
            .comment .child .comment .child .comment .child .comment, .comment .child .comment .child .comment .child .comment .child,
            .comment .child .comment .child .comment .child .comment .child .comment,
            .comment .child .comment .child .comment .child .comment .child .comment .child,
            .comment .child .comment .child .comment .child .comment .child .comment .child .comment {
                background-color: ${colors.bg} !important;
            }
            .comment.noncollapsed[class*="id-t1_"].thing { background-color: ${colors.bg} !important; }
            .comment.noncollapsed[class*="id-t1_"].thing :is(.entry, .usertext-body, .usertext-edit, .md) {
                background-color: ${colors.content} !important;
            }

            .userattrs a, .submitter, .moderator, .admin, .friend, .flair {
                background-color: ${colors.content} !important;
                color: ${colors.text} !important;
            }
            .new-comment .usertext-body { background-color: ${colors.content} !important; }
            img, video, iframe {
                filter: brightness(0.9) contrast(1.1) !important;
            }
        `;
    };

    const generateUniversalCSS = () => {
        const colors = State.colors;

        const layoutAreas = `:is(header, nav, main, aside, footer, section, article, #header, #nav, #main, #aside, #footer, .header, .nav, .navbar, .main, .aside, .footer, .container, .wrapper, .site-header)`;

        const dropdownAreas = `:is(.dropdown, .dropdown-menu, .sub-menu, .submenu, .flyout, [role="menu"], [role="listbox"], [class*="dropdown"], [class*="submenu"])`;

        const advancedNavAreas = `:is(
            .nav__wrap, ul.nav__row, ul.nav__sub, div.nav__subitem, li.nav__subwrap, menu,
            div.menu-main, div.menu-sub, li.menu-parent, nav.o-nav, ul.o-nav__list, li.o-nav__list-item,
            ul.a-show-on-hover, div.nested_nav, ul.a-unstyle-list, .tdb_header_menu, .tdb-block-menu,
            .sub-menu, .tdb_header_mega_menu, li.menu-item, nav.main-nav, nav.main-nav ul,
            li.folder-collection, div.subnav, div.subnav ul, div#main-menu, div#main-menu ul,
            div#main-menu ul li, div#main-menu ul li ul, div[class*="sc-ktkden"], div[class*="ikNBeo"],
            div[class*="doTrdi"], div[class*="sc-mg7twj"], div[class*="sc-6i7ydt-"], div[class*="fJunbn"],
            div[class*="sc-34br53-"], div[class*="sc-1rtcbr6-"], ul#mnmain.main_menu, li.dropdown,
            ul.drops, nav.site-header__secondary-content, ul.site-navigation__list,
            ul.site-navigation__list--secondary, li.e-navigation-secondary-item,
            ul.site-navigation__list--tertiary, li.e-navigation-tertiary-item, nav.menu,
            div.menu__bar, ul.menu__list, ul.menu__list li, div.menu__list-item, div.menu__sub,
            ul.menu__sub-list, bsp-header, bsp-nav, .MainNavigation, .MainNavigationItem,
            ul.MainNavigationItem-items, li.MainNavigationItem-items-item, div.MainNavigationItemItem,
            div#nav-grid, div#nav-subs, div#dropdown-nav, [class*="css-1osqdpu"], [class*="css-m631z3"]
        )`;

        return `
            ${generateBaseCSS()}
            * {
                background-color: transparent !important;
                color: inherit !important;
            }
            img, video, iframe, embed, object, canvas, source {
                background-color: transparent !important;
                filter: brightness(0.9) contrast(1.1) !important;
            }
            svg, svg * {
                fill: transparent !important;
                stroke: ${colors.text} !important;
            }
            ${layoutAreas}, ${dropdownAreas}, ${advancedNavAreas} {
                background-color: ${colors.bg} !important;
                color: ${colors.text} !important;
            }
            ${dropdownAreas} {
                z-index: 2147483647 !important;
            }
            :is(${layoutAreas}, ${dropdownAreas}, ${advancedNavAreas}) a:hover {
                 filter: brightness(1.2) !important;
                 text-decoration: none !important;
            }
        `;
    };

    const generateCSS = () => {
        if (Site.isWordPress) return generateWordPressCSS();
        if (Site.isTorrentFreak) return generateTorrentFreakCSS();
        if (Site.isOldReddit) return generateOldRedditCSS();
        if (Site.is4chan) return generate4chanCSS();
        return generateUniversalCSS();
    };

    const processElementStyle = (el) => {
        if (el.nodeType !== Node.ELEMENT_NODE || el.hasAttribute(Config.FORCE_DM_ATTR)) return;

        const isWp = Site.isWordPress && State.darkMode.wordpress;
        const isTf = Site.isTorrentFreak && State.darkMode.universal;

        if (!isWp && !isTf) return;

        const computedStyle = window.getComputedStyle(el);
        const bgColor = computedStyle.backgroundColor;
        const textColor = computedStyle.color;

        if (isTf) {
            if (['IMG', 'IFRAME', 'EMBED', 'VIDEO', 'CANVAS', 'SVG', 'PATH'].includes(el.tagName)) return;

            if (['rgba(0, 0, 0, 0)', 'rgb(255, 255, 255)', 'white', '#ffffff', '#fff'].includes(bgColor)) {
                el.style.setProperty('background-color', 'var(--tf-bg)', 'important');
            }
            if (['rgb(0, 0, 0)', 'black', '#000000', '#000'].includes(textColor)) {
                el.style.setProperty('color', 'var(--tf-text)', 'important');
            }
            if (el.classList.contains('container') || el.classList.contains('wrapper') ||
                el.classList.contains('content') || el.classList.contains('main') ||
                el.classList.contains('section')) {
                el.style.setProperty('background-color', 'var(--tf-article-bg)', 'important');
            }
        }

        if (isWp) {
            if (el.closest('#adminmenu') || el.closest('#wpadminbar')) return;

            if (['rgb(255, 255, 255)', 'white', 'rgb(241, 241, 241)', '#f1f1f1',
                 'rgb(250, 250, 250)', '#fafafa'].includes(bgColor)) {
                el.style.setProperty('background-color', 'var(--bg-dark)', 'important');
                el.setAttribute(Config.FORCE_DM_ATTR, 'true');
            }
            if (['rgb(0, 0, 0)', 'black', '#000000', 'rgb(33, 33, 33)', '#212121'].includes(textColor)) {
                el.style.setProperty('color', 'var(--text-primary)', 'important');
                el.setAttribute(Config.FORCE_DM_ATTR, 'true');
            }
            if (el.classList.contains('wp-color-picker') || el.classList.contains('select2-container') ||
                el.classList.contains('media-modal') || el.classList.contains('block-editor-block-list__block')) {
                el.style.setProperty('background-color', 'var(--bg-medium)', 'important');
                el.style.setProperty('color', 'var(--text-primary)', 'important');
                el.setAttribute(Config.FORCE_DM_ATTR, 'true');
            }
        }
    };

    const processSubtree = (rootNode) => {
        if (rootNode.nodeType !== Node.ELEMENT_NODE) return;

        const needsStyleOverride = (Site.isWordPress && State.darkMode.wordpress) ||
                                   (Site.isTorrentFreak && State.darkMode.universal);

        if (!needsStyleOverride) return;

        processElementStyle(rootNode);

        const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT, null, false);
        let node;
        while ((node = walker.nextNode())) {
            processElementStyle(node);
        }
    };

    const forceDarkMode = () => {
        if (document.body) processSubtree(document.body);
    };

    const cleanupForcedStyles = () => {
        const allElements = document.querySelectorAll(`[${Config.FORCE_DM_ATTR}]`);
        for (const el of allElements) {
            el.style.removeProperty('background-color');
            el.style.removeProperty('color');
            el.removeAttribute(Config.FORCE_DM_ATTR);
        }
    };

    const fixWhiteElements = () => {
        if (document.body) processSubtree(document.body);
    };

    const colorizeLinks = () => {
        if (!State.darkMode.universal) return;
        const links = document.querySelectorAll('a[href]');
        const uncoloredLinks = Array.from(links).filter(a => !a.hasAttribute(Config.COLORED_LINK_ATTR));
        uncoloredLinks.forEach(colorizeSingleLink);
    };

    const resetLinks = () => {
        const links = document.querySelectorAll(`[${Config.COLORED_LINK_ATTR}]`);
        for (const el of links) {
            el.style.removeProperty('color');
            el.removeAttribute(Config.COLORED_LINK_ATTR);
        }
    };

    const activateObservers = () => {
        if (Observers.isActive) return;
        const body = document.body;
        if (!body) return;

        if (!Site.isWordPress && State.darkMode.universal && !Observers.link) {
            Observers.link = new MutationObserver(processNewLinks);
            Observers.link.observe(document.documentElement, { childList: true, subtree: true });
        }

        if (!Site.isWordPress && State.darkMode.universal) {
            if (!Observers.main) {
                Observers.main = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE) processSubtree(node);
                        }
                    }
                });
            }
            Observers.main.observe(body, { childList: true, subtree: true });
        }

        Observers.isActive = true;
    };

    const deactivateObservers = () => {
        Observers.clear();
    };

    const applyUniversalStyle = () => {
        if (Site.isWordPress) return;
        const styleId = Config.STYLE_ID;
        if (State.darkMode.universal && !document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = generateCSS();
            (document.head || document.documentElement).appendChild(style);
            activateObservers();
        }
    };

    const removeUniversalStyle = () => {
        const el = document.getElementById(Config.STYLE_ID);
        if (el) el.remove();
        cleanupForcedStyles();
        deactivateObservers();
        resetLinks();
    };

    const applyWordPressDarkMode = () => {
        const styleId = Config.WORDPRESS_STYLE_ID;
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = generateWordPressCSS();
        (document.head || document.documentElement).appendChild(style);
        forceDarkMode();

        Observers.clear();

        Observers.wordpress = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) processSubtree(node);
                }
            }
        });
        Observers.wordpress.observe(document.body, { childList: true, subtree: true });

        Observers.react = new MutationObserver(() => {
            const reactRoots = document.querySelectorAll('#wpwrap, #editor, .block-editor-writing-flow');
            reactRoots.forEach(root => processSubtree(root));
        });
        Observers.react.observe(document.body, { childList: true, subtree: true });
    };

    const removeWordPressDarkMode = () => {
        const el = document.getElementById(Config.WORDPRESS_STYLE_ID);
        if (el) el.remove();
        cleanupForcedStyles();
        Observers.clear();
        if (!State.darkMode.universal) {
            document.body.style.background = "";
            document.body.style.color = "";
        }
    };

    const apply4chanDarkMode = () => {
        const styleId = Config.FOURCHAN_STYLE_ID;
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = generate4chanCSS();
        (document.head || document.documentElement).appendChild(style);
        activateObservers();
    };

    const remove4chanDarkMode = () => {
        const el = document.getElementById(Config.FOURCHAN_STYLE_ID);
        if (el) el.remove();
        cleanupForcedStyles();
        deactivateObservers();
        resetLinks();
    };

    const refresh = () => {
        if (Site.isWordPress) {
            if (State.darkMode.wordpress) applyWordPressDarkMode();
            else removeWordPressDarkMode();
        } else if (Site.is4chan) {
            if (State.darkMode.universal) {
                apply4chanDarkMode();
                colorizeLinks();
            } else {
                remove4chanDarkMode();
            }
        } else {
            if (State.darkMode.universal) {
                applyUniversalStyle();
                colorizeLinks();
            } else {
                removeUniversalStyle();
            }
        }

        if (Site.isTorrentFreak && State.darkMode.universal) {
            fixWhiteElements();
        }
    };

    const toggleUniversalDarkMode = (reload = true) => {
        cleanup();

        State.darkMode.universal = !State.darkMode.universal;
        localStorage.setItem(Config.STORAGE_KEY, State.darkMode.universal ? 'true' : 'false');

        if (reload) location.reload();
        else refresh();
    };

    const toggleWordPressDarkMode = () => {
        State.darkMode.wordpress = !State.darkMode.wordpress;
        localStorage.setItem(Config.WORDPRESS_STORAGE_KEY, State.darkMode.wordpress ? 'true' : 'false');
        refresh();
    };

    const handlePageShow = () => { activateObservers(); };
    const handlePageHide = () => { deactivateObservers(); };

    const handleStorageChange = (event) => {
        if (event.key === Config.STORAGE_KEY || event.key === Config.WORDPRESS_STORAGE_KEY) {
            State.darkMode.universal = localStorage.getItem(Config.STORAGE_KEY) !== 'false';
            State.darkMode.wordpress = localStorage.getItem(Config.WORDPRESS_STORAGE_KEY) === 'true';
            initializeColors();
            refresh();
        }
    };

    const handleVisibilityChange = () => {
        if (document.hidden) handlePageHide();
        else handlePageShow();
    };

    const cleanup = () => {
        Observers.clear();
        [Config.STYLE_ID, Config.WORDPRESS_STYLE_ID, Config.FOURCHAN_STYLE_ID].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
        cleanupForcedStyles();
        resetLinks();
        EventManager.removeAll();
        Observers.isActive = false;
    };

    const init = () => {
        if (State.initialized) return;
        State.initialized = true;

        refresh();

        if (Site.isWordPress) {
            GM_registerMenuCommand("WordPress Dark Mode", toggleWordPressDarkMode);
        } else {
            GM_registerMenuCommand("Universal Dark Mode", () => toggleUniversalDarkMode(false));
        }

        EventManager.add(window, 'pageshow', handlePageShow, { passive: true });
        EventManager.add(window, 'pagehide', handlePageHide, { passive: true });
        EventManager.add(window, 'beforeunload', handlePageHide, { passive: true });
        EventManager.add(window, 'storage', handleStorageChange, { passive: true });
        EventManager.add(document, 'visibilitychange', handleVisibilityChange, { passive: true });
        EventManager.add(window, 'unload', cleanup, { passive: true });
    };

    if (document.head && document.body) {
        init();
    } else {
        Observers.init = new MutationObserver(() => {
            if (document.head && document.body) {
                Observers.init.disconnect();
                Observers.init = null;
                init();
            }
        });
        Observers.init.observe(document.documentElement, { childList: true, subtree: true });
    }
})();
