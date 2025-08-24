# 🚫 Nitter Blocker (`nitterblocker.user.js`)

Hide posts from **blocked users** or **hashtags** on Nitter-based frontends, and get notified when suspended or deleted accounts are detected (once per page load).

Perfect for cleaning up your feed when using [Nitter](https://nitter.net), [xcancel.com](https://xcancel.com), or similar privacy-friendly Twitter frontends.

---

## ⚙️ Features

- 🔕 **Block specific users** – Hides tweets, retweets, quote tweets, and user cards from predefined usernames.
- 🏷️ **Block specific hashtags** – Removes posts containing undesired tags.
- 🔁 **Retweeter filtering** – Optionally hide posts retweeted by blocked users.
- ⚠️ **Suspended account alerts** – Highlights if a blocked account is suspended or deleted, only once per load.
- 🎨 **Blur instead of hide** – Optional visual effect instead of full removal.

---

## 🧩 Requirements

Designed for use with [Violentmonkey](https://violentmonkey.github.io/).  
Other userscript managers (e.g. Tampermonkey, Greasemonkey) may also work but are not officially supported.

---

## 🚀 Installation

1. Install the [Violentmonkey browser extension](https://violentmonkey.github.io/).
2. [Click here to install the script](./nitterblocker.user.js), or open the file directly and install it via Violentmonkey.
3. Or install manually:
   - Click the Violentmonkey icon → **Create a new script**
   - Paste in the contents of `nitterblocker.user.js`
   - Save and reload your Nitter page

---

## 🛠️ Configuration

To customize the blocking behavior, edit the script directly:

```js
const DEFAULT_BLOCKED = [
  'user1', 'elonmusk', 'someotheruser'
];

const DEFAULT_BLOCKED_HASHTAGS = [
  'crypto', 'nsfw', 'someevent'
];

const HIDE_RETWEETER = true;  // Hide retweets from blocked users
const USE_BLUR = false;       // Set to true to blur instead of hide
const DEBUG = false;          // Enable debug logging
```

No external config files — just update the arrays and save.

---

## 🌐 Supported Domains

The script runs on all common Nitter mirrors, including:

- `nitter.net`
- Any `*.nitter.*` subdomain (e.g., `nitter.snopyta.org`)
- [xcancel.com](https://xcancel.com)

---

## 🔄 Behavior Summary

| Content Type         | Hidden If Blocked?                      |
|----------------------|------------------------------------------|
| Tweet author         | ✅ Yes                                   |
| Retweeter            | ✅ If `HIDE_RETWEETER` is `true`         |
| Quoted tweet author  | ✅ Yes                                   |
| Hashtag              | ✅ Yes                                   |
| Suspended account    | ⚠️ One-time notice shown per page load   |
| User card / search   | ✅ Yes                                   |

---

## ⚠️ Disclaimer

This script is provided **as-is**, with no warranties or guarantees.  
You are responsible for editing the blocklist to suit your preferences.  
Use at your **own risk**.
