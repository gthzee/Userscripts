# 🧩 Universal Modern JS Polyfills (`polyfills.user.js`)

Injects polyfills for modern JavaScript features into every site — only when needed — with a **per-domain toggle**.  
Perfect for testing legacy environments, improving compatibility, or debugging missing feature support.

Useful when a website is broken or fails to load correctly in older or restricted browsers due to missing JavaScript features (like `Array.prototype.flat`, `Promise.any`, etc).  
This script patches those gaps automatically — allowing the site to work as intended, even in non-modern environments.

---

## ⚙️ How It Works

This userscript does two things:

1. **Applies Modern JavaScript Polyfills**  
   It checks if key JavaScript features are missing (based on ECMAScript 2019–2023) and injects polyfills only when necessary. Includes polyfills for:

   - `Promise.withResolvers`, `Promise.any`, `Promise.allSettled`
   - `Array.prototype.at`, `flat`, `flatMap`, `findLast`
   - `Array.prototype.toReversed`, `toSorted`, `toSpliced`
   - `String.prototype.at`, `replaceAll`
   - `Object.hasOwn`, `Object.fromEntries`
   - `structuredClone`, `queueMicrotask`, `globalThis`

2. **Toggle Polyfills Per Domain**  
   Use the userscript manager menu to enable or disable polyfills for the current domain. The script remembers your choice and reloads the page with or without polyfills accordingly.

---

## 🧩 Requirements

Designed for use with [Violentmonkey](https://violentmonkey.github.io/).  
Other userscript managers (e.g. Tampermonkey, Greasemonkey) may work but are not officially supported.

---

## 🚀 Installation

1. Install the [Violentmonkey](https://violentmonkey.github.io/) browser extension.
2. [Click here to install the script](./polyfills.user.js), or open the file and install it via Violentmonkey.
3. Or install manually:
   - Click the Violentmonkey icon → **Create a new script**
   - Paste in the contents of `polyfills.user.js`
   - Save

---

## 🔄 Behavior Summary

| Situation                         | What Happens                                   |
|----------------------------------|-------------------------------------------------|
| Missing JS features              | Polyfills are applied (if enabled)              |
| Polyfills disabled via menu      | Page runs natively with no patching             |
| Polyfills enabled via menu       | Missing features are polyfilled at start        |
| You reload the page              | Polyfill setting for the domain is remembered   |

---

## 🛠️ Features

- ✅ Injects modern JS polyfills only when missing
- 🔄 Toggleable per domain via userscript menu
- 🧠 Helps test feature support in limited environments
- 🗝️ Stores toggle state using `GM_setValue`
- 🌐 Runs on all pages (`*://*/*`) before scripts execute

---

## ⚠️ Disclaimer

This script is provided **as-is**, with no warranties or guarantees.  
Use at your **own risk** — especially on web apps sensitive to polyfill injection.  
Some polyfills may behave differently than native implementations.

---
