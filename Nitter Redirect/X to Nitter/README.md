🔁 Twitter → Nitter → XCancel (x2nitter.js)

A userscript that automatically redirects X.com / Twitter.com to Nitter.net, and then to XCancel.com if Nitter is rate-limited, overloaded, or down.

Browse Twitter content through a privacy-friendly frontend — with automatic fallback when Nitter fails.
⚙️ How It Works

This script performs two main functions:
🔄 1. Redirect X.com / Twitter → Nitter.net

When visiting:

    https://x.com/*

    https://twitter.com/*

You are instantly redirected to:

    https://nitter.net/*
    (URL path, query string, and hash are preserved)

🚨 2. Redirect Nitter Errors → XCancel

If Nitter displays an error such as:

    no auth tokens

    rate limited

    try again later

    instance overloaded

    nitter.net is down

    be back shortly

Then it automatically redirects to:

    https://xcancel.com/*
    (same path and parameters as original)

The script checks both immediately and dynamically via a DOM observer.
🧩 Requirements

    ✅ Violentmonkey (recommended)

    ⚠️ Other userscript managers (e.g., Tampermonkey, Greasemonkey) may work but are not officially tested

🚀 Installation

    Install Violentmonkey in your browser

    Click here to install the script (or open and copy the contents)

    Or manually:

        Click the Violentmonkey icon → Create a new script

        Paste the contents of x2nitter.js

        Save and enable it

📄 Filename

Save this script as:

x2nitter.js

⚠️ Disclaimer

This script is provided as-is, without warranties or guarantees.
Use at your own risk.
