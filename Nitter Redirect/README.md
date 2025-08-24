# 🔀 Twitter/X to Nitter Redirector (`x2nitter.user.js`)

Automatically redirects **Twitter/X.com** to [nitter.net](https://nitter.net), and gracefully handles **Nitter errors** by rerouting to working alternative instances like [xcancel.com](https://xcancel.com) or [nitter.privacyredirect.com](https://nitter.privacyredirect.com).

Ideal for anonymous Twitter browsing and bypassing rate limits or instance outages — this script keeps your experience smooth and automated.

---

## ⚙️ How It Works

This userscript does two things:

1. **Redirects Twitter/X → Nitter**  
   Any visit to `twitter.com` or `x.com` is redirected to the same path on `nitter.net`.

2. **Handles Nitter Errors**  
   If Nitter shows one of the following errors:

   - `no auth tokens`
   - `rate limited`
   - `try again later`
   - `instance overloaded`
   - `nitter.net is down`
   - `be back shortly`

   The script will automatically redirect you to a randomly chosen working alternative instance:

   - [xcancel.com](https://xcancel.com)
   - [nitter.privacyredirect.com](https://nitter.privacyredirect.com)

---

## 🧩 Requirements

Designed for use with [Violentmonkey](https://violentmonkey.github.io/).  
Other userscript managers (e.g. Tampermonkey, Greasemonkey) may work but are not officially supported.

---

## 🚀 Installation

1. Install the [Violentmonkey](https://violentmonkey.github.io/) browser extension.
2. [Click here to install the script](./x2nitter.user.js), or open the file and install it via Violentmonkey.
3. Or install manually:
   - Click the Violentmonkey icon → **Create a new script**
   - Paste in the contents of `x2nitter.user.js`
   - Save

---

## 🔄 Behavior Summary

| Situation                      | What Happens                                 |
|-------------------------------|-----------------------------------------------|
| Visiting `x.com` or `twitter.com` | Redirects to `nitter.net`                  |
| `nitter.net` shows an error message | Redirects to a random alternative instance |

---

## ⚠️ Disclaimer

This script is provided **as-is**, with no warranties or guarantees.  
Use it at your **own risk**. Availability of instances may vary.
