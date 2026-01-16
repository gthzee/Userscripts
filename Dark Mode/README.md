# 🌒 Universal Dark Mode (`könDarkMode.user.js`)

Applies a universal dark mode on **all websites** you visit, using a random dark background color (black, dark gray, or navy) and random link colors for a comfortable browsing experience at night.

## ⚙️ How It Works

- On page load, the script randomly picks one of three dark background styles.
- Applies that background along with light-colored text globally.
- Randomizes the colors of all links (`<a href>`) on the page.
- Watches for dynamically added content and recolors new links accordingly.
- Saves your dark mode preference per domain in `localStorage`.
- Provides menu commands to toggle dark mode without page reload.

## 🧩 Requirements

- Designed for use with [Violentmonkey](https://violentmonkey.github.io/).  
- Should work with other userscript managers but officially tested with Violentmonkey.

## 🚀 Installation

1. Install the [Violentmonkey](https://violentmonkey.github.io/) browser extension.
2. [Download or copy the script source code](./könDarkMode.user.js).
3. In Violentmonkey, create a new userscript and paste the script code.
4. Save and enable the script.

## ⚙️ Usage

- Dark mode activates automatically on page load.
- Use the Violentmonkey menu (script commands) to toggle dark mode:
  - **Universal Dark Mode (Instant)**: toggles dark mode instantly without reloading.
  - **Wordpress Dark Mode (Instant)**: toggles dark mode on wordpress editor without reloading.

## ⚠️ Disclaimer

This script is provided **as-is**, with no warranties or guarantees.  
Use at your own risk.
