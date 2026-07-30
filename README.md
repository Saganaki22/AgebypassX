# 🛡️ AgebypassX – Webpack Edition 2.3.0 
Bypass **Twitter/X**'s age restrictions and unlock **sensitive media** — all **without compromising your privacy**.

AgebypassX v2.3.0 uses **multi-layer state interception** (`__INITIAL_STATE__`, `Object.assign`, `JSON.parse`, and `fetch` response hooks) to work with X.com's latest architecture. It works **100% locally** in your browser, doesn't collect data, send requests to external servers, or modify your account.  
Your browsing experience remains **fully private**.


---

## 🚀 Quick Setup Guide (Recommended)
1. Install **Tampermonkey** (if not already installed).  
2. Install the **AgebypassX** userscript.  
3. Reopen X/Twitter — the **green indicator dot** should appear if everything is set up correctly. ✅  

---

## 🔒 Privacy Matters
Unlike other bypass scripts, **AgebypassX**:
- **Does NOT** send your data anywhere.
- **Does NOT** modify your account or cookies.
- **Does NOT** include analytics, ads, or tracking.
- Everything runs **locally** via Tampermonkey.

Your privacy stays protected. 🛡️

---

## 📸 How It Works v2.3.0
Once installed, a small **dot** appears at the top-right of the page:
- 🟢 **Green Dot** → Script is **active** and patching state successfully ✅  
- 🔴 **Red Dot** → A hook or patch **failed** — check the browser console ❌  

**Status Popup** (click the dot):
- Shows **AgebypassX version** info
- **Status**: ACTIVE / ERROR
- **Hooks active**: `__INITIAL_STATE__`, `Object.assign`, `JSON.parse`, `Response.json`
- Hotkey reminder

**Indicator Hotkey**:
- Press **Alt + .** to show/hide the indicator dot
- Your preference is **remembered** across page reloads (stored locally, nowhere else)


---

## 🛠️ Troubleshooting v2.3.0

### Basic Issues
- If the indicator dot is **red**, reload the page and check console for `[Nox]` errors
- Can't see the dot? It may be hidden — press **Alt + .** to bring it back
- Ensure Tampermonkey is **enabled** and script is **active**
- Use a **VPN** and set your location **outside of the UK**
- Make sure your **DNS is handled by the VPN** — avoid UK-based DNS
- **Clear your cookies** and **log out** of your X/Twitter session before enabling the script
- Tested only on **Chromium-based browsers** — other browsers may not work

### Advanced Debugging
1. **Check the Console**:
   - Open DevTools (F12) → Console
   - Filter by `[Nox]` to see exactly what the script is doing
   - `[Nox] Loaded` / `[Nox] Ready` → hooks installed successfully
   - `[Nox] Patched __INITIAL_STATE__` → initial state intercepted and patched

2. **Common Issues**:
   - **No `[Nox]` logs at all** → Script not running (check Tampermonkey is enabled for x.com)
   - **Red dot on load** → A hook failed to install (X.com may have changed something — report it)
   - **Green dot but restrictions remain** → X.com may have renamed feature flags (report it)

3. **Performance**:
   - The script is fully gated — it only deep-scans payloads that actually contain target flag names
   - Timeline and media payloads are **never** walked, so there's no per-tweet overhead
   - No timers, no scroll listeners, no polling — everything is event-driven

### Reporting Issues
For bug reports, [**open a GitHub issue**](https://github.com/Saganaki22/AgebypassX/issues) and include:
- Browser version and type
- Console messages (filter by `[Nox]`)
- Screenshot of the status popup (click the dot)

---

## 🧑‍💻 Source Code
Open-source and fully transparent:  
🔗 [https://github.com/Saganaki22/AgebypassX](https://github.com/Saganaki22/AgebypassX)

---

## 📜 License
Licensed under the [MIT License](https://opensource.org/licenses/MIT).  
Free to audit, fork, and improve.

---

## ⭐ Support
💡 Have feedback, feature requests, or just want to support the project?  
Visit the GitHub repository:  
🔗 **[https://github.com/Saganaki22/AgebypassX](https://github.com/Saganaki22/AgebypassX)**

---

## 🔄 Version History

### v2.3.0 (Latest)
- **⌨️ Indicator Hotkey**: **Alt + .** shows/hides the status dot, persisted across reloads
- **⚡ Performance Gate**: Single-pass regex over raw payloads — deep walks only happen when target flags are actually present
- **🔍 Smarter fetch Sniffing**: Depth-limited key scan on `fetch` responses, no full graph walks

### v2.2.0
- **🆕 Response.json Hook**: `fetch()` responses bypass the `JSON.parse` hook entirely — this path is now patched too
- **🔁 Re-patch Support**: State re-populated by X after SPA navigation is now re-patched (per-pass cycle protection)
- **🛡️ Defensive Indicator**: Survives `document-start` mounting and auto re-mounts if the page wipes it
- **🎭 Native Spoofing**: Overridden functions keep correct `.length`/`.name` so page feature-detection doesn't trip
- **🧩 GraphQL Arrays**: `{feature: "name", enabled: bool}` entries are now flipped too

### v2.1.0
- **🎯 Multi-Hook Architecture**: `__INITIAL_STATE__`, `Object.assign`, and `JSON.parse` interception
- **🚦 Status Indicator**: Green/red dot with click-for-status popup
- **🛡️ Hardened Patching**: Full error protection, frozen-object and getter-throw tolerance

### v1.3.0 - Webpack Edition
- **🆕 Modern Architecture**: Completely rewritten to use webpack chunk interception
- **🎯 Enhanced Detection**: Targets `SensitiveMediaSettingsQuery` and related modules
- **📊 Advanced Status**: Detailed statistics, debug API, and enhanced tooltips
- **🔧 Multiple Fallbacks**: Network request hooking and GraphQL query interception
- **🎨 Better UI**: Animated status indicator with rich hover information
- **🐛 Improved Debugging**: Console API and comprehensive error reporting

### v1.2 - Enhanced Edition  
- Configuration system and state management
- Multiple patching strategies and UI improvements
- Privacy warning removal and SPA navigation handling

### v1.1 - Reliability Update
- Added fallback methods and enhanced error handling
- Multiple patch targets for better coverage

### v1.0 - Original
- Basic age bypass functionality with simple status indicator
