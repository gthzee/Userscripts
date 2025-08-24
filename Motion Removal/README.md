# ⏸️ Universal Motion Removal (`motionremoval.user.js`)

Automatically disables **animations**, **transitions**, and **motion effects** across the entire web — improving accessibility, reducing visual clutter, and enhancing performance.

Ideal for users with motion sensitivity, or anyone who prefers a static browsing experience without flashy or distracting effects.

---

## ⚙️ How It Works

This userscript does two main things:

1. **Removes Animations and Transitions**  
   On every site you visit, it injects CSS to eliminate animations, transitions, smooth scrolling, and motion-triggered effects — even those applied via class names or data attributes.

2. **User Toggle via Menu Command**  
   You can easily toggle motion removal **on/off** from the userscript manager menu. Your preference is saved per site and automatically applied on your next visit.

---

## 🧩 Requirements

Designed for use with [Violentmonkey](https://violentmonkey.github.io/).  
Other userscript managers (e.g. Tampermonkey, Greasemonkey) may work but are not officially supported.

---

## 🚀 Installation

1. Install the [Violentmonkey](https://violentmonkey.github.io/) browser extension.
2. [Click here to install the script](./motionremoval.user.js), or open the file and install it via Violentmonkey.
3. Or install manually:
   - Click the Violentmonkey icon → **Create a new script**
   - Paste in the contents of `motionremoval.user.js`
   - Save

---

## 🔄 Behavior Summary

| Situation                           | What Happens                                  |
|------------------------------------|-----------------------------------------------|
| Page loads with animations         | They are removed instantly via injected CSS   |
| You disable motion via menu        | The site reloads with animations allowed again |
| You re-enable motion removal       | The site reloads with animations removed again |
| Site uses `prefers-reduced-motion` | Script enforces full motion removal regardless|

---

## 🛠️ Features

- 🔥 Kills **all** animations, transitions, and smooth scrolling
- 🎯 Targets common classes like `animate-*`, `fade`, `slide`, `bounce`, etc.
- 🧠 Respects `svg`, `canvas`, and elements explicitly marked with `.no-motion-removal`
- 🧩 Works globally on all sites
- ✅ Fully toggleable via menu
- 🗝️ Saves your setting per domain using `GM_setValue`

---

## ⚠️ Disclaimer

This script is provided **as-is**, with no warranties or guarantees.  
Use it at your **own risk**. Some sites may rely on motion for essential UX feedback.
