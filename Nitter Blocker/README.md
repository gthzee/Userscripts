# 🚫 Nitter Blocker (`nitterblocker.user.js`)

A userscript that hides posts from **blocked users** or **hashtags** on Nitter-based frontends, and shows a one-time alert when suspended or deleted accounts are detected.

Perfect for cleaning up your timeline while browsing via [Nitter](https://nitter.net), [xcancel.com](https://xcancel.com), or similar privacy-friendly Twitter frontends.

---

## ⚙️ Features

- 🔕 **Block specific users** – Hides tweets, retweets, quote tweets, and user cards from defined usernames.
- 🏷️ **Block specific hashtags** – Hides posts containing any blocked hashtags.
- 🔁 **Retweet filtering** – Optionally hide posts retweeted by blocked users.
- ⚠️ **Suspended account alerts** – Warns if any blocked user appears suspended or deleted (shown once per page load).
- 🎨 **Blur instead of hide** – Optional setting to blur hidden content instead of fully removing it.

---

## 🧩 Requirements

- ✅ Built for [Violentmonkey](https://violentmonkey.github.io/)
- ⚠️ Other userscript managers (e.g. Tampermonkey, Greasemonkey) may work but are not officially supported

---

## 🚀 Installation

1. Install the [Violentmonkey browser extension](https://violentmonkey.github.io/)
2. [Click here to install the script](./nitterblocker.user.js), or open the file and install it via Violentmonkey
3. Or install manually:
   - Click the Violentmonkey icon → **Create a new script**
   - Paste in the contents of `nitterblocker.user.js`
   - Save and refresh your Nitter tab

---

## 🛠️ Configuration

To customize blocked users and hashtags, open the script in your userscript manager and edit the config section:

```js
const DEFAULT_BLOCKED = [
  'user1', 'elonmusk', 'someotheruser'
];

const DEFAULT_BLOCKED_HASHTAGS = [
  'crypto', 'nsfw', 'someevent'
];

const HIDE_RETWEETER = true;  // Hide retweets by blocked users
const USE_BLUR = false;       // Set to true to blur instead of hide
const DEBUG = false;          // Enable console logs
```

No external config files required. Just update the arrays and save the script.

---

## 🌐 Supported Domains

The script runs on most Nitter frontends, including:

- `https://nitter.net/*`
- `https://nitter.*/*`
- `https://nitter.*.*/*`
- `https://xcancel.*/*`

---

## 🔄 Behavior Summary

| Content Type         | Hidden if Blocked?                      |
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
You are responsible for editing the blocklists to suit your needs.  
Use at your **own risk**.
