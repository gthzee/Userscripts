# 🔁 Nitter.net Auto-Redirect (`x2nitter.js`)

Automatically redirects **Twitter/X** links to [nitter.net](https://nitter.net), and falls back to [xcancel.com](https://xcancel.com) when Nitter is **rate-limited**, **overloaded**, or down.

Useful when browsing Twitter through a privacy-friendly frontend — this script ensures uninterrupted viewing even when Nitter fails.

---

## ⚙️ How It Works

The script handles two types of redirection:

- If you're visiting `x.com` or `twitter.com`, it redirects you to the same path on **nitter.net**
- If you're on `nitter.net` and the page shows errors like:

  - `no auth tokens`
  - `rate limited`
  - `try again later`
  - `instance overloaded`
  - `nitter.net is down`
  - `be back shortly`

  ...then you're redirected to the same content on **xcancel.com**

This works both on page load and when content is updated dynamically.

---

## 🧩 Requirements

Designed for use with [Violentmonkey](https://violentmonkey.github.io/).  
Other userscript managers may work but are not officially supported.

---

## 🚀 Installation

1. Install the [Violentmonkey](https://violentmonkey.github.io/) extension in your browser.
2. [Click here to install the script](./x2nitter.user.js), or open the file and install it via Violentmonkey.
3. Alternatively, copy the contents of `x2nitter.js` and paste it into a new script inside Violentmonkey:
   - Click the Violentmonkey icon → **Create a new script**
   - Paste the code and save

---

## ⚠️ Disclaimer

This script is provided **as-is**, with no warranties or guarantees.  
Use it at your **own risk**.
