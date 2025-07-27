# 🔁 Nitter.net Auto-Redirect (`nitter2xcancel.js`)

Automatically redirects to [xcancel.com](https://xcancel.com) when [nitter.net](https://nitter.net) displays a **rate limit** or **auth token** error.

Useful when Nitter is overloaded, rate-limited, or down — this script helps you reach the original content seamlessly without manual steps.

## ⚙️ How It Works

The script checks for common Nitter error messages like:

- `rate limited`
- `no auth tokens`
- `Instance has no auth tokens, or is fully rate limited`

If such messages are found, it redirects you to the same path on **xcancel.com**.

## 🧩 Requirements

Designed for use with [Violentmonkey](https://violentmonkey.github.io/).  
Other userscript managers may work but are not officially supported.

## 🚀 Installation

1. Install the [Violentmonkey](https://violentmonkey.github.io/) extension in your browser.
2. [Click here to install the script](./nitter2xcancel.user.js), or open the file and install it via Violentmonkey.
3. Alternatively, copy the contents of `nitter2xcancel.js` and paste it into a new script inside Violentmonkey:
   - Click the Violentmonkey icon → **Create a new script**
   - Paste the code and save

## ⚠️ Disclaimer

This script is provided **as-is**, with no warranties or guarantees.  
Use it at your **own risk**.
