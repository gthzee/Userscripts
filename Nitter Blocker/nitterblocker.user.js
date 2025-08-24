// ==UserScript==
// @name         Nitter Blocker 🚫
// @namespace    https://github.com/gthzee/
// @version      3.1.0
// @description  Hide posts from blocked users or hashtags + alert suspended accounts (only once on load)
// @author       gthzee
// @match        *://nitter.net/*
// @match        *://nitter.*/*
// @match        *://*.nitter.*/*
// @match        *://xcancel.*/*
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==
(function() {
  'use strict';

  // ==== Config ====
  const DEFAULT_BLOCKED = [
    'user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10'
    
  ];
  const DEFAULT_BLOCKED_HASHTAGS = [
    'hashtag1', 'hashtag2', 'hashtag3', 'hashtag4', 'hashtag5'
  ];
  const HIDE_RETWEETER = true;
  const USE_BLUR = false;
  const DEBUG = false;

  // ==== CSS ====
  function ensureCSS() {
    if (document.getElementById('vm-hide-css')) return;
    const style = document.createElement('style');
    style.id = 'vm-hide-css';
    style.textContent = `
      [data-vm-hidden] { display: none !important; }
      [data-vm-hidden="blur"] {
        display: block !important;
        filter: blur(6px);
        pointer-events: none;
        opacity: 0.6;
      }
      .vm-suspended-notice {
        background: #fff8e1;
        border-left: 4px solid #ffc107;
        padding: 10px;
        margin: 10px 0;
        border-radius: 0 4px 4px 0;
        font-size: 0.9em;
      }
      .vm-suspended-notice strong {
        color: #d32f2f;
      }
    `;
    document.head.appendChild(style);
  }

  // ==== Normalizers ====
  const normalizeHandle = handle => String(handle || '').trim().replace(/^@+/, '').toLowerCase();
  const normalizeHashtag = tag => String(tag || '').trim().replace(/^#+/, '').toLowerCase();

  const BLOCKED_USERS = new Set(DEFAULT_BLOCKED.map(normalizeHandle));
  const BLOCKED_HASHTAGS = new Set(DEFAULT_BLOCKED_HASHTAGS.map(normalizeHashtag));

  const isUserBlocked = handle => handle && BLOCKED_USERS.has(normalizeHandle(handle));
  const isHashtagBlocked = tag => tag && BLOCKED_HASHTAGS.has(normalizeHashtag(tag));

  // ==== DOM Selectors ====
  const POST_SELECTOR = '.timeline-item, .tweet, article.tweet, article[role="article"]';
  const CARD_SELECTOR = '.profile-card, .user-card, .search-card';

  const extractHandleFromUrl = url => {
    try {
      if (!url) return null;
      const parsedUrl = new URL(url, location.origin);
      const pathSegments = (parsedUrl.pathname || '').replace(/^\/+/, '').split('/');
      const invalidSegments = new Set(['search', 'settings', 'login', 'signup', 'about', 'i', 'explore']);
      const handle = pathSegments[0];
      return handle && !invalidSegments.has(handle.toLowerCase()) ? normalizeHandle(handle) : null;
    } catch {
      return null;
    }
  };

  const getAuthorElement = post => post.querySelector(
    '.tweet-header .username a,' +
    '.username a,' +
    'a.username,' +
    'a.account-group,' +
    'a[href^="/"][rel~="author"],' +
    'a[href^="/"][aria-label]'
  );

  const getRetweeterElement = post => post.querySelector(
    '.retweet-header a[href^="/"],' +
    '.icon-retweet ~ a[href^="/"],' +
    '[class*="retweet"] a[href^="/"]'
  );

  const getQuoteAuthorElement = post => post.querySelector(
    '.quote .username a[href^="/"],' +
    '.quoted-tweet a.username,' +
    '.quote a[href^="/"][rel~="author"]'
  );

  const getHashtagsFromPost = post => {
    const hashtags = [];
    post.querySelectorAll('a[href*="/search?q=%23"]').forEach(anchor => {
      const tag = normalizeHashtag(anchor.textContent);
      if (tag) hashtags.push(tag);
    });
    return hashtags;
  };

  const hideElement = (element, reason) => {
    if (!element || element.dataset.vmHidden) return;
    element.setAttribute('data-vm-hidden', USE_BLUR ? 'blur' : '');
    if (DEBUG) console.log('[VM Hide]', reason, element);
  };

  // ==== Suspended Account Detection ====
  let suspendedAccountsChecked = false;

  const isAccountSuspended = element => {
    if (!element) return false;
    const text = element.textContent || '';
    const keywords = ['suspended', 'deleted', 'banned', 'not available', 'not found'];
    const hasKeyword = keywords.some(keyword => text.toLowerCase().includes(keyword));
    const hasSuspensionElements = element.querySelectorAll('.suspended, .error-panel, .error-message, .icon-warning, .icon-suspended').length > 0;
    return hasKeyword || hasSuspensionElements;
  };

  const checkSuspendedAccountsOnce = () => {
    if (suspendedAccountsChecked) return;
    suspendedAccountsChecked = true;

    const suspendedHandles = new Set();
    const suspendedPosts = new Map();

    document.querySelectorAll(POST_SELECTOR).forEach(post => {
      const authorUrl = getAuthorElement(post)?.getAttribute('href');
      const authorHandle = extractHandleFromUrl(authorUrl);
      if (authorHandle && isUserBlocked(authorHandle) && isAccountSuspended(post)) {
        suspendedHandles.add(authorHandle);
        suspendedPosts.set(authorHandle, post);
      }
    });

    suspendedHandles.forEach(handle => {
      const post = suspendedPosts.get(handle);
      if (post && !post.querySelector('.vm-suspended-notice')) {
        const notice = document.createElement('div');
        notice.className = 'vm-suspended-notice';
        notice.innerHTML = `<strong>⚠️ Account @${handle} suspended/deleted</strong><br>` +
                           `Edit <code>DEFAULT_BLOCKED</code> in script to remove permanently.`;
        post.parentNode.insertBefore(notice, post.nextSibling);
      }
    });

    if (suspendedHandles.size > 0) {
      alert(`Suspended/Deleted Accounts Detected:\n\n${Array.from(suspendedHandles).map(h => `@${h}`).join('\n')}`);
    }
  };

  // ==== Processors ====
  const processedPosts = new WeakSet();
  const processedCards = new WeakSet();

  const processPost = post => {
    if (!post || !post.isConnected || processedPosts.has(post)) return;
    if (post.hasAttribute('data-vm-hidden')) {
      processedPosts.add(post);
      return;
    }

    const authorUrl = getAuthorElement(post)?.getAttribute('href');
    const retweeterUrl = getRetweeterElement(post)?.getAttribute('href');
    const quoteAuthorUrl = getQuoteAuthorElement(post)?.getAttribute('href');
    const hashtags = getHashtagsFromPost(post);

    const authorHandle = extractHandleFromUrl(authorUrl);
    const retweeterHandle = extractHandleFromUrl(retweeterUrl);
    const quoteAuthorHandle = extractHandleFromUrl(quoteAuthorUrl);

    if (authorHandle && isUserBlocked(authorHandle)) {
      hideElement(post, `author @${authorHandle}`);
    } else if (HIDE_RETWEETER && retweeterHandle && isUserBlocked(retweeterHandle)) {
      hideElement(post, `retweeter @${retweeterHandle}`);
    } else if (quoteAuthorHandle && isUserBlocked(quoteAuthorHandle)) {
      hideElement(post, `quote @${quoteAuthorHandle}`);
    } else if (hashtags.some(isHashtagBlocked)) {
      hideElement(post, 'blocked hashtag');
    }

    processedPosts.add(post);
  };

  const processCard = card => {
    if (!card || !card.isConnected || processedCards.has(card)) return;
    if (card.hasAttribute('data-vm-hidden')) {
      processedCards.add(card);
      return;
    }

    const link = card.querySelector('a[href^="/"]');
    const handle = extractHandleFromUrl(link?.getAttribute('href'));
    if (handle && isUserBlocked(handle)) {
      hideElement(card, `usercard @${handle}`);
    }

    processedCards.add(card);
  };

  // ==== Mutation Observer ====
  const pendingRoots = new Set();
  let processingScheduled = false;

  const scheduleProcessing = root => {
    if (root) pendingRoots.add(root);
    if (processingScheduled) return;

    processingScheduled = true;
    requestAnimationFrame(() => {
      const roots = Array.from(pendingRoots);
      pendingRoots.clear();

      roots.forEach(root => {
        if (root instanceof Element) {
          if (root.matches(POST_SELECTOR)) processPost(root);
          if (root.matches(CARD_SELECTOR)) processCard(root);
        }
        root.querySelectorAll?.(POST_SELECTOR).forEach(processPost);
        root.querySelectorAll?.(CARD_SELECTOR).forEach(processCard);
      });

      processingScheduled = false;
    });
  };

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) scheduleProcessing(node);
      });
    });
  });

  // ==== Start ====
  const start = () => {
    ensureCSS();
    checkSuspendedAccountsOnce();
    scheduleProcessing(document);

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    // SPA navigation handling
    window.addEventListener('popstate', () => scheduleProcessing(document));
  };

  start();
})();
